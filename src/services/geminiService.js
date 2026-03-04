/**
 * geminiService.js
 * Handles all Gemini AI API calls for template generation.
 * Uses gemini-2.0-flash (free tier, multimodal).
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`

/**
 * Convert a File object to a base64 inline data part for Gemini multimodal.
 */
const fileToBase64Part = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = reader.result.split(',')[1]
            resolve({ inlineData: { mimeType: file.type, data: base64 } })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Core function to call the Gemini API.
 */
const callGemini = async (parts) => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
                temperature: 0.7,
                topP: 0.9,
                maxOutputTokens: 2048,
                responseMimeType: 'application/json',
            },
        }),
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.error?.message || 'Gemini API request failed')
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No response from Gemini')

    return JSON.parse(text)
}

// ─────────────────────────────────────────────
// STANDARD TEMPLATE GENERATION
// ─────────────────────────────────────────────

const STANDARD_SYSTEM_PROMPT = `
You are a WhatsApp Business Template expert. Generate a professional, compliant WhatsApp message template.

STRICT WHATSAPP RULES YOU MUST FOLLOW:
- Body text: max 1024 characters
- Header text (if TEXT type): max 60 characters
- Footer text: max 60 characters. STRICT: NO emojis, NO newlines, NO special characters.
- Button text: max 25 characters each
- CRITICAL: Generate ONLY the button types explicitly listed in the user prompt. Do NOT add extra buttons or types.
- ALLOWED VARIABLES: You may ONLY use {{first_name}} and {{phone_number}} in the body text. Do NOT invent other variables.
- UTILITY category = strictly informational, NO promotional or sales language
- MARKETING category = promotional language allowed
- No spam trigger words, no ALL CAPS abuse, no excessive emojis
- Template must feel genuine and human, not robotic
- LANGUAGE RULE: You MUST generate all copy (header, body, footer, buttons) in the EXACT language requested by the user (English, Telugu, or Hindi). Even if the user's purpose/prompt is in a different language, the OUTPUT must be in the specified target language.

Return ONLY valid JSON in this exact structure:
{
  "templateName": "short_snake_case_name (max 4 words, lowercase, underscores only)",
  "headerText": "string (max 60 chars) or empty string if no header",
  "bodyText": "string (max 1024 chars). Only {{first_name}} and {{phone_number}} are allowed as variables.",
  "footerText": "string (max 60 chars). STRICT: NO emojis, NO newlines.",
  "buttons": [],
  "suggestedVariables": ["first_name", "phone_number"]
}

The "buttons" array must contain EXACTLY the button types listed in the request — no more, no less.
For QUICK_REPLY: { "type": "QUICK_REPLY", "text": "max 25 chars" }
For URL: { "type": "URL", "text": "max 25 chars", "url": "https://..." }
For PHONE_NUMBER: { "type": "PHONE_NUMBER", "text": "max 25 chars", "phone": "+91XXXXXXXXXX" }
If no buttons are requested, return "buttons": [].
`

/**
 * Generate a standard WhatsApp template using Gemini.
 * @param {object} params
 * @param {string} params.purpose - What the template is for
 * @param {string} params.tone - 'formal' | 'friendly' | 'urgent'
 * @param {string} params.category - 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
 * @param {boolean} params.includeHeader - Whether to include a header
 * @param {boolean} params.includeFooter - Whether to include a footer
 * @param {Array}  params.buttonTypes - e.g. ['QUICK_REPLY', 'URL']
 * @param {File|null} params.headerImage - Optional header image file
 */
export const generateStandardTemplate = async ({
    purpose,
    tone = 'formal',
    language = 'English',
    category = 'UTILITY',
    includeHeader = false,
    includeFooter = false,
    buttonTypes = [],
    headerImage = null,
}) => {
    const buttonInstructions = buttonTypes.length > 0
        ? buttonTypes.map(t => {
            if (t === 'QUICK_REPLY') return `- One QUICK_REPLY button: { "type": "QUICK_REPLY", "text": "...max 25 chars..." }`
            if (t === 'URL') return `- One URL button: { "type": "URL", "text": "...max 25 chars...", "url": "https://..." }`
            if (t === 'PHONE_NUMBER') return `- One PHONE_NUMBER button: { "type": "PHONE_NUMBER", "text": "...max 25 chars...", "phone": "+91XXXXXXXXXX" }`
            return ''
        }).join('\n')
        : '- NO buttons. Return "buttons": [].'

    const userPrompt = `
Create a WhatsApp ${category} template for the following purpose:
"${purpose}"

Requirements:
- Tone: ${tone}
- TARGET LANGUAGE: ${language} (STRICT: All generated text MUST be in ${language})
- ${includeHeader ? 'Include a text header (max 60 chars)' : 'Do NOT include a header (set headerText to empty string)'}
- ${includeFooter ? 'Include a footer (max 60 chars, no emojis, no newlines)' : 'Do NOT include a footer (set footerText to empty string)'}
- Category: ${category} ${category === 'UTILITY' ? '(strictly informational, no promotion)' : '(promotional language allowed)'}
${headerImage ? '- An image has been provided as the header. Write body text that complements this image.' : ''}

BUTTONS (generate ONLY these, nothing else):
${buttonInstructions}

Generate compelling, natural-sounding copy. You may only use {{first_name}} and {{phone_number}} as variables.
`

    const parts = [
        { text: STANDARD_SYSTEM_PROMPT + '\n\n' + userPrompt },
    ]

    if (headerImage) {
        const imagePart = await fileToBase64Part(headerImage)
        parts.push(imagePart)
    }

    return callGemini(parts)
}


// ─────────────────────────────────────────────
// CAROUSEL TEMPLATE GENERATION
// ─────────────────────────────────────────────

const CAROUSEL_SYSTEM_PROMPT = `
You are a WhatsApp Carousel Template expert. Generate a compliant WhatsApp carousel message.

STRICT WHATSAPP CAROUSEL RULES:
- Main body text: max 160 characters (appears above the cards). Only {{first_name}} and {{phone_number}} variables allowed.
- Each card body text: max 160 characters
- Each card MUST have an image (the user supplies these)
- Total cards: 2 to 10
- Keep each card's copy concise, punchy, and relevant to its image
- Button text: max 25 characters each
- For URL and PHONE_NUMBER buttons, generate a short, action-oriented button label (e.g. "Shop Now", "Call Us", "Learn More"). Do NOT generate the URL or phone number itself.
- For QUICK_REPLY buttons, do NOT generate text (the user provides it).
- LANGUAGE RULE: You MUST generate all copy (mainBody, bodyText, buttonTexts) in the EXACT language requested by the user (English, Telugu, or Hindi). Even if the user's purpose/prompt is in a different language, the OUTPUT must be in the specified target language.

Return ONLY valid JSON in this exact structure:
{
  "templateName": "short_snake_case_name (max 4 words, lowercase, underscores only)",
  "mainBody": "string (max 160 chars) — intro text that appears above all cards",
  "cards": [
    {
      "bodyText": "string (max 160 chars) — description for this card",
      "buttonTexts": ["Button label 1 (max 25 chars)", "Button label 2 (max 25 chars)"]
    }
  ]
}

The "buttonTexts" array must have one entry per button type requested (in the same order).
For QUICK_REPLY buttons, set the entry to an empty string "".
`

/**
 * Generate a carousel WhatsApp template using Gemini.
 * @param {object} params
 * @param {string} params.purpose - Overall campaign purpose
 * @param {string} params.tone - 'formal' | 'friendly' | 'urgent'
 * @param {string} params.buttonType - 'QUICK_REPLY' | 'URL' | 'none'
 * @param {string[]} params.cardTopics - Optional per-card topic hints
 * @param {File[]} params.cardImages - Array of image Files, one per card
 */
export const generateCarouselTemplate = async ({
    purpose,
    tone = 'friendly',
    language = 'English',
    buttonTypes = [],
    cardTopics = [],
    cardImages = [],
}) => {
    const numCards = cardImages.length

    const cardDescriptions = cardImages.map((_, i) => {
        const topic = cardTopics[i] ? `Topic hint: "${cardTopics[i]}"` : 'Infer topic from the provided image.'
        return `Card ${i + 1}: ${topic}`
    }).join('\n')

    const userPrompt = `
Create a WhatsApp Carousel MARKETING template for the following campaign:
"${purpose}"

Requirements:
- Tone: ${tone}
- TARGET LANGUAGE: ${language} (STRICT: All generated text MUST be in ${language})
- Number of cards: ${numCards}
- Button types per card: ${buttonTypes.join(', ') || 'none'}

Per-card details:
${cardDescriptions}

Images for each card are attached below (in order). Write card copy that directly references or complements each card's image.
Keep each card body under 160 characters. Make the experience feel cohesive as a set.
For each card, generate "buttonTexts" — one entry per button type. For URL/PHONE_NUMBER buttons write a short punchy label (max 25 chars). For QUICK_REPLY set to empty string.
`

    const textPart = { text: CAROUSEL_SYSTEM_PROMPT + '\n\n' + userPrompt }
    const parts = [textPart]

    // Attach all card images
    for (const img of cardImages) {
        const imagePart = await fileToBase64Part(img)
        parts.push(imagePart)
    }

    return callGemini(parts)
}
