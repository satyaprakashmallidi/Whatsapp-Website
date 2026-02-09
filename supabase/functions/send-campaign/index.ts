// Simplified Supabase Edge Function - uses stored template structure
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Build message payload with components from stored template structure
function buildMessagePayload(
    phone: string,
    templateName: string,
    templateLang: string,
    templateStructure: any,
    contact: any
) {
    const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: templateLang
            }
        }
    }

    // Only add components if template structure exists
    if (!templateStructure) {
        return payload
    }

    const components: any[] = []

    // Add header component if template has media header
    if (templateStructure.hasHeader && templateStructure.headerHandleId) {
        components.push({
            type: "header",
            parameters: [
                {
                    type: templateStructure.headerType,
                    [templateStructure.headerType!]: {
                        id: templateStructure.headerHandleId
                    }
                }
            ]
        })
    }

    // Add body parameters if template has them
    if (templateStructure.bodyParameters && templateStructure.bodyParameters.length > 0) {
        const bodyParams = templateStructure.bodyParameters.map((param: any) => {
            return {
                type: "text",
                text: contact.name || "Customer"
            }
        })

        components.push({
            type: "body",
            parameters: bodyParams
        })
    }

    if (components.length > 0) {
        payload.template.components = components
    }

    return payload
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')!

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Parse request body
        const { campaign_id } = await req.json()

        // Fetch user credentials
        const { data: userData, error: userDataError } = await supabaseClient
            .from('User_details')
            .select('*')
            .eq('user_email', user.email)
            .single()

        if (userDataError || !userData) {
            return new Response(
                JSON.stringify({ success: false, error: 'User credentials not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Fetch campaign details
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('Campaigns')
            .select('*')
            .eq('id', campaign_id)
            .eq('user_email', user.email)
            .single()

        if (campaignError || !campaign) {
            return new Response(
                JSON.stringify({ success: false, error: 'Campaign not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Fetch audience contacts
        const { data: audience, error: audienceError } = await supabaseClient
            .from('Audiences')
            .select('*')
            .eq('id', campaign.audience_id)
            .single()

        if (audienceError || !audience) {
            return new Response(
                JSON.stringify({ success: false, error: 'Audience not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        const contacts = audience.audience_list || []
        const templateName = campaign.template_name
        const templateLang = campaign.template_language || 'en_US'
        const templateStructure = campaign.template_structure // Get stored structure

        // Send messages
        let successCount = 0
        let failureCount = 0

        for (const contact of contacts) {
            const phone = contact.phone || contact.mobile || contact.whatsapp
            if (!phone) {
                failureCount++
                continue
            }

            const payload = buildMessagePayload(
                phone,
                templateName,
                templateLang,
                templateStructure,
                contact
            )

            try {
                const response = await fetch(
                    `https://graph.facebook.com/v20.0/${userData.meta_phone_number_id}/messages`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${userData.meta_access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    }
                )

                if (response.ok) {
                    successCount++
                } else {
                    failureCount++
                }
            } catch (error) {
                failureCount++
            }
        }

        // Update campaign status
        await supabaseClient
            .from('Campaigns')
            .update({
                status: failureCount > 0 ? 'Failed' : 'Sent',
                delivered: successCount,
                failed: failureCount,
                sent_date: new Date().toISOString()
            })
            .eq('id', campaign_id)

        return new Response(
            JSON.stringify({
                success: true,
                delivered: successCount,
                failed: failureCount
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
