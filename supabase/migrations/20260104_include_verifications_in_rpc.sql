-- Migration: Update get_deal_by_public_id to include verifications
-- Date: 2026-01-04
-- Description: Adds a verifications JSON array to the output of get_deal_by_public_id

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
