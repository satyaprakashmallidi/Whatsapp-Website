-- ============================================
-- CAMPAIGNS TABLE
-- Stores individual campaign records
-- Each campaign is a separate row
-- ============================================

CREATE TABLE IF NOT EXISTS "Campaigns" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  description TEXT,
  message_type TEXT,
  audience TEXT,
  audience_id INTEGER,
  message TEXT,
  status TEXT DEFAULT 'Draft',
  sent_date TIMESTAMP WITH TIME ZONE,
  recipients INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_email ON "Campaigns"(user_email);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON "Campaigns"(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_email_status ON "Campaigns"(user_email, status);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON "Campaigns";
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON "Campaigns"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "Campaigns" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can update their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON "Campaigns";

-- Create policies: Users can only read/write their own campaigns
CREATE POLICY "Users can view their own campaigns" 
  ON "Campaigns" 
  FOR SELECT 
  USING (auth.email() = user_email);

CREATE POLICY "Users can insert their own campaigns" 
  ON "Campaigns" 
  FOR INSERT 
  WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can update their own campaigns" 
  ON "Campaigns" 
  FOR UPDATE 
  USING (auth.email() = user_email);

CREATE POLICY "Users can delete their own campaigns" 
  ON "Campaigns" 
  FOR DELETE 
  USING (auth.email() = user_email);
