import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

const NewDashboard = () => {
  const navigate = useNavigate()
  const { stats, campaigns } = useData()
  const recentCampaigns = campaigns.slice(-3).reverse()

  return (
    <PageLoader delay={400}>
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your WhatsApp campaign performance</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Contacts</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalContacts}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-blue-600">📈 Growing audience</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-md p-6 border border-yellow-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-yellow-700 mb-1">Campaigns</p>
              <p className="text-3xl font-bold text-yellow-900">{stats.totalCampaigns}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-yellow-600">🎯 {stats.sentCampaigns} sent • {stats.draftCampaigns} draft</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Templates</p>
              <p className="text-3xl font-bold text-green-900">{stats.totalTemplates}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-green-600">📝 Ready to use</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md p-6 border border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Messages Sent</p>
              <p className="text-3xl font-bold text-purple-900">{stats.messagesSent}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-purple-600">✉️ All time total</p>
        </div>
      </div>

      {/* Recent Campaigns and Quick Actions */}
      <div className="grid grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Campaigns</h2>
            <button 
              onClick={() => navigate('/campaigns')}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center transition-colors"
            >
              View all
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          {/* Campaign List or Empty State */}
          {recentCampaigns.length > 0 ? (
            <div className="space-y-3">
              {recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate('/campaigns')}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm">{campaign.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      campaign.status === 'Sent' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{campaign.audience} • {campaign.messageType}</p>
                  {campaign.status === 'Sent' && (
                    <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                      <span>📨 {campaign.delivered} sent</span>
                      <span>👁️ {campaign.read} read</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">No campaigns yet</p>
              <button 
                onClick={() => navigate('/campaigns')}
                className="px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
              >
                Create your first campaign
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/campaigns')}
              className="w-full flex items-center space-x-3 p-4 border-2 border-gray-100 rounded-lg hover:border-[#FFC107] hover:bg-yellow-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-[#FFC107] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">New Campaign</p>
                <p className="text-xs text-gray-600">Send an update</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/contacts')}
              className="w-full flex items-center space-x-3 p-4 border-2 border-gray-100 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Add Contacts</p>
                <p className="text-xs text-gray-600">Import or add</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/templates')}
              className="w-full flex items-center space-x-3 p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-[#FFC107] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Template</p>
                <p className="text-xs text-gray-600">Reusable messages</p>
              </div>
            </button>

            <button 
              onClick={() => navigate('/chats')}
              className="w-full flex items-center space-x-3 p-4 border-2 border-gray-100 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Send a Message</p>
                <p className="text-xs text-gray-600">Direct messaging</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    </PageLoader>
  )
}

export default NewDashboard
