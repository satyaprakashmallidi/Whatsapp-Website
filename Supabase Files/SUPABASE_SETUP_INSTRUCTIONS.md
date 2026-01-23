# Supabase Setup Instructions

## Step 1: Create the User_details Table

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (cxmolmsrnofplxvsqsdp)
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the entire contents of `supabase_setup.sql` file
6. Click "Run" to execute the SQL

This will create:
- The `User_details` table with all required columns
- Indexes for faster queries
- Row Level Security (RLS) policies so users can only access their own data
- Automatic timestamp updates

## Step 2: Verify the Table

1. Go to "Table Editor" in the left sidebar
2. You should see the `User_details` table
3. Click on it to view the structure

## Table Structure

The `User_details` table includes:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| email | TEXT | User's email (unique) |
| total_contacts | INTEGER | Total number of contacts |
| campaigns | INTEGER | Total number of campaigns |
| templates | INTEGER | Total number of templates |
| messages_sent | INTEGER | Total messages sent |
| contacts | JSONB | Array of contact objects |
| audiences | JSONB | Array of audience objects |
| campaigns_data | JSONB | Array of campaign objects |
| templates_data | JSONB | Array of template objects |
| reports | JSONB | Array of report objects |
| created_at | TIMESTAMP | When the record was created |
| updated_at | TIMESTAMP | When the record was last updated |

## Step 3: Test Your Application

1. Sign up for a new account in your application
2. **The user record is automatically created immediately** when you sign up or log in
3. Check the `User_details` table in Supabase - you should see your record with your email
4. Add contacts, audiences, campaigns, etc.
5. All data will be saved to Supabase in real-time

## Row Level Security (RLS)

The table has RLS enabled, which means:
- Users can only see and modify their own data
- Data is filtered by the authenticated user's email
- This ensures data privacy and security

## What Changed in the Application

- **No more demo data**: All demo/fake data has been removed
- **Automatic user record creation**: User records are created instantly when signing up or logging in
- **Real-time sync**: All changes are instantly saved to Supabase
- **User-specific data**: Each user has their own isolated data
- **Persistent storage**: Data survives browser refresh and is accessible from any device
- **No localStorage**: All data is now stored securely in Supabase

## When is the User Record Created?

The user record in the `User_details` table is automatically created in the following scenarios:

1. **When a user signs up** - Record created immediately after successful registration
2. **When a user logs in** - If record doesn't exist, it's created automatically
3. **On page load** - If a user is already authenticated and no record exists, it's created

This ensures every authenticated user has a database record ready before they perform any actions.

## Troubleshooting

If you encounter any issues:

1. **Check RLS Policies**: Make sure RLS policies are enabled in Supabase
2. **Verify Authentication**: Ensure users are properly authenticated before accessing data
3. **Check Browser Console**: Look for any error messages
4. **View Supabase Logs**: Check the Supabase dashboard for database logs
