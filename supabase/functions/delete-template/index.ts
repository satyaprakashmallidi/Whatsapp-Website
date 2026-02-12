
// Supabase Edge Function to delete WhatsApp templates via Meta API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DeleteTemplateRequest {
    name: string
    id: string // local DB ID (UUID)
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

        const { name, id } = await req.json() as DeleteTemplateRequest

        if (!name || !id) {
            return new Response(
                JSON.stringify({ success: false, message: 'Missing template name or ID' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        console.log(`Deleting template: ${name} (ID: ${id}) for user: ${user.email}`)

        // Get user credentials (access token and WABA ID)
        const { data: credentials, error: credentialsError } = await supabaseClient
            .from('User_details')
            .select('meta_access_token, meta_business_account_id')
            .eq('email', user.email)
            .single()

        if (credentialsError || !credentials) {
            console.error('Credentials fetch error:', credentialsError)
            return new Response(
                JSON.stringify({ success: false, error: 'User credentials not found' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404
                }
            )
        }

        const { meta_access_token, meta_business_account_id } = credentials

        // Delete from Meta API
        // Using WABA ID as templates are account-level
        const metaUrl = `https://graph.facebook.com/v20.0/${meta_business_account_id}/message_templates?name=${name}`

        const metaResponse = await fetch(metaUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${meta_access_token}`,
                'Content-Type': 'application/json'
            }
        })

        const metaData = await metaResponse.json()

        if (!metaResponse.ok) {
            // If template not found on Meta, we should still proceed to delete from local DB
            // But log the error if it's something else
            if (metaData.error && metaData.error.code !== 100) { // Code 100 is often "param not found" or similar
                console.error('Meta API deletion failed:', metaData)
                return new Response(
                    JSON.stringify({ success: false, error: 'Meta API error', details: metaData }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400
                    }
                )
            } else {
                console.warn('Template not found on Meta or already deleted, proceeding to local deletion.')
            }
        } else {
            console.log('Template deleted from Meta successfully')
        }

        // Verify template exists in local database and get precise ID
        const { data: existingTemplate, error: findError } = await supabaseClient
            .from('Templates')
            .select('id')
            .eq('id', id)
            .eq('user_email', user.email)
            .single()

        if (findError || !existingTemplate) {
            console.warn('Template not found in local database or access denied:', id)
            // If deleted from Meta successfully, allow success response even if local delete fails/not found
            if (metaResponse.ok) {
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Template deleted from Meta (was not found locally)'
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }

            return new Response(
                JSON.stringify({ success: false, error: 'Template not found locally and failed on Meta' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Delete from local database using verified ID
        const { error: dbError } = await supabaseClient
            .from('Templates')
            .delete()
            .eq('id', existingTemplate.id)

        if (dbError) {
            console.error('Database deletion failed:', dbError)
            return new Response(
                JSON.stringify({ success: false, error: 'Database deletion failed', details: dbError }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500
                }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Template deleted successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Delete template error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
