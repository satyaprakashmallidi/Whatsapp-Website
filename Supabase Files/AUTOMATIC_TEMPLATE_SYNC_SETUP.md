# Automatic Template Synchronization Setup

This guide explains how to set up automatic daily template syncing for all users.

## Overview

Three Edge Functions are available for template management:

1. **`fetch-templates`** - Manually sync templates for logged-in user (called from UI)
2. **`update-template-statuses`** - Manually update statuses for logged-in user (called from UI)
3. **`sync-all-templates-cron`** - Automatically sync templates for ALL users (called by cron service)

## Manual Execution (UI Buttons)

Users can click these buttons in the Templates page:
- **"Sync Templates"** - Fetches all templates from Meta and adds/updates in database
- **"Update Statuses"** - Checks status of each template and updates in database

## Automatic Daily Execution

For automatic daily synchronization, you need to set up a cron service to call the `sync-all-templates-cron` Edge Function.

### Option 1: Vercel Cron Jobs (Recommended)

1. Create a new API route in your project: `pages/api/cron/sync-templates.js`

```javascript
export default async function handler(req, res) {
  // Verify Vercel Cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/sync-all-templates-cron`,
      {
        method: 'POST',
        headers: {
          'X-Cron-Secret': process.env.CRON_SECRET,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

2. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-templates",
      "schedule": "0 2 * * *"
    }
  ]
}
```

3. Set environment variables in Vercel:
   - `CRON_SECRET` - A random secret key (generate with `openssl rand -hex 32`)
   - `VITE_SUPABASE_URL` - Your Supabase URL

4. Set the same `CRON_SECRET` in Supabase Edge Function secrets:
   ```bash
   supabase secrets set CRON_SECRET=your_secret_here
   ```

### Option 2: GitHub Actions

1. Create `.github/workflows/sync-templates.yml`:

```yaml
name: Sync WhatsApp Templates

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Sync Function
        run: |
          curl -X POST \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/sync-all-templates-cron
```

2. Add secrets to GitHub repository:
   - `CRON_SECRET` - A random secret key
   - `SUPABASE_URL` - Your Supabase project URL

### Option 3: External Cron Service (cron-job.org, EasyCron, etc.)

1. Set up a scheduled job to call:
   ```
   POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-all-templates-cron
   Headers:
     X-Cron-Secret: YOUR_SECRET_KEY
     Content-Type: application/json
   ```

2. Schedule: Daily at 2:00 AM (cron: `0 2 * * *`)

## Environment Variables Required

### Supabase Edge Function Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
# Required for cron function authentication
supabase secrets set CRON_SECRET=your_random_secret_key_here

# Required for service role operations (usually already set)
# SUPABASE_SERVICE_ROLE_KEY is automatically available
```

### Application Environment Variables

In your `.env` file:

```env
VITE_SUPABASE_URL=https://cxmolmsrnofplxvsqsdp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
CRON_SECRET=same_secret_as_edge_function
```

## How It Works

1. **Cron service** calls `sync-all-templates-cron` Edge Function daily
2. **Edge Function** authenticates using `X-Cron-Secret` header
3. **Function fetches** all users with Meta credentials from database
4. **For each user**, it:
   - Calls Meta API to get all templates
   - Compares with database
   - Adds new templates
   - Updates existing templates with latest status
5. **Returns summary** of sync operation for all users

## Testing Automatic Sync

To test the cron function manually:

```bash
curl -X POST \
  -H "X-Cron-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT.supabase.co/functions/v1/sync-all-templates-cron
```

Expected response:
```json
{
  "success": true,
  "message": "Processed 5 users",
  "summary": {
    "total_users": 5,
    "successful": 5,
    "failed": 0
  },
  "results": [
    {
      "email": "user@example.com",
      "success": true,
      "synced": 3,
      "new": 1,
      "updated": 2
    }
  ]
}
```

## Monitoring

### Supabase Logs

View Edge Function logs in Supabase Dashboard:
- Navigate to Edge Functions → `sync-all-templates-cron`
- Check logs for execution history and errors

### Database Monitoring

Check the `Templates` table:
- `updated_at` column shows when templates were last synced
- `status` column shows current approval status from Meta

## Template Statuses

The system tracks these statuses from Meta API:

- **`approved`** - Template approved by Meta, ready to use ✅
- **`pending`** - Awaiting Meta approval ⏳
- **`rejected`** - Rejected by Meta ❌
- **`failed`** - Failed submission ❌

Statuses are color-coded in the UI:
- Green badge = Approved
- Yellow badge = Pending
- Red badge = Rejected/Failed

## Troubleshooting

### Cron function returns 401 Unauthorized
- Check that `CRON_SECRET` matches in both cron service and Supabase secrets

### Templates not syncing
- Verify users have valid `meta_access_token` and `meta_business_account_id` in database
- Check Supabase Edge Function logs for errors
- Test Meta API credentials manually

### Status updates not working
- Ensure `meta_template_id` is saved when creating templates
- Verify Meta access tokens haven't expired

## Security Notes

1. **Never expose `CRON_SECRET`** - Keep it secret and rotate periodically
2. **Use service role key** only in Edge Functions, never in frontend
3. **Validate cron secret** before processing any requests
4. **Rate limiting** - Meta API has rate limits, monitor usage

## Next Steps

1. Choose a cron service (Vercel recommended if hosting there)
2. Generate a secure `CRON_SECRET`
3. Set up the cron job
4. Test with manual trigger
5. Monitor logs for first few days
6. Set up alerts for failed syncs (optional)
