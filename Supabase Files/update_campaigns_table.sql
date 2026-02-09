
-- Add template fields to Campaigns table
ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS template_language TEXT DEFAULT 'en_US';
