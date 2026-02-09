-- Add template_structure column to Campaigns table
-- This will store the parsed template structure from WhatsApp API

ALTER TABLE "Campaigns" 
  ADD COLUMN IF NOT EXISTS template_structure JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "Campaigns".template_structure IS 'Stores parsed template structure from WhatsApp API including headers and body parameters';

SELECT 'Successfully added template_structure column to Campaigns table' as status;
