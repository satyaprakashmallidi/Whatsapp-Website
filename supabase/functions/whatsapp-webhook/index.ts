import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers (same logic as send-campaign-messages) ────────────────────────

async function uploadImageToMeta(imageUrl: string, phoneNumberId: string, accessToken: string): Promise<string | null> {
    try {
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) return null
        const imageBlob = await imageResponse.blob()
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

        const formData = new FormData()
        formData.append('file', imageBlob, 'image.jpg')
        formData.append('type', contentType)
        formData.append('messaging_product', 'whatsapp')

        const uploadResponse = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        })
        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok || !uploadData.id) return null
        return String(uploadData.id)
    } catch {
        return null
    }
}

/**
 * Fetches and parses a template's full structure from Meta — identical to get-template-details.
 */
async function fetchTemplateStructure(
    templateName: string,
    templateLanguage: string,
    accessToken: string,
    wabaId: string
): Promise<any | null> {
    try {
        const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates?name=${encodeURIComponent(templateName)}`
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
        if (!res.ok) return null
        const data = await res.json()
        const templatesFound = data?.data || []
        const template = templatesFound.find((t: any) => t.language === templateLanguage) || templatesFound[0]
        if (!template) return null

        const components = template.components || []
        const structure: any = {
            hasHeader: false, headerType: null, headerHandleId: null,
            hasCarousel: false, carouselCards: [], bodyParameters: [],
            components
        }

        const headerComponent = components.find((c: any) => c.type.toUpperCase() === 'HEADER')
        if (headerComponent?.format) {
            const format = headerComponent.format.toLowerCase()
            if (['image', 'video', 'document'].includes(format)) {
                structure.hasHeader = true
                structure.headerType = format
                structure.headerHandleId = headerComponent.example?.header_handle?.[0] || null
            }
        }

        const carouselComponent = components.find((c: any) => c.type.toUpperCase() === 'CAROUSEL')
        if (carouselComponent?.cards) {
            structure.hasCarousel = true
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
        }

        const bodyComponent = components.find((c: any) => c.type.toUpperCase() === 'BODY')
        if (bodyComponent?.text) {
            const paramMatches = bodyComponent.text.match(/\{\{[^}]+\}\}/g) || []
            structure.bodyParameters = paramMatches.map((match: string, idx: number) => {
                const content = match.replace(/\{\{|\}\}/g, '')
                const index = isNaN(parseInt(content)) ? idx + 1 : parseInt(content)
                return { index, placeholder: match, name: content }
            })
        }

        return structure
    } catch (e) {
        console.error('Failed to fetch template structure:', e)
        return null
    }
}

/**
 * Sends a follow-up template — same pipeline as send-campaign-messages:
 * fetch template structure → resolve images → build payload → send.
 */
async function sendFollowupTemplate(
    phone: string,
    templateName: string,
    templateLanguage: string,
    accessToken: string,
    phoneNumberId: string,
    wabaId: string,
    contact: { name?: string; first_name?: string;[key: string]: any },
    supabase: any,
    userEmail: string
): Promise<boolean> {
    const structure = await fetchTemplateStructure(templateName, templateLanguage, accessToken, wabaId)
    console.log(`📋 Template structure for "${templateName}":`, JSON.stringify(structure, null, 2))

    const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
            name: templateName,
            language: { code: templateLanguage }
        }
    }

    if (structure) {
        const components: any[] = []
        const firstName = contact.first_name || (contact.name ? contact.name.split(' ')[0] : null) || 'Customer'

        // ── Header image ───────────────────────────────────────────────────
        if (structure.hasHeader && structure.headerHandleId) {
            const handleUrl = structure.headerHandleId
            let mediaId: string | null = null

            if (String(handleUrl).startsWith('http')) {
                console.log(`📥 Uploading header image for follow-up template...`)
                mediaId = await uploadImageToMeta(handleUrl, phoneNumberId, accessToken)
            } else {
                mediaId = handleUrl  // already numeric ID
            }

            if (mediaId) {
                components.push({
                    type: 'header',
                    parameters: [{ type: structure.headerType, [structure.headerType]: { id: mediaId } }]
                })
                console.log(`✅ Header resolved to media ID: ${mediaId}`)
            } else {
                console.warn(`⚠️ Could not resolve header image, omitting header`)
            }
        }

        // ── Body parameters ────────────────────────────────────────────────
        if (structure.bodyParameters?.length > 0) {
            const bodyParams = structure.bodyParameters.map((param: any) => {
                const paramObj: any = { type: 'text', text: firstName }
                if (param.name && isNaN(Number(param.name))) paramObj.parameter_name = param.name
                return paramObj
            })
            components.push({ type: 'body', parameters: bodyParams })
        }

        // ── Carousel cards ─────────────────────────────────────────────────
        if (structure.hasCarousel && structure.carouselCards?.length > 0) {
            const resolvedCardIds: Record<number, string> = {}

            for (const card of structure.carouselCards) {
                const imageUrl = card.headerMediaId || card.headerImageUrl
                if (!imageUrl) continue

                if (String(imageUrl).startsWith('http')) {
                    const mediaId = await uploadImageToMeta(imageUrl, phoneNumberId, accessToken)
                    if (mediaId) resolvedCardIds[card.index] = mediaId
                } else {
                    resolvedCardIds[card.index] = String(imageUrl)
                }
            }

            const cards = structure.carouselCards.map((card: any) => {
                const cardComponents: any[] = []
                const numericMediaId = resolvedCardIds[card.index]
                if (card.hasHeader && card.headerFormat === 'IMAGE' && numericMediaId) {
                    cardComponents.push({
                        type: 'header',
                        parameters: [{ type: 'image', image: { id: numericMediaId } }]
                    })
                }
                return { card_index: card.index, components: cardComponents }
            })

            components.push({ type: 'carousel', cards })
        }

        if (components.length > 0) {
            payload.template.components = components
        }
    }

    console.log(`📤 Sending follow-up "${templateName}" to ${phone}:`, JSON.stringify(payload, null, 2))

    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })

    if (response.ok) {
        console.log(`✅ Follow-up sent successfully to ${phone}`)
        const metaData = await response.json()
        const wamid = metaData.messages?.[0]?.id || null

        // Build template_data for the Chat UI
        let templateHeader = null
        let templateBody = `[Template: ${templateName}]`
        let templateFooter = null
        let templateButtons: any[] = []

        if (structure) {
            const headerComp = structure.components.find((c: any) => c.type.toUpperCase() === 'HEADER')
            if (headerComp && headerComp.format === 'TEXT') templateHeader = headerComp.text

            const bodyComp = structure.components.find((c: any) => c.type.toUpperCase() === 'BODY')
            if (bodyComp && bodyComp.text) templateBody = bodyComp.text

            const footerComp = structure.components.find((c: any) => c.type.toUpperCase() === 'FOOTER')
            if (footerComp) templateFooter = footerComp.text

            const buttonsComp = structure.components.find((c: any) => c.type.toUpperCase() === 'BUTTONS')
            if (buttonsComp && buttonsComp.buttons) {
                templateButtons = buttonsComp.buttons.map((b: any) => ({
                    type: b.type,
                    text: b.text,
                    url: b.url || null,
                    phone_number: b.phone_number || null
                }))
            }

            // Interpolate dynamic firstName into the body text
            if (templateBody && structure.bodyParameters?.length > 0) {
                const firstName = contact.first_name || (contact.name ? contact.name.split(' ')[0] : null) || 'Customer'
                templateBody = templateBody.replace(/\{\{.+?\}\}/g, firstName)
            }
        }

        const now = new Date().toISOString()
        const templateDataPayload = {
            header: templateHeader,
            body: templateBody,
            footer: templateFooter,
            buttons: templateButtons,
            template_name: templateName
        }

        try {
            await Promise.all([
                supabase.from('messages').insert({
                    user_email: userEmail,
                    contact_phone: phone,
                    message: templateBody,
                    message_type: 'template',
                    template_data: templateDataPayload,
                    direction: 'outbound',
                    status: 'sent',
                    wamid,
                    created_at: now
                }),
                supabase.from('conversations').upsert({
                    user_email: userEmail,
                    contact_phone: phone,
                    last_message: templateBody,
                    last_message_time: now,
                    unread_count: 0
                }, { onConflict: 'user_email,contact_phone' })
            ])
            console.log(`💾 Saved follow-up template to chat database`)
        } catch (dbErr) {
            console.error('❌ Error saving follow-up msg to DB:', dbErr)
        }

        return true
    } else {
        const err = await response.json()
        console.error(`❌ Failed to send follow-up to ${phone}:`, JSON.stringify(err))
        return false
    }
}

// ─── Webhook Handler ────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const token = url.searchParams.get('token')

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        if (!token) {
            return new Response(JSON.stringify({ error: 'Missing webhook token' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const { data: user, error: userError } = await supabase
            .from('User_details')
            .select('email, webhook_token, secret_token, meta_access_token, meta_phone_number_id, meta_business_account_id, contacts, external_webhook_url, external_webhook_active')
            .eq('webhook_token', token)
            .single()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid webhook token' }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Webhook verification (GET)
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode')
            const verify_token = url.searchParams.get('hub.verify_token')
            const challenge = url.searchParams.get('hub.challenge')

            if (mode === 'subscribe' && challenge && verify_token === user.secret_token) {
                await supabase.from('webhook_logs').insert({
                    user_email: user.email, webhook_token: token,
                    event_type: 'verification', payload: { mode, verify_token, challenge }, processed: true
                })
                return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
            }
            return new Response('Invalid verification request', { status: 400 })
        }

        // Incoming events (POST)
        if (req.method === 'POST') {
            const body = await req.json()
            console.log('📥 Webhook event for user:', user.email, JSON.stringify(body, null, 2))

            // ─── Forward to External Webhook if Active ────────────────────────
            if (user.external_webhook_active && user.external_webhook_url) {
                console.log(`🚀 Forwarding payload to external webhook: ${user.external_webhook_url}`)

                // Allow up to 4 seconds for external webhook to respond with an AI reply
                // (Meta needs acknowledgment within ~10s or it retries)
                const fetchPromise = fetch(user.external_webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }).then(async res => {
                    if (res.ok) {
                        try {
                            const resJson = await res.json()
                            if (resJson && resJson.reply_message) {
                                // Extract sender's phone to send the reply back
                                const phoneFrom = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from
                                if (phoneFrom && user.meta_access_token && user.meta_phone_number_id) {
                                    console.log(`🤖 Received AI reply from webhook: "${resJson.reply_message}"`)

                                    // Split on "||" to support multi-message replies
                                    const messageParts = resJson.reply_message
                                        .split('||')
                                        .map((p: string) => p.trim())
                                        .filter((p: string) => p.length > 0)

                                    console.log(`📨 Sending ${messageParts.length} message part(s) to ${phoneFrom}`)

                                    let lastMessage = messageParts[messageParts.length - 1]

                                    for (let i = 0; i < messageParts.length; i++) {
                                        const part = messageParts[i]

                                        // Add a 500ms delay between messages (skip before the first)
                                        if (i > 0) {
                                            await new Promise(resolve => setTimeout(resolve, 500))
                                        }

                                        const metaPayload = {
                                            messaging_product: 'whatsapp',
                                            recipient_type: 'individual',
                                            to: phoneFrom,
                                            type: 'text',
                                            text: { body: part }
                                        }

                                        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${user.meta_phone_number_id}/messages`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${user.meta_access_token}`, 'Content-Type': 'application/json' },
                                            body: JSON.stringify(metaPayload)
                                        })

                                        if (metaRes.ok) {
                                            const metaData = await metaRes.json()
                                            const wamid = metaData.messages?.[0]?.id || null
                                            const now = new Date().toISOString()

                                            // Always insert each message part into the messages table
                                            await supabase.from('messages').insert({
                                                user_email: user.email,
                                                contact_phone: phoneFrom,
                                                message: part,
                                                direction: 'outbound',
                                                status: 'sent',
                                                wamid,
                                                created_at: now
                                            })

                                            // Only upsert conversation after the last message part
                                            if (i === messageParts.length - 1) {
                                                await supabase.from('conversations').upsert({
                                                    user_email: user.email,
                                                    contact_phone: phoneFrom,
                                                    last_message: part,
                                                    last_message_time: now,
                                                    unread_count: 0
                                                }, { onConflict: 'user_email,contact_phone' })
                                            }

                                            console.log(`✅ Sent part ${i + 1}/${messageParts.length}: "${part}"`)
                                        } else {
                                            console.error(`❌ Failed to send part ${i + 1} to Meta:`, await metaRes.text())
                                        }
                                    }

                                    console.log('✅ All reply parts sent from external webhook')
                                }
                            }
                        } catch (e) {
                            // Response wasn't JSON or fetch failed, that's fine
                        }
                    }
                }).catch(err => {
                    console.error('❌ Failed to forward to external webhook:', err)
                })

                // Create a 4-second timeout promise
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 4000))

                // Wait for either the webhook to finish or 4 seconds to pass
                await Promise.race([fetchPromise, timeoutPromise])
            }

            const messages = body.entry?.[0]?.changes?.[0]?.value?.messages || []
            const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses || []
            const eventType = messages.length > 0 ? 'message' : statuses.length > 0 ? 'status' : 'unknown'

            const { data: logData } = await supabase
                .from('webhook_logs')
                .insert({ user_email: user.email, webhook_token: token, event_type: eventType, payload: body, processed: false })
                .select().single()

            // ─── Store all inbound messages for Chat UI ───────────────────
            for (const message of messages) {
                const phoneFrom = message.from
                if (!phoneFrom) continue

                let messageText: string | null = null

                if (message.type === 'text') {
                    messageText = message.text?.body || null
                } else if (message.type === 'interactive') {
                    messageText = message.interactive?.button_reply?.title
                        || message.interactive?.list_reply?.title
                        || '[Interactive message]'
                } else if (message.type === 'button') {
                    messageText = message.button?.text || '[Button reply]'
                } else if (message.type === 'image') {
                    messageText = '📷 Image'
                } else if (message.type === 'document') {
                    messageText = '📄 Document'
                } else if (message.type === 'audio') {
                    messageText = '🎵 Audio'
                } else if (message.type === 'video') {
                    messageText = '🎥 Video'
                } else if (message.type === 'sticker') {
                    messageText = '🎨 Sticker'
                }

                if (messageText) {
                    const now = new Date().toISOString()

                    // Save to messages table
                    await supabase.from('messages').insert({
                        user_email: user.email,
                        contact_phone: phoneFrom,
                        message: messageText,
                        direction: 'inbound',
                        status: 'received',
                        wamid: message.id,
                        created_at: now
                    })

                    // Upsert conversation with incremented unread & last message
                    const { data: existingConvo } = await supabase
                        .from('conversations')
                        .select('unread_count, contact_name')
                        .eq('user_email', user.email)
                        .eq('contact_phone', phoneFrom)
                        .maybeSingle()

                    // Try to get contact name from user contacts
                    const allContacts: any[] = user.contacts || []
                    const norm = (p: string) => p.replace(/\D/g, '').slice(-10)
                    const matchedContact = allContacts.find((c: any) => {
                        const stored = norm(String(c.phone || c.mobile || c.whatsapp || ''))
                        return stored === norm(phoneFrom)
                    })
                    const contactName = existingConvo?.contact_name || matchedContact?.name || phoneFrom

                    await supabase.from('conversations').upsert({
                        user_email: user.email,
                        contact_phone: phoneFrom,
                        contact_name: contactName,
                        last_message: messageText,
                        last_message_time: now,
                        unread_count: (existingConvo?.unread_count || 0) + 1
                    }, { onConflict: 'user_email,contact_phone' })

                    console.log(`💬 Stored inbound message from ${phoneFrom}: "${messageText}"`)
                }
            }
            // ─────────────────────────────────────────────────────────────

            // ─── Quick Reply Button Clicks ────────────────────────────────
            for (const message of messages) {
                let senderPhone: string | null = null
                let buttonPayload: string | null = null
                let buttonTitle: string | null = null

                if (message.type === 'button') {
                    // Template quick reply
                    senderPhone = message.from
                    buttonPayload = message.button?.payload || null
                    buttonTitle = message.button?.text || null
                } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
                    // Interactive message quick reply
                    senderPhone = message.from
                    buttonPayload = message.interactive.button_reply?.id || null
                    buttonTitle = message.interactive.button_reply?.title || null
                } else {
                    continue
                }

                console.log(`🔘 Quick Reply from ${senderPhone}: payload="${buttonPayload}", title="${buttonTitle}"`)
                if (!senderPhone || (!buttonPayload && !buttonTitle)) continue

                // Flexible matching: exact → normalised → title fallback
                const matchesButton = (storedPayload: string | null, storedTitle: string | null): boolean => {
                    if (buttonPayload && storedPayload) {
                        if (storedPayload === buttonPayload) return true
                        const normIn = buttonPayload.toLowerCase().replace(/\s+/g, '_')
                        const normSt = storedPayload.toLowerCase().replace(/\s+/g, '_')
                        if (normSt === normIn || normSt.endsWith('__' + normIn)) return true
                    }
                    if (buttonTitle && storedTitle) {
                        if (storedTitle.toLowerCase() === buttonTitle.toLowerCase()) return true
                    }
                    return false
                }

                let followupTemplateName: string | null = null
                let followupTemplateLanguage = 'en_US'

                // 1. Standard rows
                const { data: standardRows } = await supabase
                    .from('template_followups')
                    .select('followup_template_name, followup_template_language, button_payload, button_title')
                    .eq('user_email', user.email)
                    .eq('template_type', 'standard')

                for (const row of (standardRows || [])) {
                    if (matchesButton(row.button_payload, row.button_title)) {
                        followupTemplateName = row.followup_template_name
                        followupTemplateLanguage = row.followup_template_language || 'en_US'
                        console.log(`✅ Matched standard rule: send "${followupTemplateName}"`)
                        break
                    }
                }

                // 2. Carousel JSONB rows
                if (!followupTemplateName) {
                    const { data: carouselRows } = await supabase
                        .from('template_followups')
                        .select('rules')
                        .eq('user_email', user.email)
                        .eq('template_type', 'carousel')

                    outerLoop: for (const row of (carouselRows || [])) {
                        for (const r of (row.rules || [])) {
                            if (matchesButton(r.button_payload, r.button_title)) {
                                followupTemplateName = r.followup_template_name
                                followupTemplateLanguage = r.followup_template_language || 'en_US'
                                console.log(`✅ Matched carousel rule: send "${followupTemplateName}"`)
                                break outerLoop
                            }
                        }
                    }
                }

                if (!followupTemplateName) {
                    console.log(`ℹ️ No follow-up rule found for payload="${buttonPayload}" / title="${buttonTitle}"`)
                    continue
                }

                if (!user.meta_access_token || !user.meta_phone_number_id) {
                    console.error('❌ User missing meta credentials')
                    continue
                }

                // Look up contact by phone to personalise parameters
                const allContacts: any[] = user.contacts || []
                const norm = (p: string) => p.replace(/\D/g, '').slice(-10)
                const contact = allContacts.find((c: any) => {
                    const stored = norm(String(c.phone || c.mobile || c.whatsapp || ''))
                    return stored === norm(senderPhone)
                }) || {}
                console.log(`👤 Contact: ${contact.name || senderPhone}`)

                await sendFollowupTemplate(
                    senderPhone,
                    followupTemplateName,
                    followupTemplateLanguage,
                    user.meta_access_token,
                    user.meta_phone_number_id,
                    user.meta_business_account_id || '',
                    contact,
                    supabase,
                    user.email
                )
            }
            // ─────────────────────────────────────────────────────────────

            if (logData?.id) {
                await supabase.from('webhook_logs').update({ processed: true }).eq('id', logData.id)
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
