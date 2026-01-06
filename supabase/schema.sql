-- Proofo Database Schema (Consolidated)
-- Run this in Supabase SQL Editor for a fresh database setup
-- Last updated: 2026-01-06
-- Includes: Core tables, Trust Levels, Verification system, RLS, Demo Data

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. CUSTOM TYPES
-- ============================================
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
      'pdf_generated',
      'pdf_downloaded',
      'deal_verified',
      'deal_link_shared',
      'token_validated',
      'email_otp_sent',
      'email_verified',
      'phone_otp_sent',
      'phone_verified'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new enum values for existing databases
DO $$ BEGIN ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'email_otp_sent'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'email_verified'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'phone_otp_sent'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'phone_verified'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE trust_level AS ENUM ('basic', 'verified', 'strong', 'maximum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE trust_level IS 'Trust level for deals: basic (no verification), verified (email OTP), strong (email+phone), maximum (email+phone+ID)';

-- ============================================
-- 3. CORE TABLES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  job_title TEXT,
  location TEXT,
  currency TEXT DEFAULT 'USD',
  signature_url TEXT,
  phone TEXT,
  phone_verified_at TIMESTAMPTZ,
  id_verified_at TIMESTAMPTZ,
  id_verification_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table (for People Page persistence)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Deals table (core table)
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
  trust_level trust_level DEFAULT 'basic',
  deal_seal TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  last_nudged_at TIMESTAMPTZ
);

-- Access tokens table (for secure recipient access)
CREATE TABLE IF NOT EXISTS public.access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table (append-only event log)
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

-- User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_deal_viewed BOOLEAN DEFAULT TRUE,
  notify_deal_signed BOOLEAN DEFAULT TRUE,
  notify_deal_expiring BOOLEAN DEFAULT TRUE,
  notify_deal_comments BOOLEAN DEFAULT TRUE,
  notify_messages BOOLEAN DEFAULT TRUE,
  notify_mentions BOOLEAN DEFAULT TRUE,
  notify_deadlines BOOLEAN DEFAULT TRUE,
  notify_followups BOOLEAN DEFAULT FALSE,
  notify_security BOOLEAN DEFAULT TRUE,
  notify_product_updates BOOLEAN DEFAULT FALSE,
  email_frequency TEXT DEFAULT 'instant',
  channel_email BOOLEAN DEFAULT TRUE,
  channel_push BOOLEAN DEFAULT TRUE,
  channel_mobile BOOLEAN DEFAULT FALSE,
  do_not_disturb BOOLEAN DEFAULT FALSE,
  dnd_expires_at TIMESTAMPTZ,
  compact_mode BOOLEAN DEFAULT FALSE,
  font_scale NUMERIC(3,2) DEFAULT 1.00,
  reduced_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Deal verifications table for per-deal verification records
CREATE TABLE IF NOT EXISTS public.deal_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  verified_value TEXT NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(deal_id, verification_type)
);

-- OTP codes table for temporary verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, verification_type)
);

-- ============================================
-- 3b. COLUMN MIGRATIONS (for existing databases)
-- ============================================
-- These ADD COLUMN statements ensure older databases get new columns

-- Profiles new columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_verification_method TEXT;

-- Deals columns (for older databases)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS trust_level trust_level DEFAULT 'basic';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS last_nudged_at TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;

-- User preferences new columns
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS dnd_expires_at TIMESTAMPTZ;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS font_scale NUMERIC(3,2) DEFAULT 1.00;
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT FALSE;

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_deals_public_id ON public.deals(public_id);
CREATE INDEX IF NOT EXISTS idx_deals_creator_id ON public.deals(creator_id);
CREATE INDEX IF NOT EXISTS idx_deals_recipient_id ON public.deals(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deals_recipient_email ON public.deals(recipient_email);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON public.access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_deal_id ON public.access_tokens(deal_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_deal_id_created ON public.access_tokens(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_deal_id ON public.audit_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_verifications_deal_id ON public.deal_verifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_deal_id ON public.verification_codes(deal_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON public.verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can lookup profiles by email" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "View deal party profiles" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "View deal party profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    id IN (SELECT recipient_id FROM deals WHERE creator_id = auth.uid() AND recipient_id IS NOT NULL)
    OR
    id IN (SELECT creator_id FROM deals WHERE recipient_id = auth.uid())
    OR
    id IN (
      SELECT creator_id FROM deals
      WHERE recipient_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Deals
DROP POLICY IF EXISTS "Creators can view their own deals" ON public.deals;
DROP POLICY IF EXISTS "Recipients can view deals assigned to them" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can create deals" ON public.deals;
DROP POLICY IF EXISTS "Creators can update their own deals" ON public.deals;

CREATE POLICY "Creators can view their own deals" ON public.deals FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Recipients can view deals assigned to them" ON public.deals FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Authenticated users can create deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their own deals" ON public.deals FOR UPDATE USING (auth.uid() = creator_id);

-- Access Tokens
DROP POLICY IF EXISTS "Creators can view their deal tokens" ON public.access_tokens;
DROP POLICY IF EXISTS "Creators can create tokens for their deals" ON public.access_tokens;

CREATE POLICY "Creators can view their deal tokens" ON public.access_tokens FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals WHERE deals.id = access_tokens.deal_id AND deals.creator_id = auth.uid())
);
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

-- Contacts
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- User Preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own preferences" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Deal Verifications
DROP POLICY IF EXISTS "Users can view deal verifications" ON public.deal_verifications;
CREATE POLICY "Users can view deal verifications" ON public.deal_verifications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_verifications.deal_id
    AND (deals.creator_id = auth.uid() OR deals.recipient_id = auth.uid())
  )
);

-- Verification Codes (very restrictive - use RPC functions)
DROP POLICY IF EXISTS "No direct access to verification codes" ON public.verification_codes;
CREATE POLICY "No direct access to verification codes" ON public.verification_codes FOR ALL USING (false);

-- ============================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================

-- Handle new user signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync deals for new user
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

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_deals_for_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. RPC FUNCTIONS
-- ============================================

-- Confirm deal with token validation
CREATE OR REPLACE FUNCTION public.confirm_deal_with_token(
  p_deal_id UUID,
  p_token TEXT,
  p_signature_data TEXT,
  p_deal_seal TEXT,
  p_recipient_email TEXT DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL,
  p_confirmed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS public.deals AS $$
DECLARE
  v_deal public.deals;
  v_token_valid BOOLEAN;
BEGIN
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

  UPDATE public.access_tokens
  SET used_at = NOW()
  WHERE deal_id = p_deal_id AND token = p_token;

  UPDATE public.deals
  SET
    status = 'confirmed',
    signature_url = p_signature_data,
    deal_seal = p_deal_seal,
    confirmed_at = p_confirmed_at,
    recipient_email = COALESCE(p_recipient_email, recipient_email),
    recipient_id = COALESCE(p_recipient_id, recipient_id)
  WHERE id = p_deal_id
    AND status = 'pending'
  RETURNING * INTO v_deal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found or not in pending status';
  END IF;

  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata)
  VALUES (p_deal_id, 'deal_confirmed', p_recipient_id, 'recipient', jsonb_build_object(
    'has_seal', p_deal_seal IS NOT NULL,
    'has_email', p_recipient_email IS NOT NULL
  ));

  RETURN v_deal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get deal by public ID (with verifications)
CREATE OR REPLACE FUNCTION public.get_deal_by_public_id(p_public_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', d.id,
    'public_id', d.public_id,
    'creator_id', d.creator_id,
    'creator_name', COALESCE(p.name, 'Unknown'),
    'creator_avatar_url', p.avatar_url,
    'recipient_id', d.recipient_id,
    'recipient_name', d.recipient_name,
    'recipient_email', d.recipient_email,
    'title', d.title,
    'description', d.description,
    'template_id', d.template_id,
    'terms', d.terms,
    'status', d.status,
    'trust_level', COALESCE(d.trust_level, 'basic'),
    'deal_seal', d.deal_seal,
    'signature_url', d.signature_url,
    'created_at', d.created_at,
    'confirmed_at', d.confirmed_at,
    'voided_at', d.voided_at,
    'viewed_at', d.viewed_at,
    'last_nudged_at', d.last_nudged_at,
    'verifications', (
      SELECT json_agg(json_build_object(
        'verification_type', dv.verification_type,
        'verified_value', dv.verified_value,
        'verified_at', dv.verified_at
      ))
      FROM public.deal_verifications dv
      WHERE dv.deal_id = d.id
    )
  ) INTO v_result
  FROM public.deals d
  LEFT JOIN public.profiles p ON d.creator_id = p.id
  WHERE d.public_id = p_public_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get deal verifications
CREATE OR REPLACE FUNCTION public.get_deal_verifications(p_deal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) THEN
    RETURN NULL;
  END IF;

  SELECT json_agg(json_build_object(
    'verification_type', dv.verification_type,
    'verified_value', dv.verified_value,
    'verified_at', dv.verified_at
  ))
  INTO v_result
  FROM public.deal_verifications dv
  WHERE dv.deal_id = p_deal_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate access token
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

-- Get access token for deal
CREATE OR REPLACE FUNCTION public.get_access_token_for_deal(p_deal_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF p_deal_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT token INTO v_token
  FROM public.access_tokens
  WHERE deal_id = p_deal_id
    AND expires_at > NOW()
    AND used_at IS NULL
  LIMIT 1;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get token status for deal
CREATE OR REPLACE FUNCTION public.get_token_status_for_deal(p_deal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_used_at TIMESTAMPTZ;
BEGIN
  IF p_deal_id IS NULL THEN
    RETURN json_build_object('status', 'not_found', 'expires_at', NULL);
  END IF;

  SELECT expires_at, used_at INTO v_expires_at, v_used_at
  FROM public.access_tokens
  WHERE deal_id = p_deal_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'not_found', 'expires_at', NULL);
  END IF;

  IF v_used_at IS NOT NULL THEN
    RETURN json_build_object('status', 'used', 'expires_at', v_expires_at);
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN json_build_object('status', 'expired', 'expires_at', v_expires_at);
  END IF;

  RETURN json_build_object('status', 'valid', 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_deal_id UUID,
  p_event_type audit_event_type,
  p_actor_type actor_type,
  p_metadata JSONB DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_deal_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) INTO v_deal_exists;

  IF NOT v_deal_exists THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  INSERT INTO public.audit_log (
    deal_id, event_type, actor_id, actor_type, metadata, ip_address, user_agent
  )
  VALUES (
    p_deal_id, p_event_type, p_actor_id, p_actor_type, p_metadata, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get deal audit logs
CREATE OR REPLACE FUNCTION public.get_deal_audit_logs(p_deal_id UUID, p_token TEXT DEFAULT NULL)
RETURNS SETOF audit_log AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM deals WHERE id = p_deal_id AND status = 'confirmed') THEN
    RETURN QUERY SELECT * FROM audit_log WHERE deal_id = p_deal_id ORDER BY created_at ASC;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM deals WHERE id = p_deal_id
    AND (creator_id = auth.uid() OR recipient_id = auth.uid())
  ) THEN
    RETURN QUERY SELECT * FROM audit_log WHERE deal_id = p_deal_id ORDER BY created_at ASC;
    RETURN;
  END IF;

  IF p_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM access_tokens WHERE deal_id = p_deal_id AND token = p_token
  ) THEN
    RETURN QUERY SELECT * FROM audit_log WHERE deal_id = p_deal_id ORDER BY created_at ASC;
    RETURN;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lookup profile by email
CREATE OR REPLACE FUNCTION public.lookup_profile_by_email(p_email TEXT)
RETURNS TABLE(id UUID, name TEXT, avatar_url TEXT) AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT profiles.id, profiles.name, profiles.avatar_url
  FROM public.profiles
  WHERE profiles.email = LOWER(TRIM(p_email));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check email for deal
CREATE OR REPLACE FUNCTION public.check_email_for_deal(p_public_id TEXT, p_email TEXT)
RETURNS TABLE(is_proofo_user BOOLEAN, is_creator BOOLEAN, user_name TEXT, user_avatar_url TEXT) AS $$
DECLARE
  v_deal_creator_id UUID;
  v_profile_id UUID;
  v_profile_name TEXT;
  v_profile_avatar TEXT;
BEGIN
  SELECT creator_id INTO v_deal_creator_id
  FROM public.deals
  WHERE public_id = p_public_id;

  IF v_deal_creator_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT profiles.id, profiles.name, profiles.avatar_url INTO v_profile_id, v_profile_name, v_profile_avatar
  FROM public.profiles
  WHERE email = LOWER(TRIM(p_email));

  IF v_profile_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_profile_id = v_deal_creator_id THEN
    RETURN QUERY SELECT FALSE, TRUE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, FALSE, v_profile_name, v_profile_avatar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create verification code
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
  SELECT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) INTO v_deal_exists;
  IF NOT v_deal_exists THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  DELETE FROM public.verification_codes
  WHERE deal_id = p_deal_id AND verification_type = p_verification_type;

  INSERT INTO public.verification_codes (
    deal_id, verification_type, target, code, expires_at
  )
  VALUES (
    p_deal_id, p_verification_type, LOWER(TRIM(p_target)), p_code_hash,
    NOW() + (p_expires_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify code
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
  SELECT id, attempts INTO v_code_id, v_attempts
  FROM public.verification_codes
  WHERE deal_id = p_deal_id
    AND verification_type = p_verification_type
    AND target = LOWER(TRIM(p_target))
    AND code = p_code_hash
    AND expires_at > NOW()
    AND verified_at IS NULL;

  IF v_code_id IS NULL THEN
    UPDATE public.verification_codes
    SET attempts = attempts + 1
    WHERE deal_id = p_deal_id AND verification_type = p_verification_type;
    RETURN FALSE;
  END IF;

  UPDATE public.verification_codes
  SET verified_at = NOW()
  WHERE id = v_code_id;

  INSERT INTO public.deal_verifications (deal_id, verification_type, verified_value)
  VALUES (p_deal_id, p_verification_type, LOWER(TRIM(p_target)))
  ON CONFLICT (deal_id, verification_type)
  DO UPDATE SET verified_value = EXCLUDED.verified_value, verified_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get deal verification status
CREATE OR REPLACE FUNCTION public.get_deal_verification_status(p_deal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_trust_level trust_level;
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
BEGIN
  SELECT trust_level INTO v_trust_level FROM public.deals WHERE id = p_deal_id;

  IF v_trust_level IS NULL THEN
    RETURN json_build_object('error', 'Deal not found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.deal_verifications
    WHERE deal_id = p_deal_id AND verification_type = 'email'
  ) INTO v_email_verified;

  SELECT EXISTS(
    SELECT 1 FROM public.deal_verifications
    WHERE deal_id = p_deal_id AND verification_type = 'phone'
  ) INTO v_phone_verified;

  RETURN json_build_object(
    'trust_level', v_trust_level::TEXT,
    'email_required', v_trust_level IN ('verified', 'strong', 'maximum'),
    'email_verified', v_email_verified,
    'phone_required', v_trust_level IN ('strong', 'maximum'),
    'phone_verified', v_phone_verified,
    'id_required', v_trust_level = 'maximum',
    'id_verified', FALSE,
    'can_sign', CASE
      WHEN v_trust_level = 'basic' THEN TRUE
      WHEN v_trust_level = 'verified' THEN v_email_verified
      WHEN v_trust_level = 'strong' THEN v_email_verified AND v_phone_verified
      WHEN v_trust_level = 'maximum' THEN FALSE
      ELSE FALSE
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_deal_by_public_id(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_deal_verifications(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.validate_access_token(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_deal_with_token(UUID, TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_access_token_for_deal(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_token_status_for_deal(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, audit_event_type, actor_type, JSONB, UUID, INET, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_deal_audit_logs(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_for_deal(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_verification_code(UUID, TEXT, TEXT, TEXT, INT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.verify_code(UUID, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_deal_verification_status(UUID) TO authenticated, anon, service_role;

-- ============================================
-- 10. DEMO DATA SEED
-- ============================================
-- Creates demo users and a verified demo deal for the public verify page

DO $$
DECLARE
  v_creator_id UUID := '00000000-0000-0000-0000-000000000001';
  v_recipient_id UUID := '00000000-0000-0000-0000-000000000002';
  v_deal_id UUID := '00000000-0000-0000-0000-000000000003';
  v_deal_public_id TEXT := 'demo-verify';
  v_confirmed_at TIMESTAMPTZ := '2025-12-15 14:30:00+00';
  v_created_at TIMESTAMPTZ := '2025-12-14 10:00:00+00';
  v_terms JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.deals WHERE public_id = v_deal_public_id) THEN
    RAISE NOTICE 'Demo deal already exists, skipping seed.';
    RETURN;
  END IF;

  v_terms := '[
    {"id": "1", "label": "Project", "value": "Website Redesign & Brand Refresh", "type": "text"},
    {"id": "2", "label": "Fee", "value": "$12,500.00", "type": "currency"},
    {"id": "3", "label": "Duration", "value": "8 weeks", "type": "text"},
    {"id": "4", "label": "Milestones", "value": "3 deliverable checkpoints", "type": "text"}
  ]'::jsonb;

  -- Temporarily disable FK checks to allow demo data without auth.users
  SET session_replication_role = 'replica';

  -- Create demo profiles directly (bypassing auth.users FK)
  INSERT INTO public.profiles (id, email, name, created_at)
  VALUES (v_creator_id, 'john@proofo.app', 'John Doe', v_created_at - INTERVAL '30 days')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

  INSERT INTO public.profiles (id, email, name, created_at)
  VALUES (v_recipient_id, 'jane@proofo.app', 'Jane Smith', v_created_at - INTERVAL '15 days')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

  -- Re-enable FK checks
  SET session_replication_role = 'origin';

  -- Create demo deal
  INSERT INTO public.deals (
    id, public_id, creator_id, recipient_id, recipient_name, recipient_email,
    title, description, template_id, terms, status, trust_level, deal_seal,
    signature_url, created_at, confirmed_at, viewed_at
  ) VALUES (
    v_deal_id, v_deal_public_id, v_creator_id, v_recipient_id, 'Jane Smith', 'jane@proofo.app',
    'Services Agreement', 'Professional design services for Q1 2026 rebrand project.',
    'service-exchange', v_terms, 'confirmed', 'verified',
    '7ff61c429524dbeea05512ce2a303b9051d1f0421ce165a1440690a82963f937',
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCAzMCBRIDMwIDEwLCA1MCAzMCBUIDkwIDMwIFQgMTMwIDMwIFQgMTcwIDMwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
    v_created_at, v_confirmed_at, v_created_at + INTERVAL '1 day 4 hours 20 minutes'
  );

  -- Create email verification record
  INSERT INTO public.deal_verifications (deal_id, verification_type, verified_value, verified_at)
  VALUES (v_deal_id, 'email', 'jane@proofo.app', '2025-12-15 14:25:00+00')
  ON CONFLICT (deal_id, verification_type) DO NOTHING;

  -- Create audit log entries
  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
  VALUES (v_deal_id, 'deal_created', v_creator_id, 'creator', '{"template": "service-exchange"}'::jsonb, v_created_at);

  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
  VALUES (v_deal_id, 'email_sent', NULL, 'system', '{"recipient": "jane@proofo.app", "type": "invitation"}'::jsonb, v_created_at + INTERVAL '1 minute');

  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
  VALUES (v_deal_id, 'deal_viewed', v_recipient_id, 'recipient', '{}'::jsonb, v_created_at + INTERVAL '1 day 4 hours 20 minutes');

  -- Note: email_verified audit log skipped to maintain single-transaction compatibility
  -- (new enum values can't be used in same transaction they're added)

  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
  VALUES (v_deal_id, 'deal_signed', v_recipient_id, 'recipient', '{"signatureMethod": "draw"}'::jsonb, '2025-12-15 14:28:00+00');

  INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
  VALUES (v_deal_id, 'deal_confirmed', NULL, 'system', '{"sealGenerated": true}'::jsonb, v_confirmed_at);

  RAISE NOTICE 'Demo deal seeded successfully with public_id: %', v_deal_public_id;
END $$;

-- ============================================
-- STORAGE SETUP (Run in Supabase Dashboard)
-- ============================================
-- Create a bucket named "signatures" with:
-- - Public bucket: YES
-- - Allowed MIME types: image/png, image/jpeg
-- - Max file size: 1MB
-- Add policies for public read and authenticated/anon uploads.
