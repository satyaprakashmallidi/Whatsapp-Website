import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/PageLoader'
import { useAlert } from '../hooks/useAlert'
import CredentialsWarning from '../components/CredentialsWarning'
import ProfileSettings from '../components/ProfileSettings'
import TemplatePreview from '../components/TemplatePreview'
import { generateStandardTemplate, generateCarouselTemplate } from '../services/geminiService'
import { useSearchParams } from 'react-router-dom'

const Templates = () => {
  const { templates, addTemplate, deleteTemplate, fetchWhatsAppTemplateDetails } = useData()
  const { showAlert, AlertComponent } = useAlert()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [templateType, setTemplateType] = useState('standard') // 'standard' or 'carousel'

  // Standard template state
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

  // Carousel template state
  const [carouselTemplate, setCarouselTemplate] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    mainBody: '',
    cards: []
  })

  const [showPreview, setShowPreview] = useState(true)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('approved')
  const [creating, setCreating] = useState(false)
  const [showParamSuggestions, setShowParamSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [updatingStatuses, setUpdatingStatuses] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTemplateForDetails, setSelectedTemplateForDetails] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // ── AI Generator State ──
  const [showStandardAI, setShowStandardAI] = useState(false)
  const [showCarouselAI, setShowCarouselAI] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiStatus, setAiStatus] = useState('') // step-by-step status message

  // Standard AI form
  const [stdAiForm, setStdAiForm] = useState({
    purpose: '',
    tone: 'formal',
    language: 'English',
    includeHeader: false,
    headerType: 'TEXT', // 'TEXT' | 'IMAGE'
    headerImageFile: null,
    includeFooter: false,
    buttonTypes: ['QUICK_REPLY'], // min 1, max 2
    buttonValues: ['', ''],      // value per selected button (text / url / phone)
  })

  // Carousel AI form
  const [carAiForm, setCarAiForm] = useState({
    purpose: '',
    tone: 'friendly',
    language: 'English',
    numCards: 2,
    buttonTypes: ['QUICK_REPLY'],
    cardTopics: [], // optional per-card hint
    cardImages: [], // File[] — one per card
    cardButtons: [[{ text: '', value: '' }, { text: '', value: '' }], [{ text: '', value: '' }, { text: '', value: '' }]],
  })
  const textareaRef = useRef(null)
  const headerTextareaRef = useRef(null)
  const footerTextareaRef = useRef(null)

  // Listen for deep-links from Reports page
  useEffect(() => {
    const openCarousel = searchParams.get('openCarouselAI')
    if (openCarousel === 'true') {
      setShowCreateForm(true)
      setTemplateType('carousel')

      // Clean up URL so refresh doesn't keep opening it
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('openCarouselAI')
      setSearchParams(newParams, { replace: true })
    }
  }, [])

  // Filter templates by status (default to 'approved' for backward compatibility)
  const approvedTemplates = templates.filter(t => !t.status || t.status === 'approved')
  const pendingTemplates = templates.filter(t => t.status === 'pending')
  const failedTemplates = templates.filter(t => t.status === 'failed' || t.status === 'rejected')

  // Get current templates based on active tab
  const getCurrentTemplates = () => {
    switch (activeTab) {
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

  const [nameError, setNameError] = useState('')

  // Check for duplicate template name
  const checkDuplicateName = (name) => {
    if (!name) {
      setNameError('')
      return false
    }
    const sanitizedName = sanitizeTemplateName(name)
    const exists = templates.some(t => t.template_name === sanitizedName || t.name === sanitizedName)
    if (exists) {
      setNameError('Template name already exists. Please use a unique name.')
      return true
    }
    setNameError('')
    return false
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
          message: `Total: ${data.details.total}\nNew: ${data.details.new}\nUpdated: ${data.details.updated}\nDeleted: ${data.details.deleted || 0}`,
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

  // Mapping for Meta language codes
  const LANGUAGE_MAP = {
    'English': 'en_US',
    'Telugu': 'te',
    'Hindi': 'hi'
  }

  // Handle image upload to get media handle
  // ── AI Handler: Standard Template ──
  const handleGenerateStandardTemplate = async () => {
    if (!stdAiForm.purpose.trim()) return
    setAiGenerating(true)
    setAiError('')
    setAiStatus('')

    let uploadedImageHandle = null

    try {
      // Step 1: Upload image to Meta (if IMAGE header chosen)
      if (stdAiForm.includeHeader && stdAiForm.headerType === 'IMAGE' && stdAiForm.headerImageFile) {
        setAiStatus('📤 Uploading image to Meta… please wait')
        uploadedImageHandle = await handleImageUpload(stdAiForm.headerImageFile)
        if (!uploadedImageHandle) {
          throw new Error('Image upload to Meta failed. Please try again.')
        }
      }

      // Step 2: Generate template with Gemini
      setAiStatus('✨ AI is generating your template…')
      const result = await generateStandardTemplate({
        purpose: stdAiForm.purpose,
        tone: stdAiForm.tone,
        language: stdAiForm.language,
        category: newTemplate.category,
        includeHeader: stdAiForm.includeHeader,
        includeFooter: stdAiForm.includeFooter,
        buttonTypes: stdAiForm.buttonTypes,
        headerImage: (stdAiForm.includeHeader && stdAiForm.headerType === 'IMAGE' && stdAiForm.headerImageFile)
          ? stdAiForm.headerImageFile : null,
      })

      // Step 3: Apply AI output to main form
      setNewTemplate(prev => ({
        ...prev,
        name: result.templateName ? sanitizeTemplateName(result.templateName) : prev.name,
        language: LANGUAGE_MAP[stdAiForm.language] || 'en_US',
        bodyText: result.bodyText || prev.bodyText,
        hasHeader: stdAiForm.includeHeader,
        headerFormat: stdAiForm.includeHeader ? stdAiForm.headerType : prev.headerFormat,
        headerText: (stdAiForm.includeHeader && stdAiForm.headerType === 'TEXT') ? (result.headerText || '') : prev.headerText,
        // Apply both file (for preview) and handle (for Meta submission)
        headerImageFile: (stdAiForm.includeHeader && stdAiForm.headerType === 'IMAGE') ? stdAiForm.headerImageFile : prev.headerImageFile,
        headerImageHandle: uploadedImageHandle || prev.headerImageHandle,
        hasFooter: stdAiForm.includeFooter,
        footerText: stdAiForm.includeFooter ? (result.footerText || '') : prev.footerText,
        hasButtons: result.buttons?.length > 0,
        buttons: result.buttons?.map((btn, i) => ({
          id: i + 1,
          type: btn.type,
          text: btn.text,
          url: btn.type === 'URL' ? (stdAiForm.buttonValues[i] || btn.url || '') : '',
          phone_number: btn.type === 'PHONE_NUMBER' ? (stdAiForm.buttonValues[i] || btn.phone || '') : '',
          quick_reply_payload: btn.type === 'QUICK_REPLY' ? (stdAiForm.buttonValues[i] || btn.text || '') : '',
        })) || prev.buttons,
      }))

      setAiStatus('')
      // Removed setShowStandardAI(false) so panel stays open
    } catch (err) {
      console.error('AI generation error:', err)
      setAiError(err.message || 'Failed to generate. Please try again.')
      setAiStatus('')
    } finally {
      setAiGenerating(false)
    }
  }

  // ── AI Handler: Carousel Template ──
  const handleGenerateCarouselTemplate = async () => {
    if (!carAiForm.purpose.trim()) return
    if (carAiForm.cardImages.length < 2) {
      setAiError('Please upload at least 2 card images.')
      return
    }
    setAiGenerating(true)
    setAiError('')
    try {
      // Step 1: Upload all card images to Meta first
      setAiError('')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const imageHandles = await Promise.all(
        carAiForm.cardImages.map(async (file, idx) => {
          if (!file) throw new Error(`Image for card ${idx + 1} is missing.`)
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileType', file.type)
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-header-image`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
          )
          const data = await res.json()
          if (!res.ok || !data.success || !data.handle) {
            throw new Error(data.error || data.message || `Failed to upload image for card ${idx + 1}`)
          }
          return data.handle
        })
      )

      // Step 2: Run AI generation (Gemini reads the images for copy)
      const result = await generateCarouselTemplate({
        purpose: carAiForm.purpose,
        tone: carAiForm.tone,
        language: carAiForm.language,
        buttonTypes: carAiForm.buttonTypes,
        cardTopics: carAiForm.cardTopics,
        cardImages: carAiForm.cardImages,
      })

      // Step 3: Build cards with both the local File preview and the Meta handle
      setCarouselTemplate(prev => ({
        ...prev,
        name: result.templateName ? sanitizeTemplateName(result.templateName) : prev.name,
        category: 'MARKETING',
        language: LANGUAGE_MAP[carAiForm.language] || 'en_US',
        mainBody: result.mainBody || prev.mainBody,
        cards: result.cards.map((card, i) => ({
          id: crypto.randomUUID(),
          headerImageFile: carAiForm.cardImages[i] || null,
          headerImageHandle: imageHandles[i] || '',
          bodyText: card.bodyText || '',
          buttons: (carAiForm.buttonTypes || []).filter(Boolean).map((type, btnIdx) => ({
            id: btnIdx + 1,
            type: (type || 'quick_reply').toLowerCase(),
            text: type === 'QUICK_REPLY'
              ? (carAiForm.cardButtons[i]?.[btnIdx]?.text || '')
              : (card.buttonTexts?.[btnIdx] || ''),
            value: type === 'QUICK_REPLY'
              ? (carAiForm.cardButtons[i]?.[btnIdx]?.text || '')
              : (carAiForm.cardButtons[i]?.[btnIdx]?.value || ''),
          })),
        })),
      }))

      // setShowCarouselAI(false)
    } catch (err) {
      console.error('AI generation error:', err)
      setAiError(err.message || 'Failed to generate. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  // Carousel AI Card Button Management
  const updateAiCardButton = (cardIndex, btnIndex, field, value) => {
    setCarAiForm(prev => {
      const newButtons = [...prev.cardButtons]
      if (!newButtons[cardIndex]) newButtons[cardIndex] = [{ text: '', value: '' }, { text: '', value: '' }]
      newButtons[cardIndex] = [...newButtons[cardIndex]]
      if (!newButtons[cardIndex][btnIndex]) newButtons[cardIndex][btnIndex] = { text: '', value: '' }
      newButtons[cardIndex][btnIndex] = { ...newButtons[cardIndex][btnIndex], [field]: value }
      return { ...prev, cardButtons: newButtons }
    })
  }

  // Carousel Card Management
  const addCarouselCard = () => {
    if (carouselTemplate.cards.length >= 10) return

    const newCard = {
      id: crypto.randomUUID(),
      headerImageFile: null,
      headerImageHandle: '',
      bodyText: '',
      buttons: []
    }

    setCarouselTemplate(prev => ({
      ...prev,
      cards: [...prev.cards, newCard]
    }))
  }

  const removeCarouselCard = (index) => {
    setCarouselTemplate(prev => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index)
    }))
  }

  const updateCarouselCard = (index, field, value) => {
    setCarouselTemplate(prev => {
      const newCards = [...prev.cards]
      newCards[index] = {
        ...newCards[index],
        [field]: value
      }
      return { ...prev, cards: newCards }
    })
  }

  const handleCarouselImageUpload = async (index, file) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Update local state to show preview immediately
    updateCarouselCard(index, 'headerImageFile', file)
    setUploadingImage(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileType', file.type)

      // Use the same edge function as standard template
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-header-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success || !data.handle) {
        throw new Error(data.error || data.message || 'Upload failed')
      }

      // Store the returned handle
      updateCarouselCard(index, 'headerImageHandle', data.handle)
      console.log('✅ Carousel card image uploaded:', data)

    } catch (error) {
      console.error('Error uploading carousel image:', error)
      alert(`Failed to upload image: ${error.message}`)
      updateCarouselCard(index, 'headerImageFile', null)
    } finally {
      setUploadingImage(false)
    }
  }

  const addCardButton = (cardIndex, type) => {
    const currentButtons = carouselTemplate.cards[cardIndex].buttons || []
    if (currentButtons.length >= 2) return // Max 2 buttons per card

    const newButton = {
      type, // 'url', 'phone_number', 'quick_reply'
      text: '',
      value: ''
    }

    updateCarouselCard(cardIndex, 'buttons', [...currentButtons, newButton])
  }

  const removeCardButton = (cardIndex, buttonIndex) => {
    const currentButtons = carouselTemplate.cards[cardIndex].buttons || []
    const newButtons = currentButtons.filter((_, i) => i !== buttonIndex)
    updateCarouselCard(cardIndex, 'buttons', newButtons)
  }

  const updateCardButton = (cardIndex, buttonIndex, field, value) => {
    const currentButtons = carouselTemplate.cards[cardIndex].buttons || []
    const newButtons = [...currentButtons]
    newButtons[buttonIndex] = {
      ...newButtons[buttonIndex],
      [field]: value
    }
    updateCarouselCard(cardIndex, 'buttons', newButtons)
  }

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

  // Handle template deletion
  // Handle template deletion process
  const performDelete = async (template, templateName) => {
    setDeletingTemplateId(template.id)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-template`

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: templateName,
          id: template.id
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to delete template')
      }

      // Update local state without reload
      if (deleteTemplate) {
        deleteTemplate(template.id)
      }

      showAlert({
        title: 'Template Deleted',
        message: 'The template has been successfully deleted.',
        type: 'success'
      })
    } catch (error) {
      console.error('Delete template error:', error)
      showAlert({
        title: 'Delete Failed',
        message: error.message || 'An error occurred while deleting the template.',
        type: 'error'
      })
    } finally {
      setDeletingTemplateId(null)
    }
  }

  const handleDeleteTemplate = (template) => {
    const templateName = template.template_name || template.name

    showAlert({
      title: 'Delete Template',
      message: `Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => performDelete(template, templateName)
    })
  }

  const handleEditTemplate = (template) => {
    // Only allow editing if status is rejected or failed, or if it's a draft (if you have drafts)
    // For now, maybe just load it into the form?
    // This part wasn't requested but good to have a placeholder or just logic
    // For now, let's just scroll to top and populate form?
    // implementation pending user requirement
  }

  const handleViewDetails = async (template) => {
    setLoadingDetails(true)
    // Set initial data from what we have in Supabase
    setSelectedTemplateForDetails({
      ...template,
      bodyText: template.content || '',
      hasHeader: false,
      hasFooter: false,
      hasButtons: false,
      buttons: []
    })
    setShowDetailsModal(true)

    try {
      // Try to fetch full details from Meta
      const fullTemplate = await fetchWhatsAppTemplateDetails(
        template.template_name || template.name,
        template.language || 'en_US'
      )

      if (fullTemplate && fullTemplate.components) {
        // Map Meta components to our preview component's format
        const bodyComp = fullTemplate.components.find(c => c.type === 'BODY')
        const headerComp = fullTemplate.components.find(c => c.type === 'HEADER')
        const footerComp = fullTemplate.components.find(c => c.type === 'FOOTER')
        const buttonsComp = fullTemplate.components.find(c => c.type === 'BUTTONS')

        const mappedTemplate = {
          ...template,
          bodyText: bodyComp?.text || template.content || '',
          mainBody: bodyComp?.text || template.content || '',
          hasHeader: !!headerComp,
          headerFormat: (headerComp?.format || 'TEXT').toUpperCase(),
          headerText: headerComp?.text || '',
          // Use hasCarousel flag from Edge Function
          type: fullTemplate.hasCarousel ? 'carousel' : 'standard',
          // Header Media Handling
          headerMediaId: headerComp?.example?.header_handle?.[0] || null,
          headerImageUrl: headerComp?.example?.header_url?.[0] || null,
          hasFooter: !!footerComp,
          footerText: footerComp?.text || '',
          hasButtons: !!buttonsComp,
          buttons: buttonsComp?.buttons || [],
          // Carousel Specific - Use the already processed carouselCards from Edge Function
          cards: fullTemplate.carouselCards || []
        }

        setSelectedTemplateForDetails(mappedTemplate)
      }
    } catch (error) {
      console.error('Error fetching full template details:', error)
      // Fallback is already set in the beginning of function
    } finally {
      setLoadingDetails(false)
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
      text: type === 'URL' ? 'Visit Website' : type === 'PHONE_NUMBER' ? 'Call Us' : 'Quick Message',
      url: type === 'URL' ? 'https://example.com' : '',
      phone_number: type === 'PHONE_NUMBER' ? '+911234567890' : ''
    }
    setNewTemplate({ ...newTemplate, buttons: [...newTemplate.buttons, newButton] })
  }

  const updateButton = (id, field, value) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons.map(btn => btn.id === id ? { ...btn, [field]: value } : btn)
    })
  }

  const removeButton = (id) => {
    setNewTemplate({ ...newTemplate, buttons: newTemplate.buttons.filter(btn => btn.id !== id) })
  }

  // Preview rendering functions extracted to TemplatePreview component


  const handleCreateTemplate = async (e) => {
    if (e?.preventDefault) e.preventDefault()
    setCreating(true)

    try {
      const sanitizedName = sanitizeTemplateName(templateType === 'carousel' ? carouselTemplate.name : newTemplate.name)

      if (!sanitizedName) {
        showAlert({
          title: 'Invalid Template Name',
          message: 'Please enter a valid template name (lowercase, numbers, underscores only)',
          type: 'warning'
        })
        setCreating(false)
        return
      }

      // Handle Carousel Template Submission
      if (templateType === 'carousel') {
        // Validation
        if (!carouselTemplate.mainBody) {
          throw new Error('Main body text is required')
        }
        if (carouselTemplate.cards.length < 1) { // WhatsApp usually requires min 2, but let's start with 1 validation
          throw new Error('At least one card is required')
        }

        // Validate main body text against Meta rules
        const mainBodyParams = extractParameters(carouselTemplate.mainBody)
        const mainBodyValidation = validateTemplate(carouselTemplate.mainBody, mainBodyParams)
        if (!mainBodyValidation.valid) {
          throw new Error(`Main Body: ${mainBodyValidation.error}`)
        }

        // Validate cards
        carouselTemplate.cards.forEach((card, index) => {
          if (!card.headerImageHandle) throw new Error(`Card ${index + 1} is missing an image`)
          if (!card.bodyText) throw new Error(`Card ${index + 1} is missing body text`)

          // Validate card body text against Meta rules
          const cardParams = extractParameters(card.bodyText)
          const cardValidation = validateTemplate(card.bodyText, cardParams)
          if (!cardValidation.valid) {
            throw new Error(`Card ${index + 1}: ${cardValidation.error}`)
          }

          if (!card.buttons || card.buttons.length === 0) throw new Error(`Card ${index + 1} must have at least one button`)
        })

        // WhatsApp API Requirement: All cards must have same button configuration
        if (carouselTemplate.cards.length > 1) {
          const firstCardButtons = carouselTemplate.cards[0].buttons
          const firstButtonConfig = firstCardButtons.map(b => b.type).join(',')
          const firstButtonCount = firstCardButtons.length

          for (let i = 1; i < carouselTemplate.cards.length; i++) {
            const currentCard = carouselTemplate.cards[i]
            const currentButtonConfig = currentCard.buttons.map(b => b.type).join(',')
            const currentButtonCount = currentCard.buttons.length

            if (currentButtonCount !== firstButtonCount) {
              throw new Error(
                `Button mismatch: Card 1 has ${firstButtonCount} button(s), but Card ${i + 1} has ${currentButtonCount}. All cards must have the same number of buttons.`
              )
            }

            if (currentButtonConfig !== firstButtonConfig) {
              throw new Error(
                `Button type mismatch: Card 1 has [${firstButtonConfig}] buttons, but Card ${i + 1} has [${currentButtonConfig}]. All cards must have the same button types in the same order.`
              )
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        if (!token) throw new Error('Not authenticated')

        // Call Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-carousel-template`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: sanitizedName,
              language: carouselTemplate.language,
              category: carouselTemplate.category,
              mainBody: carouselTemplate.mainBody,
              cards: carouselTemplate.cards.map(card => ({
                headerHandle: card.headerImageHandle,
                bodyText: card.bodyText,
                buttons: card.buttons
              }))
            })
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create carousel template')
        }

        // Add to database
        const { data: { user } } = await supabase.auth.getUser()

        const { error: dbError } = await supabase
          .from('Templates')
          .insert({
            user_email: user.email,
            template_name: sanitizedName,
            language: carouselTemplate.language,
            category: carouselTemplate.category,
            status: 'PENDING',
            template_type: 'carousel',
            carousel_data: {
              mainBody: carouselTemplate.mainBody,
              cards: carouselTemplate.cards
            },
            meta_template_id: data.id,
            body_text: carouselTemplate.mainBody
          })

        if (dbError) throw dbError

        showAlert({
          title: 'Success',
          message: 'Carousel template created successfully',
          type: 'success'
        })

        setShowCreateForm(false)
        // Reset form
        setCarouselTemplate({
          name: '',
          category: 'UTILITY',
          language: 'en_US',
          mainBody: '',
          cards: []
        })
        // Refresh templates
        const { data: newTemplates } = await supabase.from('Templates').select('*').order('created_at', { ascending: false })
        // Update context/state if needed
        return

      }

      // STANDARD TEMPLATE SUBMISSION (Existing Logic)

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

      // Validate mixed buttons
      if (newTemplate.hasButtons && newTemplate.buttons.length > 0) {
        const hasQuickReply = newTemplate.buttons.some(b => b.type === 'QUICK_REPLY')
        const hasCTA = newTemplate.buttons.some(b => b.type === 'URL' || b.type === 'PHONE_NUMBER')

        if (hasQuickReply && hasCTA) {
          showAlert({
            title: 'Invalid Button Mix',
            message: 'Meta does not allow mixing Quick Reply and Call to Action (URL/Phone) buttons in the same template.',
            type: 'error'
          })
          setCreating(false)
          return
        }

        // Validate button text
        if (newTemplate.buttons.some(b => !b.text.trim())) {
          showAlert({
            title: 'Missing Button Text',
            message: 'All buttons must have a label.',
            type: 'error'
          })
          setCreating(false)
          return
        }
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
        footerText: '',
        hasButtons: false,
        buttons: []
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
      <div className="p-4 lg:p-8 pb-24 lg:pb-8">
        {/* Credentials Warning */}
        <CredentialsWarning onOpenSettings={() => setShowProfileSettings(true)} />

        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 text-center lg:text-left">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Templates</h1>
            <p className="text-sm lg:text-lg text-gray-600 font-medium">Create and manage WhatsApp message templates</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-end">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={handleSyncTemplates}
                disabled={syncing}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
              >
                {syncing ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /><span>Syncing...</span></> : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>Sync</span></>}
              </button>
              <button
                onClick={handleUpdateStatuses}
                disabled={updatingStatuses}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:bg-green-300 disabled:cursor-not-allowed text-sm"
              >
                {updatingStatuses ? <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /><span>Updating...</span></> : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Update</span></>}
              </button>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#FFC107] text-gray-900 text-base font-bold rounded-xl hover:bg-[#FFB300] transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
            >
              Create New Template
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 -mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto scrollbar-none border-b border-gray-200">
          <div className="flex space-x-6 min-w-max">
            <button
              onClick={() => setActiveTab('approved')}
              className={`pb-4 px-1 text-sm lg:text-base font-bold border-b-2 transition-all duration-200 ${activeTab === 'approved'
                ? 'border-[#FFC107] text-gray-900 border-b-4'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                }`}
            >
              Approved <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'approved' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{approvedTemplates.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-4 px-1 text-sm lg:text-base font-bold border-b-2 transition-all duration-200 ${activeTab === 'pending'
                ? 'border-[#FFC107] text-gray-900 border-b-4'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                }`}
            >
              Pending <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{pendingTemplates.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`pb-4 px-1 text-sm lg:text-base font-bold border-b-2 transition-all duration-200 ${activeTab === 'failed'
                ? 'border-[#FFC107] text-gray-900 border-b-4'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                }`}
            >
              Failed <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'failed' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{failedTemplates.length}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {currentTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-4 lg:p-5 border-b border-gray-50 bg-gray-50/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-bold text-gray-900 truncate pr-2 group-hover:text-yellow-600 transition-colors">
                        {template.template_name || template.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-white text-gray-500 rounded border border-gray-200 uppercase">
                          {template.type}
                        </span>
                        {template.category && (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase">
                            {template.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(template)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template)
                        }}
                        disabled={deletingTemplateId === template.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Template"
                      >
                        {deletingTemplateId === template.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {template.status && (
                    <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full border ${template.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                      template.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        template.status === 'rejected' || template.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                      {template.status.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Content preview removed as requested - use View Details for full preview */}
              </div>
            ))}
          </div>
        )}

        {/* Create Template Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full mx-4 flex flex-col max-h-[90vh] overflow-hidden" style={{ maxWidth: '1400px' }}>

              {/* Header with close button */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Create New Template</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Design a WhatsApp message template</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setTemplateType('standard')
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
                    setCarouselTemplate({
                      name: '',
                      category: 'UTILITY',
                      language: 'en_US',
                      mainBody: '',
                      cards: []
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Template Type Selector */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Select Template Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Standard Template Option */}
                  <label className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${templateType === 'standard'
                    ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="templateType"
                        value="standard"
                        checked={templateType === 'standard'}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="sr-only"
                      />
                      <svg className={`w-5 h-5 ${templateType === 'standard' ? 'text-yellow-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className={`text-sm font-bold ${templateType === 'standard' ? 'text-yellow-700' : 'text-gray-700'}`}>
                        Standard Template
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-7">
                      Single message with optional header, footer, and buttons
                    </p>
                  </label>

                  {/* Carousel Template Option */}
                  <label className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${templateType === 'carousel'
                    ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="templateType"
                        value="carousel"
                        checked={templateType === 'carousel'}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="sr-only"
                      />
                      <svg className={`w-5 h-5 ${templateType === 'carousel' ? 'text-yellow-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
                      </svg>
                      <span className={`text-sm font-bold ${templateType === 'carousel' ? 'text-yellow-700' : 'text-gray-700'}`}>
                        Carousel Template
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-7">
                      Multiple cards with images, text, and buttons
                    </p>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 flex-1 overflow-hidden min-h-0">
                {/* Form Column */}
                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pr-2 pb-6">
                  {templateType === 'standard' ? (
                    /* STANDARD TEMPLATE FORM */
                    <form onSubmit={handleCreateTemplate} className="space-y-4">

                      {/* ✨ AI Generator Panel */}
                      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setShowStandardAI(!showStandardAI); setAiError('') }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-100/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span className="font-semibold text-purple-800 text-sm">Generate with AI</span>
                          </div>
                          <svg className={`w-4 h-4 text-purple-600 transition-transform ${showStandardAI ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showStandardAI && (
                          <div className="px-4 pb-4 space-y-3 border-t border-purple-200 pt-3">
                            {/* Purpose */}
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">What is this template for? *</label>
                              <textarea
                                value={stdAiForm.purpose}
                                onChange={e => setStdAiForm(p => ({ ...p, purpose: e.target.value }))}
                                placeholder="e.g. Notify citizens about road repair completion in Ward 7"
                                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none bg-white"
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Tone */}
                              <div>
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Tone</label>
                                <select
                                  value={stdAiForm.tone}
                                  onChange={e => setStdAiForm(p => ({ ...p, tone: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                                >
                                  <option value="formal">Formal</option>
                                  <option value="friendly">Friendly</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>
                              {/* Language */}
                              <div>
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Language</label>
                                <select
                                  value={stdAiForm.language}
                                  onChange={e => setStdAiForm(p => ({ ...p, language: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                                >
                                  <option value="English">English</option>
                                  <option value="Telugu">Telugu</option>
                                  <option value="Hindi">Hindi</option>
                                </select>
                              </div>
                            </div>

                            {/* Buttons — Pill Multi-Select */}
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Button Types (Max 2) *</label>
                              <div className="flex gap-2">
                                {['QUICK_REPLY', 'URL', 'PHONE_NUMBER'].map(bType => {
                                  const isSelected = stdAiForm.buttonTypes.includes(bType);
                                  const isDisabled = !isSelected && stdAiForm.buttonTypes.length >= 2;
                                  return (
                                    <button
                                      key={bType}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        setStdAiForm(p => {
                                          if (isSelected) {
                                            if (p.buttonTypes.length <= 1) return p;
                                            return { ...p, buttonTypes: p.buttonTypes.filter(t => t !== bType) };
                                          } else {
                                            return { ...p, buttonTypes: [...p.buttonTypes, bType] };
                                          }
                                        });
                                      }}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${isSelected
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-105'
                                        : isDisabled
                                          ? 'hidden'
                                          : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                                        }`}
                                    >
                                      {bType === 'QUICK_REPLY' ? 'Quick Reply' : bType === 'URL' ? 'URL' : 'Phone'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Per-button value inputs */}
                            {stdAiForm.buttonTypes.filter(Boolean).map((bType, btnIdx) => (
                              <div key={btnIdx}>
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">
                                  {bType === 'QUICK_REPLY' && 'Quick Reply Text *'}
                                  {bType === 'URL' && 'Button URL *'}
                                  {bType === 'PHONE_NUMBER' && 'Phone Number (with country code) *'}
                                </label>
                                <input
                                  type={bType === 'URL' ? 'url' : bType === 'PHONE_NUMBER' ? 'tel' : 'text'}
                                  value={stdAiForm.buttonValues[btnIdx] || ''}
                                  onChange={e => {
                                    let val = e.target.value;
                                    if (bType === 'PHONE_NUMBER') {
                                      val = val.replace(/[^\d+]/g, '');
                                      if (val.indexOf('+') > 0) val = val.slice(0, 1) + val.slice(1).replace(/\+/g, '');
                                    } else if (bType === 'URL') {
                                      if (val && !val.startsWith('https://') && !val.startsWith('http')) {
                                        val = 'https://' + val;
                                      }
                                    }
                                    const vals = [...stdAiForm.buttonValues];
                                    vals[btnIdx] = val;
                                    setStdAiForm(p => ({ ...p, buttonValues: vals }));
                                  }}
                                  placeholder={
                                    bType === 'URL' ? 'https://example.com' :
                                      bType === 'PHONE_NUMBER' ? '+91 98765 43210' :
                                        "e.g. Yes, I'm interested"
                                  }
                                  maxLength={bType === 'QUICK_REPLY' ? 25 : undefined}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                                />
                                {bType === 'PHONE_NUMBER' && (
                                  <p className="text-xs text-purple-400 mt-1">Include country code, e.g. +91 for India</p>
                                )}
                              </div>
                            ))}

                            {/* Toggles — Header & Footer */}
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-xs text-purple-700 cursor-pointer">
                                <input type="checkbox" checked={stdAiForm.includeHeader} onChange={e => setStdAiForm(p => ({ ...p, includeHeader: e.target.checked }))} className="rounded text-purple-500" />
                                Include Header
                              </label>
                              <label className="flex items-center gap-2 text-xs text-purple-700 cursor-pointer">
                                <input type="checkbox" checked={stdAiForm.includeFooter} onChange={e => setStdAiForm(p => ({ ...p, includeFooter: e.target.checked }))} className="rounded text-purple-500" />
                                Include Footer
                              </label>
                            </div>

                            {/* Header type — shown when Include Header is checked */}
                            {stdAiForm.includeHeader && (
                              <div>
                                <label className="block text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">Header Type *</label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setStdAiForm(p => ({ ...p, headerType: 'TEXT', headerImageFile: null }))}
                                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${stdAiForm.headerType === 'TEXT' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-purple-200 bg-white text-gray-400 hover:border-purple-300'}`}
                                  >
                                    <span className="text-lg font-bold">T</span>
                                    <span className="text-xs font-semibold">Text</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStdAiForm(p => ({ ...p, headerType: 'IMAGE' }))}
                                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${stdAiForm.headerType === 'IMAGE' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-purple-200 bg-white text-gray-400 hover:border-purple-300'}`}
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-semibold">Image</span>
                                  </button>
                                </div>

                                {/* Image upload — shown when IMAGE header type selected */}
                                {stdAiForm.headerType === 'IMAGE' && (
                                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg border-2 border-dashed transition-colors ${stdAiForm.headerImageFile ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-purple-200 bg-white text-gray-400 hover:border-purple-400 hover:text-purple-600'}`}>
                                      {stdAiForm.headerImageFile ? (
                                        <><span>🖼️</span> {stdAiForm.headerImageFile.name.slice(0, 28)}{stdAiForm.headerImageFile.name.length > 28 ? '…' : ''}</>
                                      ) : (
                                        <><span>📁</span> Upload header image (AI will read it)</>
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files[0]
                                        if (file) setStdAiForm(p => ({ ...p, headerImageFile: file }))
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}

                            {aiError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</p>}
                            {aiStatus && (
                              <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 animate-pulse">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {aiStatus}
                              </div>
                            )}

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleGenerateStandardTemplate}
                                disabled={aiGenerating || !stdAiForm.purpose.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {aiGenerating ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Generating...
                                  </>
                                ) : (
                                  <><span>✨</span> Generate Template</>
                                )}
                              </button>
                              {newTemplate.name && newTemplate.bodyText && (
                                <button
                                  type="submit"
                                  disabled={creating || aiGenerating}
                                  className="flex-1 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {creating ? 'Creating...' : 'Create Template'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Template Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Name *
                        </label>
                        <input
                          type="text"
                          value={newTemplate.name}
                          onChange={(e) => {
                            setNewTemplate({ ...newTemplate, name: e.target.value })
                            checkDuplicateName(e.target.value)
                          }}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${nameError ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., Order Confirmation or order_confirmation"
                          required
                          disabled={creating}
                        />
                        {nameError ? (
                          <p className="text-xs text-red-600 mt-1 font-semibold">{nameError}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Will be auto-converted to: <code className="bg-gray-100 px-1 rounded">{sanitizeTemplateName(newTemplate.name) || 'lowercase_with_underscores'}</code>
                          </p>
                        )}
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          value={newTemplate.category}
                          onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
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
                              onChange={(e) => setNewTemplate({ ...newTemplate, hasHeader: e.target.checked })}
                              className="mr-2 w-5 h-5 text-yellow-400 focus:ring-yellow-400 rounded"
                              disabled={creating}
                            />
                            <span className="text-sm text-gray-600">Enable Header</span>
                          </label>
                        </div>

                        {newTemplate.hasHeader && (
                          <div className="space-y-3 ml-7">
                            {/* Header Format — Visual Toggle */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Header Type *</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setNewTemplate({ ...newTemplate, headerFormat: 'TEXT', headerText: '', headerImageFile: null, headerImageHandle: '' })}
                                  disabled={creating}
                                  className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl border-2 transition-all ${newTemplate.headerFormat === 'TEXT' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                  <span className="text-xl font-bold">T</span>
                                  <span className="text-xs font-semibold">Text</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewTemplate({ ...newTemplate, headerFormat: 'IMAGE', headerText: '', headerImageFile: null, headerImageHandle: '' })}
                                  disabled={creating}
                                  className={`flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl border-2 transition-all ${newTemplate.headerFormat === 'IMAGE' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs font-semibold">Image</span>
                                </button>
                              </div>
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
                                  onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
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
                                          setNewTemplate({ ...newTemplate, headerImageFile: file })
                                          const handle = await handleImageUpload(file)
                                          if (handle) {
                                            setNewTemplate(prev => ({ ...prev, headerImageHandle: handle }))
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
                              onChange={(e) => setNewTemplate({ ...newTemplate, hasFooter: e.target.checked })}
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
                              onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })}
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

                      {/* Buttons Section (Optional) */}
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
                              onChange={(e) => setNewTemplate({ ...newTemplate, hasButtons: e.target.checked, buttons: e.target.checked ? newTemplate.buttons : [] })}
                              className="mr-2 w-5 h-5 text-yellow-400 focus:ring-yellow-400 rounded"
                              disabled={creating}
                            />
                            <span className="text-sm text-gray-600">Enable Buttons</span>
                          </label>
                        </div>

                        {newTemplate.hasButtons && (() => {
                          const hasURL = newTemplate.buttons.some(b => b.type === 'URL');
                          const hasPhone = newTemplate.buttons.some(b => b.type === 'PHONE_NUMBER');
                          const hasQR = newTemplate.buttons.some(b => b.type === 'QUICK_REPLY');
                          const hasCTA = hasURL || hasPhone;

                          return (
                            <div className="ml-7 space-y-4">
                              <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                  type="button"
                                  onClick={() => addButton('URL')}
                                  disabled={creating || hasURL || hasQR}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {hasURL ? '✓ Website Added' : '+ Visit Website'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addButton('PHONE_NUMBER')}
                                  disabled={creating || hasPhone || hasQR}
                                  className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                                >
                                  {hasPhone ? '✓ Phone Added' : '+ Call Phone'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addButton('QUICK_REPLY')}
                                  disabled={creating || hasQR || hasCTA}
                                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-md text-xs font-medium hover:bg-purple-100 disabled:opacity-50"
                                >
                                  {hasQR ? '✓ Message Added' : '+ Quick Message'}
                                </button>
                              </div>

                              <div className="space-y-3">
                                {newTemplate.buttons.map((button) => (
                                  <div key={button.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 relative group">
                                    <button
                                      type="button"
                                      onClick={() => removeButton(button.id)}
                                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>

                                    <div className="grid grid-cols-1 gap-3">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${button.type === 'URL' ? 'bg-blue-100 text-blue-700' :
                                          button.type === 'PHONE_NUMBER' ? 'bg-green-100 text-green-700' :
                                            'bg-purple-100 text-purple-700'
                                          }`}>
                                          {button.type.replace('_', ' ')}
                                        </span>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Button Text</label>
                                        <input
                                          type="text"
                                          value={button.text}
                                          onChange={(e) => updateButton(button.id, 'text', e.target.value)}
                                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                          placeholder="Button Label"
                                          maxLength={25}
                                          disabled={creating}
                                        />
                                      </div>

                                      {button.type === 'URL' && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">Website URL <span className="text-red-500">*</span></label>
                                          <input
                                            type="url"
                                            value={button.url}
                                            onChange={(e) => {
                                              let val = e.target.value;
                                              if (val && !val.startsWith('https://') && !val.startsWith('http')) {
                                                val = 'https://' + val;
                                              }
                                              updateButton(button.id, 'url', val);
                                            }}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                            placeholder="https://example.com"
                                            required
                                            disabled={creating}
                                          />
                                        </div>
                                      )}

                                      {button.type === 'PHONE_NUMBER' && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number with Country Code <span className="text-red-500">*</span></label>
                                          <input
                                            type="tel"
                                            value={button.phone_number}
                                            onChange={(e) => {
                                              let val = e.target.value.replace(/[^\d+]/g, '');
                                              if (val.indexOf('+') > 0) val = val.slice(0, 1) + val.slice(1).replace(/\+/g, '');
                                              updateButton(button.id, 'phone_number', val);
                                            }}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                            placeholder="+91 98765 43210"
                                            required
                                            disabled={creating}
                                          />
                                          <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +91 for India</p>
                                        </div>
                                      )}

                                      {button.type === 'QUICK_REPLY' && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-500 mb-1">Quick Reply Text <span className="text-red-500">*</span></label>
                                          <input
                                            type="text"
                                            value={button.quick_reply_payload || ''}
                                            onChange={(e) => updateButton(button.id, 'quick_reply_payload', e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                            placeholder="e.g. Yes, I'm interested"
                                            maxLength={25}
                                            required
                                            disabled={creating}
                                          />
                                          <p className="text-xs text-gray-400 mt-1">Text sent when recipient taps this button (max 25 chars)</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {newTemplate.buttons.length === 0 && (
                                  <p className="text-xs text-gray-400 italic text-center">No buttons added yet</p>
                                )}
                              </div>

                              {(newTemplate.buttons.some(b => b.type === 'QUICK_REPLY') &&
                                newTemplate.buttons.some(b => b.type !== 'QUICK_REPLY' && b.type !== '')) && (
                                  <p className="text-xs text-red-500 font-medium">
                                    ⚠️ Meta does not allow mixing Quick Reply and Call to Action buttons.
                                  </p>
                                )}
                            </div>
                          );
                        })()}
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
                          disabled={creating || !newTemplate.name || !newTemplate.bodyText || !!nameError}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
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
                  ) : (
                    /* CAROUSEL TEMPLATE FORM */
                    <div className="space-y-4">

                      {/* ✨ Carousel AI Generator Panel */}
                      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setShowCarouselAI(!showCarouselAI); setAiError('') }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-purple-100/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span className="font-semibold text-purple-800 text-sm">Generate Carousel with AI</span>
                          </div>
                          <svg className={`w-4 h-4 text-purple-600 transition-transform ${showCarouselAI ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showCarouselAI && (
                          <div className="px-4 pb-4 space-y-4 border-t border-purple-200 pt-3">

                            {/* Purpose */}
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Campaign Purpose *</label>
                              <textarea
                                value={carAiForm.purpose}
                                onChange={e => setCarAiForm(p => ({ ...p, purpose: e.target.value }))}
                                placeholder="e.g. Showcase 4 newly developed parks across different wards in the city"
                                className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none bg-white"
                                rows={2}
                              />
                            </div>

                            {/* Tone + Language + Button Type */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Tone</label>
                                <select
                                  value={carAiForm.tone}
                                  onChange={e => setCarAiForm(p => ({ ...p, tone: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                                >
                                  <option value="friendly">Friendly</option>
                                  <option value="formal">Formal</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">Language</label>
                                <select
                                  value={carAiForm.language}
                                  onChange={e => setCarAiForm(p => ({ ...p, language: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                                >
                                  <option value="English">English</option>
                                  <option value="Telugu">Telugu</option>
                                  <option value="Hindi">Hindi</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">
                                  Button Types (Max 2) *
                                </label>
                                <div className="flex gap-2">
                                  {['QUICK_REPLY', 'URL', 'PHONE_NUMBER'].map(bType => {
                                    const isSelected = carAiForm.buttonTypes.includes(bType);
                                    const isDisabled = !isSelected && carAiForm.buttonTypes.length >= 2;
                                    return (
                                      <button
                                        key={bType}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                          setCarAiForm(p => {
                                            if (isSelected) {
                                              if (p.buttonTypes.length <= 1) return p; // prevent removing last button
                                              return { ...p, buttonTypes: p.buttonTypes.filter(t => t !== bType) };
                                            } else {
                                              return { ...p, buttonTypes: [...p.buttonTypes, bType] };
                                            }
                                          });
                                        }}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${isSelected
                                          ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105'
                                          : isDisabled
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed hidden md:block'
                                            : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                                          }`}
                                      >
                                        {bType === 'QUICK_REPLY' ? 'Quick Reply' : bType === 'URL' ? 'URL' : 'Phone'}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            {/* Number of Cards */}
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">
                                Number of Cards: <span className="text-purple-900 font-bold">{carAiForm.numCards}</span>
                              </label>
                              <input
                                type="range"
                                min={2}
                                max={10}
                                value={carAiForm.numCards}
                                onChange={e => {
                                  const n = parseInt(e.target.value)
                                  setCarAiForm(p => ({
                                    ...p,
                                    numCards: n,
                                    cardTopics: Array(n).fill('').map((_, i) => p.cardTopics[i] || ''),
                                    cardImages: p.cardImages.slice(0, n),
                                    cardButtons: Array(n).fill('').map((_, i) => p.cardButtons[i] || []),
                                  }))
                                }}
                                className="w-full accent-purple-600"
                              />
                              <div className="flex justify-between text-xs text-purple-400 mt-1"><span>2</span><span>10</span></div>
                            </div>

                            {/* Per-card image uploads + topic hints */}
                            <div>
                              <label className="block text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide">
                                Card Images + Topic Hints (AI will read each image)
                              </label>
                              <div className="space-y-2">
                                {Array.from({ length: carAiForm.numCards }, (_, i) => (
                                  <div key={i} className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center mt-1">
                                      {i + 1}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                      {/* Image upload */}
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border-2 border-dashed transition-colors ${carAiForm.cardImages[i] ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-purple-200 bg-white text-gray-400 hover:border-purple-400 hover:text-purple-600'}`}>
                                          {carAiForm.cardImages[i] ? (
                                            <><span>🖼️</span> {carAiForm.cardImages[i].name.slice(0, 20)}{carAiForm.cardImages[i].name.length > 20 ? '…' : ''}</>
                                          ) : (
                                            <><span>📁</span> Upload Image *</>
                                          )}
                                        </div>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={e => {
                                            const file = e.target.files[0]
                                            if (!file) return
                                            setCarAiForm(p => {
                                              const imgs = [...p.cardImages]
                                              imgs[i] = file
                                              return { ...p, cardImages: imgs }
                                            })
                                          }}
                                        />
                                      </label>
                                      {/* Topic hint */}
                                      <input
                                        type="text"
                                        placeholder={`Card ${i + 1} topic hint (optional)…`}
                                        value={carAiForm.cardTopics[i] || ''}
                                        onChange={e => {
                                          const val = e.target.value
                                          setCarAiForm(p => {
                                            const topics = [...p.cardTopics]
                                            topics[i] = val
                                            return { ...p, cardTopics: topics }
                                          })
                                        }}
                                        className="w-full px-3 py-1.5 text-xs border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white"
                                      />

                                      {/* AI Form Card Buttons */}
                                      <div className="mt-4 pt-3 border-t border-purple-100">
                                        <div className="space-y-3">
                                          {(carAiForm.buttonTypes || []).filter(Boolean).map((bType, btnIdx) => {
                                            const btnData = carAiForm.cardButtons[i]?.[btnIdx] || { text: '', value: '' };

                                            return (
                                              <div key={btnIdx} className="flex gap-2 items-start bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                                                <div className="flex-1 space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <div className="font-semibold text-[10px] text-purple-700 uppercase tracking-wider bg-purple-200 px-2 py-0.5 rounded-full">{bType.replace('_', ' ')}</div>
                                                  </div>
                                                  {bType === 'QUICK_REPLY' ? (
                                                    <input
                                                      type="text"
                                                      value={btnData.text}
                                                      onChange={(e) => updateAiCardButton(i, btnIdx, 'text', e.target.value)}
                                                      placeholder="Quick reply text (max 25 chars) *"
                                                      maxLength={25}
                                                      className="w-full px-2.5 py-1.5 text-xs border border-purple-200 rounded focus:ring-1 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm"
                                                    />
                                                  ) : (
                                                    <input
                                                      type={bType === 'URL' ? 'url' : 'tel'}
                                                      value={btnData.value}
                                                      onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (bType === 'PHONE_NUMBER') {
                                                          val = val.replace(/[^\d+]/g, '');
                                                          if (val.indexOf('+') > 0) val = val.slice(0, 1) + val.slice(1).replace(/\+/g, '');
                                                        } else if (bType === 'URL') {
                                                          if (val && !val.startsWith('https://') && !val.startsWith('http')) {
                                                            val = 'https://' + val;
                                                          }
                                                        }
                                                        updateAiCardButton(i, btnIdx, 'value', val);
                                                      }}
                                                      placeholder={bType === 'URL' ? 'https://example.com *' : '+91 98765 43210 *'}
                                                      className="w-full px-2.5 py-1.5 text-xs border border-purple-200 rounded focus:ring-1 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm"
                                                    />
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {aiError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</p>}

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleGenerateCarouselTemplate}
                                disabled={aiGenerating || !carAiForm.purpose.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {aiGenerating ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Generating Carousel...
                                  </>
                                ) : (
                                  <><span>✨</span> Generate All Cards</>
                                )}
                              </button>
                              {carouselTemplate.mainBody && carouselTemplate.cards.length > 0 && !aiGenerating && (
                                <button
                                  type="button"
                                  onClick={handleCreateTemplate}
                                  disabled={creating}
                                  className="flex-1 py-2.5 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {creating ? 'Creating...' : 'Create Template'}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-purple-500 text-center">AI will analyze each image and write contextual copy for all {carAiForm.numCards} cards.</p>
                          </div>
                        )}
                      </div>

                      {/* Template Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Name *
                        </label>
                        <input
                          type="text"
                          value={carouselTemplate.name}
                          onChange={(e) => {
                            setCarouselTemplate({ ...carouselTemplate, name: e.target.value })
                            checkDuplicateName(e.target.value)
                          }}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${nameError ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., product_carousel"
                          required
                          disabled={creating}
                        />
                        {nameError ? (
                          <p className="text-xs text-red-600 mt-1 font-semibold">{nameError}</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Will be auto-converted to: <code className="bg-gray-100 px-1 rounded">{sanitizeTemplateName(carouselTemplate.name) || 'lowercase_with_underscores'}</code>
                          </p>
                        )}
                      </div>

                      {/* Main Body Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Main Body Text *
                        </label>
                        <textarea
                          value={carouselTemplate.mainBody}
                          onChange={(e) => setCarouselTemplate({ ...carouselTemplate, mainBody: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          rows={3}
                          placeholder="This text will appear above all carousel cards..."
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">This message appears above all cards</p>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-800">
                            Cards ({carouselTemplate.cards.length}/10)
                          </label>
                          <button
                            type="button"
                            onClick={addCarouselCard}
                            className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300"
                            disabled={carouselTemplate.cards.length >= 10 || creating}
                          >
                            + Add Card
                          </button>
                        </div>

                        {/* Carousel Completion Checklist */}
                        <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-xl">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.633.271 1.243.644 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.644 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.644-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.644-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Completion Checklist
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className={`p-2 rounded-lg text-sm flex items-center ${carouselTemplate.mainBody ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-white border border-dashed border-gray-300'}`}>
                              {carouselTemplate.mainBody ? '✓' : '○'} Main Body Text
                            </div>
                            <div className={`p-2 rounded-lg text-sm flex items-center ${carouselTemplate.cards.length >= 2 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                              {carouselTemplate.cards.length >= 2 ? '✓' : '○'} Minimum 2 Cards ({carouselTemplate.cards.length}/2)
                            </div>
                            {carouselTemplate.cards.map((card, idx) => {
                              const hasImage = !!card.headerImageFile
                              const hasBody = !!card.bodyText
                              const hasButtons = card.buttons?.length > 0
                              const isComplete = hasImage && hasBody && hasButtons

                              return (
                                <div key={idx} className={`p-2 rounded-lg text-sm flex flex-col ${isComplete ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                  <div className="flex items-center justify-between font-bold mb-1">
                                    <span>Card #{idx + 1}</span>
                                    {isComplete ? '✓ Ready' : '○ Incomplete'}
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 text-[10px] uppercase font-bold text-gray-400">
                                    <span className={hasImage ? 'text-green-600' : 'text-red-400'}>Photo</span>
                                    <span className={hasBody ? 'text-green-600' : 'text-red-400'}>Text</span>
                                    <span className={hasButtons ? 'text-green-600' : 'text-red-400'}>Buttons</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        <div className="space-y-4">
                          {carouselTemplate.cards.map((card, index) => (
                            <div key={card.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold text-gray-700">Card #{index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCarouselCard(index)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Remove card"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>

                              {/* Card Image Upload */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-tighter">
                                    Card Image <span className="text-red-500">*</span>
                                  </label>
                                  {!card.headerImageFile && (
                                    <span className="text-[10px] font-bold text-red-500 uppercase flex items-center">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                      </svg>
                                      Required
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors bg-white">
                                  <div className="space-y-1 text-center">
                                    {card.headerImageFile ? (
                                      <div className="relative">
                                        <img
                                          src={URL.createObjectURL(card.headerImageFile)}
                                          alt="Card header preview"
                                          className="mx-auto h-32 object-contain rounded"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => updateCarouselCard(index, 'headerImageFile', null)}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                        {card.headerImageHandle ? (
                                          <span className="absolute bottom-0 right-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded-tl">
                                            Uploaded
                                          </span>
                                        ) : uploadingImage ? (
                                          <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-tl flex items-center">
                                            <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Uploading...
                                          </span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <>
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500">
                                            <span>Upload a file</span>
                                            <input
                                              type="file"
                                              className="sr-only"
                                              accept="image/*"
                                              onChange={(e) => handleCarouselImageUpload(index, e.target.files?.[0])}
                                              disabled={uploadingImage}
                                            />
                                          </label>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Body Text */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="block text-xs font-medium text-gray-700">Card Body Text *</label>
                                  <span className={`text-xs ${(card.bodyText?.length || 0) > 160 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                    {card.bodyText?.length || 0}/160
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={card.bodyText}
                                  onChange={(e) => updateCarouselCard(index, 'bodyText', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent text-sm"
                                  placeholder="Enter text for this card..."
                                  maxLength={160}
                                  required
                                />
                              </div>

                              {/* Card Buttons */}
                              <div className="mt-4 pt-3 border-t border-gray-200">
                                {/* WhatsApp API Requirement Alert */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-blue-900">Important: Button Consistency Required</p>
                                      <p className="text-xs text-blue-700 mt-1">All cards must have the same number and types of buttons. E.g., if Card 1 has [URL, Quick Reply], all other cards must also have [URL, Quick Reply] in the same order.</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                  <label className="block text-xs font-semibold text-gray-700">Buttons *</label>
                                  <div className="flex space-x-2">
                                    {(!card.buttons || card.buttons.length < 2) && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => addCardButton(index, 'quick_reply')}
                                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                                        >
                                          + Quick Reply
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => addCardButton(index, 'url')}
                                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                                        >
                                          + URL
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => addCardButton(index, 'phone_number')}
                                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                                        >
                                          + Phone
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {card.buttons && card.buttons.map((button, btnIndex) => (
                                    <div key={btnIndex} className="flex gap-2 items-start bg-white p-2 rounded border border-gray-200">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-xs font-medium text-gray-500 capitalize">{button.type.replace('_', ' ')}</span>
                                        </div>
                                        <input
                                          type="text"
                                          value={button.text}
                                          onChange={(e) => updateCardButton(index, btnIndex, 'text', e.target.value)}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                          placeholder="Button Text"
                                          maxLength={25}
                                        />
                                        {button.type === 'url' && (
                                          <input
                                            type="url"
                                            value={button.value}
                                            onChange={(e) => {
                                              let val = e.target.value;
                                              if (val && !val.startsWith('https://') && !val.startsWith('http')) {
                                                val = 'https://' + val;
                                              }
                                              updateCardButton(index, btnIndex, 'value', val);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                            placeholder="https://example.com"
                                          />
                                        )}
                                        {button.type === 'phone_number' && (
                                          <input
                                            type="tel"
                                            value={button.value}
                                            onChange={(e) => {
                                              let val = e.target.value.replace(/[^\d+]/g, '');
                                              if (val.indexOf('+') > 0) val = val.slice(0, 1) + val.slice(1).replace(/\+/g, '');
                                              updateCardButton(index, btnIndex, 'value', val);
                                            }}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-yellow-400 focus:border-transparent"
                                            placeholder="+1234567890"
                                          />
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeCardButton(index, btnIndex)}
                                        className="text-gray-400 hover:text-red-500 mt-6"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                  {(!card.buttons || card.buttons.length === 0) && (
                                    <p className="text-xs text-center text-gray-400 italic py-1">No buttons added</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {carouselTemplate.cards.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <p className="text-sm text-gray-600">No cards added yet</p>
                              <p className="text-xs text-gray-500 mt-1">Click "Add Card" to create your first card</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false)
                            setCarouselTemplate({
                              name: '',
                              category: 'UTILITY',
                              language: 'en_US',
                              mainBody: '',
                              cards: []
                            })
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                          disabled={creating}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateTemplate}
                          disabled={creating || !carouselTemplate.name || !carouselTemplate.mainBody || carouselTemplate.cards.length === 0 || !!nameError}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
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
                    </div>
                  )}
                </div>

                {/* Preview Column */}
                <div className="lg:border-l lg:border-gray-200 lg:pl-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pb-6">
                  {templateType === 'standard' ? (
                    <TemplatePreview
                      type="standard"
                      template={newTemplate}
                      showPreview={showPreview}
                      onTogglePreview={() => setShowPreview(!showPreview)}
                    />
                  ) : (
                    <TemplatePreview
                      type="carousel"
                      template={carouselTemplate}
                    />
                  )}
                </div>
              </div>

              {/* Profile Settings Modal */}
              <ProfileSettings
                isOpen={showProfileSettings}
                onClose={() => setShowProfileSettings(false)}
              />
            </div>
          </div>
        )}
        {/* Template Details Modal */}
        {showDetailsModal && selectedTemplateForDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
              {/* Left Side: Preview */}
              <div className="w-full md:w-1/2 bg-[#E5DDD5] p-6 lg:p-8 overflow-y-auto min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Preview</h3>
                  {loadingDetails && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      <span className="text-xs font-semibold">Fetching full details...</span>
                    </div>
                  )}
                </div>
                <div className="iphone-x-frame mx-auto max-w-[320px] relative">
                  {loadingDetails && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[3rem]">
                      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
                      <p className="text-blue-600 font-bold text-center px-4">Loading Template Details from Meta...</p>
                    </div>
                  )}
                  <TemplatePreview
                    type={selectedTemplateForDetails.type === 'carousel' ? 'carousel' : 'standard'}
                    template={{
                      ...selectedTemplateForDetails,
                      // Ensure strings are passed for previewing
                      bodyText: selectedTemplateForDetails.bodyText || selectedTemplateForDetails.content,
                      mainBody: selectedTemplateForDetails.mainBody || selectedTemplateForDetails.bodyText || selectedTemplateForDetails.content,
                    }}
                  />
                </div>
              </div>

              {/* Right Side: Details & Actions */}
              <div className="w-full md:w-1/2 p-6 lg:p-8 bg-white overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 truncate max-w-[300px]">
                      {selectedTemplateForDetails.template_name || selectedTemplateForDetails.name}
                    </h2>
                    <p className="text-gray-500 font-medium">Template Details</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTemplateForDetails.status === 'approved' ? 'bg-green-100 text-green-700' :
                        selectedTemplateForDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {selectedTemplateForDetails.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                      <span className="text-sm font-bold text-gray-700">{selectedTemplateForDetails.category || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Language</p>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827-5.806m10.705 5.806a18.022 18.022 0 01-10.126-5.806m10.126 5.806c-1.121 2.3-3.325 4.303-10.126 5.806m10.126-5.806V19m0-3h3m-8-3h3m-6-3h3M9 13l3 3m0 0l-3 3m3-3H9" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">{selectedTemplateForDetails.language || 'en_US'}</span>
                    </div>
                  </div>

                  {/* Components Info (only if loaded) */}
                  {!loadingDetails && (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Structure Breakdown</p>
                      <div className="space-y-2">
                        {selectedTemplateForDetails.hasHeader && (
                          <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <span className="text-sm font-semibold text-blue-700">Header Container</span>
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{selectedTemplateForDetails.headerFormat}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-3 bg-green-50/50 rounded-xl border border-green-100">
                          <span className="text-sm font-semibold text-green-700">Message Body</span>
                          <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">REQUIRED</span>
                        </div>
                        {selectedTemplateForDetails.hasFooter && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-sm font-semibold text-gray-600">Footer Text</span>
                            <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">OPTIONAL</span>
                          </div>
                        )}
                        {selectedTemplateForDetails.hasButtons && (
                          <div className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                            <span className="text-sm font-semibold text-purple-700">Interactive Buttons</span>
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{selectedTemplateForDetails.buttons?.length || 0} ITEMS</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                      Close Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLoader>
  )
}

export default Templates
