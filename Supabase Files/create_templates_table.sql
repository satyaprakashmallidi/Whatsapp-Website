-- ============================================
-- TEMPLATES TABLE
-- Stores individual template records
-- Each template is a separate row
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_email ON "Templates"(user_email);
CREATE INDEX IF NOT EXISTS idx_templates_type ON "Templates"(template_type);

-- Create unique index to prevent duplicate template names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_user_email_name 
  ON "Templates"(user_email, template_name);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON "Templates";
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON "Templates"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "Templates" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can insert their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can update their own templates" ON "Templates";
DROP POLICY IF EXISTS "Users can delete their own templates" ON "Templates";

-- Create policies: Users can only read/write their own templates
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
