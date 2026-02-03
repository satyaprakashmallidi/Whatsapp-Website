-- Add WhatsApp Meta API token fields to User_details table
-- Run this in your Supabase SQL Editor
-- SECURITY: Ensure RLS (Row Level Security) is enabled before running this!

-- Add token columns
ALTER TABLE "User_details" 
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS meta_business_account_id TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN "User_details".meta_access_token IS 'Meta/Facebook Access Token for WhatsApp Business API - SENSITIVE';
COMMENT ON COLUMN "User_details".meta_phone_number_id IS 'Meta/Facebook Phone Number ID for WhatsApp Business API - SENSITIVE';
COMMENT ON COLUMN "User_details".meta_business_account_id IS 'Meta/Facebook Business Account ID for WhatsApp Business API - SENSITIVE';

-- Verify RLS is enabled (should return 'true')
DO $$
BEGIN
  IF NOT (SELECT rowsecurity FROM pg_tables WHERE tablename = 'User_details') THEN
    RAISE EXCEPTION 'ERROR: Row Level Security is NOT enabled on User_details table! Enable RLS before storing sensitive tokens.';
  ELSE
    RAISE NOTICE 'SUCCESS: Row Level Security is enabled. Tokens will be protected.';
  END IF;
END $$;
