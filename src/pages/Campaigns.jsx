import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

const Campaigns = () => {
  const { campaigns, audiences, addCampaign, sendCampaign, deleteCampaign } = useData()
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    messageType: 'text',
    audienceId: '',
    audience: '',
    message: ''
  })

  const handleCreateCampaign = (e) => {
    e.preventDefault()
    const selectedAudience = audiences.find(a => a.id === Number(newCampaign.audienceId))
    addCampaign({
      ...newCampaign,
      audience: selectedAudience ? selectedAudience.name : 'All Contacts'
    })
    setNewCampaign({ name: '', description: '', messageType: 'text', audienceId: '', audience: '', message: '' })
    setShowNewCampaign(false)
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

      {/* Campaigns List */}
      {campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      campaign.status === 'Sent' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>📋 Type: {campaign.messageType}</span>
                    <span>👥 Audience: {campaign.audience}</span>
                    {campaign.status === 'Sent' && (
                      <>
                        <span>📨 {campaign.delivered} sent</span>
                        <span>👁️ {campaign.read} read</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {campaign.status === 'Draft' && (
                    <button
                      onClick={() => sendCampaign(campaign.id)}
                      className="px-4 py-2 bg-[#FFC107] text-gray-900 text-sm font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                    >
                      Send Now
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
          ))}
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
                    Description
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
                    Message Type
                  </label>
                  <div className="flex space-x-4">
                    {['text', 'image', 'carousel'].map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="radio"
                          name="messageType"
                          value={type}
                          checked={newCampaign.messageType === type}
                          onChange={(e) => setNewCampaign({...newCampaign, messageType: e.target.value})}
                          className="mr-1.5 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span className="text-xs text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Target Audience
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
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-3">Message Content</h3>
              
              <div className="mb-4">
                <textarea
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your message here..."
                  rows="4"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  💡 Tip: Keep messages clear and concise for better engagement
                </p>
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
