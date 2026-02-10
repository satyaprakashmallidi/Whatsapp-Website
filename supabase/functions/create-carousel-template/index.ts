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

        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Get authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Authentication failed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Get user's WhatsApp credentials
        const { data: userData, error: userDataError } = await supabaseClient
            .from('User_details')
            .select('meta_access_token, meta_business_account_id')
            .eq('email', user.email)
            .single()

        if (userDataError || !userData) {
            return new Response(
                JSON.stringify({ success: false, error: 'User credentials not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Parse request body
        const { name, language, category, mainBody, cards } = await req.json()

        console.log(`📱 Creating carousel template: ${name}`)
        console.log(`📊 Cards count: ${cards.length}`)

        // Validate input
        if (!name || !language || !category || !mainBody || !cards || cards.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (cards.length > 10) {
            return new Response(
                JSON.stringify({ success: false, error: 'Maximum 10 cards allowed' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Validate each card
        for (const card of cards) {
            if (!card.headerHandle || !card.bodyText || !card.buttons || card.buttons.length === 0) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Each card must have image, body text, and at least one button' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        // Construct carousel template components
        const carouselCards = cards.map((card: any) => ({
            components: [
                {
                    type: "header",
                    format: "IMAGE",
                    example: {
                        header_handle: [card.headerHandle]
                    }
                },
                {
                    type: "body",
                    text: card.bodyText
                },
                {
                    type: "buttons",
                    buttons: card.buttons.map((btn: any) => {
                        const button: any = {
                            type: btn.type,
                            text: btn.text
                        }

                        // Frontend sends 'value' for both URL and phone number
                        if (btn.type === 'url' && btn.value) {
                            button.url = btn.value
                        }

                        if (btn.type === 'phone_number' && btn.value) {
                            button.phone_number = btn.value
                        }

                        return button
                    })
                }
            ]
        }))

        // Build WhatsApp API payload
        const payload = {
            name: name,
            language: language,
            category: category,
            parameter_format: "NAMED",
            components: [
                {
                    type: "body",
                    text: mainBody
                },
                {
                    type: "carousel",
                    cards: carouselCards
                }
            ]
        }

        console.log(`📤 Sending to WhatsApp API...`)
        console.log(`Payload:`, JSON.stringify(payload, null, 2))

        // Call WhatsApp API
        const response = await fetch(
            `https://graph.facebook.com/v23.0/${userData.meta_business_account_id}/message_templates`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userData.meta_access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        )

        const whatsappData = await response.json()

        if (!response.ok) {
            console.error('❌ WhatsApp API Error:', whatsappData)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: whatsappData.error?.message || 'Failed to create template',
                    details: whatsappData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
            )
        }

        console.log(`✅ Template created successfully!`)
        console.log(`Template ID:`, whatsappData.id)

        return new Response(
            JSON.stringify({
                success: true,
                template_id: whatsappData.id,
                status: whatsappData.status || 'PENDING'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('❌ Server Error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
