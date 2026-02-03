-- Update Templates table to include WhatsApp template fields

-- Add new columns for WhatsApp template management
ALTER TABLE public."Templates"
ADD COLUMN IF NOT EXISTS category text DEFAULT 'UTILITY',
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en_US',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS meta_template_id text NULL,
ADD COLUMN IF NOT EXISTS body_text text NULL;

-- Update existing content column to allow null (body_text will be the new primary content field)
ALTER TABLE public."Templates" 
ALTER COLUMN content DROP NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public."Templates".category IS 'WhatsApp template category: UTILITY or MARKETING';
COMMENT ON COLUMN public."Templates".language IS 'Template language code (e.g., en_US)';
COMMENT ON COLUMN public."Templates".status IS 'Template status: pending, approved, or failed';
COMMENT ON COLUMN public."Templates".meta_template_id IS 'Template ID returned from Meta API';
COMMENT ON COLUMN public."Templates".body_text IS 'Template body text with parameters';

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_templates_status ON public."Templates" USING btree (status);

-- Enable Row Level Security (if not already enabled)
ALTER TABLE public."Templates" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own templates" ON public."Templates";
DROP POLICY IF EXISTS "Users can insert their own templates" ON public."Templates";
DROP POLICY IF EXISTS "Users can update their own templates" ON public."Templates";
DROP POLICY IF EXISTS "Users can delete their own templates" ON public."Templates";

-- Create RLS policies for Templates table
CREATE POLICY "Users can view their own templates"
ON public."Templates"
FOR SELECT
USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own templates"
ON public."Templates"
FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own templates"
ON public."Templates"
FOR UPDATE
USING (auth.jwt() ->> 'email' = user_email)
WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own templates"
ON public."Templates"
FOR DELETE
USING (auth.jwt() ->> 'email' = user_email);

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Templates table updated successfully with WhatsApp fields';
END $$;
