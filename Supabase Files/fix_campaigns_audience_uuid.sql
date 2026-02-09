-- Fix Campaigns table to support UUID audience_id and add missing template fields
-- This fixes the "Audience: Unknown" and "Template: N/A" issues

-- STEP 1: Clean up existing campaigns with invalid audience_id values
-- Set numeric audience_id values to NULL since they can't be converted to UUID
UPDATE "Campaigns" 
SET audience_id = NULL 
WHERE audience_id IS NOT NULL 
  AND NOT (audience_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- STEP 2: Change audience_id from INTEGER to UUID
ALTER TABLE "Campaigns" 
  ALTER COLUMN audience_id TYPE UUID USING 
    CASE 
      WHEN audience_id IS NULL THEN NULL
      ELSE audience_id::text::uuid
    END;

-- STEP 3: Add template_name and template_language columns (they may already exist from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Campaigns' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE "Campaigns" ADD COLUMN template_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Campaigns' AND column_name = 'template_language'
  ) THEN
    ALTER TABLE "Campaigns" ADD COLUMN template_language TEXT DEFAULT 'en_US';
  END IF;
END $$;

-- STEP 4: Create index on audience_id for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_audience_id ON "Campaigns"(audience_id);

-- Success message
SELECT 'Migration completed successfully! Old campaigns with invalid audience_id have been set to NULL.' as status;
