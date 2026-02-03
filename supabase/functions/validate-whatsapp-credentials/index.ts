// Supabase Edge Function to validate WhatsApp Business API credentials
// This function validates that the access token, phone number ID, and business account ID
// all belong to the same WhatsApp Business account

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface ValidationRequest {
  accessToken: string
  phoneNumberId: string
  businessAccountId: string
}

interface ValidationResponse {
  valid: boolean
  error?: string
  details?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken, phoneNumberId, businessAccountId }: ValidationRequest = await req.json()

    // Validate input
    if (!accessToken || !phoneNumberId || !businessAccountId) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Missing required fields: accessToken, phoneNumberId, or businessAccountId'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    console.log('Starting validation...')
    console.log('Business Account ID:', businessAccountId)
    console.log('Phone Number ID:', phoneNumberId)

    // Step 1: Verify access token works
    console.log('Step 1: Verifying access token...')
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?access_token=${accessToken}`
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token validation failed:', errorData)
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid access token',
          details: errorData.error?.message || 'The access token is invalid or expired.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const tokenData = await tokenResponse.json()
    console.log('Token validated successfully:', tokenData)

    // Step 2: Fetch phone numbers under the WABA ID
    console.log('Step 2: Fetching phone numbers for WABA...')
    const phonesResponse = await fetch(
      `https://graph.facebook.com/v21.0/${businessAccountId}/phone_numbers?access_token=${accessToken}`
    )

    if (!phonesResponse.ok) {
      const errorData = await phonesResponse.json()
      console.error('WABA phone fetch failed:', errorData)
      
      // Check if it's a permissions error
      if (errorData.error?.code === 190) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Access token permissions issue',
            details: 'Token does not have required permissions for this Business Account. Ensure token has "whatsapp_business_messaging" and "whatsapp_business_management" permissions.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }

      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid Business Account ID',
          details: errorData.error?.message || 'The Business Account ID does not match the access token or does not exist.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const phonesData = await phonesResponse.json()
    console.log('Phone numbers fetched:', phonesData)

    // Step 3: Check if Phone Number ID is in the list
    console.log('Step 3: Checking if Phone Number ID matches...')
    const phoneMatch = phonesData.data?.some((phone: any) => phone.id === phoneNumberId)

    if (!phoneMatch) {
      console.error('Phone ID not found in WABA')
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Phone Number ID mismatch',
          details: `The Phone Number ID (${phoneNumberId}) does not belong to Business Account ${businessAccountId}. Please verify your credentials in Meta Business Manager.`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Step 4: Optional - Get phone details for additional validation
    console.log('Step 4: Fetching phone number details...')
    const phoneDetailsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating&access_token=${accessToken}`
    )

    let phoneDetails = null
    if (phoneDetailsResponse.ok) {
      phoneDetails = await phoneDetailsResponse.json()
      console.log('Phone details:', phoneDetails)
    }

    // All validations passed!
    console.log('✓ All validations passed successfully')
    return new Response(
      JSON.stringify({
        valid: true,
        details: phoneDetails?.verified_name 
          ? `Connected to: ${phoneDetails.verified_name} (${phoneDetails.display_phone_number || 'N/A'})`
          : 'All credentials are valid and properly linked.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Validation error:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'An unexpected error occurred during validation.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
