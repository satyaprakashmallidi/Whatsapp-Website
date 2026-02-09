-- Add header_media_id column to Campaigns table
-- This stores WhatsApp Media ID for templates with image headers

ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS header_media_id TEXT;

COMMENT ON COLUMN "Campaigns".header_media_id IS 'WhatsApp Media ID for image header (from media upload API)';
