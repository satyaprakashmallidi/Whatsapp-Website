# Database Tables Summary

## 📊 All Tables Created

### 1. **User_details** (One row per user)
- Stores: User email, contacts, campaigns, templates, reports (JSONB)
- Auto-created: On signup/login by AuthContext

### 2. **Chats** (One row per user)
- Stores: Chat conversations (JSONB array)
- Auto-created: By database trigger when User_details is created

### 3. **Audiences** (Multiple rows per user)
- Stores: Each audience as a separate row
- Columns: user_email, audience_name, description, audience_list (JSONB)
- Created: When user creates an audience

### 4. **Campaigns** ⭐ NEW
- Stores: Each campaign as a separate row
- Columns: user_email, campaign_name, description, message_type, audience, message, **status (Draft/Sent)**, sent_date, recipients, delivered, read
- Created: When user creates a campaign

### 5. **Templates** ⭐ NEW
- Stores: Each template as a separate row
- Columns: user_email, template_name, template_type, content
- Created: When user creates a template

---

## 🎯 Campaign Table Details

```sql
CREATE TABLE "Campaigns" (
  user_email TEXT,           -- Owner
  campaign_name TEXT,        -- Name
  description TEXT,          -- Description
  message_type TEXT,         -- text/image/carousel
  audience TEXT,             -- Audience name
  audience_id INTEGER,       -- Link to audience
  message TEXT,              -- Message content
  status TEXT DEFAULT 'Draft', -- Draft or Sent
  sent_date TIMESTAMP,       -- When sent
  recipients INTEGER,        -- How many
  delivered INTEGER,         -- Delivery count
  read INTEGER              -- Read count
)
```

**Status Values:**
- `'Draft'` - Not sent yet
- `'Sent'` - Already sent

---

## 🎯 Template Table Details

```sql
CREATE TABLE "Templates" (
  user_email TEXT,          -- Owner
  template_name TEXT,       -- Unique name per user
  template_type TEXT,       -- text/image/carousel
  content TEXT             -- Template content
)
```

**Unique Constraint:** Users can't create two templates with the same name

---

## ⚡ Quick Setup

### Run This SQL File:
```
complete_database_setup.sql
```

This creates ALL tables with:
- ✅ Proper RLS policies
- ✅ Auto-update timestamps
- ✅ Indexes for fast queries
- ✅ Triggers for auto-creation
- ✅ Duplicate prevention

---

## 📁 Files You Need

| File | What It Does |
|------|--------------|
| `complete_database_setup.sql` | ⭐ Creates all 5 tables (run this!) |
| `create_campaigns_table.sql` | Only Campaigns table |
| `create_templates_table.sql` | Only Templates table |
| `DATABASE_SETUP_COMPLETE.md` | Full documentation |

---

## ✅ Checklist

- [ ] Run `complete_database_setup.sql` in Supabase
- [ ] Sign up in your app
- [ ] Check `User_details` table has your email
- [ ] Check `Chats` table has your email (auto-created)
- [ ] Add a test contact
- [ ] Create a test audience (new row in `Audiences`)
- [ ] Create a test campaign (new row in `Campaigns`)
- [ ] Create a test template (new row in `Templates`)
- [ ] Verify all data in Supabase Table Editor

---

## 🔍 How to Verify

After running the SQL:

1. **Supabase Dashboard** → **Table Editor**
2. You should see **5 tables**:
   - User_details ✅
   - Chats ✅
   - Audiences ✅
   - Campaigns ✅ NEW
   - Templates ✅ NEW

3. **Sign up** in your app
4. **Refresh** Table Editor
5. See your email in `User_details` and `Chats`
