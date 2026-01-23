-- Populate Chats table for existing users in User_details
-- This ensures no duplicate rows are created

INSERT INTO "Chats" (user_email, chats)
SELECT email, '[]'::jsonb
FROM "User_details"
WHERE email NOT IN (SELECT user_email FROM "Chats")
ON CONFLICT (user_email) DO NOTHING;

-- Note: Audiences table doesn't need population since it stores individual audience records
-- Users will create audiences as they go
