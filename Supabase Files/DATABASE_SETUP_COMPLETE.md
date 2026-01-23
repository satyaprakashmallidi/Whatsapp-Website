# Complete Database Setup Guide

## 🚀 Quick Setup

### Run the Complete Setup (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy the entire `complete_database_setup.sql` file
4. Paste and click **Run**

This creates **ALL 5 tables** at once with proper RLS policies and triggers.

---

## 📊 Database Structure

### Overview

Your database now has **5 main tables**:

| Table | Purpose | Structure |
|-------|---------|-----------|
| `User_details` | Main user data storage | One row per user |
| `Chats` | WhatsApp-style conversations | One row per user |
| `Audiences` | Audience segments | Multiple rows per user |
| `Campaigns` | Campaign records | Multiple rows per user |
| `Templates` | Message templates | Multiple rows per user |

---

## 📋 Detailed Table Structures

### 1. User_details Table

**Purpose**: Stores user profile and aggregated data

**Columns**:
```sql
- id (UUID, Primary Key)
- email (TEXT, Unique) - User's email
- total_contacts (INTEGER) - Count of contacts
- campaigns (INTEGER) - Count of campaigns
- templates (INTEGER) - Count of templates
- messages_sent (INTEGER) - Total messages sent
- contacts (JSONB) - Array of contact objects
- audiences (JSONB) - Legacy audience storage
- campaigns_data (JSONB) - Legacy campaign storage
- templates_data (JSONB) - Legacy template storage
- reports (JSONB) - Array of report objects
- created_at, updated_at (TIMESTAMP)
```

**Auto-created**: When user signs up or logs in (via AuthContext)

**Example Row**:
```json
{
  "email": "user@example.com",
  "total_contacts": 5,
  "campaigns": 3,
  "templates": 2,
  "messages_sent": 150,
  "contacts": [...],
  "reports": [...]
}
```

---

### 2. Chats Table

**Purpose**: Store WhatsApp-style chat conversations

**Columns**:
```sql
- id (UUID, Primary Key)
- user_email (TEXT, Unique) - User's email
- chats (JSONB) - Array of chat conversation objects
- created_at, updated_at (TIMESTAMP)
```

**Auto-created**: Via database trigger when User_details row is inserted

**Example Row**:
```json
{
  "user_email": "user@example.com",
  "chats": [
    {
      "contactId": 1,
      "contactName": "Rajesh Kumar",
      "messages": [
        {"type": "sent", "text": "Hello!", "timestamp": "..."},
        {"type": "received", "text": "Hi!", "timestamp": "..."}
      ]
    }
  ]
}
```

---

### 3. Audiences Table

**Purpose**: Store audience segments (each audience = separate row)

**Columns**:
```sql
- id (UUID, Primary Key)
- user_email (TEXT) - Owner's email
- audience_name (TEXT) - Name of audience
- description (TEXT) - Description
- audience_list (JSONB) - Array of contact IDs
- created_at, updated_at (TIMESTAMP)
```

**Unique Constraint**: `(user_email, audience_name)` - No duplicate names per user

**Example Rows**:
```json
// User creates 2 audiences = 2 rows
Row 1: {
  "user_email": "user@example.com",
  "audience_name": "City Center Residents",
  "description": "Residents in city center",
  "audience_list": [1, 4, 7]
}

Row 2: {
  "user_email": "user@example.com",
  "audience_name": "Business Owners",
  "description": "Local business owners",
  "audience_list": [2, 5, 8]
}
```

---

### 4. Campaigns Table ⭐ NEW

**Purpose**: Store campaign records (each campaign = separate row)

**Columns**:
```sql
- id (UUID, Primary Key)
- user_email (TEXT) - Owner's email
- campaign_name (TEXT) - Campaign name
- description (TEXT) - Campaign description
- message_type (TEXT) - 'text', 'image', 'carousel'
- audience (TEXT) - Audience name
- audience_id (INTEGER) - Audience ID reference
- message (TEXT) - Message content
- status (TEXT) - 'Draft' or 'Sent'
- sent_date (TIMESTAMP) - When campaign was sent
- recipients (INTEGER) - Number of recipients
- delivered (INTEGER) - Number delivered
- read (INTEGER) - Number read
- created_at, updated_at (TIMESTAMP)
```

**Indexes**:
- `user_email` - Fast lookup by user
- `status` - Filter by draft/sent
- `(user_email, status)` - Combined filter

**Example Rows**:
```json
// Draft Campaign
{
  "user_email": "user@example.com",
  "campaign_name": "January Update",
  "description": "Monthly newsletter",
  "message_type": "text",
  "audience": "City Center Residents",
  "audience_id": 1,
  "message": "Hello everyone! Here's this month's update...",
  "status": "Draft",
  "sent_date": null,
  "recipients": 0
}

// Sent Campaign
{
  "user_email": "user@example.com",
  "campaign_name": "Tax Reminder",
  "status": "Sent",
  "sent_date": "2024-01-20",
  "recipients": 150,
  "delivered": 148,
  "read": 120
}
```

---

### 5. Templates Table ⭐ NEW

**Purpose**: Store reusable message templates (each template = separate row)

**Columns**:
```sql
- id (UUID, Primary Key)
- user_email (TEXT) - Owner's email
- template_name (TEXT) - Template name
- template_type (TEXT) - 'text', 'image', 'carousel'
- content (TEXT) - Template content/message
- created_at, updated_at (TIMESTAMP)
```

**Unique Constraint**: `(user_email, template_name)` - No duplicate names per user

**Example Rows**:
```json
{
  "user_email": "user@example.com",
  "template_name": "Weekly Update",
  "template_type": "text",
  "content": "Hello {{name}}! Here's your weekly update: {{message}}"
}

{
  "user_email": "user@example.com",
  "template_name": "Event Announcement",
  "template_type": "image",
  "content": "Join us for {{event_name}} on {{date}}!"
}
```

---

## 🔒 Security (Row Level Security)

All tables have RLS enabled:

### User_details & Chats
- Users can only access their own data (by email)

### Audiences, Campaigns, Templates
- Users can only see/edit their own records (by user_email)

### Policies Created
- `SELECT` - View own data
- `INSERT` - Create own data
- `UPDATE` - Modify own data
- `DELETE` - Remove own data

---

## 🔄 Automatic Row Creation

### When User Signs Up:

```
User fills signup form
    ↓
Supabase Auth creates auth user
    ↓
AuthContext.ensureUserRecord()
    ↓
Creates User_details row
    ↓
Database trigger fires
    ↓
Creates Chats row automatically
    ↓
User redirected to dashboard
```

### What Gets Auto-Created:
- ✅ **User_details** - Created by AuthContext on signup/login
- ✅ **Chats** - Created by database trigger
- ❌ **Audiences** - Created manually by user
- ❌ **Campaigns** - Created manually by user
- ❌ **Templates** - Created manually by user

---

## 🚫 Duplicate Prevention

### User_details
- Unique constraint on `email`
- `ensureUserRecord()` checks before inserting

### Chats
- Unique constraint on `user_email`
- `ON CONFLICT DO NOTHING` in trigger

### Audiences
- Unique constraint on `(user_email, audience_name)`
- Can't create two audiences with same name

### Campaigns
- No unique constraint (users can have campaigns with same name)
- Each campaign is independent

### Templates
- Unique constraint on `(user_email, template_name)`
- Can't create two templates with same name

---

## 📁 SQL Files Available

| File | Purpose |
|------|---------|
| ⭐ `complete_database_setup.sql` | **RUN THIS** - All 5 tables at once |
| `create_campaigns_table.sql` | Campaigns table only |
| `create_templates_table.sql` | Templates table only |

---

## 🧪 Testing Your Setup

### Step 1: Create Tables
Run `complete_database_setup.sql` in Supabase

### Step 2: Sign Up
Create a new account in your app

### Step 3: Check Tables
Go to Supabase **Table Editor** and verify:
- ✅ `User_details` has your email
- ✅ `Chats` has your email (auto-created)

### Step 4: Add Data
- Add contacts → Saved to `User_details.contacts`
- Create audience → New row in `Audiences` table
- Create campaign → New row in `Campaigns` table
- Create template → New row in `Templates` table

### Step 5: View in Supabase
Check each table to see your data stored properly

---

## 📊 Query Examples

### Get all campaigns for a user
```sql
SELECT * FROM "Campaigns" 
WHERE user_email = 'user@example.com'
ORDER BY created_at DESC;
```

### Get only draft campaigns
```sql
SELECT * FROM "Campaigns" 
WHERE user_email = 'user@example.com' 
AND status = 'Draft';
```

### Get all templates for a user
```sql
SELECT * FROM "Templates" 
WHERE user_email = 'user@example.com'
ORDER BY template_name;
```

### Count campaigns by status
```sql
SELECT status, COUNT(*) 
FROM "Campaigns" 
WHERE user_email = 'user@example.com'
GROUP BY status;
```

---

## 🔧 Maintenance

### Reset All Data (Development Only)
```sql
-- WARNING: This deletes everything!
DELETE FROM "Templates" WHERE user_email = 'your@email.com';
DELETE FROM "Campaigns" WHERE user_email = 'your@email.com';
DELETE FROM "Audiences" WHERE user_email = 'your@email.com';
DELETE FROM "Chats" WHERE user_email = 'your@email.com';
DELETE FROM "User_details" WHERE email = 'your@email.com';
```

### Re-run Setup
The SQL script is **idempotent** - you can run it multiple times safely. It uses:
- `CREATE TABLE IF NOT EXISTS`
- `DROP TRIGGER IF EXISTS`
- `DROP POLICY IF EXISTS`

---

## ✅ Next Steps

1. ✅ Run `complete_database_setup.sql`
2. ✅ Sign up in your app
3. ✅ Add test contacts
4. ✅ Create test audience
5. ✅ Create test campaign (draft)
6. ✅ Create test template
7. ✅ Check all tables in Supabase
8. ✅ Deploy to production

---

## 🆘 Troubleshooting

### Issue: Table already exists error
**Solution**: The script handles this with `IF NOT EXISTS`

### Issue: Trigger already exists error
**Solution**: Fixed with `DROP TRIGGER IF EXISTS`

### Issue: Can't insert data
**Solution**: Check RLS policies - run the complete script again

### Issue: Duplicate key error
**Solution**: You're trying to create duplicate audience/template name
