import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

// Default test template (same as in Templates page)
const DEFAULT_TEMPLATE = {
  id: 'default-template',
  name: 'Test Campaign 23-01-2026',
  type: 'text',
  content: `Dear {{1}},

Celebrate the rich heritage of Indian culture with us! 🇮🇳✨

Experience the vibrant colors, soulful music, and timeless traditions that make India unique. From classical dance forms to mouth-watering regional cuisines, immerse yourself in a journey that honors our roots and festivals.

🌟 Exclusive Offer:
Enjoy {{2}}% OFF on our curated Indian culture collection—handicrafts, apparel, and ethnic decor.

Hurry! The offer ends on {{3}}. Don't miss out on owning a piece of India's glorious legacy.

Click below to explore and bring home the spirit of India today!`,
  isDefault: true
}

const Campaigns = () => {
  const { campaigns, audiences, templates, addCampaign, sendCampaign, deleteCampaign } = useData()
  const [showNewCampaign, setShowNewCampaign] = useState(false)
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

  // Combine default template with user templates
  const allTemplates = [DEFAULT_TEMPLATE, ...templates]

  const handleCreateCampaign = (e) => {
    e.preventDefault()
    const selectedAudience = audiences.find(a => a.id === Number(newCampaign.audienceId))
    const selectedTemplate = allTemplates.find(t => String(t.id) === String(newCampaign.templateId))
    addCampaign({
      ...newCampaign,
      audience: selectedAudience ? selectedAudience.name : 'All Contacts',
      templateName: selectedTemplate ? selectedTemplate.name : '',
      message: selectedTemplate ? selectedTemplate.content : '',
      messageType: selectedTemplate ? selectedTemplate.type : 'text'
    })
    setNewCampaign({ name: '', description: '', templateId: '', templateName: '', audienceId: '', audience: '' })
    setShowNewCampaign(false)
  }

  const handleTemplateChange = (e) => {
    const templateId = e.target.value
    const selectedTemplate = allTemplates.find(t => String(t.id) === String(templateId))
    setNewCampaign({
      ...newCampaign,
      templateId,
      templateName: selectedTemplate ? selectedTemplate.name : ''
    })
  }

  const handleAudienceChange = (e) => {
    const audienceId = e.target.value
    const selectedAudience = audiences.find(a => a.id === Number(audienceId))
    setNewCampaign({
      ...newCampaign,
      audienceId,
      audience: selectedAudience ? selectedAudience.name : ''
    })
  }

  // Filter tabs configuration
  const filterTabs = [
    { key: 'All', label: 'All', count: campaigns.length },
    { key: 'Draft', label: 'Drafts', count: campaigns.filter(c => c.status === 'Draft').length },
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
          <p className="text-gray-600">Create and manage your WhatsApp campaigns</p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
        >
          New Campaign
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeFilter === tab.key
                ? 'bg-[#FFC107] text-gray-900'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeFilter === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
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
              Draft: 'bg-yellow-100 text-yellow-700',
              Failed: 'bg-red-100 text-red-700',
              Completed: 'bg-green-100 text-green-700',
              Sent: 'bg-green-100 text-green-700'
            }
            const statusLabel = campaign.status === 'Sent' ? 'Completed' : campaign.status

            return (
              <div key={campaign.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${statusStyles[campaign.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Template: {campaign.templateName || campaign.messageType || 'N/A'}</span>
                      <span>Audience: {campaign.audience}</span>
                      {(campaign.status === 'Sent' || campaign.status === 'Completed') && (
                        <>
                          <span className="text-green-600">{campaign.delivered} sent</span>
                          {campaign.failed > 0 && <span className="text-red-500">{campaign.failed} failed</span>}
                        </>
                      )}
                      {campaign.status === 'Failed' && (
                        <span className="text-red-500">{campaign.failed || campaign.recipients} failed</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(campaign.status === 'Draft' || campaign.status === 'Failed') && (
                      <button
                        onClick={async () => {
                          setSendingCampaignId(campaign.id)
                          await sendCampaign(campaign.id)
                          setSendingCampaignId(null)
                        }}
                        disabled={sendingCampaignId === campaign.id}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                          sendingCampaignId === campaign.id
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#FFC107] text-gray-900 hover:bg-[#FFB300]'
                        }`}
                      >
                        {sendingCampaignId === campaign.id
                          ? 'Sending...'
                          : campaign.status === 'Failed'
                            ? 'Retry'
                            : 'Send Now'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : campaigns.length > 0 ? (
        /* No campaigns matching filter */
        <div className="bg-white rounded-xl shadow-sm p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No {activeFilter.toLowerCase()} campaigns</h3>
            <p className="text-gray-600">There are no campaigns matching this filter</p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl shadow-sm p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">Start reaching your audience by creating your first campaign</p>
            <button 
              onClick={() => setShowNewCampaign(true)}
              className="px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
            >
              Create Your First Campaign
            </button>
          </div>
        </div>
      )}

      {/* New Campaign Modal/Form */}
      {showNewCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-auto max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">New Campaign</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Create a new WhatsApp campaign to reach your citizens</p>
                </div>
                <button 
                  onClick={() => setShowNewCampaign(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Campaign Details</h3>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
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
                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
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
                    {allTemplates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.type}){template.isDefault ? ' - Default' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Preview */}
                {newCampaign.templateId && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Template Preview:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {allTemplates.find(t => String(t.id) === String(newCampaign.templateId))?.content || ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewCampaign(false)}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageLoader>
  )
}

export default Campaigns
