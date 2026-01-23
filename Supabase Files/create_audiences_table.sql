-- Create Audiences table
-- Note: This table stores individual audience records, not one row per user
-- Each user can have multiple audience records
CREATE TABLE IF NOT EXISTS "Audiences" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  audience_name TEXT NOT NULL,
  description TEXT,
  audience_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_audiences_user_email ON "Audiences"(user_email);

-- Create composite index for unique audience names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_audiences_user_email_name 
  ON "Audiences"(user_email, audience_name);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_audiences_updated_at ON "Audiences";
CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON "Audiences"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "Audiences" ENABLE ROW LEVEL SECURITY;

-- Create policies: Users can only read/write their own audiences
CREATE POLICY "Users can view their own audiences" 
  ON "Audiences" 
  FOR SELECT 
  USING (auth.email() = user_email);

CREATE POLICY "Users can insert their own audiences" 
  ON "Audiences" 
  FOR INSERT 
  WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can update their own audiences" 
  ON "Audiences" 
  FOR UPDATE 
  USING (auth.email() = user_email);

CREATE POLICY "Users can delete their own audiences" 
  ON "Audiences" 
  FOR DELETE 
  USING (auth.email() = user_email);
