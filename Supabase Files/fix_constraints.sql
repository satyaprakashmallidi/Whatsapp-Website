-- Run this in your Supabase SQL Editor to safely fix the constraint issue

-- 1. Drop the old uniquely named constraint (since we don't know the exact name, we drop by columns)
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'template_followups'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 4; -- (user_email, source_template_name, button_payload, card_index)
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE template_followups DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. Ensure the required columns exist
ALTER TABLE template_followups
  ADD COLUMN IF NOT EXISTS template_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT NULL;

ALTER TABLE template_followups
  ALTER COLUMN button_payload DROP NOT NULL,
  ALTER COLUMN button_title DROP NOT NULL,
  ALTER COLUMN followup_template_name DROP NOT NULL;

-- 3. Create the correct unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_followups_carousel
  ON template_followups (user_email, source_template_name)
  WHERE template_type = 'carousel';

CREATE UNIQUE INDEX IF NOT EXISTS idx_followups_standard
  ON template_followups (user_email, source_template_name, button_payload)
  WHERE template_type = 'standard';
