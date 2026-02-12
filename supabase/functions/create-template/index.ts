// Supabase Edge Function to create WhatsApp templates via Meta API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateTemplateRequest {
  name: string
  language: string
  category: string
  bodyText: string
  parameters: Array<{
    param_name: string
    example: string
  }>
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    // Parse request body
    const requestBody = await req.json()
    console.log('Received request body:', JSON.stringify(requestBody, null, 2))

    const { name, language, category, components, headerHandle } = requestBody

    // Validate required fields
    if (!name || !language || !category || !components || !Array.isArray(components)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          message: 'Please provide name, language, category, and components array'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Extract body text from components for database storage
    const bodyComponent = components.find((c: any) => c.type === 'BODY')
    const bodyText = bodyComponent?.text || ''

    // Check if there's a header with IMAGE format
    const headerComponent = components.find((c: any) => c.type === 'HEADER')
    const hasImageHeader = headerComponent && headerComponent.format === 'IMAGE'

    // Determine template type
    const hasCarouselComp = components.some((c: any) => c.type.toUpperCase() === 'CAROUSEL')
    const templateType = hasCarouselComp ? 'carousel' : 'text'

    console.log('Creating template:', name, 'Type:', templateType)
    console.log('User email:', user.email)

    // Fetch user's Meta WhatsApp API credentials
    const { data: userData, error: credError } = await supabaseClient
      .from('User_details')
      .select('meta_access_token, meta_business_account_id')
      .eq('email', user.email)
      .single()

    if (credError || !userData) {
      console.error('Failed to fetch credentials:', credError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credentials not found',
          message: 'Please configure your WhatsApp API credentials in Profile Settings.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const { meta_access_token, meta_business_account_id } = userData

    if (!meta_access_token || !meta_business_account_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing credentials',
          message: 'Please configure your WhatsApp API credentials in Profile Settings.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Build the Meta API request body with provided components
    const metaRequestBody: any = {
      name: name,
      language: language,
      category: category,
      parameter_format: "NAMED",
      components: components.map((comp: any) => {
        // Normalize component type to uppercase
        const normalizedComp = { ...comp, type: comp.type.toUpperCase() }

        // For BUTTONS component, normalize button types to lowercase (Meta API requirement)
        if (normalizedComp.type === 'BUTTONS' && normalizedComp.buttons) {
          normalizedComp.buttons = normalizedComp.buttons.map((btn: any) => {
            const normalizedBtn: any = {
              type: btn.type.toLowerCase(), // 'url', 'phone_number', 'quick_reply'
              text: btn.text
            }
            // Only include url/phone_number fields if they exist
            if (btn.url) normalizedBtn.url = btn.url
            if (btn.phone_number) normalizedBtn.phone_number = btn.phone_number
            return normalizedBtn
          })
        }

        return normalizedComp
      })
    }

    // If there's an image header, add the handle to components
    if (hasImageHeader && headerHandle) {
      // Find the header component and add example with header_handle
      const headerIndex = metaRequestBody.components.findIndex((c: any) => c.type === 'HEADER')
      if (headerIndex !== -1) {
        metaRequestBody.components[headerIndex].example = {
          header_handle: [headerHandle]
        }
      }
      console.log('Added header_handle to component:', headerHandle)
    }

    console.log('Meta API request body:', JSON.stringify(metaRequestBody, null, 2))

    // Call Meta API to create template
    const metaApiUrl = `https://graph.facebook.com/v21.0/${meta_business_account_id}/message_templates`

    const response = await fetch(metaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${meta_access_token}`
      },
      body: JSON.stringify(metaRequestBody)
    })

    const responseData = await response.json()
    console.log('Meta API response:', responseData)

    if (!response.ok) {
      console.error('Meta API error:', responseData)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Meta API error',
          message: responseData.error?.message || 'Failed to create template',
          details: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status
        }
      )
    }

    // Meta returns: { id: "...", status: "PENDING", category: "..." }
    // Save template to Supabase Templates table
    const { error: dbError } = await supabaseClient
      .from('Templates')
      .insert({
        user_email: user.email,
        template_name: name,
        template_type: templateType,
        content: bodyText,
        category: category,
        language: language,
        status: responseData.status.toLowerCase(), // "PENDING" -> "pending"
        meta_template_id: responseData.id,
        body_text: bodyText
      })

    if (dbError) {
      console.error('Failed to save template to database:', dbError)
      // Template was created in Meta but failed to save locally
      // Still return success but with a warning
      return new Response(
        JSON.stringify({
          success: true,
          templateId: responseData.id,
          status: responseData.status,
          category: responseData.category,
          message: 'Template created in Meta but failed to save locally. Please refresh the page.',
          warning: 'Database save failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        templateId: responseData.id,
        status: responseData.status,
        category: responseData.category,
        message: 'Template created successfully and is pending Meta approval'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Template creation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Template creation failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
