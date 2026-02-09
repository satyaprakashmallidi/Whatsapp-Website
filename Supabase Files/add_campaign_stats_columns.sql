-- Add failed column to Campaigns table for tracking failed message count

ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS failed INTEGER DEFAULT 0;

COMMENT ON COLUMN "Campaigns".failed IS 'Number of messages that failed to send';
