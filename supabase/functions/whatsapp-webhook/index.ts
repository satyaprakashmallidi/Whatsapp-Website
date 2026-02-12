import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const token = url.searchParams.get('token')

        // Get Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Validate token
        if (!token) {
            return new Response(
                JSON.stringify({ error: 'Missing webhook token' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Find user with this token
        const { data: user, error: userError } = await supabase
            .from('User_details')
            .select('email, webhook_token, secret_token')
            .eq('webhook_token', token)
            .single()

        if (userError || !user) {
            console.error('Invalid webhook token:', token)
            return new Response(
                JSON.stringify({ error: 'Invalid webhook token' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Handle Meta webhook verification (GET request)
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode')
            const verify_token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            console.log('🔐 Webhook verification request:', { mode, verify_token, challenge })

            // STRICT VERIFICATION: Verify token must match user's secret_token
            if (mode === 'subscribe' && challenge && verify_token === user.secret_token) {
                console.log('✅ Webhook verified for user:', user.email)

                // Log verification event
                await supabase.from('webhook_logs').insert({
                    user_email: user.email,
                    webhook_token: token,
                    event_type: 'verification',
                    payload: { mode, verify_token, challenge },
                    processed: true
                })

                // Return the challenge to verify the webhook
                return new Response(challenge, {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                })
            }

            return new Response('Invalid verification request', { status: 400 })
        }

        // Handle webhook events (POST request)
        if (req.method === 'POST') {
            const body = await req.json()
            console.log('📥 Webhook event received for user:', user.email, body)

            // Determine event type from payload
            let eventType = 'unknown'
            if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
                eventType = 'message'
            } else if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
                eventType = 'status'
            }

            // Log webhook event to database
            const { error: logError } = await supabase
                .from('webhook_logs')
                .insert({
                    user_email: user.email,
                    webhook_token: token,
                    event_type: eventType,
                    payload: body,
                    processed: false
                })

            if (logError) {
                console.error('Error logging webhook:', logError)
            }

            // TODO: Process webhook events (future enhancement)
            // For now, just log and acknowledge receipt

            return new Response(
                JSON.stringify({ success: true, message: 'Webhook received' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
