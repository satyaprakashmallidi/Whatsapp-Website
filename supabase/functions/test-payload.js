import "dotenv/config";

const PHONE_ID = "973073362553621";
const TOKEN = process.env.SUPABASE_ANON_KEY; // Replace with actual token locally, or I'll just hardcode a placeholder for the script to use the DB token

// For testing purposes, I will query the DB for the token first
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cxmolmsrnofplxvsqsdp.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPayload() {
    const { data } = await supabase.from('User_details').select('meta_access_token').eq('email', 'mspreddy7891@gmail.com').single();
    const token = data.meta_access_token;

    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "+917013252723",
        type: "template",
        template: {
            name: "account_profile_details_test",
            language: {
                code: "en_US"
            },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: "Satya", parameter_name: "first_name" }
                    ]
                },
                {
                    type: "carousel",
                    cards: [
                        {
                            card_index: 0,
                            components: [
                                {
                                    type: "header",
                                    parameters: [
                                        { type: "image", image: { id: "2077152616377337" } }
                                    ]
                                }
                            ]
                        },
                        {
                            card_index: 1,
                            components: [
                                {
                                    type: "header",
                                    parameters: [
                                        { type: "image", image: { id: "813749991014680" } }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };

    const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
}

testPayload().catch(console.error);
