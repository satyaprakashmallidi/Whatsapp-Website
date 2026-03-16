-- ================================================================
-- Add External Webhook Integration columns to User_details table
-- Run this in the Supabase SQL Editor
-- ================================================================

ALTER TABLE "User_details"
  ADD COLUMN IF NOT EXISTS external_webhook_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_webhook_active boolean DEFAULT false;

-- Add a comment explaining the columns
COMMENT ON COLUMN "User_details".external_webhook_url IS 'URL for external webhook integration (e.g., n8n) to forward inbound WhatsApp messages';
COMMENT ON COLUMN "User_details".external_webhook_active IS 'Whether the external webhook integration is currently active';
