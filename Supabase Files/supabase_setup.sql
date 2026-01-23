-- Create User Details table
CREATE TABLE IF NOT EXISTS "User_details" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  total_contacts INTEGER DEFAULT 0,
  campaigns INTEGER DEFAULT 0,
  templates INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  contacts JSONB DEFAULT '[]'::jsonb,
  audiences JSONB DEFAULT '[]'::jsonb,
  campaigns_data JSONB DEFAULT '[]'::jsonb,
  templates_data JSONB DEFAULT '[]'::jsonb,
  reports JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_details_email ON "User_details"(email);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_details_updated_at ON "User_details";
CREATE TRIGGER update_user_details_updated_at
  BEFORE UPDATE ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "User_details" ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read/write their own data
CREATE POLICY "Users can view their own data" 
  ON "User_details" 
  FOR SELECT 
  USING (auth.email() = email);

CREATE POLICY "Users can insert their own data" 
  ON "User_details" 
  FOR INSERT 
  WITH CHECK (auth.email() = email);

CREATE POLICY "Users can update their own data" 
  ON "User_details" 
  FOR UPDATE 
  USING (auth.email() = email);

CREATE POLICY "Users can delete their own data" 
  ON "User_details" 
  FOR DELETE 
  USING (auth.email() = email);
