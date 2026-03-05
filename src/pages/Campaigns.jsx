import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'
import CredentialsWarning from '../components/CredentialsWarning'
import ProfileSettings from '../components/ProfileSettings'
import TemplatePreview from '../components/TemplatePreview'
import { supabase } from '../lib/supabase'
import { useAlert } from '../hooks/useAlert'



const Campaigns = () => {
  const { campaigns, audiences, templates, addCampaign, sendCampaign, deleteCampaign, fetchWhatsAppTemplateDetails } = useData()
  const { showAlert, AlertComponent } = useAlert()
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [sendingCampaignId, setSendingCampaignId] = useState(null)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    templateId: '',
    templateName: '',
    audienceId: '',
    audience: ''
  })



  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateStructure, setTemplateStructure] = useState(null)
  const [fetchingTemplate, setFetchingTemplate] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedMediaId, setUploadedMediaId] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [cardMedia, setCardMedia] = useState({}) // { cardIndex: { file, mediaId, uploading } }

  const handleCreateCampaign = async (e, action = 'draft') => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const selectedAudience = audiences.find(a => String(a.id) === String(newCampaign.audienceId))
      const selectedTemplate = templates.find(t => String(t.id) === String(newCampaign.templateId))

      // Re-fetch template structure to ensure we have fresh data
      let freshTemplateStructure = templateStructure
      if (selectedTemplate) {
        console.log('🔄 Re-fetching template structure before campaign creation...')
        freshTemplateStructure = await fetchWhatsAppTemplateDetails(selectedTemplate.name)
        console.log('✅ Fresh template structure:', freshTemplateStructure)
      }

      // Create Campaign in DB (Draft initially)
      const createdCampaign = await addCampaign({
        ...newCampaign,
        audience: selectedAudience ? selectedAudience.name : 'All Contacts',
        templateName: selectedTemplate ? selectedTemplate.name : '',
        templateLanguage: selectedTemplate ? selectedTemplate.language : 'en_US',
        templateStructure: freshTemplateStructure, // Use freshly fetched structure
        headerMediaId: uploadedMediaId, // Include uploaded media ID
        cardMediaIds: Object.keys(cardMedia).reduce((acc, current) => {
          if (cardMedia[current].mediaId) acc[current] = cardMedia[current].mediaId
          return acc
        }, {}),
        message: selectedTemplate ? selectedTemplate.content : '',
        messageType: selectedTemplate ? selectedTemplate.type : 'text'
      })

      if (createdCampaign && action === 'send') {
        // Asynchronous trigger: we don't await sendCampaign here, let it run in the background
        setSendingCampaignId(createdCampaign.id)
        sendCampaign(createdCampaign.id).then(() => {
          setSendingCampaignId(null)
        }).catch(err => {
          console.error('Background send failed:', err)
          setSendingCampaignId(null)
        })

        // Notify user that campaign is processing
        showAlert({
          title: 'Campaign Started',
          message: 'Campaign started! It is now running in the background and has been moved to the "In Progress" tab.',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Draft Saved',
          message: 'Campaign saved to Drafts.',
          type: 'success'
        })
      }

      // Reset all state after campaign creation and close modal immediately
      setNewCampaign({ name: '', description: '', templateId: '', templateName: '', audienceId: '', audience: '' })
      setTemplateStructure(null)
      setUploadedImage(null)
      setUploadedMediaId(null)
      setCardMedia({})
      setShowNewCampaign(false)
    } catch (error) {
      console.error("Error creating/sending campaign:", error)
      showAlert({
        title: 'Error',
        message: 'Failed to process campaign. See console for details.',
        type: 'error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTemplateChange = async (e) => {
    const templateId = e.target.value

    // 🔍 DEBUG: Log selection process
    console.log('🔍 Selected Template ID from dropdown:', templateId)
    console.log('📋 All available templates:', templates)

    const selectedTemplate = templates.find(t => String(t.id) === String(templateId))

    // 🔍 DEBUG: Log found template
    console.log('✅ Found selected template:', selectedTemplate)
    console.log('📝 Template name that will be fetched:', selectedTemplate?.name)
    console.log('🌐 Template language that will be used:', selectedTemplate?.language)

    // Reset uploaded image state when template changes
    setUploadedImage(null)
    setUploadedMediaId(null)
    setCardMedia({}) // Reset carousel media

    setNewCampaign({
      ...newCampaign,
      templateId,
      templateName: selectedTemplate ? selectedTemplate.name : ''
    })

    // Fetch template details from WhatsApp if template is selected
    if (selectedTemplate) {
      setFetchingTemplate(true)
      setTemplateStructure(null)
      try {
        // 🔍 DEBUG: Log API call parameters
        console.log('🚀 Calling fetchWhatsAppTemplateDetails with:', {
          name: selectedTemplate.name,
          language: selectedTemplate.language || 'en_US'
        })

        const structure = await fetchWhatsAppTemplateDetails(
          selectedTemplate.name,
          selectedTemplate.language || 'en_US'
        )

        console.log('📋 Template structure fetched (stringified):', JSON.stringify(structure, null, 2))
        console.log('📦 Received template structure name:', structure?.name)
        setTemplateStructure(structure)
      } catch (error) {
        console.error('Error fetching template details:', error)
        showAlert({
          title: 'Error',
          message: 'Failed to fetch template details. Please try again.',
          type: 'error'
        })
      } finally {
        setFetchingTemplate(false)
      }
    }
  }

  const handleViewDetails = async (campaign) => {
    // Find the correct template item to get its ID for the dropdown
    const selectedTemplate = templates.find(t => t.name === campaign.template_name)

    // Populate form with draft data
    setNewCampaign({
      name: campaign.campaign_name || '',
      description: campaign.description || '',
      templateId: selectedTemplate ? String(selectedTemplate.id) : '',
      templateName: campaign.template_name || '',
      audienceId: campaign.audience_id || '',
      audience: campaign.audience || ''
    })

    // If template exists, try to set structure if available in campaign object
    if (campaign.template_structure) {
      setTemplateStructure(campaign.template_structure)
    } else if (campaign.template_name) {
      // Fallback: fetch structure if not in campaign record
      setFetchingTemplate(true)
      try {
        const structure = await fetchWhatsAppTemplateDetails(
          campaign.template_name,
          campaign.template_language || 'en_US'
        )
        setTemplateStructure(structure)
      } catch (error) {
        console.error('Error fetching template details in view:', error)
      } finally {
        setFetchingTemplate(false)
      }
    }

    // Set media if available
    setUploadedMediaId(campaign.header_media_id || null)
    if (campaign.card_media_ids) {
      const media = {}
      Object.entries(campaign.card_media_ids).forEach(([index, mediaId]) => {
        media[index] = { mediaId }
      })
      setCardMedia(media)
    }

    setShowNewCampaign(true)
  }

  const handleAudienceChange = (e) => {
    const audienceId = e.target.value
    const selectedAudience = audiences.find(a => String(a.id) === String(audienceId))
    setNewCampaign({
      ...newCampaign,
      audienceId,
      audience: selectedAudience ? selectedAudience.name : ''
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      // Error will be shown in UI
      return
    }

    // Validate file size (max 5MB for WhatsApp)
    if (file.size > 5 * 1024 * 1024) {
      // Error will be shown in UI
      return
    }

    setUploadingImage(true)
    setUploadedImage(file)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        console.error('Not authenticated')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      console.log('✅ Image uploaded! Media ID:', data.media_id)
      setUploadedMediaId(data.media_id)
      // Success message shown in UI below

    } catch (error) {
      console.error('Upload error:', error)
      // Error will be shown in UI
      setUploadedImage(null)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCardImageUpload = async (e, cardIndex) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) return
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) return

    setCardMedia(prev => ({
      ...prev,
      [cardIndex]: { ...prev[cardIndex], file, uploading: true }
    }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')

      console.log(`✅ Image uploaded for card ${cardIndex}! Media ID:`, data.media_id)
      setCardMedia(prev => ({
        ...prev,
        [cardIndex]: { file, mediaId: data.media_id, uploading: false }
      }))

    } catch (error) {
      console.error(`Upload error for card ${cardIndex}:`, error)
      setCardMedia(prev => {
        const next = { ...prev }
        delete next[cardIndex]
        return next
      })
    }
  }

  const handleCancelCampaign = () => {
    setNewCampaign({ name: '', description: '', templateId: '', templateName: '', audienceId: '', audience: '' })
    setTemplateStructure(null)
    setUploadedImage(null)
    setUploadedMediaId(null)
    setCardMedia({})
    setShowNewCampaign(false)
  }

  // Filter tabs configuration
  const filterTabs = [
    { key: 'All', label: 'All', count: campaigns.length },
    { key: 'Draft', label: 'Drafts', count: campaigns.filter(c => c.status === 'Draft').length },
    { key: 'Processing', label: 'In Progress', count: campaigns.filter(c => c.status === 'Processing').length },
    { key: 'Failed', label: 'Failed', count: campaigns.filter(c => c.status === 'Failed').length },
    { key: 'Completed', label: 'Completed', count: campaigns.filter(c => c.status === 'Completed' || c.status === 'Sent').length }
  ]

  // Filter campaigns based on active tab
  const filteredCampaigns = activeFilter === 'All'
    ? campaigns
    : activeFilter === 'Completed'
      ? campaigns.filter(c => c.status === 'Completed' || c.status === 'Sent')
      : campaigns.filter(c => c.status === activeFilter)

  return (
    <PageLoader delay={350}>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8">
        {/* Credentials Warning */}
        <CredentialsWarning onOpenSettings={() => setShowProfileSettings(true)} />

        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Campaigns</h1>
            <p className="text-sm lg:text-lg text-gray-600 font-medium">Create and manage your WhatsApp campaigns</p>
          </div>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="w-full sm:w-auto px-6 py-3 bg-[#FFC107] text-gray-900 text-base font-bold rounded-xl hover:bg-[#FFB300] transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Campaign
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 border-2 ${activeFilter === tab.key
                ? 'bg-[#FF9800] border-[#FF9800] text-white shadow-sm'
                : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${activeFilter === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Campaigns List */}
        {filteredCampaigns.length > 0 ? (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              // Status badge styling
              const statusStyles = {
                Draft: 'bg-yellow-100 text-yellow-700 font-bold',
                Failed: 'bg-red-100 text-red-700 font-bold',
                Completed: 'bg-green-100 text-green-700 font-bold',
                Sent: 'bg-green-100 text-green-700 font-bold',
                Processing: 'bg-blue-100 text-blue-700 font-bold'
              }
              const statusLabel = campaign.status === 'Sent' ? 'Completed' : campaign.status

              return (
                <div key={campaign.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{campaign.name}</h3>
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${statusStyles[campaign.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">{campaign.description || 'No description provided'}</p>
                      </div>
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="h-8 w-8 bg-white rounded-lg shadow-sm flex items-center justify-center mr-3 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Template</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{campaign.template_name || campaign.templateName || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="h-8 w-8 bg-white rounded-lg shadow-sm flex items-center justify-center mr-3 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Audience</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">{campaign.audience}</p>
                        </div>
                      </div>
                    </div>

                    {(campaign.status === 'Sent' || campaign.status === 'Completed' || campaign.status === 'Failed') && (
                      <div className="mb-6 flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Delivered</span>
                            <span className="text-lg font-bold text-green-600">{campaign.delivered || 0}</span>
                          </div>
                          {campaign.failed > 0 && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Failed</span>
                              <span className="text-lg font-bold text-red-500">{campaign.failed}</span>
                            </div>
                          )}
                        </div>
                        <div className="h-10 w-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {campaign.status === 'Draft' && (
                        <button
                          onClick={() => handleViewDetails(campaign)}
                          className="flex-1 px-4 py-3 text-sm font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all active:scale-95"
                        >
                          Details
                        </button>
                      )}
                      {(campaign.status === 'Draft' || campaign.status === 'Failed') && (
                        <button
                          onClick={() => {
                            setSendingCampaignId(campaign.id)
                            sendCampaign(campaign.id).then(() => {
                              setSendingCampaignId(null)
                            }).catch(err => {
                              console.error('Background send failed:', err)
                              setSendingCampaignId(null)
                              showAlert({
                                title: 'Error',
                                message: 'Background send failed. Check console for details.',
                                type: 'error'
                              })
                            })
                            showAlert({
                              title: 'Campaign Started',
                              message: 'Campaign started! It is now running in the background.',
                              type: 'success'
                            })
                          }}
                          disabled={sendingCampaignId === campaign.id || campaign.status === 'Processing'}
                          className={`flex-1 px-4 py-3 text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${sendingCampaignId === campaign.id
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#FFC107] text-gray-900 hover:bg-[#FFB300] hover:shadow-md'
                            }`}
                        >
                          {sendingCampaignId === campaign.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </>
                          ) : campaign.status === 'Failed' ? 'Retry Campaign' : 'Launch Campaign'}
                        </button>
                      )}
                      {campaign.status === 'Processing' && (
                        <div className="flex-1 flex items-center justify-center py-3 px-4 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Campaign Processing...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : campaigns.length > 0 ? (
          /* No campaigns matching filter */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 lg:p-20">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3">No {activeFilter.toLowerCase()} campaigns</h3>
              <p className="text-gray-500 text-base lg:text-lg leading-relaxed">We couldn't find any campaigns matching the <strong>{activeFilter}</strong> filter.</p>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 lg:p-20">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Launch your first campaign</h3>
              <p className="text-gray-500 mb-8 text-base lg:text-lg leading-relaxed">Start reaching your audience today and grow your network with high-impact WhatsApp campaigns.</p>
              <button
                onClick={() => setShowNewCampaign(true)}
                className="inline-flex items-center justify-center px-8 py-4 bg-[#FFC107] text-gray-900 font-bold rounded-2xl hover:bg-[#FFB300] transition-all shadow-md hover:shadow-lg active:scale-95 gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Campaign
              </button>
            </div>
          </div>
        )}

        {/* New Campaign Modal/Form */}
        {showNewCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-auto flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-white z-10 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">New Campaign</h2>
                    <p className="text-xs text-gray-600 mt-0.5">Create a new WhatsApp campaign to reach your citizens</p>
                  </div>
                  <button
                    onClick={handleCancelCampaign}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative flex-1 overflow-hidden min-h-0">
                {/* Form Column */}
                <div className="p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  <form onSubmit={handleCreateCampaign}>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Campaign Details</h3>

                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Campaign Name *
                        </label>
                        <input
                          type="text"
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          placeholder="Example: January Development Update"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Description <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={newCampaign.description}
                          onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          placeholder="Brief description"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Target Audience *
                        </label>
                        <select
                          value={newCampaign.audienceId}
                          onChange={handleAudienceChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          required
                        >
                          <option value="">Select an audience</option>
                          {audiences.map(audience => (
                            <option key={audience.id} value={audience.id}>
                              {audience.name} ({audience.members.length} members)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Message Template *
                        </label>
                        <select
                          value={newCampaign.templateId}
                          onChange={handleTemplateChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                          required
                        >
                          <option value="">Select a template</option>
                          {templates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Carousel Card Images Upload */}
                      {templateStructure && (templateStructure.hasCarousel || templateStructure.components?.find(c => c.type === 'CAROUSEL')) && (() => {
                        const carouselComp = templateStructure.hasCarousel
                          ? { cards: templateStructure.carouselCards.map(c => ({ components: [{ type: 'BODY', text: c.bodyText }] })) } // Fallback structure for preview
                          : templateStructure.components.find(c => c.type === 'CAROUSEL');

                        const cards = templateStructure.carouselCards || carouselComp?.cards || [];

                        if (cards.length === 0) {
                          console.warn('⚠️ Carousel template detected but no cards found in structure:', templateStructure);
                          return null;
                        }

                        const uploadedCount = Object.keys(cardMedia).filter(key => cardMedia[key]?.mediaId).length;
                        const allUploaded = uploadedCount === cards.length;

                        return (
                          <div className="space-y-4">
                            <div className={`border rounded-xl p-5 ${allUploaded ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                              <div className="flex items-start gap-4 mb-5">
                                <div className={`p-2 rounded-lg ${allUploaded ? 'bg-green-500' : 'bg-amber-500'}`}>
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className={`text-base font-bold ${allUploaded ? 'text-green-900' : 'text-amber-900'}`}>
                                    Carousel Images {allUploaded ? 'Ready' : 'Required'}
                                  </h4>
                                  <p className={`text-sm ${allUploaded ? 'text-green-700' : 'text-amber-700'}`}>
                                    {allUploaded
                                      ? 'All card images have been uploaded successfully.'
                                      : `Please upload images for all cards. Currently ${uploadedCount} of ${cards.length} uploaded.`}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {cards.map((card, index) => {
                                  const isUploaded = !!cardMedia[index]?.mediaId;
                                  const isUploading = cardMedia[index]?.uploading;
                                  const cardBodyText = card.bodyText || card.components?.find(c => c.type === 'BODY')?.text;

                                  return (
                                    <div key={index} className={`p-4 rounded-lg border transition-all ${isUploaded ? 'bg-white border-green-200 shadow-sm' : 'bg-white/50 border-gray-200 border-dashed'}`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Card #{index + 1}</span>
                                        {isUploaded ? (
                                          <span className="flex items-center text-[10px] font-bold text-green-600 uppercase">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Uploaded
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-amber-600 uppercase">Missing Photo</span>
                                        )}
                                      </div>

                                      {/* Card Text Preview */}
                                      <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-100 min-h-[40px]">
                                        <p className="text-[10px] text-gray-500 line-clamp-2 italic">
                                          {cardBodyText || 'No text content'}
                                        </p>
                                      </div>

                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleCardImageUpload(e, index)}
                                        disabled={isUploading || isSubmitting}
                                        className="block w-full text-[10px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#FFC107] file:text-gray-900 hover:file:bg-[#FFB300] file:cursor-pointer disabled:opacity-50"
                                      />

                                      {isUploading && (
                                        <div className="mt-2 flex items-center text-[10px] text-blue-600 font-medium">
                                          <svg className="animate-spin h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Uploading to Meta...
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Loading indicator while fetching template */}
                      {fetchingTemplate && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-sm text-blue-700 font-medium">Fetching template details...</p>
                          </div>
                        </div>
                      )}

                      {/* Image Upload for Templates with Image Header */}
                      {templateStructure && templateStructure.hasHeader && templateStructure.headerType === 'image' && !templateStructure.hasCarousel && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-800 mb-1">Image Header Required</p>
                              <p className="text-xs text-amber-700 mb-3">
                                This template includes an image header. Please upload the same image used in your WhatsApp template.
                              </p>

                              <label className="block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                  disabled={uploadingImage}
                                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-white hover:file:bg-yellow-600 file:cursor-pointer disabled:opacity-50"
                                />
                              </label>

                              {uploadingImage && (
                                <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Uploading image...
                                </p>
                              )}

                              {uploadedMediaId && (
                                <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Image uploaded successfully! Media ID: {uploadedMediaId}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="flex justify-end space-x-2 pt-5 border-t border-gray-200 mt-6">
                      <button
                        type="button"
                        onClick={handleCancelCampaign}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCreateCampaign(e, 'draft')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCreateCampaign(e, 'send')}
                        disabled={
                          isSubmitting ||
                          !newCampaign.name ||
                          !newCampaign.audienceId ||
                          !newCampaign.templateId ||
                          // If template has image header, require uploaded media ID
                          (templateStructure?.hasHeader && templateStructure?.headerType === 'image' && !uploadedMediaId) ||
                          // If template has carousel, require all card images
                          (templateStructure?.hasCarousel &&
                            templateStructure.carouselCards?.some((_, idx) => !cardMedia[idx]?.mediaId))
                        }
                        className="px-4 py-2 text-sm bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
                      >
                        {sendingCampaignId ? 'Sending...' : 'Start Campaign'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Preview Column */}
                <div className="lg:border-l lg:border-gray-200 lg:pl-6 p-5 bg-gray-50 lg:bg-transparent overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
                  <div>
                    {fetchingTemplate ? (
                      <div className="bg-[#E5DDD5] p-4 rounded-lg flex flex-col items-center justify-center animate-pulse" style={{ minHeight: '400px' }}>
                        <div className="w-10 h-10 rounded-full bg-gray-300 mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                      </div>
                    ) : templateStructure ? (
                      <TemplatePreview
                        type={templateStructure.hasCarousel ? 'carousel' : 'standard'}
                        template={{
                          ...templateStructure,
                          // For standard templates
                          bodyText: templateStructure.components?.find(c => c.type === 'BODY' || c.type === 'body')?.text || '',
                          hasHeader: templateStructure.hasHeader,
                          headerFormat: templateStructure.headerType?.toUpperCase(),
                          headerImageUrl: uploadedImage ? URL.createObjectURL(uploadedImage) : '',
                          headerMediaId: uploadedMediaId || templateStructure.headerHandleId, // Pass media ID for draft previews or fallback to template handle
                          headerText: templateStructure.components?.find(c => c.type === 'HEADER' && c.format === 'TEXT')?.text || '',
                          hasFooter: !!templateStructure.components?.find(c => c.type === 'FOOTER'),
                          footerText: templateStructure.components?.find(c => c.type === 'FOOTER')?.text || '',
                          hasButtons: !!templateStructure.components?.find(c => c.type === 'BUTTONS'),
                          buttons: templateStructure.components?.find(c => c.type === 'BUTTONS')?.buttons?.map(b => ({
                            type: b.type,
                            text: b.text,
                            value: b.url || b.phone_number || b.text
                          })) || [],
                          // For carousel templates
                          mainBody: templateStructure.components?.find(c => c.type === 'CAROUSEL')?.cards?.[0]?.components?.find(c => c.type === 'BODY')?.text ? templateStructure.components?.find(c => c.type === 'BODY')?.text : '', // Meta returns carousel body differently sometimes, fallback to main body component
                          cards: templateStructure.carouselCards?.map((card, idx) => ({
                            headerImageFile: cardMedia[idx]?.file,
                            headerMediaId: cardMedia[idx]?.mediaId || card.headerMediaId || card.headerImageUrl, // Pass carousel media IDs or fallback to template handles
                            bodyText: card.bodyText || card.components?.find(c => c.type === 'BODY')?.text || '',
                            buttons: card.components?.find(c => c.type === 'BUTTONS')?.buttons?.map(b => ({
                              type: b.type,
                              text: b.text,
                            })) || []
                          })) || []
                        }}
                        showPreview={true}
                      />
                    ) : (
                      <div className="bg-[#E5DDD5] p-4 rounded-lg flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                        <div className="text-gray-500 text-sm">Select a template to view preview here</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
      <AlertComponent />
    </PageLoader >
  )
}

export default Campaigns
