import { useState, useRef } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'

const Contacts = () => {
  const { contacts, addContact, addContacts, updateContact, deleteContact, loading } = useData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const fileInputRef = useRef(null)

  // Debug: Log contacts
  console.log('Contacts:', contacts, 'Loading:', loading)

  const handleEditClick = (contact) => {
    setEditingContact({ ...contact })
    setShowEditModal(true)
  }

  const handleEditContact = (e) => {
    e.preventDefault()
    updateContact(editingContact.id, {
      name: editingContact.name,
      phone: editingContact.phone,
      email: editingContact.email
    })
    setShowEditModal(false)
    setEditingContact(null)
  }

  const handleAddContact = (e) => {
    e.preventDefault()
    addContact(newContact)
    setShowAddModal(false)
    setNewContact({ name: '', phone: '', email: '' })
  }

  const downloadExampleCSV = () => {
    // Use tab character before the + to force Excel to preserve it
    // \t (tab) tells Excel this is text, not a number
    const csvContent = `Name,Phone,Email
Rajesh Kumar,\t+919876543210,rajesh.kumar@example.com
Priya Sharma,\t+919876543211,priya.sharma@example.com
Amit Patel,\t+919876543212,amit.patel@example.com
John Smith,\t+14155551234,john.smith@example.com
Sarah Johnson,\t+14155551235,sarah.johnson@example.com`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'contacts_example.csv')
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

    // Check if it's a CSV file (accept .csv, .txt, or any text-based format)
    const fileName = file.name.toLowerCase()
    const isValidFile = fileName.endsWith('.csv') || fileName.endsWith('.txt') || file.type.includes('text')

    if (!isValidFile) {
      setImportError('Please upload a CSV or TXT file with contact data')
      return
    }

    setImporting(true)
    setImportError('')
    setImportSuccess('')

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result

        // Split by different line endings (Windows \r\n, Unix \n, Mac \r)
        const lines = text.split(/\r?\n|\r/).filter(line => line.trim())

        console.log('Total lines in file:', lines.length)
        console.log('First 3 lines:', lines.slice(0, 3))

        // Skip header row
        const dataLines = lines.slice(1)

        console.log('Data lines to process:', dataLines.length)

        let skippedCount = 0
        const contactsToAdd = []

        // Process each line and collect valid contacts
        for (const line of dataLines) {
          try {
            // Parse CSV - handle quoted values and tabs properly
            const values = []
            let current = ''
            let inQuotes = false

            for (let i = 0; i < line.length; i++) {
              const char = line[i]

              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                values.push(current)
                current = ''
              } else {
                current += char
              }
            }
            values.push(current) // Add last value

            // Clean up values - remove quotes, tabs, carriage returns, and extra whitespace
            const cleanValues = values.map(v =>
              v.replace(/^["'\t\r]+|["'\t\r]+$/g, '')
                .replace(/\t/g, '')
                .trim()
            )

            console.log('Parsed values:', cleanValues)

            // Check if we have at least name and phone
            if (cleanValues.length >= 2 && cleanValues[0] && cleanValues[1]) {
              const contact = {
                name: cleanValues[0],
                phone: cleanValues[1],
                email: cleanValues[2] || ''
              }

              console.log('Adding contact:', contact)
              contactsToAdd.push(contact)
            } else {
              console.log('Skipping line - insufficient data:', cleanValues)
              skippedCount++
            }
          } catch (lineError) {
            console.error('Error processing line:', line, lineError)
            skippedCount++
          }
        }

        // Bulk add all contacts at once
        if (contactsToAdd.length > 0) {
          await addContacts(contactsToAdd)
        }

        const importedCount = contactsToAdd.length

        console.log('Import complete. Imported:', importedCount, 'Skipped:', skippedCount)

        // Show success message
        setImportSuccess(`Successfully imported ${importedCount} contact${importedCount !== 1 ? 's' : ''}!${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`)
        setImporting(false)

        // Auto-hide success message after 5 seconds
        setTimeout(() => setImportSuccess(''), 5000)

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } catch (error) {
        console.error('Error parsing CSV:', error)
        setImportError('Error parsing CSV file. Please check the format.')
        setImporting(false)
      }
    }

    reader.onerror = () => {
      setImportError('Error reading file')
      setImporting(false)
    }

    reader.readAsText(file)
  }

  return (
    <PageLoader delay={350}>
      <div className="p-4 lg:p-8 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Contacts</h1>
            <p className="text-sm lg:text-lg text-gray-600 font-medium">Manage your audience and subscriber lists</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={downloadExampleCSV}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
              >
                Example
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center"
              >
                {importing ? '...' : 'Import CSV'}
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-[#FFC107] text-gray-900 text-base font-bold rounded-xl hover:bg-[#FFB300] transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Contact
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Import success message */}
        {importSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{importSuccess}</span>
              <button
                onClick={() => setImportSuccess('')}
                className="ml-auto text-green-700 hover:text-green-900 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Import error message */}
        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{importError}</span>
              <button
                onClick={() => setImportError('')}
                className="ml-auto text-red-700 hover:text-red-900 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Contacts Table/Cards or Empty State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12">
            <div className="text-center">
              <p className="text-gray-600">Loading contacts...</p>
            </div>
          </div>
        ) : contacts.length > 0 ? (
          <>
            {/* Mobile View (Profile Cards) */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {contacts.map((contact, idx) => {
                const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700'];
                const colorClass = colors[idx % colors.length];
                return (
                  <div key={contact.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`h-14 w-14 ${colorClass} rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner`}>
                            {contact.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{contact.name}</h3>
                            <p className="text-xs text-gray-400 font-medium">Added {contact.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditClick(contact)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteContact(contact.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                          <div className="h-8 w-8 bg-white rounded-lg shadow-sm flex items-center justify-center mr-3 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Phone Number</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{contact.phone}</p>
                          </div>
                          <a href={`tel:${contact.phone}`} className="ml-2 p-2 text-green-600 bg-green-50 rounded-lg lg:hidden">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 004.815 4.815l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C10.066 18 2 9.934 2 3z" /></svg>
                          </a>
                        </div>

                        <div className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="h-8 w-8 bg-white rounded-lg shadow-sm flex items-center justify-center mr-3 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email Address</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{contact.email || 'Not provided'}</p>
                          </div>
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="ml-2 p-2 text-blue-600 bg-blue-50 rounded-lg lg:hidden">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[#FFC107] rounded-full flex items-center justify-center">
                            <span className="text-gray-900 font-semibold">{contact.name[0]}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{contact.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEditClick(contact)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteContact(contact.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 lg:p-20">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Your network starts here</h3>
              <p className="text-gray-500 mb-8 text-base lg:text-lg leading-relaxed">Connect with your audience by adding your first contact or importing your list via CSV.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center px-8 py-4 bg-[#FFC107] text-gray-900 font-bold rounded-2xl hover:bg-[#FFB300] transition-all shadow-md hover:shadow-lg active:scale-95 gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Contact
              </button>
            </div>
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Add Contact</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddContact} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="+919876543210 or +14155551234"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +91 for India, +1 for US)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                  >
                    Add Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Contact Modal */}
        {showEditModal && editingContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Contact</h2>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingContact(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleEditContact} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editingContact.name}
                      onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={editingContact.phone}
                      onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="+919876543210 or +14155551234"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +91 for India, +1 for US)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingContact.email}
                      onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingContact(null)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors"
                  >
                    Save Changes
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

export default Contacts
