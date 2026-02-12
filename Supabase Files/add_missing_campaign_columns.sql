-- Add missing columns to Campaigns table
-- This supports carousel templates and tracks delivery failures

-- 1. Add card_media_ids for carousel support
ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS card_media_ids JSONB DEFAULT '{}'::jsonb;

-- 2. Add failed column for better stats tracking
ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS failed INTEGER DEFAULT 0;

-- 3. Ensure audience_id is UUID (fixes type mismatches)
DO $$ 
BEGIN
    -- Only attempt conversion if it's not already a UUID
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'Campaigns' AND column_name = 'audience_id') != 'uuid' THEN
        
        -- Set invalid formats to NULL before converting to UUID to avoid errors
        UPDATE "Campaigns" 
        SET audience_id = NULL 
        WHERE audience_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

        ALTER TABLE "Campaigns" 
        ALTER COLUMN audience_id TYPE UUID USING audience_id::text::uuid;
        
        RAISE NOTICE 'Converted audience_id to UUID';
    END IF;
END $$;

-- 4. Add template_structure if missing (some older schemas might not have it)
ALTER TABLE "Campaigns" 
ADD COLUMN IF NOT EXISTS template_structure JSONB;

-- Update comments
COMMENT ON COLUMN "Campaigns".card_media_ids IS 'JSON object storing WhatsApp Media IDs for carousel cards { "0": "id1", "1": "id2" }';
COMMENT ON COLUMN "Campaigns".failed IS 'Number of messages that failed to deliver';
COMMENT ON COLUMN "Campaigns".template_structure IS 'Stores parsed template structure from WhatsApp API';

-- Verify results
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Campaigns' 
AND column_name IN ('card_media_ids', 'failed', 'audience_id', 'template_structure');
