-- ============================================
-- COMPLETE DATABASE SETUP - ALL TABLES
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE UPDATE FUNCTION (shared by all tables)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. USER DETAILS TABLE
-- Main user data storage
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_user_details_email ON "User_details"(email);

DROP TRIGGER IF EXISTS update_user_details_updated_at ON "User_details";
CREATE TRIGGER update_user_details_updated_at
  BEFORE UPDATE ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "User_details" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can insert their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can update their own data" ON "User_details";
DROP POLICY IF EXISTS "Users can delete their own data" ON "User_details";

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

-- ============================================
-- 3. CHATS TABLE
-- Stores chat conversations
-- ============================================
CREATE TABLE IF NOT EXISTS "Chats" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  chats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_email ON "Chats"(user_email);

DROP TRIGGER IF EXISTS update_chats_updated_at ON "Chats";
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON "Chats"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "Chats" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chats" ON "Chats";
DROP POLICY IF EXISTS "Users can insert their own chats" ON "Chats";
DROP POLICY IF EXISTS "Users can update their own chats" ON "Chats";
DROP POLICY IF EXISTS "Users can delete their own chats" ON "Chats";

CREATE POLICY "Users can view their own chats" 
  ON "Chats" 
  FOR SELECT 
  USING (auth.email() = user_email);

CREATE POLICY "Users can insert their own chats" 
  ON "Chats" 
  FOR INSERT 
  WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can update their own chats" 
  ON "Chats" 
  FOR UPDATE 
  USING (auth.email() = user_email);

CREATE POLICY "Users can delete their own chats" 
  ON "Chats" 
  FOR DELETE 
  USING (auth.email() = user_email);

-- ============================================
-- 4. AUDIENCES TABLE
-- Stores individual audience records
-- ============================================
CREATE TABLE IF NOT EXISTS "Audiences" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  audience_name TEXT NOT NULL,
  description TEXT,
  audience_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiences_user_email ON "Audiences"(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audiences_user_email_name 
  ON "Audiences"(user_email, audience_name);

DROP TRIGGER IF EXISTS update_audiences_updated_at ON "Audiences";
CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON "Audiences"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "Audiences" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audiences" ON "Audiences";
DROP POLICY IF EXISTS "Users can insert their own audiences" ON "Audiences";
DROP POLICY IF EXISTS "Users can update their own audiences" ON "Audiences";
DROP POLICY IF EXISTS "Users can delete their own audiences" ON "Audiences";

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

-- ============================================
-- 5. CAMPAIGNS TABLE
-- Stores individual campaign records
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

CREATE INDEX IF NOT EXISTS idx_campaigns_user_email ON "Campaigns"(user_email);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON "Campaigns"(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_email_status ON "Campaigns"(user_email, status);

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON "Campaigns";
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON "Campaigns"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "Campaigns" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can update their own campaigns" ON "Campaigns";
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON "Campaigns";

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

-- ============================================
-- 6. TEMPLATES TABLE
-- Stores individual template records
-- ============================================
CREATE TABLE IF NOT EXISTS "Templates" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_email ON "Templates"(user_email);
CREATE INDEX IF NOT EXISTS idx_templates_type ON "Templates"(template_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_user_email_name 
  ON "Templates"(user_email, template_name);

DROP TRIGGER IF EXISTS update_templates_updated_at ON "Templates";
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON "Templates"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE "Templates" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can insert their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can update their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can delete their own templates" ON "Templates";

CREATE POLICY "Users can view their own templates" 
  ON "Templates" 
  FOR SELECT 
  USING (auth.email() = user_email);

CREATE POLICY "Users can insert their own templates" 
  ON "Templates" 
  FOR INSERT 
  WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can update their own templates" 
  ON "Templates" 
  FOR UPDATE 
  USING (auth.email() = user_email);

CREATE POLICY "Users can delete their own templates" 
  ON "Templates" 
  FOR DELETE 
  USING (auth.email() = user_email);

-- ============================================
-- 7. AUTO-CREATE CHATS RECORD FOR NEW USERS
-- ============================================
CREATE OR REPLACE FUNCTION create_chat_record_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "Chats" (user_email, chats)
  VALUES (NEW.email, '[]'::jsonb)
  ON CONFLICT (user_email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_chats ON "User_details";
CREATE TRIGGER auto_create_chats
  AFTER INSERT ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_record_for_user();

-- ============================================
-- 8. POPULATE CHATS FOR EXISTING USERS
-- ============================================
INSERT INTO "Chats" (user_email, chats)
SELECT email, '[]'::jsonb
FROM "User_details"
WHERE email NOT IN (SELECT user_email FROM "Chats")
ON CONFLICT (user_email) DO NOTHING;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Tables created:
-- 1. User_details - Main user data (auto-created on signup/login)
-- 2. Chats - Chat conversations (auto-created via trigger)
-- 3. Audiences - Individual audience records (created by users)
-- 4. Campaigns - Individual campaign records (created by users)
-- 5. Templates - Individual template records (created by users)
--
-- All tables have RLS enabled for security
-- No duplicate rows will be created
-- ============================================
