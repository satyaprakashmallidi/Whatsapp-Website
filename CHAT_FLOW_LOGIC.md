# WhatsApp Chat Flow Logic Reference

This document explains how inputs (sending) and outputs (receiving) are handled in this project.

## 1. Chat Input: Sending a Message
When a user types a message in the UI and clicks "Send", the following flow occurs:

### Frontend Trigger (`Chats.jsx`)
The `sendMessage` function calls the Supabase Edge Function.
```javascript
const sendMessage = async () => {
    // ... validation ...
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
            phone: selectedConversation.phone, 
            message: text.trim() 
        }),
    });
    // ... refresh messages ...
};
```

### Backend Processing (`supabase/functions/send-message/index.ts`)
The Edge Function handles the secure communication with Meta.
```typescript
// 1. Send to Meta (WhatsApp Cloud API)
await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, ... },
    body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
    }),
});

// 2. Log in Database
await supabase.from("messages").insert({
    phone, message, direction: "outbound", status: "sent"
});
```

---

## 2. Chat Output: Receiving a Message
When a customer sends a message, Meta hits your Webhook.

### Webhook Handling (`supabase/functions/webhook/index.ts`)
The webhook parses the data and saves it.
```typescript
// 1. Extract from Meta Payload
const msg = body.entry[0].changes[0].value.messages[0];
const phone = msg.from;
const text = msg.text.body;

// 2. Save Inbound Message
await supabase.from("messages").insert({
    phone,
    message: text,
    direction: "inbound",
    status: "received",
});

// 3. Update Conversation List
await supabase.from("conversations").upsert({
    phone,
    last_message: text,
    updated_at: new Date().toISOString()
});
```

---

## 3. Real-time UI Update
The frontend stays in sync using Supabase Realtime in `Chats.jsx`.

```javascript
supabase
    .channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // If the new message belongs to the open chat, refresh view
        if (selectedConversation && payload.new.phone === selectedConversation.phone) {
            fetchMessages(selectedConversation.phone);
        }
        fetchConversations(); // Update sidebar "Last message"
    })
    .subscribe();
```
