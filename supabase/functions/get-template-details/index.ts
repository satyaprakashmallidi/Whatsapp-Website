import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Create Supabase client with anon key
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Get the authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Parse request body
        const { template_name } = await req.json()

        if (!template_name) {
            return new Response(
                JSON.stringify({ success: false, error: 'template_name is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Fetch user's WhatsApp credentials
        const { data: userData, error: credError } = await supabaseClient
            .from('User_details')
            .select('meta_business_account_id, meta_access_token')
            .eq('email', user.email)
            .single()

        if (credError || !userData) {
            return new Response(
                JSON.stringify({ success: false, error: 'User credentials not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Call WhatsApp Graph API
        const url = `https://graph.facebook.com/v20.0/${userData.meta_business_account_id}/message_templates?name=${template_name}`

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userData.meta_access_token}`
            }
        })

        if (!response.ok) {
            const error = await response.json()
            return new Response(
                JSON.stringify({ success: false, error: `WhatsApp API error: ${JSON.stringify(error)}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
            )
        }

        const data = await response.json()
        const template = data.data?.[0]

        if (!template) {
            return new Response(
                JSON.stringify({ success: false, error: 'Template not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Parse template structure
        const components = template.components || []

        const structure = {
            hasHeader: false,
            headerType: null,
            headerHandleId: null,
            bodyParameters: [],
        }

        // Find header component
        const headerComponent = components.find((c: any) => c.type === 'HEADER')
        if (headerComponent && headerComponent.format) {
            const format = headerComponent.format.toLowerCase()
            if (['image', 'video', 'document'].includes(format)) {
                structure.hasHeader = true
                structure.headerType = format
                structure.headerHandleId = headerComponent.example?.header_handle?.[0] || null
            }
        }

        // Find body component with parameters
        const bodyComponent = components.find((c: any) => c.type === 'BODY')
        console.log('🔍 Body component:', JSON.stringify(bodyComponent, null, 2))

        if (bodyComponent && bodyComponent.text) {
            console.log('📝 Body text:', bodyComponent.text)
            // Match both numbered {{1}} and named {{name}} parameters
            const paramMatches = bodyComponent.text.match(/\{\{[^}]+\}\}/g) || []
            console.log('🎯 Param matches:', paramMatches)

            structure.bodyParameters = paramMatches.map((match: string, idx: number) => {
                // Extract the content between {{ and }}
                const content = match.replace(/\{\{|\}\}/g, '')
                // Try to parse as number, otherwise use index + 1
                const index = isNaN(parseInt(content)) ? idx + 1 : parseInt(content)
                return { index, placeholder: match, name: content }
            })
        }

        console.log('✅ Final structure:', JSON.stringify(structure, null, 2))

        return new Response(
            JSON.stringify({
                success: true,
                template: structure,
                raw: template
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
