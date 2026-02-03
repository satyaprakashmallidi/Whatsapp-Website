# Meta WhatsApp Business API Integration Guide

## Overview

Your application now uses **Meta's official WhatsApp Business API** directly (no third-party services like AiSensy). This gives you:
- ✅ Direct control over WhatsApp messaging
- ✅ Better reliability and delivery rates
- ✅ Access to all WhatsApp Business features
- ✅ Lower costs (no middleman fees)
- ✅ Real-time message status tracking

## What Changed

### Removed
- ❌ AiSensy API integration
- ❌ `VITE_AISENSY_API_KEY` environment variable
- ❌ Third-party API dependencies

### Added
- ✅ Direct Meta WhatsApp Business API integration
- ✅ User-specific WhatsApp credentials in Profile Settings
- ✅ Meta API token management in database
- ✅ Template-based messaging support

## How It Works Now

### 1. User Setup (One-Time)
1. User logs into your application
2. Clicks on their profile button in the sidebar
3. Enters their Meta WhatsApp API credentials:
   - Meta Access Token
   - Meta Phone Number ID
   - Meta Business Account ID
4. Saves the settings (stored securely in Supabase)

### 2. Campaign Sending
When a user sends a campaign:
1. System fetches their Meta API credentials from database
2. Validates credentials are configured
3. Loops through all contacts in the selected audience
4. Sends WhatsApp template messages via Meta's API
5. Tracks success/failure for each contact
6. Updates campaign status and delivery stats

## API Implementation Details

### Endpoint
```
POST https://graph.facebook.com/v21.0/{phone-number-id}/messages
```

### Authentication
```
Authorization: Bearer {access-token}
```

### Request Format
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "template",
  "template": {
    "name": "campaign_name",
    "language": {
      "code": "en"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Contact Name"
          }
        ]
      }
    ]
  }
}
```

### Success Response
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{"input": "1234567890", "wa_id": "1234567890"}],
  "messages": [{"id": "wamid.XXXXX"}]
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "type": "OAuthException",
    "code": 190
  }
}
```

## Setting Up Meta WhatsApp Business API

### Step 1: Create a Meta Developer Account
1. Go to https://developers.facebook.com
2. Sign up or log in
3. Accept the Terms of Service

### Step 2: Create a WhatsApp Business App
1. Click "My Apps" → "Create App"
2. Select "Business" as app type
3. Fill in app details and create

### Step 3: Add WhatsApp Product
1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. Follow the setup wizard

### Step 4: Get Your Credentials

#### A. Access Token
**Temporary Token (for testing):**
1. Go to WhatsApp → API Setup
2. Copy the "Temporary access token"
3. Valid for 24 hours

**Permanent Token (for production):**
1. Go to WhatsApp → API Setup
2. Click "Generate permanent token"
3. Select required permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy and save securely

#### B. Phone Number ID
1. In WhatsApp → API Setup
2. Under "From", you'll see your phone number
3. The Phone Number ID is shown below it
4. Format: `123456789012345`

#### C. Business Account ID
1. Go to Business Settings → Business Info
2. Find "Business Manager ID"
3. Or check the URL: `business.facebook.com/settings/XXXXX`
4. The XXXXX is your Business Account ID

### Step 5: Create Message Templates

WhatsApp requires pre-approved templates for business messaging:

1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Fill in template details:
   - **Name:** Use lowercase and underscores (e.g., `order_confirmation`)
   - **Category:** Marketing, Utility, or Authentication
   - **Language:** Select your language
   - **Content:** Add your message with variables like `{{1}}`
4. Submit for approval (usually approved within 24 hours)

**Example Template:**
```
Hello {{1}},

Your order has been confirmed. We will deliver it within {{2}} days.

Thank you for shopping with us!
```

### Step 6: Configure in Your App
1. Log into your Campaign Hub
2. Click your profile button
3. Enter the credentials you collected
4. Save settings

## Using Templates in Campaigns

### Template Naming Convention
When creating campaigns, use the **exact template name** you created in Meta:
- ✅ Correct: `order_confirmation` (matches Meta template)
- ❌ Wrong: `Order Confirmation` (won't match)

### Template Parameters
The current implementation passes:
- **Parameter 1:** Contact name
- More parameters can be added in the template configuration

### Customizing Templates
To modify template parameters, update the `sendCampaign` function in `DataContext.jsx`:

```javascript
components: [
  {
    type: 'body',
    parameters: [
      { type: 'text', text: contact.name },           // {{1}}
      { type: 'text', text: 'Your custom value' },    // {{2}}
      { type: 'text', text: contact.email }           // {{3}}
    ]
  }
]
```

## Rate Limits & Best Practices

### Meta's Rate Limits
- **Quality Rating:** Your sending limits depend on your phone number's quality rating
- **Tier System:** Start at Tier 1 (1,000 messages/day), can scale up
- **Throttling:** 80 messages per second max

### Best Practices
1. **Message Quality**
   - Keep opt-out rates low
   - Only message users who opted in
   - Provide value in every message
   - Respect user preferences

2. **Template Management**
   - Create templates for different use cases
   - Test templates before scaling
   - Monitor template performance
   - Update rejected templates

3. **Error Handling**
   - Always check API responses
   - Log errors for debugging
   - Retry failed messages appropriately
   - Monitor delivery rates

4. **Rate Limiting**
   - Add delays between messages (current: 2 seconds)
   - Monitor your tier limits
   - Request tier upgrades when needed

## Monitoring & Analytics

### Track These Metrics
- **Delivery Rate:** % of messages successfully sent
- **Read Rate:** % of delivered messages that were read
- **Response Rate:** % of messages that got replies
- **Block Rate:** % of users who blocked you

### Meta Business Manager
View detailed analytics:
1. Go to Meta Business Manager
2. Select your WhatsApp Business Account
3. View Insights and Analytics
4. Monitor message performance

## Troubleshooting

### "Please configure your WhatsApp API credentials"
**Solution:** User hasn't set up credentials in Profile Settings

### "Invalid access token" (Error 190)
**Solutions:**
- Token expired (generate new permanent token)
- Wrong token copied
- Token doesn't have required permissions

### "Phone number not verified" (Error 100)
**Solution:** Complete phone number verification in Meta Business Manager

### "Template not found" (Error 132000)
**Solutions:**
- Template name doesn't match exactly
- Template not approved yet
- Template was rejected or disabled

### "Rate limit exceeded" (Error 80007)
**Solutions:**
- Reduce message frequency
- Add longer delays between messages
- Request tier upgrade
- Check your quality rating

### Messages not delivering
**Checklist:**
1. ✓ Template is approved
2. ✓ Phone numbers are valid WhatsApp numbers
3. ✓ Access token is valid
4. ✓ Phone number ID is correct
5. ✓ Users have opted in to receive messages
6. ✓ Not hitting rate limits

## Security Considerations

### Token Security
- ✅ Tokens stored with Row Level Security
- ✅ HTTPS encryption in transit
- ✅ Password-style inputs in UI
- ⚠️ Consider adding encryption at rest (see SECURITY_GUIDE.md)

### Best Practices
1. Use permanent tokens (not temporary)
2. Rotate tokens periodically
3. Never commit tokens to git
4. Enable 2FA on Meta Developer account
5. Monitor for suspicious activity
6. Revoke compromised tokens immediately

## Cost Information

### Meta WhatsApp Pricing (as of 2024)
- **Marketing Messages:** Vary by country
  - US: ~$0.03 per message
  - India: ~$0.01 per message
- **Utility Messages:** Lower cost
- **Authentication Messages:** Free (limited quantity)

### Billing
- Billed through Meta Business Manager
- Monthly invoices
- Pre-paid or post-paid options
- Usage limits based on tier

## Upgrading Your Tier

As your messaging volume grows:

1. **Tier 1:** 1,000 messages/day (starting tier)
2. **Tier 2:** 10,000 messages/day
3. **Tier 3:** 100,000 messages/day
4. **Tier 4:** Unlimited (requires approval)

**How to upgrade:**
- Maintain high quality rating
- Follow messaging policies
- Request upgrade in Meta Business Manager
- Usually approved within 24-48 hours

## Additional Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/business-platform)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

## Support

**Meta Support:**
- Developer Support: https://developers.facebook.com/support/
- WhatsApp Business Help: https://business.facebook.com/help

**Common Issues:**
- Check Meta's Status Page for outages
- Review error codes in API documentation
- Join Meta Developer Community forums

## Migration from AiSensy

If you were using AiSensy before:

### What to Update
1. ✅ Remove old AiSensy API key from environment variables
2. ✅ Set up Meta API credentials in Profile Settings
3. ✅ Create templates in Meta Business Manager (if not done)
4. ✅ Update campaign template names to match Meta templates
5. ✅ Test with a small audience first

### Benefits of Direct Integration
- Lower costs (no middleman)
- Better reliability
- More features and control
- Official Meta support
- Real-time status tracking

---

**Need Help?**
If you need assistance with:
- Setting up Meta Developer account
- Creating message templates
- Configuring webhooks
- Adding more template parameters
- Implementing delivery receipts

Let me know!
