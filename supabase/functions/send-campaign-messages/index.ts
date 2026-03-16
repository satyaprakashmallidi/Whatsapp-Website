import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to add delay between API calls (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Downloads an image from a URL and uploads it to Meta's Media API.
 * Returns the numeric media handle ID, or null if it fails.
 */
async function uploadImageToMeta(
    imageUrl: string,
    phoneNumberId: string,
    accessToken: string
): Promise<string | null> {
    try {
        console.log(`📥 Downloading image from CDN: ${imageUrl.substring(0, 80)}...`)

        // Step 1: Download the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
            console.error(`❌ Failed to download image: ${imageResponse.status}`)
            return null
        }

        const imageBlob = await imageResponse.blob()
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        console.log(`✅ Downloaded image (${imageBlob.size} bytes, type: ${contentType})`)

        // Step 2: Upload to Meta Media API
        const formData = new FormData()
        formData.append('file', imageBlob, 'image.jpg')
        formData.append('type', contentType)
        formData.append('messaging_product', 'whatsapp')

        console.log(`📤 Uploading to Meta Media API for phone number: ${phoneNumberId}`)
        const uploadResponse = await fetch(
            `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                body: formData
            }
        )

        const uploadData = await uploadResponse.json()

        if (!uploadResponse.ok || !uploadData.id) {
            console.error(`❌ Meta media upload failed:`, JSON.stringify(uploadData))
            return null
        }

        console.log(`✅ Got numeric media ID from Meta: ${uploadData.id}`)
        return String(uploadData.id)

    } catch (error) {
        console.error(`❌ Exception during image upload:`, error)
        return null
    }
}

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
        const contactIds = audience.audience_list || []
        console.log(`📋 Contact IDs in audience:`, contactIds)
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

        // Trigger the background processing task
        const backgroundSend = async () => {
            let successCount = 0
            let failureCount = 0
            const errors: string[] = []

            // Extract base template string for logging to messages table
            let baseMessageText = `[Template: ${templateName}]`
            let templateHeader: string | null = null
            let templateFooter: string | null = null
            let templateButtons: any[] = []

            if (templateStructure?.components) {
                const bodyComp = templateStructure.components.find((c: any) => c.type.toUpperCase() === 'BODY')
                if (bodyComp && bodyComp.text) {
                    baseMessageText = bodyComp.text
                }
                const headerComp = templateStructure.components.find((c: any) => c.type.toUpperCase() === 'HEADER')
                if (headerComp && headerComp.format === 'TEXT') {
                    templateHeader = headerComp.text || null
                }
                const footerComp = templateStructure.components.find((c: any) => c.type.toUpperCase() === 'FOOTER')
                if (footerComp) {
                    templateFooter = footerComp.text || null
                }
                const buttonsComp = templateStructure.components.find((c: any) => c.type.toUpperCase() === 'BUTTONS')
                if (buttonsComp && buttonsComp.buttons) {
                    templateButtons = buttonsComp.buttons.map((b: any) => ({
                        type: b.type,
                        text: b.text,
                        url: b.url || null,
                        phone_number: b.phone_number || null
                    }))
                }
            }

            // ─── PRE-PROCESS: Upload carousel card images ONCE before looping contacts ───
            // Meta's template API gives us CDN URLs in header_handle, not numeric IDs.
            // We must download and re-upload each to get a proper numeric media handle.
            const resolvedCardMediaIds: Record<number, string> = {}
            let resolvedStandardHeaderId: string | null = null

            if (templateStructure?.hasHeader) {
                console.log(`\n🖼️ Pre-processing standard template header...`)
                const headerImageUrl = campaign.header_media_id || templateStructure.headerHandleId

                if (headerImageUrl) {
                    const isUrl = String(headerImageUrl).startsWith('http')

                    if (isUrl) {
                        const numericId = await uploadImageToMeta(
                            headerImageUrl,
                            userData.meta_phone_number_id,
                            userData.meta_access_token
                        )
                        if (numericId) {
                            resolvedStandardHeaderId = numericId
                            console.log(`✅ Standard header resolved to media ID: ${numericId}`)
                        } else {
                            console.warn(`⚠️ Could not get media ID for standard header, header will be omitted`)
                        }
                    } else {
                        resolvedStandardHeaderId = String(headerImageUrl)
                        console.log(`✅ Standard header already has numeric ID: ${headerImageUrl}`)
                    }
                }
            }
            if (templateStructure?.hasCarousel && templateStructure.carouselCards) {
                console.log(`\n🎠 Pre-processing carousel card images...`)
                for (let idx = 0; idx < templateStructure.carouselCards.length; idx++) {
                    const card = templateStructure.carouselCards[idx]

                    // Get the stored media value (may be a URL or a numeric ID)
                    const storedValue = campaign.card_media_ids?.[idx] ?? campaign.card_media_ids?.[String(idx)]
                    const imageUrl = storedValue || card.headerMediaId || card.headerImageUrl

                    if (!imageUrl) {
                        console.log(`⚠️ No image found for card ${idx}, skipping header`)
                        continue
                    }

                    const isUrl = String(imageUrl).startsWith('http')

                    if (isUrl) {
                        // Download and re-upload to get a numeric media ID
                        const numericId = await uploadImageToMeta(
                            imageUrl,
                            userData.meta_phone_number_id,
                            userData.meta_access_token
                        )
                        if (numericId) {
                            resolvedCardMediaIds[idx] = numericId
                            console.log(`✅ Card ${idx} resolved to media ID: ${numericId}`)
                        } else {
                            console.warn(`⚠️ Could not get media ID for card ${idx}, header will be omitted`)
                        }
                    } else {
                        // Already a numeric ID — use directly
                        resolvedCardMediaIds[idx] = String(imageUrl)
                        console.log(`✅ Card ${idx} already has numeric ID: ${imageUrl}`)
                    }
                }
                console.log(`🎠 Resolved card media IDs:`, resolvedCardMediaIds)
            }
            // ─────────────────────────────────────────────────────────────────────────────

            for (const contact of contacts) {
                const rawPhone = contact.phone || contact.mobile || contact.whatsapp
                const phone = String(rawPhone).replace(/\D/g, '') // Remove all non-numeric characters for Meta
                console.log(`\n👤 Processing contact:`, contact.name, phone)

                if (!phone || phone.length < 5) {
                    failureCount++
                    errors.push(`Invalid phone number for contact: ${contact.name || 'Unknown'} (${rawPhone})`)
                    console.error(`❌ Invalid phone number: ${rawPhone}`)
                    continue
                }

                // Interpolate variables into baseMessageText for the database
                let contactMessageText = baseMessageText
                if (templateStructure?.bodyParameters && templateStructure.bodyParameters.length > 0) {
                    contactMessageText = contactMessageText.replace(/\{\{.+?\}\}/g, contact.name || "Customer")
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

                    // Add header if exists - use uploaded media ID from campaign or template default
                    if (templateStructure.hasHeader && resolvedStandardHeaderId) {
                        components.push({
                            type: "header",
                            parameters: [{
                                type: templateStructure.headerType,
                                [templateStructure.headerType]: {
                                    id: resolvedStandardHeaderId
                                }
                            }]
                        })
                    }

                    // Add body parameters if exist
                    if (templateStructure.bodyParameters && templateStructure.bodyParameters.length > 0) {
                        const bodyParams = templateStructure.bodyParameters.map((param: any) => {
                            const p: any = {
                                type: "text",
                                text: contact.name || "Customer"
                            }
                            // Meta requires parameter_name ONLY for named parameters (non-numeric)
                            if (param.name && isNaN(Number(param.name))) {
                                p.parameter_name = param.name
                            }
                            return p
                        })
                        components.push({
                            type: "body",
                            parameters: bodyParams
                        })
                    }

                    // Add carousel component using pre-resolved numeric media IDs
                    if (templateStructure.hasCarousel && templateStructure.carouselCards) {
                        const cards = templateStructure.carouselCards.map((card: any, idx: number) => {
                            const cardComponents: any[] = []

                            const numericMediaId = resolvedCardMediaIds[idx]
                            if (card.hasHeader && card.headerFormat === 'IMAGE' && numericMediaId) {
                                cardComponents.push({
                                    type: "header",
                                    parameters: [{
                                        type: "image",
                                        image: { id: numericMediaId }
                                    }]
                                })
                            }

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
                        const metaData = await response.json()
                        successCount++
                        console.log(`✅ Message sent successfully! Msg ID: ${metaData.messages?.[0]?.id}`)

                        // Insert into Chat UI Database
                        const wamid = metaData.messages?.[0]?.id || null
                        const now = new Date().toISOString()

                        try {
                            // Run inserts in the background without blocking the loop
                            const templateDataPayload = {
                                header: templateHeader,
                                body: contactMessageText,
                                footer: templateFooter,
                                buttons: templateButtons,
                                template_name: templateName
                            }
                            Promise.all([
                                supabaseClient.from('messages').insert({
                                    user_email: user.email,
                                    contact_phone: phone,
                                    message: contactMessageText,
                                    message_type: 'template',
                                    template_data: templateDataPayload,
                                    direction: 'outbound',
                                    status: 'sent',
                                    wamid,
                                    created_at: now
                                }),
                                supabaseClient.from('conversations').upsert({
                                    user_email: user.email,
                                    contact_phone: phone,
                                    last_message: contactMessageText,
                                    last_message_time: now,
                                    unread_count: 0
                                }, { onConflict: 'user_email,contact_phone' })
                            ]).catch(dbErr => console.error('Error saving campaign msg to DB:', dbErr))
                        } catch (e) {
                            console.error('Error initiating DB insert:', e)
                        }

                    } else {
                        const error = await response.json()
                        failureCount++
                        console.error(`❌ WhatsApp API error for ${phone}:`, JSON.stringify(error, null, 2))
                        errors.push(`Failed to send to ${phone}: ${JSON.stringify(error)}`)
                    }
                } catch (error) {
                    failureCount++
                    console.log(`❌ Exception:`, error)
                    errors.push(`Exception sending to ${phone}: ${error instanceof Error ? error.message : 'Unknown'}`)
                }

                // Rate limiting: Wait 100ms between messages
                await delay(100)
            } // End of contact loop

            console.log(`\n📊 Final Results: ${successCount} sent, ${failureCount} failed`)
            if (errors.length > 0) console.log(`Recent Errors:`, errors.slice(0, 5))

            // Update campaign status
            let finalStatus = 'Completed'
            if (successCount === 0 && failureCount > 0) {
                finalStatus = 'Failed'
            } else if (successCount > 0 && failureCount > 0) {
                finalStatus = 'Completed' // Partial success
            }
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

        // Use EdgeRuntime.waitUntil if available to keep execution alive after returning
        if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
            EdgeRuntime.waitUntil(backgroundSend().catch((err: any) => {
                console.error('Background send utterly failed:', err);
            }));
        } else if (typeof (globalThis as any).waitUntil === 'function') {
            (globalThis as any).waitUntil(backgroundSend().catch((err: any) => {
                console.error('Background send utterly failed:', err);
            }));
        } else {
            backgroundSend().catch((err: any) => {
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

