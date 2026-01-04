-- Trust Levels Feature Migration
-- Adds trust level verification requirements to deals
-- Migration: 20260104_trust_levels.sql

-- 1. Create trust_level enum type
DO $$ BEGIN
    CREATE TYPE trust_level AS ENUM ('basic', 'verified', 'strong', 'maximum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add trust_level column to deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS trust_level trust_level DEFAULT 'basic';

-- 3. Add phone verification columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 4. Add ID verification columns to profiles table (for future use)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_verification_method TEXT;

-- 5. Create deal_verifications table for per-deal verification records
CREATE TABLE IF NOT EXISTS public.deal_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'email', 'phone', 'id'
  verified_value TEXT NOT NULL, -- the email/phone that was verified
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- optional extra data (e.g., OTP method, IP, user_agent)
  UNIQUE(deal_id, verification_type)
);

-- 6. Create OTP codes table for temporary verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'email', 'phone'
  target TEXT NOT NULL, -- email address or phone number
  code TEXT NOT NULL, -- the OTP code (hashed for security)
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0, -- track failed attempts
  verified_at TIMESTAMPTZ, -- null until verified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, verification_type) -- only one active code per deal per type
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_verifications_deal_id ON public.deal_verifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_deal_id ON public.verification_codes(deal_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 8. Enable RLS on new tables
ALTER TABLE public.deal_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for deal_verifications
-- Creators and recipients can view verifications for their deals
DROP POLICY IF EXISTS "Users can view deal verifications" ON public.deal_verifications;
CREATE POLICY "Users can view deal verifications" ON public.deal_verifications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_verifications.deal_id
    AND (deals.creator_id = auth.uid() OR deals.recipient_id = auth.uid())
  )
);

-- 10. RLS Policies for verification_codes (very restrictive)
-- Only system/service role should access these directly - use RPC functions
DROP POLICY IF EXISTS "No direct access to verification codes" ON public.verification_codes;
CREATE POLICY "No direct access to verification codes" ON public.verification_codes
  FOR ALL USING (false);

-- 11. Add new audit event types for verification
-- Note: Altering ENUMs requires special handling
DO $$ BEGIN
  ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'email_otp_sent';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'email_verified';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'phone_otp_sent';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'phone_verified';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 12. Function to create verification code (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.create_verification_code(
  p_deal_id UUID,
  p_verification_type TEXT,
  p_target TEXT,
  p_code_hash TEXT,
  p_expires_minutes INT DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_deal_exists BOOLEAN;
BEGIN
  -- Validate deal exists
  SELECT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) INTO v_deal_exists;
  IF NOT v_deal_exists THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  -- Delete any existing code for this deal+type (upsert behavior)
  DELETE FROM public.verification_codes
  WHERE deal_id = p_deal_id AND verification_type = p_verification_type;

  -- Insert new code
  INSERT INTO public.verification_codes (
    deal_id,
    verification_type,
    target,
    code,
    expires_at
  )
  VALUES (
    p_deal_id,
    p_verification_type,
    LOWER(TRIM(p_target)),
    p_code_hash,
    NOW() + (p_expires_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Function to verify code and record verification
CREATE OR REPLACE FUNCTION public.verify_code(
  p_deal_id UUID,
  p_verification_type TEXT,
  p_target TEXT,
  p_code_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_code_id UUID;
  v_attempts INT;
BEGIN
  -- Find matching code that hasn't expired
  SELECT id, attempts INTO v_code_id, v_attempts
  FROM public.verification_codes
  WHERE deal_id = p_deal_id
    AND verification_type = p_verification_type
    AND target = LOWER(TRIM(p_target))
    AND code = p_code_hash
    AND expires_at > NOW()
    AND verified_at IS NULL;

  IF v_code_id IS NULL THEN
    -- Increment attempts counter for rate limiting
    UPDATE public.verification_codes
    SET attempts = attempts + 1
    WHERE deal_id = p_deal_id AND verification_type = p_verification_type;
    RETURN FALSE;
  END IF;

  -- Mark code as verified
  UPDATE public.verification_codes
  SET verified_at = NOW()
  WHERE id = v_code_id;

  -- Create verification record
  INSERT INTO public.deal_verifications (deal_id, verification_type, verified_value)
  VALUES (p_deal_id, p_verification_type, LOWER(TRIM(p_target)))
  ON CONFLICT (deal_id, verification_type)
  DO UPDATE SET verified_value = EXCLUDED.verified_value, verified_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Function to check required verifications for a deal
CREATE OR REPLACE FUNCTION public.get_deal_verification_status(p_deal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_trust_level trust_level;
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_result JSON;
BEGIN
  -- Get deal trust level
  SELECT trust_level INTO v_trust_level FROM public.deals WHERE id = p_deal_id;

  IF v_trust_level IS NULL THEN
    RETURN json_build_object('error', 'Deal not found');
  END IF;

  -- Check what's verified
  SELECT EXISTS(
    SELECT 1 FROM public.deal_verifications
    WHERE deal_id = p_deal_id AND verification_type = 'email'
  ) INTO v_email_verified;

  SELECT EXISTS(
    SELECT 1 FROM public.deal_verifications
    WHERE deal_id = p_deal_id AND verification_type = 'phone'
  ) INTO v_phone_verified;

  -- Build result based on trust level
  RETURN json_build_object(
    'trust_level', v_trust_level::TEXT,
    'email_required', v_trust_level IN ('verified', 'strong', 'maximum'),
    'email_verified', v_email_verified,
    'phone_required', v_trust_level IN ('strong', 'maximum'),
    'phone_verified', v_phone_verified,
    'id_required', v_trust_level = 'maximum',
    'id_verified', FALSE, -- Not implemented yet
    'can_sign', CASE
      WHEN v_trust_level = 'basic' THEN TRUE
      WHEN v_trust_level = 'verified' THEN v_email_verified
      WHEN v_trust_level = 'strong' THEN v_email_verified AND v_phone_verified
      WHEN v_trust_level = 'maximum' THEN FALSE -- Not implemented
      ELSE FALSE
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Grant permissions on new functions
GRANT EXECUTE ON FUNCTION public.create_verification_code(UUID, TEXT, TEXT, TEXT, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.verify_code(UUID, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_deal_verification_status(UUID) TO authenticated, anon, service_role;

-- 16. Update types definition comment
COMMENT ON TYPE trust_level IS 'Trust level for deals: basic (no verification), verified (email OTP), strong (email+phone), maximum (email+phone+ID)';
