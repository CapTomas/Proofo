-- Proofo Database Schema
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create custom types
-- We use DO blocks to prevent errors if types already exist
DO $$ BEGIN
    CREATE TYPE deal_status AS ENUM ('pending', 'sealing', 'confirmed', 'voided');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM ('creator', 'recipient', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM (
      'deal_created',
      'deal_viewed',
      'deal_signed',
      'deal_confirmed',
      'deal_voided',
      'email_sent',
      'pdf_generated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Deals table (core table)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_id TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  template_id TEXT,
  terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  status deal_status DEFAULT 'pending',
  deal_seal TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ
);

-- 5. Access tokens table (for secure recipient access)
CREATE TABLE IF NOT EXISTS public.access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit log table (append-only event log)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type audit_event_type NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_type actor_type NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_public_id ON public.deals(public_id);
CREATE INDEX IF NOT EXISTS idx_deals_creator_id ON public.deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_deals_recipient_id ON public.deals(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deals_recipient_email ON public.deals(recipient_email);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON public.access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_deal_id ON public.access_tokens(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_deal_id ON public.audit_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- 8. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Deals
DROP POLICY IF EXISTS "Creators can view their own deals" ON public.deals;
CREATE POLICY "Creators can view their own deals" ON public.deals FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Recipients can view deals assigned to them" ON public.deals;
CREATE POLICY "Recipients can view deals assigned to them" ON public.deals FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
CREATE POLICY "Authenticated users can create deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their own deals" ON public.deals;
CREATE POLICY "Creators can update their own deals" ON public.deals FOR UPDATE USING (auth.uid() = creator_id);

-- Access Tokens
DROP POLICY IF EXISTS "Creators can view their deal tokens" ON public.access_tokens;
CREATE POLICY "Creators can view their deal tokens" ON public.access_tokens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = access_tokens.deal_id AND deals.creator_id = auth.uid())
);

DROP POLICY IF EXISTS "Creators can create tokens for their deals" ON public.access_tokens;
CREATE POLICY "Creators can create tokens for their deals" ON public.access_tokens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = access_tokens.deal_id AND deals.creator_id = auth.uid())
);

-- Audit Log
DROP POLICY IF EXISTS "Users can view audit logs for their deals" ON public.audit_log;
CREATE POLICY "Users can view audit logs for their deals" ON public.audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = audit_log.deal_id
    AND (deals.creator_id = auth.uid() OR deals.recipient_id = auth.uid())
  )
);

-- 10. Functions & Triggers

-- FIXED: Handle new user signup with explicit schema and search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to retroactively sync deals
CREATE OR REPLACE FUNCTION public.sync_deals_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.deals
  SET recipient_id = NEW.id
  WHERE recipient_email = NEW.email
    AND recipient_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for syncing deals
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_deals_for_new_user();

-- Function to confirm deal with token validation
CREATE OR REPLACE FUNCTION public.confirm_deal_with_token(
  p_deal_id UUID,
  p_token TEXT,
  p_signature_data TEXT,
  p_deal_seal TEXT,
  p_recipient_email TEXT DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS public.deals AS $$
DECLARE
  v_deal public.deals;
  v_token_valid BOOLEAN;
BEGIN
  -- Validate the token
  SELECT EXISTS(
    SELECT 1 FROM public.access_tokens
    WHERE deal_id = p_deal_id
      AND token = p_token
      AND expires_at > NOW()
      AND used_at IS NULL
  ) INTO v_token_valid;

  IF NOT v_token_valid THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Mark token as used
  UPDATE public.access_tokens
  SET used_at = NOW()
  WHERE deal_id = p_deal_id AND token = p_token;

  -- Update the deal
  UPDATE public.deals
  SET
    status = 'confirmed',
    signature_url = p_signature_data,
    deal_seal = p_deal_seal,
    confirmed_at = NOW(),
    recipient_email = COALESCE(p_recipient_email, recipient_email),
    recipient_id = COALESCE(p_recipient_id, recipient_id)
  WHERE id = p_deal_id
    AND status = 'pending'
  RETURNING * INTO v_deal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found or not in pending status';
  END IF;

  -- Add audit log entry
  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata)
  VALUES (p_deal_id, 'deal_confirmed', p_recipient_id, 'recipient', jsonb_build_object(
    'has_seal', p_deal_seal IS NOT NULL,
    'has_email', p_recipient_email IS NOT NULL
  ));

  RETURN v_deal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deal by public ID
CREATE OR REPLACE FUNCTION public.get_deal_by_public_id(p_public_id TEXT)
RETURNS public.deals AS $$
DECLARE
  v_deal public.deals;
BEGIN
  SELECT * INTO v_deal
  FROM public.deals
  WHERE public_id = p_public_id;
  RETURN v_deal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate access token
CREATE OR REPLACE FUNCTION public.validate_access_token(p_deal_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.access_tokens
    WHERE deal_id = p_deal_id
      AND token = p_token
      AND expires_at > NOW()
      AND used_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get access token for a deal (for anonymous recipients)
CREATE OR REPLACE FUNCTION public.get_access_token_for_deal(p_deal_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT token INTO v_token
  FROM public.access_tokens
  WHERE deal_id = p_deal_id
    AND expires_at > NOW()
    AND used_at IS NULL
  LIMIT 1;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Permissions (Critical for API access)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 12. Public Function Grants
GRANT EXECUTE ON FUNCTION public.get_deal_by_public_id(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.validate_access_token(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_deal_with_token(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_access_token_for_deal(UUID) TO authenticated, anon;
