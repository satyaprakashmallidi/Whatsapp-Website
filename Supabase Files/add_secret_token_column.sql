-- Add secret_token column (6-char alphanumeric)
ALTER TABLE "User_details" 
ADD COLUMN IF NOT EXISTS secret_token TEXT;

-- Create function to generate 6-char secret token
CREATE OR REPLACE FUNCTION generate_secret_token()
RETURNS TEXT AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with secret token if missing
UPDATE "User_details"
SET secret_token = generate_secret_token()
WHERE secret_token IS NULL;

-- Update the auto-generation trigger function to handle both tokens
CREATE OR REPLACE FUNCTION auto_generate_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate webhook token if missing
  IF NEW.webhook_token IS NULL THEN
    NEW.webhook_token := encode(gen_random_bytes(32), 'hex');
  END IF;

  -- Generate secret token if missing
  IF NEW.secret_token IS NULL THEN
    NEW.secret_token := generate_secret_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_webhook_token ON "User_details";

-- Create new comprehensive trigger
DROP TRIGGER IF EXISTS trigger_auto_user_tokens ON "User_details";
CREATE TRIGGER trigger_auto_user_tokens
  BEFORE INSERT ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_user_tokens();

-- Add comment
COMMENT ON COLUMN "User_details".secret_token IS '6-character unique secret token for user profile';
