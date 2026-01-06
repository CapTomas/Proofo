-- Proofo Post-Schema Setup
-- Run this AFTER schema.sql completes successfully
-- Adds demo data that requires committed enum values

-- Add email_verified audit log entry (requires enum value to be committed)
INSERT INTO public.audit_log (deal_id, event_type, actor_id, actor_type, metadata, created_at)
SELECT
  '00000000-0000-0000-0000-000000000003'::uuid,
  'email_verified',
  '00000000-0000-0000-0000-000000000002'::uuid,
  'recipient',
  '{"email": "jane@proofo.app"}'::jsonb,
  '2025-12-15 14:25:00+00'::timestamptz
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_log
  WHERE deal_id = '00000000-0000-0000-0000-000000000003'
  AND event_type = 'email_verified'
);
