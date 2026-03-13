import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

const Audiences = () => {
  const { audiences, contacts, addAudience, addContacts, updateAudience, deleteAudience } = useData()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAudience, setNewAudience] = useState({ name: '', description: '', members: [] })
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingAudience, setEditingAudience] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const fileInputRef = useRef(null)

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  )

  const handleCreateAudience = (e) => {
    e.preventDefault()
    addAudience(newAudience)
    setNewAudience({ name: '', description: '', members: [] })
    setSearchTerm('')
    setShowCreateForm(false)
  }

  const toggleContactSelection = (contactId) => {
    setNewAudience(prev => {
      const isSelected = prev.members.includes(contactId)
      return {
        ...prev,
        members: isSelected
          ? prev.members.filter(id => id !== contactId)
          : [...prev.members, contactId]
      }
    })
  }

  const handleDelete = (id) => {
    deleteAudience(id)
    setOpenMenuId(null)
  }

  const handleEdit = (audience) => {
    setEditingAudience({
      ...audience,
      members: audience.members || []
    })
    setOpenMenuId(null)
  }

  const handleUpdateAudience = (e) => {
    e.preventDefault()
    updateAudience(editingAudience.id, editingAudience)
    setEditingAudience(null)
    setSearchTerm('')
  }

  const toggleContactSelectionForEdit = (contactId) => {
    setEditingAudience(prev => {
      const isSelected = prev.members.includes(contactId)
      return {
        ...prev,
        members: isSelected
          ? prev.members.filter(id => id !== contactId)
          : [...prev.members, contactId]
      }
    })
  }

  const downloadExampleCSV = () => {
    const csvContent = `Name,Phone,Email\nRajesh Kumar,\t+919876543210,rajesh.kumar@example.com\nPriya Sharma,\t+919876543211,priya.sharma@example.com`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'audience_example.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isValidFile = fileName.endsWith('.csv') || fileName.endsWith('.txt') || file.type.includes('text')

    if (!isValidFile) {
      setImportError('Please upload a CSV or TXT file')
      return
    }

    setImporting(true)
    setImportError('')
    setImportSuccess('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const lines = text.split(/\r?\n|\r/).filter(line => line.trim())
        const dataLines = lines.slice(1) // Skip header

        const contactsToAdd = []
        for (const line of dataLines) {
          const values = []
          let current = '', inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') inQuotes = !inQuotes
            else if (char === ',' && !inQuotes) { values.push(current); current = '' }
            else current += char
          }
          values.push(current)
          const cleanValues = values.map(v => v.replace(/^["'\t\r]+|["'\t\r]+$/g, '').replace(/\t/g, '').trim())
          if (cleanValues.length >= 2 && cleanValues[0] && cleanValues[1]) {
            contactsToAdd.push({ name: cleanValues[0], phone: cleanValues[1], email: cleanValues[2] || '' })
          }
        }

        if (contactsToAdd.length > 0) {
          const addedContacts = await addContacts(contactsToAdd)
          const newContactIds = addedContacts.map(c => c.id)

          if (editingAudience) {
            setEditingAudience(prev => ({
              ...prev,
              members: [...new Set([...(prev.members || []), ...newContactIds])]
            }))
          } else if (showCreateForm) {
            setNewAudience(prev => ({
              ...prev,
              members: [...new Set([...prev.members, ...newContactIds])]
            }))
          }

          setImportSuccess(`Successfully imported ${addedContacts.length} contacts`)
        } else {
          setImportError('No valid contacts found in the file')
        }
      } catch (error) {
        console.error('Import error:', error)
        setImportError('Error parsing file')
      } finally {
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setTimeout(() => setImportSuccess(''), 5000)
      }
    }
    reader.readAsText(file)
  }

  return (
    <PageLoader delay={350}>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Audiences</h1>
            <p className="text-sm lg:text-base text-gray-600">Create segments to target specific groups of contacts</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full lg:w-auto px-6 py-2 bg-[#FFC107] text-gray-900 text-sm lg:text-base font-semibold rounded-lg hover:bg-[#FFB300] transition-colors shadow-sm"
            >
              Create Audience
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleFileUpload}
          className="hidden"
        />


        {/* Audiences Grid */}
        {audiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
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
                  <span>{audience.members?.length || 0} members</span>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Edit Audience</h2>
                  <button
                    onClick={() => {
                      setEditingAudience(null)
                      setSearchTerm('')
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleUpdateAudience} className="p-4 lg:p-6 overflow-y-auto">
                {importSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4 flex items-center shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs">{importSuccess}</span>
                    <button type="button" onClick={() => setImportSuccess('')} className="ml-auto text-green-700 hover:text-green-900 font-bold">×</button>
                  </div>
                )}

                {importError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 flex items-center shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs">{importError}</span>
                    <button type="button" onClick={() => setImportError('')} className="ml-auto text-red-700 hover:text-red-900 font-bold">×</button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Audience Name *
                    </label>
                    <input
                      type="text"
                      value={editingAudience.name}
                      onChange={(e) => setEditingAudience({ ...editingAudience, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm lg:text-base"
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
                      onChange={(e) => setEditingAudience({ ...editingAudience, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm lg:text-base"
                      placeholder="Brief description of this audience segment"
                      rows="3"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Audience List
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={downloadExampleCSV}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Example CSV
                        </button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={handleImportClick}
                          disabled={importing}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {importing ? 'Importing...' : 'Import CSV'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] lg:text-xs text-gray-500 mb-2">
                      Select contacts ({editingAudience.members?.length || 0} selected)
                    </p>
                    {editingAudience.members?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 p-2 border border-dashed border-gray-300 rounded-lg bg-white max-h-24 overflow-y-auto">
                        {contacts.filter(c => editingAudience.members.includes(c.id)).map(contact => (
                          <div key={contact.id} className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-100">
                            <span className="truncate max-w-[100px]">{contact.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleContactSelectionForEdit(contact.id)}
                              className="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3 lg:p-4 bg-gray-50 max-h-48 lg:max-h-60 overflow-y-auto">
                      {filteredContacts.length > 0 ? (
                        <div className="space-y-2">
                          {filteredContacts.map((contact) => (
                            <label key={contact.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={editingAudience.members?.includes(contact.id)}
                                onChange={() => toggleContactSelectionForEdit(contact.id)}
                                className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No contacts available. Add contacts first.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-3">
                  <button
                    type="submit"
                    className="w-full lg:w-auto px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors text-sm lg:text-base order-1 lg:order-none"
                  >
                    Update Audience
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAudience(null)}
                    className="w-full lg:w-auto px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Create Audience</h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setSearchTerm('')
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleCreateAudience} className="p-4 lg:p-6 overflow-y-auto">
                {importSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4 flex items-center shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs">{importSuccess}</span>
                    <button type="button" onClick={() => setImportSuccess('')} className="ml-auto text-green-700 hover:text-green-900 font-bold">×</button>
                  </div>
                )}

                {importError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 flex items-center shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs">{importError}</span>
                    <button type="button" onClick={() => setImportError('')} className="ml-auto text-red-700 hover:text-red-900 font-bold">×</button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Audience Name *
                    </label>
                    <input
                      type="text"
                      value={newAudience.name}
                      onChange={(e) => setNewAudience({ ...newAudience, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm lg:text-base"
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
                      onChange={(e) => setNewAudience({ ...newAudience, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm lg:text-base"
                      placeholder="Brief description of this audience segment"
                      rows="3"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Audience List
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={downloadExampleCSV}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Example CSV
                        </button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={handleImportClick}
                          disabled={importing}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {importing ? 'Importing...' : 'Import CSV'}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] lg:text-xs text-gray-500 mb-2">
                      Select contacts ({newAudience.members.length} selected)
                    </p>
                    {newAudience.members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 p-2 border border-dashed border-gray-300 rounded-lg bg-white max-h-24 overflow-y-auto">
                        {contacts.filter(c => newAudience.members.includes(c.id)).map(contact => (
                          <div key={contact.id} className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-100">
                            <span className="truncate max-w-[100px]">{contact.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleContactSelection(contact.id)}
                              className="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-3 lg:p-4 bg-gray-50 max-h-48 lg:max-h-60 overflow-y-auto">
                      {filteredContacts.length > 0 ? (
                        <div className="space-y-2">
                          {filteredContacts.map((contact) => (
                            <label key={contact.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={newAudience.members.includes(contact.id)}
                                onChange={() => toggleContactSelection(contact.id)}
                                className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                                <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No contacts available. Add contacts first.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-3">
                  <button
                    type="submit"
                    className="w-full lg:w-auto px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors text-sm lg:text-base order-1 lg:order-none"
                  >
                    Create Audience
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="w-full lg:w-auto px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base"
                  >
                    Cancel
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
