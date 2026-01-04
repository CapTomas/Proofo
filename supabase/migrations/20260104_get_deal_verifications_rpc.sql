-- Migration: Add RPC function to fetch deal verifications bypassing RLS
-- Date: 2026-01-04
-- Description: Creates a SECURITY DEFINER function to fetch deal_verifications
-- records, allowing anonymous recipients to include verifications in the deal seal.
-- This is needed because anonymous users can't SELECT from deal_verifications due to RLS.

CREATE OR REPLACE FUNCTION public.get_deal_verifications(p_deal_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate that the deal exists (basic security check)
  IF NOT EXISTS(SELECT 1 FROM public.deals WHERE id = p_deal_id) THEN
    RETURN NULL;
  END IF;

  -- Get all verifications for this deal
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

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_deal_verifications(UUID) TO authenticated, anon, service_role;
