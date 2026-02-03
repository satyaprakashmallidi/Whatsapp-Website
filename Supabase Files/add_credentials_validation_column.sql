-- Add credentials validation status column to User_details table

-- Add column to track if WhatsApp credentials are validated
ALTER TABLE public."User_details"
ADD COLUMN IF NOT EXISTS whatsapp_credentials_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credentials_last_validated_at TIMESTAMP WITH TIME ZONE NULL;

-- Add comments for documentation
COMMENT ON COLUMN public."User_details".whatsapp_credentials_validated IS 'Whether WhatsApp API credentials have been successfully validated';
COMMENT ON COLUMN public."User_details".credentials_last_validated_at IS 'Timestamp of last successful credentials validation';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_details_credentials_validated 
ON public."User_details" USING btree (whatsapp_credentials_validated);

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added credentials validation tracking columns';
END $$;
