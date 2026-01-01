-- Migration: Secure Profile RLS Policy
-- Date: 2025-12-31
-- Description: Restricts profile access to own profile and deal party profiles.
--              Fixes critical security vulnerability allowing public access to all profiles.

-- Drop the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "Anyone can lookup profiles by email" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "View deal party profiles" ON public.profiles;

-- Allow users to view their own profile (basic requirement)
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to view profiles of people they have deals with
-- This covers both creators viewing recipient profiles and vice versa
CREATE POLICY "View deal party profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- View profiles of people you've created deals for
    id IN (SELECT recipient_id FROM deals WHERE creator_id = auth.uid() AND recipient_id IS NOT NULL)
    OR
    -- View profiles of deal creators for deals you're a recipient of
    id IN (SELECT creator_id FROM deals WHERE recipient_id = auth.uid())
    OR
    -- View profiles of deal creators by email match (for recipients not yet registered)
    id IN (
      SELECT creator_id FROM deals
      WHERE recipient_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  )
);

-- Note: Anonymous users accessing public deals still work because:
-- 1. get_deal_by_public_id (SECURITY DEFINER) returns creator_name in the deal data
-- 2. The new checkRecipientEmailForDealAction handles email lookups for anonymous users
-- 3. Profile images can still be fetched via storage URLs (not RLS protected)

-- SECURITY DEFINER function for authenticated profile lookup
-- This allows authenticated users to look up any profile by email when creating deals
-- Security is enforced at the action level (authentication + rate limiting)
CREATE OR REPLACE FUNCTION public.lookup_profile_by_email(p_email TEXT)
RETURNS TABLE(id UUID, name TEXT, avatar_url TEXT) AS $$
BEGIN
  -- Only allow authenticated users to call this function
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT profiles.id, profiles.name, profiles.avatar_url
  FROM public.profiles
  WHERE profiles.email = LOWER(TRIM(p_email));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER function for anonymous email check on public signing page
-- Returns minimal info: whether email is registered and if it's the deal creator
-- Used by checkRecipientEmailForDealAction for anonymous users
CREATE OR REPLACE FUNCTION public.check_email_for_deal(p_public_id TEXT, p_email TEXT)
RETURNS TABLE(is_proofo_user BOOLEAN, is_creator BOOLEAN, user_name TEXT, user_avatar_url TEXT) AS $$
DECLARE
  v_deal_creator_id UUID;
  v_profile_id UUID;
  v_profile_name TEXT;
  v_profile_avatar TEXT;
BEGIN
  -- Get the deal's creator_id
  SELECT creator_id INTO v_deal_creator_id
  FROM public.deals
  WHERE public_id = p_public_id;

  IF v_deal_creator_id IS NULL THEN
    -- Deal not found
    RETURN QUERY SELECT FALSE, FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if email exists in profiles
  SELECT id, name, avatar_url INTO v_profile_id, v_profile_name, v_profile_avatar
  FROM public.profiles
  WHERE email = LOWER(TRIM(p_email));

  IF v_profile_id IS NULL THEN
    -- Email not registered
    RETURN QUERY SELECT FALSE, FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if this is the creator
  IF v_profile_id = v_deal_creator_id THEN
    RETURN QUERY SELECT FALSE, TRUE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- It's a registered Proofo user who is NOT the creator
  RETURN QUERY SELECT TRUE, FALSE, v_profile_name, v_profile_avatar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_deal_by_public_id to include creator's avatar_url
-- This allows anonymous users to see the creator's avatar on public deals
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
    'deal_seal', d.deal_seal,
    'signature_url', d.signature_url,
    'created_at', d.created_at,
    'confirmed_at', d.confirmed_at,
    'voided_at', d.voided_at,
    'viewed_at', d.viewed_at,
    'last_nudged_at', d.last_nudged_at
  ) INTO v_result
  FROM public.deals d
  LEFT JOIN public.profiles p ON d.creator_id = p.id
  WHERE d.public_id = p_public_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY FIX: Update log_audit_event to validate deal exists
-- This prevents fake audit trail entries for non-existent deals
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
  -- SECURITY: Validate that the deal exists before logging
  SELECT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) INTO v_deal_exists;

  IF NOT v_deal_exists THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  INSERT INTO public.audit_log (
    deal_id,
    event_type,
    actor_id,
    actor_type,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    p_deal_id,
    p_event_type,
    p_actor_id,
    p_actor_type,
    p_metadata,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
