import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

const Audiences = () => {
  const { audiences, addAudience, updateAudience, deleteAudience } = useData()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAudience, setNewAudience] = useState({ name: '', description: '' })
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingAudience, setEditingAudience] = useState(null)

  const handleCreateAudience = (e) => {
    e.preventDefault()
    addAudience(newAudience)
    setNewAudience({ name: '', description: '' })
    setShowCreateForm(false)
  }

  const handleDelete = (id) => {
    deleteAudience(id)
    setOpenMenuId(null)
  }

  const handleEdit = (audience) => {
    setEditingAudience(audience)
    setOpenMenuId(null)
  }

  const handleUpdateAudience = (e) => {
    e.preventDefault()
    updateAudience(editingAudience.id, editingAudience)
    setEditingAudience(null)
  }

  return (
    <PageLoader delay={350}>
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audiences</h1>
          <p className="text-gray-600">Create segments to target specific groups of contacts</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
        >
          Create Audience
        </button>
      </div>

      {/* Audiences Grid */}
      {audiences.length > 0 ? (
        <div className="grid grid-cols-3 gap-6">
          {audiences.map((audience) => (
            <div key={audience.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{audience.name}</h3>
                  <p className="text-sm text-gray-600">{audience.description}</p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setOpenMenuId(openMenuId === audience.id ? null : audience.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <circle cx="12" cy="19" r="2"/>
                    </svg>
                  </button>
                  {openMenuId === audience.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button 
                        onClick={() => handleEdit(audience)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(audience.id)}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{audience.members.length} members</span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No audiences yet</h3>
            <p className="text-gray-600 mb-6">Create audience segments to better target your campaigns</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
            >
              Create Your First Audience
            </button>
          </div>
        </div>
      )}

      {/* Edit Audience Modal */}
      {editingAudience && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Audience</h2>
                <button 
                  onClick={() => setEditingAudience(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleUpdateAudience} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audience Name *
                  </label>
                  <input
                    type="text"
                    value={editingAudience.name}
                    onChange={(e) => setEditingAudience({...editingAudience, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="e.g., Downtown Residents"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingAudience.description}
                    onChange={(e) => setEditingAudience({...editingAudience, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Brief description of this audience segment"
                    rows="4"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center space-x-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                >
                  Update Audience
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAudience(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Audience Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create Audience</h2>
                <button 
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateAudience} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audience Name *
                  </label>
                  <input
                    type="text"
                    value={newAudience.name}
                    onChange={(e) => setNewAudience({...newAudience, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="e.g., Downtown Residents"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newAudience.description}
                    onChange={(e) => setNewAudience({...newAudience, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Brief description of this audience segment"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audience List
                  </label>
                  <p className="text-sm text-gray-500 mb-2">Select contacts to add to this audience (UI only)</p>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-500">No contacts available</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                >
                  Create Audience
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

export default Audiences
