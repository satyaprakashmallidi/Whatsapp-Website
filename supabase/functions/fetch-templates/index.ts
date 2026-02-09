// Supabase Edge Function to fetch all templates from Meta API and sync to database
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

    console.log('Fetching templates for user:', user.email)

    // Get user's Meta credentials
    const { data: userData, error: credError } = await supabaseClient
      .from('User_details')
      .select('meta_access_token, meta_business_account_id')
      .eq('email', user.email)
      .single()

    if (credError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credentials not found',
          message: 'Please configure your WhatsApp API credentials in Profile Settings.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { meta_access_token, meta_business_account_id } = userData

    if (!meta_access_token || !meta_business_account_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing credentials',
          message: 'Please configure your WhatsApp API credentials.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch templates from Meta API
    const statuses = ['APPROVED', 'PENDING', 'REJECTED']
    const templates: any[] = []

    for (const status of statuses) {
      const metaApiUrl = `https://graph.facebook.com/v20.0/${meta_business_account_id}/message_templates?status=${status}`

      console.log(`Fetching ${status} templates...`)

      const response = await fetch(metaApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${meta_access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const responseData = await response.json()
        if (responseData.data) {
          templates.push(...responseData.data)
        }
      } else {
        const errorData = await response.json()
        console.error(`Failed to fetch ${status} templates:`, errorData)
        // We continue to next status even if one fails, but track errors if needed
      }
    }

    let syncedCount = 0
    let newCount = 0
    let updatedCount = 0

    // Sync each template to database
    for (const template of templates) {
      const bodyComponent = template.components?.find((c: any) => c.type === 'BODY')
      const bodyText = bodyComponent?.text || ''

      // Map Meta status to lowercase for consistency
      const status = template.status?.toLowerCase() || 'unknown'

      // Check if template already exists
      const { data: existing } = await supabaseClient
        .from('Templates')
        .select('id')
        .eq('user_email', user.email)
        .eq('meta_template_id', template.id)
        .single()

      if (existing) {
        // Update existing template
        const { error: updateError } = await supabaseClient
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

        if (updateError) {
          console.error('Failed to update template:', template.name, updateError)
        } else {
          updatedCount++
        }
      } else {
        // Insert new template
        const { error: insertError } = await supabaseClient
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

        if (insertError) {
          console.error('Failed to insert template:', template.name, insertError)
        } else {
          newCount++
        }
      }

      syncedCount++
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${syncedCount} templates from Meta`,
        details: {
          total: syncedCount,
          new: newCount,
          updated: updatedCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Fetch templates error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch templates',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
