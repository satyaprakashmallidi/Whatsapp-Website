-- Add webhook_token column to User_details table
ALTER TABLE "User_details"
ADD COLUMN IF NOT EXISTS webhook_token TEXT UNIQUE;

-- Create function to generate unique webhook token
CREATE OR REPLACE FUNCTION generate_webhook_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update existing users with webhook tokens (if NULL)
UPDATE "User_details"
SET webhook_token = generate_webhook_token()
WHERE webhook_token IS NULL;

-- Create trigger to auto-generate webhook token for new users
CREATE OR REPLACE FUNCTION auto_generate_webhook_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.webhook_token IS NULL THEN
    NEW.webhook_token := generate_webhook_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_webhook_token ON "User_details";
CREATE TRIGGER trigger_auto_webhook_token
  BEFORE INSERT ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_webhook_token();

-- Add comment
COMMENT ON COLUMN "User_details".webhook_token IS 'Unique permanent webhook token for WhatsApp webhook URL';
