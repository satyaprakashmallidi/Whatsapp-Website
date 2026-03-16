-- ================================================================
-- Chat Messages System — Run this in Supabase SQL Editor
-- ================================================================

-- 1. conversations table: one row per contact per business user
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  contact_phone text NOT NULL,
  contact_name text,
  last_message text,
  last_message_time timestamptz DEFAULT now(),
  unread_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_email, contact_phone)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(contact_phone);

-- 2. messages table: individual messages per conversation
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  contact_phone text NOT NULL,
  message text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status text DEFAULT 'sent',
  wamid text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_email ON messages(user_email);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(contact_phone);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 3. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- 4. RLS Policies for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT USING (auth.email() = user_email);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE USING (auth.email() = user_email);

-- 5. RLS Policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT USING (auth.email() = user_email);

CREATE POLICY "Users can insert own messages"
  ON messages FOR INSERT WITH CHECK (auth.email() = user_email);

-- 6. Service role bypass (for webhook and edge functions using service key)
-- The service role bypasses RLS automatically — no extra policy needed.
