-- Setup automatic daily template synchronization using pg_cron
-- This will run both sync functions daily for all users

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to sync templates for all users
CREATE OR REPLACE FUNCTION sync_all_user_templates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Loop through all users with Meta credentials
  FOR user_record IN 
    SELECT email, meta_access_token, meta_business_account_id
    FROM "User_details"
    WHERE meta_access_token IS NOT NULL 
      AND meta_business_account_id IS NOT NULL
  LOOP
    BEGIN
      -- Call fetch-templates Edge Function for this user
      -- Note: This requires http extension
      -- SELECT status, content::text
      -- INTO response_status, response_body
      -- FROM http((
      --   'POST',
      --   current_setting('app.supabase_url') || '/functions/v1/fetch-templates',
      --   ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'))],
      --   'application/json',
      --   jsonb_build_object('email', user_record.email)::text
      -- )::http_request);
      
      RAISE NOTICE 'Synced templates for user: %', user_record.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to sync templates for user %. Error: %', user_record.email, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Function to update template statuses for all users
CREATE OR REPLACE FUNCTION update_all_template_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  template_record RECORD;
  new_status TEXT;
BEGIN
  -- Loop through all users with Meta credentials
  FOR user_record IN 
    SELECT email, meta_access_token
    FROM "User_details"
    WHERE meta_access_token IS NOT NULL
  LOOP
    -- Loop through all templates for this user
    FOR template_record IN
      SELECT id, meta_template_id, status
      FROM "Templates"
      WHERE user_email = user_record.email
        AND meta_template_id IS NOT NULL
    LOOP
      BEGIN
        -- Here you would call the Meta API to get status
        -- This is a placeholder - actual implementation would use http extension
        RAISE NOTICE 'Checking status for template % (user: %)', template_record.meta_template_id, user_record.email;
        
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Failed to update status for template %. Error: %', template_record.meta_template_id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Schedule daily sync at 2 AM UTC
-- Run fetch-templates for all users
SELECT cron.schedule(
  'daily-template-sync',
  '0 2 * * *',  -- Every day at 2:00 AM UTC
  $$SELECT sync_all_user_templates()$$
);

-- Schedule status updates at 2:30 AM UTC (after sync completes)
SELECT cron.schedule(
  'daily-status-update',
  '30 2 * * *',  -- Every day at 2:30 AM UTC
  $$SELECT update_all_template_statuses()$$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- To unschedule (if needed):
-- SELECT cron.unschedule('daily-template-sync');
-- SELECT cron.unschedule('daily-status-update');

/*
IMPORTANT NOTES:
================

1. MANUAL EXECUTION:
   - Users can manually trigger these functions via the UI buttons
   - The Edge Functions handle individual user requests

2. AUTOMATIC EXECUTION:
   - The cron jobs will run daily for ALL users automatically
   - Requires pg_cron extension (available in Supabase projects)
   - Requires http extension to call Edge Functions from SQL

3. ALTERNATIVE APPROACH:
   - Instead of calling Edge Functions from SQL, you can:
     a) Use a separate cron service (e.g., GitHub Actions, Vercel Cron)
     b) Call the Edge Functions with a service role key
     c) Loop through users and call the functions via HTTP

4. TO IMPLEMENT FULLY:
   - Enable http extension: CREATE EXTENSION IF NOT EXISTS http;
   - Set configuration parameters for Supabase URL and keys
   - Uncomment and complete the http calls in the functions above

5. MONITORING:
   - Check logs: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
   - View active jobs: SELECT * FROM cron.job;
*/
