import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/PageLoader'
import { useAlert } from '../hooks/useAlert'
import CredentialsWarning from '../components/CredentialsWarning'
import ProfileSettings from '../components/ProfileSettings'

const Templates = () => {
  const { templates, addTemplate } = useData()
  const { showAlert, AlertComponent } = useAlert()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ 
    name: '', 
    category: 'UTILITY', 
    language: 'en_US',
    // Header
    hasHeader: false,
    headerFormat: 'TEXT', // 'TEXT' or 'IMAGE'
    headerText: '',
    headerImageFile: null,
    headerImageHandle: '',
    // Body
    bodyText: '',
    // Footer
    hasFooter: false,
    footerText: '',
    // Buttons
    hasButtons: false,
    buttons: []
  })
  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState('approved')
  const [creating, setCreating] = useState(false)
  const [showParamSuggestions, setShowParamSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [updatingStatuses, setUpdatingStatuses] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const textareaRef = useRef(null)
  const headerTextareaRef = useRef(null)
  const footerTextareaRef = useRef(null)

  // Filter templates by status (default to 'approved' for backward compatibility)
  const approvedTemplates = templates.filter(t => !t.status || t.status === 'approved')
  const pendingTemplates = templates.filter(t => t.status === 'pending')
  const failedTemplates = templates.filter(t => t.status === 'failed' || t.status === 'rejected')

  // Get current templates based on active tab
  const getCurrentTemplates = () => {
    switch(activeTab) {
      case 'approved': return approvedTemplates
      case 'pending': return pendingTemplates
      case 'failed': return failedTemplates
      default: return approvedTemplates
    }
  }

  const currentTemplates = getCurrentTemplates()

  // Parameter suggestions with Indian examples
  const parameterOptions = [
    { label: 'First Name', value: '{{first_name}}', example: 'Rahul' },
    { label: 'Phone Number', value: '{{phone_number}}', example: '+919876543210' },
    { label: 'Email', value: '{{email}}', example: 'rahul@example.com' }
  ]

  // Sanitize template name (lowercase, underscores only)
  const sanitizeTemplateName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
  }

  // Extract parameters from body text
  const extractParameters = (text) => {
    const paramRegex = /\{\{(\w+)\}\}/g
    const params = []
    let match
    
    while ((match = paramRegex.exec(text)) !== null) {
      const paramName = match[1]
      let example = 'Example'
      
      // Set appropriate examples based on parameter name (Indian examples)
      if (paramName === 'first_name' || paramName.includes('name')) {
        example = 'Rahul'
      } else if (paramName === 'phone_number' || paramName.includes('phone')) {
        example = '+919876543210'
      } else if (paramName === 'email') {
        example = 'rahul@example.com'
      }
      
      params.push({
        param_name: paramName,
        example: example
      })
    }
    
    return params
  }

  // Handle text change with parameter detection
  const handleBodyTextChange = (e) => {
    const text = e.target.value
    const cursorPos = e.target.selectionStart
    
    setNewTemplate({ ...newTemplate, bodyText: text })
    setCursorPosition(cursorPos)
    
    // Check if user just typed {
    if (text[cursorPos - 1] === '{' && text[cursorPos - 2] === '{') {
      setShowParamSuggestions(true)
    } else {
      setShowParamSuggestions(false)
    }
  }

  // Insert parameter at cursor position
  const insertParameter = (paramValue) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const text = newTemplate.bodyText
    const beforeCursor = text.substring(0, cursorPosition - 2) // Remove the {{
    const afterCursor = text.substring(cursorPosition)
    
    const newText = beforeCursor + paramValue + afterCursor
    
    setNewTemplate({ ...newTemplate, bodyText: newText })
    setShowParamSuggestions(false)
    
    // Set cursor position after inserted parameter
    setTimeout(() => {
      const newCursorPos = beforeCursor.length + paramValue.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  // Handle syncing templates from Meta
  const handleSyncTemplates = async () => {
    setSyncing(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-templates`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        showAlert({
          title: 'Sync Failed',
          message: `${data.message || data.error}`,
          type: 'error'
        })
      } else {
        showAlert({
          title: 'Templates Synced Successfully!',
          message: `Total: ${data.details.total}\nNew: ${data.details.new}\nUpdated: ${data.details.updated}`,
          type: 'success',
          onClose: () => window.location.reload()
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      showAlert({
        title: 'Sync Failed',
        message: 'Failed to sync templates. Please try again.',
        type: 'error'
      })
    } finally {
      setSyncing(false)
    }
  }

  // Handle image upload to get media handle
  const handleImageUpload = async (file) => {
    if (!file) return null

    setUploadingImage(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-header-image`
      
      // Create FormData to send file to Edge Function
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', file.type)

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      console.log('Upload response:', data)

      if (!response.ok || !data.success || !data.handle) {
        console.error('Upload failed:', data)
        throw new Error(data.error || data.message || 'Image upload failed')
      }

      console.log('✅ Image uploaded successfully! Handle:', data.handle)
      
      // Show warning if we got ID instead of full handle
      if (data.warning) {
        showAlert({
          title: 'Image Uploaded (Warning)',
          message: data.warning + '\n\nWe will try to use it anyway.',
          type: 'warning'
        })
      } else {
        showAlert({
          title: 'Image Uploaded!',
          message: 'Header image uploaded successfully',
          type: 'success'
        })
      }
      
      return data.handle
    } catch (error) {
      console.error('Image upload error:', error)
      showAlert({
        title: 'Image Upload Failed',
        message: error.message || 'Failed to upload image to Meta',
        type: 'error'
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  // Handle updating template statuses from Meta
  const handleUpdateStatuses = async () => {
    setUpdatingStatuses(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-template-statuses`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        showAlert({
          title: 'Update Failed',
          message: `${data.message || data.error}`,
          type: 'error'
        })
      } else {
        showAlert({
          title: 'Status Update Complete!',
          message: `Total: ${data.details.total}\nUpdated: ${data.details.updated}\nUnchanged: ${data.details.unchanged}\nFailed: ${data.details.failed}`,
          type: 'success',
          onClose: () => window.location.reload()
        })
      }
    } catch (error) {
      console.error('Update statuses error:', error)
      showAlert({
        title: 'Update Failed',
        message: 'Failed to update statuses. Please try again.',
        type: 'error'
      })
    } finally {
      setUpdatingStatuses(false)
    }
  }

  // Validate template against Meta's rules
  const validateTemplate = (bodyText, parameters) => {
    const textWithoutParams = bodyText.replace(/\{\{(\w+)\}\}/g, '').trim()
    const wordCount = textWithoutParams.split(/\s+/).filter(w => w.length > 0).length
    
    // Meta's rules:
    // 1. Max 5 parameters per template
    if (parameters.length > 5) {
      return {
        valid: false,
        error: 'Maximum 5 parameters allowed per template'
      }
    }
    
    // 2. Parameter-to-text ratio: need at least 5 words per parameter
    const minWordsNeeded = parameters.length * 5
    if (parameters.length > 0 && wordCount < minWordsNeeded) {
      return {
        valid: false,
        error: `Message too short for ${parameters.length} parameter(s). You need at least ${minWordsNeeded} words, but have only ${wordCount} words. Add ${minWordsNeeded - wordCount} more words.`
      }
    }
    
    // 3. Message must NOT end with a parameter (even with punctuation after)
    // Meta rejects parameters at the end even if followed by punctuation like . ! ?
    const endsWithParam = /\{\{(\w+)\}\}[\s.,!?;:]*$/.test(bodyText.trim())
    if (endsWithParam) {
      return {
        valid: false,
        error: 'Message cannot end with a parameter. Add meaningful text (not just punctuation) after the last parameter.'
      }
    }

    // 3b. Message must NOT start with a parameter
    const startsWithParam = /^\s*\{\{(\w+)\}\}/.test(bodyText)
    if (startsWithParam) {
      return {
        valid: false,
        error: 'Message cannot start with a parameter. Add some text before the first parameter.'
      }
    }
    
    // 4. Minimum body text length (without parameters)
    if (bodyText.length < 20) {
      return {
        valid: false,
        error: 'Template body must be at least 20 characters long'
      }
    }
    
    return { valid: true }
  }

  // Button management functions
  const addButton = (type) => {
    const newButton = {
      id: Date.now(),
      type: type,
      text: type === 'URL' ? 'Visit Website' : type === 'PHONE_NUMBER' ? 'Call Us' : 'Quick Reply',
      url: type === 'URL' ? 'https://example.com' : '',
      phone_number: type === 'PHONE_NUMBER' ? '+911234567890' : ''
    }
    setNewTemplate({...newTemplate, buttons: [...newTemplate.buttons, newButton]})
  }

  const updateButton = (id, field, value) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons.map(btn => btn.id === id ? {...btn, [field]: value} : btn)
    })
  }

  const removeButton = (id) => {
    setNewTemplate({...newTemplate, buttons: newTemplate.buttons.filter(btn => btn.id !== id)})
  }

  // Preview rendering function
  const renderPreview = () => {
    const exampleParams = {
      first_name: 'Rahul',
      phone_number: '+919876543210',
      email: 'rahul@example.com'
    }
    
    let previewBody = newTemplate.bodyText
    Object.keys(exampleParams).forEach(key => {
      previewBody = previewBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), exampleParams[key])
    })

    return (
      <div className="bg-[#E5DDD5] p-4 rounded-lg flex flex-col" style={{ minHeight: '400px' }}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
          <h3 className="font-semibold text-gray-700">WhatsApp Preview</h3>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showPreview ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showPreview && (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-md max-w-sm w-full p-3 space-y-2">
              {/* Header */}
              {newTemplate.hasHeader && (
                <div className="border-b border-gray-200 pb-2">
                  {newTemplate.headerFormat === 'TEXT' && newTemplate.headerText && (
                    <div className="font-bold text-gray-900">{newTemplate.headerText}</div>
                  )}
                  {newTemplate.headerFormat === 'IMAGE' && newTemplate.headerImageFile && (
                    <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
              
              {/* Body */}
              <div className="text-gray-800 text-sm whitespace-pre-wrap">
                {previewBody || 'Your message will appear here...'}
              </div>
              
              {/* Footer */}
              {newTemplate.hasFooter && newTemplate.footerText && (
                <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
                  {newTemplate.footerText}
                </div>
              )}
              
              {/* Buttons */}
              {newTemplate.hasButtons && newTemplate.buttons.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-200">
                  {newTemplate.buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full py-2 text-sm text-center text-[#00A5F4] font-medium border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {btn.type === 'URL' && '🔗 '}
                      {btn.type === 'PHONE_NUMBER' && '📞 '}
                      {btn.type === 'QUICK_REPLY' && '↩️ '}
                      {btn.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Sanitize template name
      const sanitizedName = sanitizeTemplateName(newTemplate.name)

      if (!sanitizedName) {
        showAlert({
          title: 'Invalid Template Name',
          message: 'Please enter a valid template name',
          type: 'warning'
        })
        setCreating(false)
        return
      }

      // Extract parameters from body text
      const parameters = extractParameters(newTemplate.bodyText)
      
      // Validate template against Meta's rules
      const validation = validateTemplate(newTemplate.bodyText, parameters)
      if (!validation.valid) {
        showAlert({
          title: 'Template Validation Failed',
          message: validation.error,
          type: 'error'
        })
        setCreating(false)
        return
      }

      console.log('Sending to Edge Function:', {
        name: sanitizedName,
        language: newTemplate.language,
        category: newTemplate.category,
        bodyText: newTemplate.bodyText,
        parameters: parameters
      })

      // Call Edge Function to create template via Meta API
      // We need to use fetch directly to get error response body
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-template`
      
      // Build components array
      const components = []

      // Add Header component if enabled
      if (newTemplate.hasHeader) {
        if (newTemplate.headerFormat === 'TEXT' && newTemplate.headerText.trim()) {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: newTemplate.headerText.trim()
          })
        } else if (newTemplate.headerFormat === 'IMAGE' && newTemplate.headerImageHandle) {
          // For IMAGE headers, we only need format in the component
          // The example goes in a separate examples array at the root level
          components.push({
            type: 'HEADER',
            format: 'IMAGE'
          })
        }
      }

      // Add Body component (always required)
      const bodyComponent = {
        type: 'BODY',
        text: newTemplate.bodyText
      }

      // Add examples for body parameters if any
      if (parameters.length > 0) {
        bodyComponent.example = {
          body_text_named_params: parameters.map(param => {
            // Handle both string and object formats
            const paramString = typeof param === 'string' ? param : param.value || param.param_name || ''
            const paramName = paramString.replace(/[{}]/g, '')
            const matchedOption = parameterOptions.find(p => p.value === paramString || p.value.includes(paramName))
            
            return {
              param_name: paramName,
              example: matchedOption?.example || 'example'
            }
          })
        }
      }

      components.push(bodyComponent)

      // Add Footer component if enabled
      if (newTemplate.hasFooter && newTemplate.footerText.trim()) {
        components.push({
          type: 'FOOTER',
          text: newTemplate.footerText.trim()
        })
      }

      if (newTemplate.hasButtons && newTemplate.buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: newTemplate.buttons.map(btn => {
            const button = { type: btn.type, text: btn.text }
            if (btn.type === 'URL') button.url = btn.url
            if (btn.type === 'PHONE_NUMBER') button.phone_number = btn.phone_number
            return button
          })
        })
      }

      console.log('Sending to Edge Function:', {
        name: sanitizedName,
        language: newTemplate.language,
        category: newTemplate.category,
        components: components,
        hasImageHeader: newTemplate.hasHeader && newTemplate.headerFormat === 'IMAGE',
        headerHandle: newTemplate.headerImageHandle
      })

      const edgeResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: sanitizedName,
          language: newTemplate.language,
          category: newTemplate.category,
          components: components,
          headerHandle: newTemplate.hasHeader && newTemplate.headerFormat === 'IMAGE' ? newTemplate.headerImageHandle : null
        })
      })

      const data = await edgeResponse.json()
      console.log('Edge Function response:', data)
      
      // Log full error details for debugging
      if (data.details) {
        console.log('Full error details:', JSON.stringify(data.details, null, 2))
      }

      // Check for errors
      if (!edgeResponse.ok || !data.success) {
        console.error('Edge Function failed:', data)
        
        // Get error message
        const errorMsg = data?.message || data?.error || 'Unknown error'
        const metaError = data?.details?.error?.message || ''
        const errorDetails = data?.details ? `\n\nFull Details: ${JSON.stringify(data.details, null, 2)}` : ''
        
        showAlert({
          title: 'Failed to Create Template',
          message: `${errorMsg}${metaError ? `\n\nMeta Error: ${metaError}` : ''}${errorDetails}`,
          type: 'error'
        })
        setCreating(false)
        return
      }

      if (!data || !data.success) {
        console.error('Template creation failed:', data)
        // Show detailed error message
        const errorMsg = data?.message || data?.error || 'Unknown error'
        const errorDetails = data?.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : ''
        showAlert({
          title: 'Failed to Create Template',
          message: `${errorMsg}${errorDetails}`,
          type: 'error'
        })
        setCreating(false)
        return
      }

      console.log('Template created:', data)

      // Reset form
      setNewTemplate({ 
        name: '', 
        category: 'UTILITY', 
        language: 'en_US',
        hasHeader: false,
        headerFormat: 'TEXT',
        headerText: '',
        headerImageFile: null,
        headerImageHandle: '',
        bodyText: '',
        hasFooter: false,
        footerText: ''
      })
      setShowCreateForm(false)
      
      // Refresh page to show new template in pending tab
      showAlert({
        title: 'Template Created Successfully!',
        message: 'Your template is pending Meta approval.',
        type: 'success'
      })
      setTimeout(() => window.location.reload(), 1500)

    } catch (error) {
      console.error('Template creation error:', error)
      showAlert({
        title: 'Creation Failed',
        message: 'Failed to create template. Please try again.',
        type: 'error'
      })
    } finally {
      setCreating(false)
    }
  }


  return (
    <PageLoader delay={350}>
      <AlertComponent />
      <div className="p-8">
        {/* Credentials Warning */}
        <CredentialsWarning onOpenSettings={() => setShowProfileSettings(true)} />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates</h1>
            <p className="text-gray-600">Create and manage WhatsApp message templates</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
          >
            Create New Template
          </button>
        </div>
        
        {/* Sync Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncTemplates}
            disabled={syncing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync Templates</span>
              </>
            )}
          </button>

          <button
            onClick={handleUpdateStatuses}
            disabled={updatingStatuses}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {updatingStatuses ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Update Statuses</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approved'
                ? 'border-[#FFC107] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved ({approvedTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-[#FFC107] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending ({pendingTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab('failed')}
            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'failed'
                ? 'border-[#FFC107] text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Failed ({failedTemplates.length})
          </button>
        </div>
      </div>

      {/* Info Messages */}
      {activeTab === 'pending' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">Awaiting Approval</p>
            <p className="text-sm text-blue-700 mt-1">Your templates need to be approved by Meta before they can be used in campaigns.</p>
          </div>
        </div>
      )}

      {activeTab === 'failed' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Approval Rejected</p>
            <p className="text-sm text-red-700 mt-1">Meta didn't approve your template. Please contact them for more information or modify your template and resubmit.</p>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {currentTemplates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'approved' && 'No approved templates yet. Create a new template to get started.'}
            {activeTab === 'pending' && 'No pending templates.'}
            {activeTab === 'failed' && 'No failed templates.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {currentTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                {template.status && (
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    template.status === 'approved' ? 'bg-green-100 text-green-800' :
                    template.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    template.status === 'rejected' || template.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {template.status.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {template.type}
                </span>
                {template.category && (
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                    {template.category}
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-line">{template.content}</p>
          </div>
        ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ maxWidth: '1400px' }}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create WhatsApp Template</h2>
                <button 
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewTemplate({ 
                      name: '', 
                      category: 'UTILITY', 
                      language: 'en_US',
                      hasHeader: false,
                      headerFormat: 'TEXT',
                      headerText: '',
                      headerImageFile: null,
                      headerImageHandle: '',
                      bodyText: '',
                      hasFooter: false,
                      footerText: '',
                      hasButtons: false,
                      buttons: []
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={creating}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Form Column */}
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="e.g., Order Confirmation or order_confirmation"
                    required
                    disabled={creating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be auto-converted to: <code className="bg-gray-100 px-1 rounded">{sanitizeTemplateName(newTemplate.name) || 'lowercase_with_underscores'}</code>
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    disabled={creating}
                  >
                    <option value="UTILITY">Utility (Transactional)</option>
                    <option value="MARKETING">Marketing (Promotional)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <input
                    type="text"
                    value={newTemplate.language}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">English (US) - Default</p>
                </div>

                {/* Header Section (Optional) */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <svg className="w-5 h-5 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Header (Optional)
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTemplate.hasHeader}
                        onChange={(e) => setNewTemplate({...newTemplate, hasHeader: e.target.checked})}
                        className="mr-2 w-5 h-5 text-yellow-400 focus:ring-yellow-400 rounded"
                        disabled={creating}
                      />
                      <span className="text-sm text-gray-600">Enable Header</span>
                    </label>
                  </div>

                  {newTemplate.hasHeader && (
                    <div className="space-y-3 ml-7">
                      {/* Header Format */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Format *
                        </label>
                        <select
                          value={newTemplate.headerFormat}
                          onChange={(e) => setNewTemplate({...newTemplate, headerFormat: e.target.value, headerText: '', headerImageFile: null, headerImageHandle: ''})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          disabled={creating}
                        >
                          <option value="TEXT">Text</option>
                          <option value="IMAGE">Image</option>
                        </select>
                      </div>

                      {/* Header Text Input */}
                      {newTemplate.headerFormat === 'TEXT' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Header Text *
                          </label>
                          <input
                            type="text"
                            value={newTemplate.headerText}
                            onChange={(e) => setNewTemplate({...newTemplate, headerText: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            placeholder="e.g., Order Confirmation"
                            required={newTemplate.hasHeader && newTemplate.headerFormat === 'TEXT'}
                            disabled={creating}
                          />
                        </div>
                      )}

                      {/* Header Image Upload */}
                      {newTemplate.headerFormat === 'IMAGE' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Header Image *
                          </label>
                          <div className="flex items-center space-x-3">
                            <label className="flex-1 cursor-pointer">
                              <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-400 transition-colors text-center">
                                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="text-sm text-gray-600">
                                  {newTemplate.headerImageFile ? newTemplate.headerImageFile.name : 'Choose file'}
                                </span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files[0]
                                  if (file) {
                                    setNewTemplate({...newTemplate, headerImageFile: file})
                                    const handle = await handleImageUpload(file)
                                    if (handle) {
                                      setNewTemplate(prev => ({...prev, headerImageHandle: handle}))
                                    }
                                  }
                                }}
                                disabled={creating || uploadingImage}
                              />
                            </label>
                            {uploadingImage && (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
                            )}
                            {newTemplate.headerImageHandle && (
                              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Image will be uploaded to Meta automatically
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body Text with Parameter Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Body *
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={newTemplate.bodyText}
                    onChange={handleBodyTextChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-sm"
                    placeholder="Enter your message. Type {{ to insert parameters like {{first_name}}, {{phone_number}}, {{email}}"
                    rows="8"
                    required
                    disabled={creating}
                  />
                  
                  {/* Parameter Suggestions Dropdown */}
                  {showParamSuggestions && (
                    <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-500 mb-2 px-2">Insert Parameter:</p>
                        {parameterOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => insertParameter(option.value)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm font-mono"
                          >
                            {option.label} <span className="text-gray-500">({option.value})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    Type <code className="bg-gray-100 px-1 rounded">{'{{ '}</code> to insert parameters. Available: first_name, phone_number, email
                  </p>
                </div>

                {/* Validation Status */}
                {newTemplate.bodyText && (() => {
                  const params = extractParameters(newTemplate.bodyText)
                  const validation = validateTemplate(newTemplate.bodyText, params)
                  const textWithoutParams = newTemplate.bodyText.replace(/\{\{(\w+)\}\}/g, '').trim()
                  const wordCount = textWithoutParams.split(/\s+/).filter(w => w.length > 0).length
                  const minWordsNeeded = params.length * 5
                  
                  return (
                    <div className={`p-3 rounded-lg border ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-start space-x-2">
                        {validation.valid ? (
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${validation.valid ? 'text-green-900' : 'text-red-900'}`}>
                            {validation.valid ? '✓ Template is valid and ready to submit!' : validation.error}
                          </p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className={params.length > 5 ? 'text-red-700 font-medium' : 'text-gray-600'}>
                              • Parameters: {params.length}/5 maximum {params.length > 5 && '❌'}
                            </p>
                            {params.length > 0 && (
                              <p className={wordCount < minWordsNeeded ? 'text-red-700 font-medium' : 'text-green-700'}>
                                • Words (excluding parameters): {wordCount}/{minWordsNeeded} required {wordCount >= minWordsNeeded ? '✓' : `❌ Need ${minWordsNeeded - wordCount} more`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Preview Parameters */}
                {newTemplate.bodyText && extractParameters(newTemplate.bodyText).length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-800 mb-2">Detected Parameters:</p>
                    <div className="space-y-1">
                      {extractParameters(newTemplate.bodyText).map((param, index) => (
                        <div key={index} className="text-xs text-blue-700">
                          <code className="bg-blue-100 px-2 py-0.5 rounded">
                            {'{{'}{param.param_name}{'}}'}
                          </code>
                          <span className="mx-2">→</span>
                          <span className="text-gray-600">Example: {param.example}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Section (Optional) */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Footer (Optional)
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTemplate.hasFooter}
                        onChange={(e) => setNewTemplate({...newTemplate, hasFooter: e.target.checked})}
                        className="mr-2 w-5 h-5 text-yellow-400 focus:ring-yellow-400 rounded"
                        disabled={creating}
                      />
                      <span className="text-sm text-gray-600">Enable Footer</span>
                    </label>
                  </div>

                  {newTemplate.hasFooter && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Text *
                      </label>
                      <textarea
                        ref={footerTextareaRef}
                        value={newTemplate.footerText}
                        onChange={(e) => setNewTemplate({...newTemplate, footerText: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                        placeholder="e.g., Thanks for choosing us!"
                        rows="2"
                        required={newTemplate.hasFooter}
                        disabled={creating}
                        maxLength={60}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Footer text (max 60 characters) - {newTemplate.footerText.length}/60
                      </p>
                    </div>
                  )}
                </div>

                {/* Meta Template Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📋 Meta WhatsApp Template Rules:</p>
                  <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                    <li><strong>Maximum 5 parameters</strong> per template</li>
                    <li><strong>Minimum 5 words per parameter</strong> (excluding the parameters themselves)</li>
                    <li><strong>Message cannot end with a parameter</strong> - add text after the last parameter</li>
                    <li><strong>Minimum 20 characters</strong> total message length</li>
                    <li><strong>Approval required:</strong> Templates are reviewed by Meta (usually takes a few hours to 24 hours)</li>
                  </ul>
                </div>

              {/* Buttons Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    Buttons (Optional)
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTemplate.hasButtons}
                      onChange={(e) => setNewTemplate({...newTemplate, hasButtons: e.target.checked})}
                      className="mr-2 w-5 h-5 text-yellow-400 focus:ring-yellow-400 rounded"
                      disabled={creating}
                    />
                    <span className="text-sm text-gray-600">Enable Buttons</span>
                  </label>
                </div>

                {newTemplate.hasButtons && (
                  <div className="ml-7 space-y-3">
                    {newTemplate.buttons.map((btn, idx) => (
                      <div key={btn.id} className="p-3 border border-gray-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Button {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeButton(btn.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <select
                          value={btn.type}
                          onChange={(e) => updateButton(btn.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          disabled={creating}
                        >
                          <option value="URL">URL Button</option>
                          <option value="PHONE_NUMBER">Phone Number</option>
                          <option value="QUICK_REPLY">Quick Reply</option>
                        </select>
                        
                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => updateButton(btn.id, 'text', e.target.value)}
                          placeholder="Button text"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          disabled={creating}
                        />
                        
                        {btn.type === 'URL' && (
                          <input
                            type="url"
                            value={btn.url}
                            onChange={(e) => updateButton(btn.id, 'url', e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            disabled={creating}
                          />
                        )}
                        
                        {btn.type === 'PHONE_NUMBER' && (
                          <input
                            type="tel"
                            value={btn.phone_number}
                            onChange={(e) => updateButton(btn.id, 'phone_number', e.target.value)}
                            placeholder="+911234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            disabled={creating}
                          />
                        )}
                      </div>
                    ))}
                    
                    {newTemplate.buttons.length < 3 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addButton('URL')}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          disabled={creating}
                        >
                          + URL
                        </button>
                        <button
                          type="button"
                          onClick={() => addButton('PHONE_NUMBER')}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          disabled={creating}
                        >
                          + Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => addButton('QUICK_REPLY')}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          disabled={creating}
                        >
                          + Quick Reply
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">Maximum 3 buttons allowed</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewTemplate({ 
                      name: '', 
                      category: 'UTILITY', 
                      language: 'en_US',
                      hasHeader: false,
                      headerFormat: 'TEXT',
                      headerText: '',
                      headerImageFile: null,
                      headerImageHandle: '',
                      bodyText: '',
                      hasFooter: false,
                      footerText: '',
                      hasButtons: false,
                      buttons: []
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Template</span>
                  )}
                </button>
              </div>
            </form>

            {/* Preview Column */}
            <div className="lg:border-l lg:border-gray-200 lg:pl-6">
              {renderPreview()}
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Profile Settings Modal */}
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
      </div>
    </PageLoader>
  )
}

export default Templates
