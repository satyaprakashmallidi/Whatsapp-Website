import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to add delay between API calls (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
        const { campaign_id } = await req.json()

        if (!campaign_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'campaign_id is required' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Fetch user's WhatsApp credentials
        const { data: userData, error: credError } = await supabaseClient
            .from('User_details')
            .select('meta_access_token, meta_phone_number_id, contacts')
            .eq('email', user.email)
            .single()

        if (credError || !userData) {
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

        // audience_list contains contact timestamp IDs  
        // Contacts  are stored in User_details.contacts JSONB field
        const contactIds = audience.audience_list || []
        console.log(`📋 Contact IDs in audience:`, contactIds)
        // Filter contacts from userData.contacts array
        const allContacts = (userData as any).contacts || []
        console.log(`👥 Total contacts available:`, allContacts.length)
        const contacts = allContacts.filter((contact: any) => contactIds.includes(contact.id))
        console.log(`✅ Filtered ${contacts.length} contacts for this campaign`)

        const templateName = campaign.template_name
        const templateLang = campaign.template_language || 'en_US'
        const templateStructure = campaign.template_structure

        // Set campaign status to Processing
        console.log(`\n🔄 Setting campaign status to Processing...`)
        await supabaseClient
            .from('Campaigns')
            .update({ status: 'Processing' })
            .eq('id', campaign_id)

        console.log(`📧 Submitting background task to send messages to ${contacts.length} contacts`)
        console.log(`Template: ${templateName}, Language: ${templateLang}`)
        // console.log(`Template structure:`, JSON.stringify(templateStructure, null, 2))

        // Trigger the background processing task
        const backgroundSend = async () => {
            let successCount = 0
            let failureCount = 0
            const errors: string[] = []

            for (const contact of contacts) {
                const phone = contact.phone || contact.mobile || contact.whatsapp
                console.log(`\n👤 Processing contact:`, contact.name, phone)

                if (!phone) {
                    failureCount++
                    errors.push(`No phone number for contact: ${contact.name || 'Unknown'}`)
                    console.log(`❌ No phone number`)
                    continue
                }

                // Build message payload
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

                // Add components if template structure exists
                if (templateStructure) {
                    const components: any[] = []

                    // Add header if exists - use uploaded media ID from campaign
                    if (templateStructure.hasHeader && campaign.header_media_id) {
                        components.push({
                            type: "header",
                            parameters: [{
                                type: templateStructure.headerType,
                                [templateStructure.headerType]: {
                                    id: campaign.header_media_id  // Use uploaded Media ID
                                }
                            }]
                        })
                    }

                    // Add body parameters if exist
                    if (templateStructure.bodyParameters && templateStructure.bodyParameters.length > 0) {
                        const bodyParams = templateStructure.bodyParameters.map((param: any) => {
                            const paramObj: any = {
                                type: "text",
                                text: contact.name || "Customer"
                            }

                            // Add parameter_name for NAMED parameters
                            if (param.name) {
                                paramObj.parameter_name = param.name
                            }

                            return paramObj
                        })

                        components.push({
                            type: "body",
                            parameters: bodyParams
                        })
                    }

                    // Add carousel component if exists
                    if (templateStructure.hasCarousel && templateStructure.carouselCards) {
                        const cards = templateStructure.carouselCards.map((card: any, idx: number) => {
                            const cardMediaId = campaign.card_media_ids?.[idx] || campaign.card_media_ids?.[String(idx)]

                            const cardComponents: any[] = []

                            // Add card header if it's an image and we have a media ID
                            if (card.hasHeader && card.headerFormat === 'IMAGE' && cardMediaId) {
                                cardComponents.push({
                                    type: "header",
                                    parameters: [{
                                        type: "image",
                                        image: {
                                            id: cardMediaId
                                        }
                                    }]
                                })
                            }

                            // Add card body parameters if they exist 
                            // Note: For now assuming no dynamic variables in card body or using contact name if needed
                            // Meta allows card body too, but we need to check if we support variables there

                            return {
                                card_index: idx,
                                components: cardComponents
                            }
                        })

                        components.push({
                            type: "carousel",
                            cards: cards
                        })
                    }

                    if (components.length > 0) {
                        payload.template.components = components
                    }
                }

                console.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2))

                // Send message via WhatsApp API
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
                        console.log(`✅ Message sent successfully!`)
                    } else {
                        const error = await response.json()
                        failureCount++
                        console.log(`❌ WhatsApp API error:`, JSON.stringify(error, null, 2))
                        errors.push(`Failed to send to ${phone}: ${JSON.stringify(error)}`)
                    }
                } catch (error) {
                    failureCount++
                    console.log(`❌ Exception:`, error)
                    errors.push(`Exception sending to ${phone}: ${error instanceof Error ? error.message : 'Unknown'}`)
                }

                // Rate limiting: Wait 100ms between messages (~10 messages/second, well within 80/sec limit)
                await delay(100)
            } // End of contact loop

            console.log(`\n📊 Final Results: ${successCount} sent, ${failureCount} failed`)
            if (errors.length > 0) console.log(`Errors:`, errors)

            // Update campaign status
            const finalStatus = failureCount > 0 ? 'Failed' : 'Completed'
            console.log(`\n📝 Updating campaign status to: ${finalStatus}`)
            const { error: updateError } = await supabaseClient
                .from('Campaigns')
                .update({
                    status: finalStatus,
                    delivered: successCount,
                    failed: failureCount,
                    sent_date: new Date().toISOString()
                })
                .eq('id', campaign_id)

            if (updateError) {
                console.error('❌ Error updating campaign status:', updateError)
            } else {
                console.log('✅ Campaign status updated successfully')
            }
        } // End of backgroundSend

        // Use EdgeRuntime.waitUntil if available (Deno in Supabase) to keep execution alive
        // after returning the response
        if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
            EdgeRuntime.waitUntil(backgroundSend().catch(err => {
                console.error('Background send utterly failed:', err);
            }));
        } else if (typeof (globalThis as any).waitUntil === 'function') {
            (globalThis as any).waitUntil(backgroundSend().catch(err => {
                console.error('Background send utterly failed:', err);
            }));
        } else {
            // Fallback for local testing or unsupported environments, 
            // just run returning promise without awaiting. 
            // Note: Deno might kill this if the event loop goes idle.
            backgroundSend().catch(err => {
                console.error('Background send utterly failed:', err);
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                status: "Processing",
                message: "Campaign queued for background delivery"
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
