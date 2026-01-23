import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext({})

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState([])
  const [audiences, setAudiences] = useState([])
  const [templates, setTemplates] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [reports, setReports] = useState([])
  const [userRecord, setUserRecord] = useState(null)

  // Fetch user data from Supabase
  const fetchUserData = async () => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch user record (it should already exist from AuthContext)
      const { data, error } = await supabase
        .from('User_details')
        .select('*')
        .eq('email', user.email)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        // Initialize with empty data if there's an error
        setUserRecord(null)
        setContacts([])
        setAudiences([])
        setTemplates([])
        setCampaigns([])
        setReports([])
      } else if (data) {
        // Record found, set data
        setUserRecord(data)
        setContacts(data.contacts || [])
        setAudiences(data.audiences || [])
        setTemplates(data.templates_data || [])
        setCampaigns(data.campaigns_data || [])
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update user data in Supabase
  const updateUserData = async (updates) => {
    if (!user?.email) return

    try {
      const { error } = await supabase
        .from('User_details')
        .update(updates)
        .eq('email', user.email)

      if (error) {
        console.error('Error updating user data:', error)
      }
    } catch (error) {
      console.error('Error updating user data:', error)
    }
  }

  // Load data when user changes
  useEffect(() => {
    fetchUserData()
  }, [user])

  // Contact functions
  const addContact = async (contact) => {
    const newContact = {
      ...contact,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    const updatedContacts = [...contacts, newContact]
    setContacts(updatedContacts)

    await updateUserData({
      contacts: updatedContacts,
      total_contacts: updatedContacts.length
    })

    return newContact
  }

  // Bulk add contacts (for CSV import)
  const addContacts = async (contactsArray) => {
    const now = Date.now()
    const newContacts = contactsArray.map((contact, index) => ({
      ...contact,
      id: now + index, // Ensure unique IDs
      createdAt: new Date().toISOString().split('T')[0]
    }))
    const updatedContacts = [...contacts, ...newContacts]
    setContacts(updatedContacts)

    await updateUserData({
      contacts: updatedContacts,
      total_contacts: updatedContacts.length
    })

    return newContacts
  }

  const updateContact = async (id, updates) => {
    const updatedContacts = contacts.map(c => c.id === id ? { ...c, ...updates } : c)
    setContacts(updatedContacts)

    await updateUserData({
      contacts: updatedContacts
    })
  }

  const deleteContact = async (id) => {
    const updatedContacts = contacts.filter(c => c.id !== id)
    setContacts(updatedContacts)

    // Also remove from audiences
    const updatedAudiences = audiences.map(a => ({
      ...a,
      members: a.members.filter(m => m !== id)
    }))
    setAudiences(updatedAudiences)

    await updateUserData({
      contacts: updatedContacts,
      audiences: updatedAudiences,
      total_contacts: updatedContacts.length
    })
  }

  // Audience functions
  const addAudience = async (audience) => {
    const newAudience = {
      ...audience,
      id: Date.now(),
      members: audience.members || [],
      createdAt: new Date().toISOString().split('T')[0]
    }
    const updatedAudiences = [...audiences, newAudience]
    setAudiences(updatedAudiences)
    
    await updateUserData({
      audiences: updatedAudiences
    })
    
    return newAudience
  }

  const updateAudience = async (id, updates) => {
    const updatedAudiences = audiences.map(a => a.id === id ? { ...a, ...updates } : a)
    setAudiences(updatedAudiences)
    
    await updateUserData({
      audiences: updatedAudiences
    })
  }

  const deleteAudience = async (id) => {
    const updatedAudiences = audiences.filter(a => a.id !== id)
    setAudiences(updatedAudiences)
    
    await updateUserData({
      audiences: updatedAudiences
    })
  }

  // Template functions
  const addTemplate = async (template) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    const updatedTemplates = [...templates, newTemplate]
    setTemplates(updatedTemplates)
    
    await updateUserData({
      templates_data: updatedTemplates,
      templates: updatedTemplates.length
    })
    
    return newTemplate
  }

  const updateTemplate = async (id, updates) => {
    const updatedTemplates = templates.map(t => t.id === id ? { ...t, ...updates } : t)
    setTemplates(updatedTemplates)
    
    await updateUserData({
      templates_data: updatedTemplates
    })
  }

  const deleteTemplate = async (id) => {
    const updatedTemplates = templates.filter(t => t.id !== id)
    setTemplates(updatedTemplates)
    
    await updateUserData({
      templates_data: updatedTemplates,
      templates: updatedTemplates.length
    })
  }

  // Campaign functions
  const addCampaign = async (campaign) => {
    const audience = audiences.find(a => a.id === campaign.audienceId)
    const newCampaign = {
      ...campaign,
      id: Date.now(),
      status: 'Draft',
      sentDate: null,
      recipients: audience ? audience.members.length : 0,
      delivered: 0,
      read: 0,
      createdAt: new Date().toISOString().split('T')[0]
    }
    const updatedCampaigns = [...campaigns, newCampaign]
    setCampaigns(updatedCampaigns)
    
    await updateUserData({
      campaigns_data: updatedCampaigns,
      campaigns: updatedCampaigns.length
    })
    
    return newCampaign
  }

  const updateCampaign = async (id, updates) => {
    const updatedCampaigns = campaigns.map(c => c.id === id ? { ...c, ...updates } : c)
    setCampaigns(updatedCampaigns)
    
    await updateUserData({
      campaigns_data: updatedCampaigns
    })
  }

  const deleteCampaign = async (id) => {
    const updatedCampaigns = campaigns.filter(c => c.id !== id)
    setCampaigns(updatedCampaigns)
    
    await updateUserData({
      campaigns_data: updatedCampaigns,
      campaigns: updatedCampaigns.length
    })
  }

  const sendCampaign = async (id) => {
    const campaign = campaigns.find(c => c.id === id)
    if (!campaign) return

    const audienceContacts = getAudienceContacts(campaign.audienceId)
    const apiKey = import.meta.env.VITE_AISENSY_API_KEY

    console.log('Starting campaign send...')
    console.log('API Key:', apiKey ? 'Present' : 'MISSING')
    console.log('Campaign:', campaign.templateName || campaign.name)
    console.log('Campaign audienceId:', campaign.audienceId, 'Type:', typeof campaign.audienceId)

    // Debug: Find the audience
    const audience = audiences.find(a => a.id === campaign.audienceId)
    console.log('Found audience:', audience)
    console.log('All audiences:', audiences)
    console.log('All contacts:', contacts)
    console.log('Contacts to send:', audienceContacts.length)

    // Helper function to add delay between API calls
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < audienceContacts.length; i++) {
      const contact = audienceContacts[i]

      // Add 2 second delay between calls (skip for first call)
      if (i > 0) {
        console.log('Waiting 2 seconds before next call...')
        await delay(2000)
      }

      try {
        console.log(`Sending to ${contact.name} (${contact.phone})...`)

        // Ensure phone number starts with +
        const phoneNumber = contact.phone.startsWith('+') ? contact.phone : '+' + contact.phone

        const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            campaignName: campaign.templateName || campaign.name,
            destination: phoneNumber,
            userName: "123456789",
            templateParams: [contact.name, "95", "today"]
          })
        })

        const data = await response.json()
        console.log('API Response:', data)

        if (data.success === "true" || data.success === true) {
          console.log(`✓ Success for ${contact.phone}`)
          successCount++
        } else {
          console.log(`✗ Failed for ${contact.phone}:`, data.message || data)
          failCount++
        }
      } catch (error) {
        console.error('✗ Network error for:', contact.phone, error)
        failCount++
      }
    }

    console.log(`Campaign complete. Success: ${successCount}, Failed: ${failCount}`)

    const newStatus = failCount === audienceContacts.length ? 'Failed' : 'Completed'
    const updatedCampaigns = campaigns.map(c =>
      c.id === id
        ? {
            ...c,
            status: newStatus,
            sentDate: new Date().toISOString().split('T')[0],
            delivered: successCount,
            failed: failCount
          }
        : c
    )
    setCampaigns(updatedCampaigns)

    const totalMessagesSent = updatedCampaigns.reduce((sum, c) => sum + (c.delivered || 0), 0)

    await updateUserData({
      campaigns_data: updatedCampaigns,
      messages_sent: totalMessagesSent
    })
  }

  // Report functions
  const addReport = async (report) => {
    const newReport = {
      ...report,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    const updatedReports = [...reports, newReport]
    setReports(updatedReports)
    
    await updateUserData({
      reports: updatedReports
    })
    
    return newReport
  }

  const deleteReport = async (id) => {
    const updatedReports = reports.filter(r => r.id !== id)
    setReports(updatedReports)
    
    await updateUserData({
      reports: updatedReports
    })
  }

  // Stats calculations
  const stats = {
    totalContacts: contacts.length,
    totalAudiences: audiences.length,
    totalTemplates: templates.length,
    totalCampaigns: campaigns.length,
    sentCampaigns: campaigns.filter(c => c.status === 'Sent').length,
    draftCampaigns: campaigns.filter(c => c.status === 'Draft').length,
    messagesSent: campaigns.reduce((sum, c) => sum + (c.delivered || 0), 0),
  }

  // Get audience by ID (handles string/number type mismatch)
  const getAudienceById = (id) => audiences.find(a => String(a.id) === String(id))

  // Get contacts in audience (handles string/number type mismatch)
  const getAudienceContacts = (audienceId) => {
    const audience = audiences.find(a => String(a.id) === String(audienceId))
    if (!audience) return []
    return contacts.filter(c => audience.members.includes(c.id))
  }

  const value = {
    contacts,
    audiences,
    templates,
    campaigns,
    reports,
    stats,
    loading,
    addContact,
    addContacts,
    updateContact,
    deleteContact,
    addAudience,
    updateAudience,
    deleteAudience,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    addReport,
    deleteReport,
    getAudienceById,
    getAudienceContacts,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
