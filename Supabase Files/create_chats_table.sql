-- Create Chats table
CREATE TABLE IF NOT EXISTS "Chats" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT UNIQUE NOT NULL,
  chats JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_chats_user_email ON "Chats"(user_email);

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_chats_updated_at ON "Chats";
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON "Chats"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "Chats" ENABLE ROW LEVEL SECURITY;

-- Create policies: Users can only read/write their own chats
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

-- Function to automatically create chat record for new users
CREATE OR REPLACE FUNCTION create_chat_record_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "Chats" (user_email, chats)
  VALUES (NEW.email, '[]'::jsonb)
  ON CONFLICT (user_email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to auto-create chat records
-- Note: This trigger will be created on the User_details table since we control that
CREATE TRIGGER auto_create_chats
  AFTER INSERT ON "User_details"
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_record_for_user();
