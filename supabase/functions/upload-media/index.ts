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
                JSON.stringify({ success: false, error: 'Invalid user' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        // Parse form data
        const formData = await req.formData()
        const imageFile = formData.get('file') as File

        if (!imageFile) {
            return new Response(
                JSON.stringify({ success: false, error: 'No file provided' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Fetch user's WhatsApp credentials
        const { data: userData, error: credError } = await supabaseClient
            .from('User_details')
            .select('meta_access_token, meta_phone_number_id')
            .eq('email', user.email)
            .single()

        if (credError || !userData) {
            return new Response(
                JSON.stringify({ success: false, error: 'User credentials not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        console.log('📤 Uploading image to WhatsApp...')
        console.log('📏 File size:', imageFile.size)
        console.log('📝 File type:', imageFile.type)

        // Upload to WhatsApp Media API
        const uploadFormData = new FormData()
        uploadFormData.append('file', imageFile)
        uploadFormData.append('messaging_product', 'whatsapp')
        uploadFormData.append('type', imageFile.type)

        const uploadUrl = `https://graph.facebook.com/v20.0/${userData.meta_phone_number_id}/media`

        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.meta_access_token}`
            },
            body: uploadFormData
        })

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json()
            console.error('❌ WhatsApp upload error:', error)
            return new Response(
                JSON.stringify({ success: false, error: `WhatsApp upload failed: ${JSON.stringify(error)}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: uploadResponse.status }
            )
        }

        const uploadData = await uploadResponse.json()
        console.log('✅ Image uploaded successfully!')
        console.log('📋 Media ID:', uploadData.id)

        return new Response(
            JSON.stringify({
                success: true,
                media_id: uploadData.id
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
