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
        setCampaigns([])
        setReports([])
      } else if (data) {
        // Record found, set data
        setUserRecord(data)
        setContacts(data.contacts || [])
        setAudiences(data.audiences || [])
        setCampaigns(data.campaigns_data || [])
        setReports(data.reports || [])
      }

      // Fetch templates from Templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('Templates')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (templatesError) {
        console.error('Error fetching templates:', templatesError)
        setTemplates([])
      } else {
        // Map database fields to component expectations
        const mappedTemplates = templatesData.map(t => ({
          id: t.id,
          name: t.template_name,
          type: t.template_type || 'text',
          content: t.body_text || t.content,
          category: t.category,
          language: t.language,
          status: t.status,
          metaTemplateId: t.meta_template_id,
          createdAt: t.created_at
        }))
        setTemplates(mappedTemplates)
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

  // Template functions - Now using Templates table
  const addTemplate = async (template) => {
    if (!user?.email) return null

    try {
      const { data, error } = await supabase
        .from('Templates')
        .insert({
          user_email: user.email,
          template_name: template.name,
          template_type: template.type || 'text',
          content: template.content,
          body_text: template.content,
          category: template.category || 'UTILITY',
          language: template.language || 'en_US',
          status: template.status || 'pending',
          meta_template_id: template.metaTemplateId || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding template:', error)
        return null
      }

      // Map database fields to component expectations
      const newTemplate = {
        id: data.id,
        name: data.template_name,
        type: data.template_type,
        content: data.body_text || data.content,
        category: data.category,
        language: data.language,
        status: data.status,
        metaTemplateId: data.meta_template_id,
        createdAt: data.created_at
      }

      setTemplates([...templates, newTemplate])
      return newTemplate
    } catch (error) {
      console.error('Error adding template:', error)
      return null
    }
  }

  const updateTemplate = async (id, updates) => {
    if (!user?.email) return

    try {
      // Map component fields to database fields
      const dbUpdates = {}
      if (updates.name) dbUpdates.template_name = updates.name
      if (updates.type) dbUpdates.template_type = updates.type
      if (updates.content) {
        dbUpdates.content = updates.content
        dbUpdates.body_text = updates.content
      }
      if (updates.category) dbUpdates.category = updates.category
      if (updates.language) dbUpdates.language = updates.language
      if (updates.status) dbUpdates.status = updates.status
      if (updates.metaTemplateId) dbUpdates.meta_template_id = updates.metaTemplateId

      const { error } = await supabase
        .from('Templates')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_email', user.email)

      if (error) {
        console.error('Error updating template:', error)
        return
      }

      // Update local state
      const updatedTemplates = templates.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
      setTemplates(updatedTemplates)
    } catch (error) {
      console.error('Error updating template:', error)
    }
  }

  const deleteTemplate = async (id) => {
    if (!user?.email) return

    try {
      const { error } = await supabase
        .from('Templates')
        .delete()
        .eq('id', id)
        .eq('user_email', user.email)

      if (error) {
        console.error('Error deleting template:', error)
        return
      }

      // Update local state
      const updatedTemplates = templates.filter(t => t.id !== id)
      setTemplates(updatedTemplates)
    } catch (error) {
      console.error('Error deleting template:', error)
    }
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

    console.log('Campaign:', campaign.name)
    console.log('Recipients:', audienceContacts.length)

    // TODO: Implement Edge Function for sending campaigns
    // For now, just simulate the campaign send
    const updatedCampaigns = campaigns.map(c =>
      c.id === id
        ? {
            ...c,
            status: 'Completed',
            sentDate: new Date().toISOString().split('T')[0],
            recipients: audienceContacts.length,
            delivered: Math.floor(audienceContacts.length * 0.7),
            read: Math.floor(audienceContacts.length * 0.5)
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
