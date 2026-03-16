import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { phone, message, userEmail } = await req.json();

        if (!phone || !message || !userEmail) {
            return new Response(
                JSON.stringify({ error: "phone, message, and userEmail are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Fetch settings
        const { data: settings } = await supabase
            .from("User_details")
            .select("meta_access_token, meta_phone_number_id")
            .eq("email", userEmail)
            .single();

        if (!settings?.meta_access_token || !settings?.meta_phone_number_id) {
            return new Response(
                JSON.stringify({ error: "WhatsApp credentials not configured" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Send message via WhatsApp Cloud API
        const waRes = await fetch(
            `https://graph.facebook.com/v20.0/${settings.meta_phone_number_id}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${settings.meta_access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: phone,
                    type: "text",
                    text: { body: message },
                }),
            }
        );

        const waData = await waRes.json();

        if (!waRes.ok) {
            return new Response(
                JSON.stringify({ error: waData.error?.message || "WhatsApp API error" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const now = new Date().toISOString();

        // Save outbound message
        await supabase.from("messages").insert({
            user_email: userEmail,
            contact_phone: phone,
            message: message,
            direction: "outbound",
            status: "sent",
            wamid: waData.messages?.[0]?.id || null,
            created_at: now,
        });

        // Update conversation
        await supabase.from("conversations").upsert(
            {
                user_email: userEmail,
                contact_phone: phone,
                last_message: message,
                last_message_time: now,
                unread_count: 0
            },
            { onConflict: "user_email,contact_phone" }
        );

        return new Response(
            JSON.stringify({ success: true, message_id: waData.messages?.[0]?.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("send-message error:", e);
        return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
