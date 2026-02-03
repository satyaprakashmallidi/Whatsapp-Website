// Supabase Edge Function for automatic daily template sync (called by cron service)
// This function processes all users and syncs their templates
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify cron secret key to prevent unauthorized calls
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid cron secret' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Starting automatic template sync for all users...')

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get all users with Meta credentials
    const { data: users, error: usersError } = await supabaseClient
      .from('User_details')
      .select('email, meta_access_token, meta_business_account_id')
      .not('meta_access_token', 'is', null)
      .not('meta_business_account_id', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users with Meta credentials found',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Found ${users.length} users to sync`)

    let successCount = 0
    let failedCount = 0
    const results: any[] = []

    // Process each user
    for (const user of users) {
      try {
        console.log(`Syncing templates for ${user.email}...`)

        // Fetch templates from Meta API
        const metaApiUrl = `https://graph.facebook.com/v21.0/${user.meta_business_account_id}/message_templates?limit=50`
        
        const response = await fetch(metaApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.meta_access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Meta API returned ${response.status}`)
        }

        const responseData = await response.json()
        const templates = responseData.data || []

        let userSyncedCount = 0
        let userNewCount = 0
        let userUpdatedCount = 0

        // Sync each template
        for (const template of templates) {
          const bodyComponent = template.components?.find((c: any) => c.type === 'BODY')
          const bodyText = bodyComponent?.text || ''
          const status = template.status?.toLowerCase() || 'unknown'
          
          // Check if exists
          const { data: existing } = await supabaseClient
            .from('Templates')
            .select('id')
            .eq('user_email', user.email)
            .eq('meta_template_id', template.id)
            .single()

          if (existing) {
            // Update
            await supabaseClient
              .from('Templates')
              .update({
                template_name: template.name,
                status: status,
                category: template.category || 'UTILITY',
                language: template.language || 'en_US',
                body_text: bodyText,
                content: bodyText,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)
            
            userUpdatedCount++
          } else {
            // Insert
            await supabaseClient
              .from('Templates')
              .insert({
                user_email: user.email,
                template_name: template.name,
                template_type: 'text',
                content: bodyText,
                category: template.category || 'UTILITY',
                language: template.language || 'en_US',
                status: status,
                meta_template_id: template.id,
                body_text: bodyText
              })
            
            userNewCount++
          }
          
          userSyncedCount++
        }

        successCount++
        results.push({
          email: user.email,
          success: true,
          synced: userSyncedCount,
          new: userNewCount,
          updated: userUpdatedCount
        })

        console.log(`✓ Synced ${userSyncedCount} templates for ${user.email}`)

      } catch (error) {
        failedCount++
        results.push({
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`✗ Failed to sync templates for ${user.email}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${users.length} users`,
        summary: {
          total_users: users.length,
          successful: successCount,
          failed: failedCount
        },
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Cron job error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
