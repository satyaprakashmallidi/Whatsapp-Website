import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/PageLoader'
import { useAlert } from '../hooks/useAlert'

const TestTemplateCreation = () => {
  const { addTemplate } = useData()
  const { showAlert, AlertComponent } = useAlert()
  const [newTemplate, setNewTemplate] = useState({ 
    name: 'test_template', // Pre-filled for testing
    category: 'UTILITY', 
    language: 'en_US',
    // Header
    hasHeader: false,
    headerFormat: 'TEXT',
    headerText: '',
    headerImageFile: null,
    headerImageHandle: '',
    // Body
    bodyText: 'Hello {{first_name}}, this is a test message from our system.\n\nWe are testing the WhatsApp template functionality. Your account {{phone_number}} is active and ready to receive messages.\n\nThank you for your patience during testing.',
    // Footer
    hasFooter: true,
    footerText: 'This is a test message',
    // Buttons
    hasButtons: false,
    buttons: []
  })
  const [showPreview, setShowPreview] = useState(true)
  const [creating, setCreating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const textareaRef = useRef(null)
  const footerTextareaRef = useRef(null)

  // Parameter suggestions with Indian examples
  const parameterOptions = [
    { label: 'First Name', value: '{{first_name}}', example: 'Rahul' },
    { label: 'Phone Number', value: '{{phone_number}}', example: '+919876543210' },
    { label: 'Email', value: '{{email}}', example: 'rahul@example.com' }
  ]

  // Sanitize template name
  const sanitizeTemplateName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  // Extract parameters from body text
  const extractParameters = (text) => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = []
    let match
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(`{{${match[1]}}}`)) {
        matches.push(`{{${match[1]}}}`)
      }
    }
    return matches
  }

  // Validate template
  const validateTemplate = (bodyText, parameters) => {
    const textWithoutParams = bodyText.replace(/\{\{(\w+)\}\}/g, '').trim()
    const wordCount = textWithoutParams.split(/\s+/).filter(w => w.length > 0).length
    
    if (parameters.length > 5) {
      return { valid: false, error: 'Maximum 5 parameters allowed per template' }
    }
    
    const minWordsNeeded = parameters.length * 5
    if (parameters.length > 0 && wordCount < minWordsNeeded) {
      return {
        valid: false,
        error: `Message too short for ${parameters.length} parameter(s). You need at least ${minWordsNeeded} words, but have only ${wordCount} words. Add ${minWordsNeeded - wordCount} more words.`
      }
    }
    
    const endsWithParam = /\{\{(\w+)\}\}\s*$/.test(bodyText.trim())
    if (endsWithParam) {
      return { valid: false, error: 'Message cannot end with a parameter. Add some text after the last parameter.' }
    }
    
    if (bodyText.length < 20) {
      return { valid: false, error: 'Template body must be at least 20 characters long' }
    }
    
    return { valid: true }
  }

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return null

    setUploadingImage(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-header-image`
      
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

      if (!response.ok || !data.success || !data.handle) {
        throw new Error(data.error || data.message || 'Image upload failed')
      }

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

  // Handle creating template
  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    
    const sanitizedName = sanitizeTemplateName(newTemplate.name)
    const parameters = extractParameters(newTemplate.bodyText)
    
    const validation = validateTemplate(newTemplate.bodyText, parameters)
    if (!validation.valid) {
      showAlert({
        title: 'Invalid Template',
        message: validation.error,
        type: 'warning'
      })
      return
    }

    if (newTemplate.hasHeader && newTemplate.headerFormat === 'IMAGE' && !newTemplate.headerImageHandle) {
      showAlert({
        title: 'Missing Header Image',
        message: 'Please upload a header image or disable the header',
        type: 'warning'
      })
      return
    }
    
    setCreating(true)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-template`

      const components = []

      if (newTemplate.hasHeader) {
        if (newTemplate.headerFormat === 'TEXT' && newTemplate.headerText.trim()) {
          components.push({
            type: 'HEADER',
            format: 'TEXT',
            text: newTemplate.headerText.trim()
          })
        } else if (newTemplate.headerFormat === 'IMAGE' && newTemplate.headerImageHandle) {
          components.push({
            type: 'HEADER',
            format: 'IMAGE'
          })
        }
      }

      const bodyComponent = {
        type: 'BODY',
        text: newTemplate.bodyText
      }

      if (parameters.length > 0) {
        bodyComponent.example = {
          body_text_named_params: parameters.map(param => {
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

      if (!edgeResponse.ok || !data.success) {
        const errorMsg = data?.message || data?.error || 'Unknown error'
        const metaError = data?.details?.error?.message || ''
        
        showAlert({
          title: 'Failed to Create Template',
          message: `${errorMsg}${metaError ? `\n\nMeta Error: ${metaError}` : ''}`,
          type: 'error'
        })
        setCreating(false)
        return
      }

      showAlert({
        title: 'Template Created Successfully!',
        message: 'Your test template is pending Meta approval.',
        type: 'success',
        onClose: () => window.location.reload()
      })
      
      setCreating(false)
    } catch (error) {
      console.error('Template creation error:', error)
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to create template',
        type: 'error'
      })
      setCreating(false)
    }
  }

  const parameters = extractParameters(newTemplate.bodyText)
  const validation = validateTemplate(newTemplate.bodyText, parameters)

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

  // Preview rendering
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
      <div className="bg-[#E5DDD5] p-4 rounded-lg h-full flex flex-col">
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

  return (
    <PageLoader delay={350}>
      <AlertComponent />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Template Creation</h1>
          <p className="text-gray-600 mb-8">Quick template creation for testing</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <form onSubmit={handleCreateTemplate} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
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
                placeholder="e.g., test_template"
                required
                disabled={creating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be converted to: <code className="bg-gray-100 px-1 rounded">{sanitizeTemplateName(newTemplate.name)}</code>
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
                <option value="UTILITY">Utility</option>
                <option value="MARKETING">Marketing</option>
              </select>
            </div>

            {/* Header Section */}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Header Format *
                    </label>
                    <select
                      value={newTemplate.headerFormat}
                      onChange={(e) => setNewTemplate({...newTemplate, headerFormat: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      disabled={creating}
                    >
                      <option value="TEXT">Text</option>
                      <option value="IMAGE">Image</option>
                    </select>
                  </div>

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

                  {newTemplate.headerFormat === 'IMAGE' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Header Image *
                      </label>
                      <div className="flex items-center space-x-3">
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-400 transition-colors text-center">
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
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                ref={textareaRef}
                value={newTemplate.bodyText}
                onChange={(e) => setNewTemplate({...newTemplate, bodyText: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent font-mono text-sm"
                placeholder="Enter your message"
                rows="8"
                required
                disabled={creating}
              />
            </div>

            {/* Validation Status */}
            {newTemplate.bodyText && (
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
                  <div>
                    <p className={`text-sm font-medium ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {validation.valid ? '✓ Template Valid' : '✗ ' + validation.error}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Parameters: {parameters.length}/5 maximum
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Section */}
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
                    {newTemplate.footerText.length}/60 characters
                  </p>
                </div>
              )}
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

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating || !validation.valid}
                className="px-6 py-3 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                    <span>Creating Test Template...</span>
                  </>
                ) : (
                  <span>Create Test Template</span>
                )}
              </button>
            </div>
          </form>

          {/* Preview Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6 lg:sticky lg:top-8">
            {renderPreview()}
          </div>
        </div>
        </div>
      </div>
    </PageLoader>
  )
}

export default TestTemplateCreation
