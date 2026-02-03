// Supabase Edge Function to update template statuses from Meta API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('Updating template statuses for user:', user.email)

    // Get user's Meta access token
    const { data: userData, error: credError } = await supabaseClient
      .from('User_details')
      .select('meta_access_token')
      .eq('email', user.email)
      .single()

    if (credError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credentials not found',
          message: 'Please configure your WhatsApp API credentials.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { meta_access_token } = userData

    if (!meta_access_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing access token',
          message: 'Please configure your WhatsApp API access token.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get all templates for this user that have a meta_template_id
    const { data: templates, error: templatesError } = await supabaseClient
      .from('Templates')
      .select('id, template_name, meta_template_id, status')
      .eq('user_email', user.email)
      .not('meta_template_id', 'is', null)

    if (templatesError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error',
          message: 'Failed to fetch templates from database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No templates to update',
          details: {
            total: 0,
            updated: 0,
            unchanged: 0,
            failed: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    let updatedCount = 0
    let unchangedCount = 0
    let failedCount = 0

    // Update status for each template
    for (const template of templates) {
      try {
        // Fetch current status from Meta API
        const metaApiUrl = `https://graph.facebook.com/v23.0/${template.meta_template_id}?fields=status`
        
        const response = await fetch(metaApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${meta_access_token}`
          }
        })

        const responseData = await response.json()

        if (!response.ok) {
          console.error(`Failed to fetch status for template ${template.template_name}:`, responseData)
          failedCount++
          continue
        }

        const newStatus = responseData.status?.toLowerCase() || 'unknown'
        const currentStatus = template.status || 'unknown'

        // Update database if status changed
        if (newStatus !== currentStatus) {
          const { error: updateError } = await supabaseClient
            .from('Templates')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', template.id)

          if (updateError) {
            console.error(`Failed to update template ${template.template_name}:`, updateError)
            failedCount++
          } else {
            console.log(`Updated ${template.template_name}: ${currentStatus} -> ${newStatus}`)
            updatedCount++
          }
        } else {
          unchangedCount++
        }

      } catch (error) {
        console.error(`Error processing template ${template.template_name}:`, error)
        failedCount++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Status update complete`,
        details: {
          total: templates.length,
          updated: updatedCount,
          unchanged: unchangedCount,
          failed: failedCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Update statuses error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update template statuses',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
