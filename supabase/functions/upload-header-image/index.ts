// Supabase Edge Function to upload header images to Meta using Resumable Upload API
// Returns the "h" handle required for template creation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string
    
    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('📦 File info:', {
      name: file.name,
      type: fileType || file.type,
      size: file.size
    })

    // Get user's Meta credentials (need App ID for resumable upload)
    const { data: userData, error: credError } = await supabaseClient
      .from('User_details')
      .select('meta_access_token, meta_business_account_id, meta_app_id')
      .eq('email', user.email)
      .single()

    if (credError || !userData?.meta_access_token || !userData?.meta_app_id) {
      console.error('❌ Credentials error:', credError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Meta credentials not found',
          message: 'Please configure your Meta App ID in Profile Settings. The App ID is required for uploading media.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { meta_access_token, meta_app_id } = userData

    // Convert file to bytes
    const fileBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(fileBuffer)

    // ========================================
    // STEP 1: Start Upload Session (Resumable Upload API)
    // Note: The Resumable Upload API requires the App ID, not the WABA ID
    // ========================================
    const sessionUrl = `https://graph.facebook.com/v21.0/${meta_app_id}/uploads?file_length=${fileBytes.length}&file_type=${encodeURIComponent(fileType || file.type)}`
    
    console.log('📤 STEP 1: Starting upload session')
    console.log('   URL:', sessionUrl)
    console.log('   File size:', fileBytes.length, 'bytes')

    const sessionResponse = await fetch(sessionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${meta_access_token}`
      }
    })

    const sessionData = await sessionResponse.json()
    console.log('📥 STEP 1 Response:', JSON.stringify(sessionData, null, 2))

    if (!sessionResponse.ok || !sessionData.id) {
      console.error('❌ Session creation failed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create upload session',
          message: sessionData.error?.message || 'Could not start resumable upload',
          details: sessionData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const sessionId = sessionData.id  // Format: "upload:ATh..."
    console.log('✅ Session ID obtained:', sessionId)

    // ========================================
    // STEP 2: Upload Binary Content
    // ========================================
    const uploadUrl = `https://graph.facebook.com/v21.0/${sessionId}`
    
    console.log('📤 STEP 2: Uploading file binary')
    console.log('   URL:', uploadUrl)

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${meta_access_token}`,
        'file_offset': '0'
      },
      body: fileBytes
    })

    const uploadData = await uploadResponse.json()
    console.log('📥 STEP 2 Response:', JSON.stringify(uploadData, null, 2))

    if (!uploadResponse.ok) {
      console.error('❌ Binary upload failed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to upload file',
          message: uploadData.error?.message || 'Could not upload file binary',
          details: uploadData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // ========================================
    // Validate Response: Must contain "h" field
    // ========================================
    if (!uploadData.h) {
      console.error('❌ No "h" handle in response')
      console.error('   Got:', uploadData)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid upload response',
          message: 'Meta did not return a template handle ("h" field). Expected format: {"h": "4:aTw7..."}',
          details: uploadData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅✅ SUCCESS! Handle obtained:', uploadData.h)

    return new Response(
      JSON.stringify({
        success: true,
        handle: uploadData.h,
        message: 'Image uploaded successfully with template handle'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Upload error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
