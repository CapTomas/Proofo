-- Proofo Database Schema for Supabase
-- This file creates all the necessary tables, types, and RLS policies
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE deal_status AS ENUM ('pending', 'sealing', 'confirmed', 'voided');
CREATE TYPE actor_type AS ENUM ('creator', 'recipient', 'system');
CREATE TYPE audit_event_type AS ENUM (
  'deal_created',
  'deal_viewed', 
  'deal_signed',
  'deal_confirmed',
  'deal_voided',
  'email_sent',
  'pdf_generated'
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals table (core table)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_id TEXT UNIQUE NOT NULL,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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

-- Access tokens table (for secure recipient access)
CREATE TABLE access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table (append-only event log)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  event_type audit_event_type NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_type actor_type NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_deals_public_id ON deals(public_id);
CREATE INDEX idx_deals_creator_id ON deals(creator_id);
CREATE INDEX idx_deals_recipient_id ON deals(recipient_id);
CREATE INDEX idx_deals_recipient_email ON deals(recipient_email);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX idx_access_tokens_token ON access_tokens(token);
CREATE INDEX idx_access_tokens_deal_id ON access_tokens(deal_id);
CREATE INDEX idx_audit_log_deal_id ON audit_log(deal_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for deals
CREATE POLICY "Creators can view their own deals"
  ON deals FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Recipients can view deals assigned to them"
  ON deals FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Authenticated users can create deals"
  ON deals FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own deals"
  ON deals FOR UPDATE
  USING (auth.uid() = creator_id);

-- RLS Policies for access_tokens
CREATE POLICY "Creators can view their deal tokens"
  ON access_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = access_tokens.deal_id 
      AND deals.creator_id = auth.uid()
    )
  );

CREATE POLICY "Creators can create tokens for their deals"
  ON access_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = access_tokens.deal_id 
      AND deals.creator_id = auth.uid()
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs for their deals"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = audit_log.deal_id 
      AND (deals.creator_id = auth.uid() OR deals.recipient_id = auth.uid())
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to retroactively sync deals for new users
CREATE OR REPLACE FUNCTION sync_deals_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Find any deals where this user's email is the recipient
  -- and link them to the new user
  UPDATE deals
  SET recipient_id = NEW.id
  WHERE recipient_email = NEW.email
    AND recipient_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync deals when profile is created
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_deals_for_new_user();

-- Function to confirm deal with token validation
CREATE OR REPLACE FUNCTION confirm_deal_with_token(
  p_deal_id UUID,
  p_token TEXT,
  p_signature_data TEXT,
  p_deal_seal TEXT,
  p_recipient_email TEXT DEFAULT NULL,
  p_recipient_id UUID DEFAULT NULL
)
RETURNS deals AS $$
DECLARE
  v_deal deals;
  v_token_valid BOOLEAN;
BEGIN
  -- Validate the token
  SELECT EXISTS(
    SELECT 1 FROM access_tokens
    WHERE deal_id = p_deal_id
      AND token = p_token
      AND expires_at > NOW()
      AND used_at IS NULL
  ) INTO v_token_valid;

  IF NOT v_token_valid THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;

  -- Mark token as used
  UPDATE access_tokens
  SET used_at = NOW()
  WHERE deal_id = p_deal_id AND token = p_token;

  -- Update the deal
  UPDATE deals
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
  INSERT INTO audit_log (deal_id, event_type, actor_id, actor_type, metadata)
  VALUES (p_deal_id, 'deal_confirmed', p_recipient_id, 'recipient', jsonb_build_object(
    'has_seal', p_deal_seal IS NOT NULL,
    'has_email', p_recipient_email IS NOT NULL
  ));

  RETURN v_deal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deal by public ID (for public access)
CREATE OR REPLACE FUNCTION get_deal_by_public_id(p_public_id TEXT)
RETURNS deals AS $$
DECLARE
  v_deal deals;
BEGIN
  SELECT * INTO v_deal
  FROM deals
  WHERE public_id = p_public_id;
  
  RETURN v_deal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate access token
CREATE OR REPLACE FUNCTION validate_access_token(p_deal_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM access_tokens
    WHERE deal_id = p_deal_id
      AND token = p_token
      AND expires_at > NOW()
      AND used_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions on functions to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_deal_by_public_id(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION validate_access_token(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION confirm_deal_with_token(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
