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
        const { template_name, language } = await req.json()

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
        const templatesFound = data.data || []

        console.log(`🔍 Found ${templatesFound.length} templates with name: ${template_name}${language ? ` and lang: ${language}` : ''}`)

        // Log brief summary of all found templates
        templatesFound.forEach((t: any, i: number) => {
            console.log(`   [${i}] ID: ${t.id}, Lang: ${t.language}, Status: ${t.status}, Components: ${t.components?.map((c: any) => c.type).join(', ')}`)
        })

        // Filter by EXACT name match first (Meta's 'name' parameter can be a prefix search)
        const exactMatches = templatesFound.filter((t: any) => t.name === template_name)

        console.log(`🎯 Exact matches for "${template_name}": ${exactMatches.length}`)

        // Filter by language if provided, otherwise take the first exact match
        const template = language
            ? exactMatches.find((t: any) => t.language === language) || exactMatches[0]
            : exactMatches[0]

        if (!template) {
            return new Response(
                JSON.stringify({ success: false, error: 'Template not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Parse template structure
        const components = template.components || []

        const structure: any = {
            name: template.name,
            language: template.language,
            hasHeader: false,
            headerType: null,
            headerHandleId: null,
            bodyParameters: [],
            hasCarousel: false,
            carouselCards: [],
            components: components
        }

        // Find header component - Case insensitive
        const headerComponent = components.find((c: any) => c.type.toUpperCase() === 'HEADER')
        if (headerComponent && headerComponent.format) {
            const format = headerComponent.format.toLowerCase()
            if (['image', 'video', 'document'].includes(format)) {
                structure.hasHeader = true
                structure.headerType = format
                structure.headerHandleId = headerComponent.example?.header_handle?.[0] || null
            }
        }

        // Find carousel component - Case insensitive
        const carouselComponent = components.find((c: any) => c.type.toUpperCase() === 'CAROUSEL')
        if (carouselComponent && carouselComponent.cards) {
            structure.hasCarousel = true

            // Debug: log raw carousel card header examples to see what Meta provides
            console.log('🎠 Raw carousel card header examples:', JSON.stringify(
                carouselComponent.cards.map((c: any) => ({
                    header_format: c.components.find((x: any) => x.type.toUpperCase() === 'HEADER')?.format,
                    header_example: c.components.find((x: any) => x.type.toUpperCase() === 'HEADER')?.example
                })), null, 2))

            structure.carouselCards = carouselComponent.cards.map((card: any, index: number) => {
                const cardHeader = card.components.find((c: any) => c.type.toUpperCase() === 'HEADER')
                const cardBody = card.components.find((c: any) => c.type.toUpperCase() === 'BODY')
                const cardButtons = card.components.find((c: any) => c.type.toUpperCase() === 'BUTTONS')

                return {
                    index,
                    hasHeader: !!cardHeader,
                    headerFormat: cardHeader?.format,
                    headerMediaId: cardHeader?.example?.header_handle?.[0] || null,
                    headerImageUrl: cardHeader?.example?.header_url?.[0] || null,
                    bodyText: cardBody?.text,
                    hasButtons: !!cardButtons,
                    buttons: cardButtons?.buttons || []
                }
            })

            // If it's a carousel, we usually don't want a root header image upload
            // but we'll leave it in the structure just in case it's a hybrid
        }

        // Find body component with parameters - Case insensitive
        const bodyComponent = components.find((c: any) => c.type.toUpperCase() === 'BODY')
        console.log('🔍 Body component:', JSON.stringify(bodyComponent, null, 2))

        if (bodyComponent && bodyComponent.text) {
            const bodyText = bodyComponent.text
            console.log('📝 Body text:', bodyText)

            // Step 1: Try strictly numbered parameters (Standard Meta normalization)
            // Matches {{1}}, {{ 1 }}, {{2}}, etc.
            let paramMatches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) || []

            // Step 2: Fallback to more inclusive alphanumeric regex if no numbered ones found
            // Catch templates that might use named markers like {{name}}
            if (paramMatches.length === 0) {
                const broadMatches = bodyText.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) || []
                // Filter out obviously non-variable text (simple heuristic: length < 40)
                paramMatches = broadMatches.filter((m: string) => m.length < 40)
            }

            console.log('🎯 Final Param matches found:', paramMatches)

            structure.bodyParameters = paramMatches.map((match: string, idx: number) => {
                // Extract unique digits/name: remove braces and spaces
                const content = match.replace(/\{\{|\}\}|\s/g, '')
                const isNumeric = /^\d+$/.test(content)
                const index = isNumeric ? parseInt(content) : idx + 1
                return {
                    index,
                    placeholder: match,
                    name: content
                }
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
