# WhatsApp Business API Token Setup

## Overview

This feature allows users to configure their WhatsApp Business API credentials directly in the application through a profile settings interface.

## What Was Added

### 1. Profile Settings Modal (`ProfileSettings.jsx`)
- New component that displays a modal for user profile settings
- Contains fields for WhatsApp Business API credentials:
  - **Meta Access Token** - Your Meta/Facebook access token
  - **Meta Phone Number ID** - Your WhatsApp phone number identifier
  - **Meta Business Account ID** - Your business account identifier
- Features password-style fields with show/hide toggle for security
- Includes helpful links to Meta Developer documentation

### 2. Updated Sidebar Component
- The user profile section (previously showing name and email) is now a clickable button
- Avatar badge changed to yellow (`#FFC107`) for better visibility
- Clicking the profile button opens the Profile Settings modal
- Works in both expanded and collapsed sidebar states
- Shows a settings gear icon to indicate it's clickable

### 3. Database Schema Updates
- Added three new columns to the `User_details` table:
  - `meta_access_token` (TEXT)
  - `meta_phone_number_id` (TEXT)
  - `meta_business_account_id` (TEXT)

## Setup Instructions

### Step 1: Update Database Schema

Run the SQL migration in your Supabase SQL Editor:

```sql
-- Located in: Supabase Files/add_whatsapp_tokens.sql
ALTER TABLE "User_details" 
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS meta_business_account_id TEXT;
```

### Step 2: Get Your WhatsApp API Credentials

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Navigate to your App Dashboard
3. Select **WhatsApp** from the left menu
4. Click on **API Setup**
5. Copy the following credentials:
   - **Temporary Access Token** (or create a permanent one)
   - **Phone Number ID** (found under "From")
   - **WhatsApp Business Account ID** (found in App Settings)

### Step 3: Configure in the Application

1. Sign in to your Campaign Hub account
2. Click on your profile button in the sidebar (bottom section)
3. The Profile Settings modal will open
4. Fill in the three WhatsApp API fields
5. Click **Save Settings**

## How to Use

### Accessing Profile Settings

**Expanded Sidebar:**
- Click the profile card showing your name and email
- A settings gear icon indicates it's clickable

**Collapsed Sidebar:**
- Click the circular avatar badge with your initial
- The profile settings modal will open

### Security Features

- All token fields are displayed as password fields by default
- Click the eye icon to toggle visibility
- Credentials are stored securely in Supabase

## Future Integration

These credentials will be used for:
- Sending WhatsApp messages through Meta's official Business API
- Automating campaign delivery
- Real-time message status tracking
- Two-way communication features

## Files Modified/Created

**New Files:**
- `/src/components/ProfileSettings.jsx` - Profile settings modal component
- `/Supabase Files/add_whatsapp_tokens.sql` - Database migration
- `/Supabase Files/WHATSAPP_TOKEN_SETUP.md` - This documentation

**Modified Files:**
- `/src/components/Sidebar.jsx` - Updated to show clickable profile button and settings modal

## Technical Details

### State Management
- Settings are fetched from `User_details` table on modal open
- Changes are saved directly to Supabase using the `supabase` client
- No local caching - always fetches fresh data

### UI/UX Improvements
- Yellow avatar badge for better brand consistency
- Smooth modal animations
- Responsive design for all screen sizes
- Clear visual feedback during save operations
- Helpful documentation links inline

## Troubleshooting

**Modal not opening?**
- Check browser console for errors
- Ensure ProfileSettings component is imported in Sidebar

**Can't save settings?**
- Verify database migration was run successfully
- Check Supabase RLS policies allow user to update their own record
- Look for error messages in browser console

**Fields not loading?**
- Ensure user is authenticated
- Check that the email column in User_details matches the logged-in user
