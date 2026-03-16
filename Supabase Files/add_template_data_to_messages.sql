-- ================================================================
-- Add template_data support to messages table
-- Run this in the Supabase SQL Editor
-- ================================================================

-- 1. Add message_type column (default 'text' for regular messages, 'template' for campaign templates)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';

-- 2. Add template_data column to store structured template info (header, body, footer, buttons)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS template_data jsonb DEFAULT NULL;

-- Example of what template_data looks like:
-- {
--   "header": "Important Update Regarding Your Request",
--   "body": "Dear Satya, This is a test notification...",
--   "footer": "Thank you for choosing our service.",
--   "buttons": [{"type": "QUICK_REPLY", "text": "Acknowledge"}, {"type": "URL", "text": "Visit Us", "url": "https://..."}],
--   "template_name": "my_template_name"
-- }
