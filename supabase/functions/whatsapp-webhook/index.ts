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
    contact: { name?: string; first_name?: string;[key: string]: any }
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
            .select('email, webhook_token, secret_token, meta_access_token, meta_phone_number_id, meta_business_account_id, contacts')
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

            const messages = body.entry?.[0]?.changes?.[0]?.value?.messages || []
            const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses || []
            const eventType = messages.length > 0 ? 'message' : statuses.length > 0 ? 'status' : 'unknown'

            const { data: logData } = await supabase
                .from('webhook_logs')
                .insert({ user_email: user.email, webhook_token: token, event_type: eventType, payload: body, processed: false })
                .select().single()

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
                    contact
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
