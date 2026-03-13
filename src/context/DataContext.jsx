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
  const [followupRules, setFollowupRules] = useState([])

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
        // Audiences are now fetched from Audiences table below
        setReports(data.reports || [])
      }

      // Fetch audiences from Audiences table
      const { data: audiencesData, error: audiencesError } = await supabase
        .from('Audiences')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (audiencesError) {
        console.error('Error fetching audiences:', audiencesError)
        setAudiences([])
      } else {
        // Map database fields to component expectations
        const mappedAudiences = audiencesData.map(a => ({
          id: a.id,
          name: a.audience_name,
          description: a.description,
          members: a.audience_list || [],
          createdAt: a.created_at
        }))
        setAudiences(mappedAudiences)
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

      // Fetch campaigns from Campaigns table
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('Campaigns')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError)
        setCampaigns([])
      } else {
        // Map database fields to component expectations
        const mappedCampaigns = campaignsData.map(c => ({
          id: c.id,
          name: c.campaign_name,
          description: c.description,
          status: c.status,
          templateName: c.template_name,
          templateLanguage: c.template_language,
          audience: c.audience,
          audienceId: c.audience_id,
          delivered: c.delivered,
          failed: c.failed,
          recipients: c.recipients,
          createdAt: c.created_at,
          messageType: c.message_type,
          // Keep original fields just in case
          ...c
        }))
        setCampaigns(mappedCampaigns)
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
    fetchFollowupRules()
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
    const existingPhones = new Set(contacts.map(c => c.phone))

    // Filter out duplicates by phone number to determine what's actually new
    const uniqueNewContacts = contactsArray.filter(c => !existingPhones.has(c.phone))

    let allUpdatedContacts = contacts
    let addedContacts = []

    if (uniqueNewContacts.length > 0) {
      addedContacts = uniqueNewContacts.map((contact, index) => ({
        ...contact,
        id: now + index,
        createdAt: new Date().toISOString().split('T')[0]
      }))

      allUpdatedContacts = [...contacts, ...addedContacts]
      setContacts(allUpdatedContacts)

      await updateUserData({
        contacts: allUpdatedContacts,
        total_contacts: allUpdatedContacts.length
      })
    }

    // Create a set of phone numbers from the input array for efficient lookup
    const inputPhones = new Set(contactsArray.map(c => c.phone));

    // Return ALL contacts that were part of this import (existing + newly added)
    return allUpdatedContacts.filter(c => inputPhones.has(c.phone))
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

  // Audience functions - Now using Audiences table
  const addAudience = async (audience) => {
    if (!user?.email) return null

    try {
      const { data, error } = await supabase
        .from('Audiences')
        .insert({
          user_email: user.email,
          audience_name: audience.name,
          description: audience.description || '',
          audience_list: audience.members || []
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding audience:', error)
        return null
      }

      // Map database fields to component expectations
      const newAudience = {
        id: data.id,
        name: data.audience_name,
        description: data.description,
        members: data.audience_list || [],
        createdAt: data.created_at
      }

      setAudiences([...audiences, newAudience])
      return newAudience
    } catch (error) {
      console.error('Error adding audience:', error)
      return null
    }
  }

  const updateAudience = async (id, updates) => {
    if (!user?.email) return

    try {
      // Map component fields to database fields
      const dbUpdates = {}
      if (updates.name) dbUpdates.audience_name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.members) dbUpdates.audience_list = updates.members

      const { error } = await supabase
        .from('Audiences')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_email', user.email)

      if (error) {
        console.error('Error updating audience:', error)
        return
      }

      // Update local state
      const updatedAudiences = audiences.map(a => a.id === id ? { ...a, ...updates } : a)
      setAudiences(updatedAudiences)
    } catch (error) {
      console.error('Error updating audience:', error)
    }
  }

  const deleteAudience = async (id) => {
    if (!user?.email) return

    try {
      const { error } = await supabase
        .from('Audiences')
        .delete()
        .eq('id', id)
        .eq('user_email', user.email)

      if (error) {
        console.error('Error deleting audience:', error)
        return
      }

      // Update local state
      const updatedAudiences = audiences.filter(a => a.id !== id)
      setAudiences(updatedAudiences)
    } catch (error) {
      console.error('Error deleting audience:', error)
    }
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

  // Helper functions for WhatsApp template details
  const fetchWhatsAppTemplateDetails = async (templateName, language = 'en_US') => {
    console.log(`📤 Fetching template details for: ${templateName} (${language})`)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    console.log('🔑 Token exists:', !!token)
    console.log('🔑 Token preview:', token?.substring(0, 50) + '...')
    console.log('👤 User:', session?.user?.email)

    if (!token) {
      throw new Error('Not authenticated')
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-template-details`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    console.log('🌐 Calling URL:', url)
    console.log('📋 Headers being sent:', Object.keys(headers))
    console.log('📋 Full headers:', headers)

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        template_name: templateName,
        language: language
      })
    })

    console.log('📥 Response status:', response.status)
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log('📥 Response data:', data)

    if (!response.ok) {
      console.error('❌ Edge function error:', data)
      throw new Error(data.error || 'Failed to fetch template details')
    }

    return data.template
  }

  const parseTemplateComponents = (templateStructure) => {
    // Template structure is already parsed by the edge function
    return templateStructure
  }

  // Campaign functions
  const addCampaign = async (campaign) => {
    if (!user?.email) return null

    try {
      const audience = audiences.find(a => a.id === campaign.audienceId)
      const template = templates.find(t => String(t.id) === String(campaign.templateId))

      // Insert into Campaigns table
      const { data: newCampaign, error } = await supabase
        .from('Campaigns')
        .insert({
          user_email: user.email,
          campaign_name: campaign.name,
          description: campaign.description,
          message_type: 'template',
          audience: audience ? audience.name : 'Unknown',
          audience_id: campaign.audienceId || null,
          message: campaign.message || template?.content || '',
          template_name: campaign.templateName || template?.name,
          template_language: campaign.templateLanguage || template?.language || 'en_US',
          template_structure: campaign.templateStructure || null,
          header_media_id: campaign.headerMediaId || null, // Save uploaded media ID
          card_media_ids: campaign.cardMediaIds || {}, // Save carousel media IDs
          status: 'Draft',
          recipients: audience ? audience.members.length : 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating campaign:', error)
        return null
      }

      console.log('Campaign created successfully:', newCampaign)
      await fetchUserData() // Refresh UI
      return newCampaign
    } catch (err) {
      console.error('Error in addCampaign:', err)
      return null
    }
  }

  const updateCampaign = async (id, updates) => {
    const updatedCampaigns = campaigns.map(c => c.id === id ? { ...c, ...updates } : c)
    setCampaigns(updatedCampaigns)

    await updateUserData({
      campaigns_data: updatedCampaigns
    })
  }

  const deleteCampaign = async (id) => {
    try {
      const { error } = await supabase
        .from('Campaigns')
        .delete()
        .eq('id', id)
        .eq('user_email', user.email)

      if (error) {
        console.error('Error deleting campaign:', error)
        return
      }

      await fetchUserData() // Refresh UI
    } catch (err) {
      console.error('Error in deleteCampaign:', err)
    }
  }

  /* 
   * Triggers the campaign sending process via Edge Function
   */
  const sendCampaign = async (id) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Not authenticated')
      }

      // Optimistic UI Update: Set status to processing immediately so it shows up in "In Progress" tab
      await updateCampaign(id, { status: 'Processing' })

      // Note: we do NOT await this locally in the frontend flow for "Start Campaign", 
      // but if we did, this promise resolves when the backend is done.
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaign_id: id })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Edge function error:', data)
        // Revert status on failure
        await updateCampaign(id, { status: 'Failed' })
        throw new Error(data.error || 'Failed to send campaign')
      }

      await fetchUserData()
      return data
    } catch (error) {
      console.error('Error sending campaign:', error)
      throw error
    }
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

  // ── Follow-up Rule Functions ──

  const fetchFollowupRules = async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from('template_followups')
      .select('*')
      .eq('user_email', user.email)
    if (!error) {
      // Expand carousel rows (JSONB) into flat rule objects so UI filtering works the same
      const expanded = []
      for (const row of (data || [])) {
        if (row.template_type === 'carousel' && Array.isArray(row.rules)) {
          row.rules.forEach(r => expanded.push({
            id: row.id,
            source_template_name: row.source_template_name,
            template_type: 'carousel',
            ...r
          }))
        } else {
          expanded.push(row)
        }
      }
      setFollowupRules(expanded)
    }
  }

  const saveFollowupRule = async (ruleOrRules) => {
    const rules = Array.isArray(ruleOrRules) ? ruleOrRules : [ruleOrRules]
    if (rules.length === 0) return { error: null }

    const sourceTemplateName = rules[0].source_template_name
    const isCarousel = rules.some(r => r.card_index !== null && r.card_index !== undefined)

    if (isCarousel) {
      // ── Carousel: one row per template, all button rules stored as JSONB array ──

      // Cleanup legacy rows from older versions to prevent UI duplicates
      await supabase
        .from('template_followups')
        .delete()
        .eq('user_email', user.email)
        .eq('source_template_name', sourceTemplateName)
        .eq('template_type', 'standard')

      const { data: existingRow } = await supabase
        .from('template_followups')
        .select('id, rules')
        .eq('user_email', user.email)
        .eq('source_template_name', sourceTemplateName)
        .eq('template_type', 'carousel')
        .maybeSingle()

      const existing = existingRow && Array.isArray(existingRow.rules) ? existingRow.rules : []
      let updatedRules = [...existing]

      // Apply each new rule (add/update if selected, remove if cleared)
      for (const rule of rules) {
        const idx = updatedRules.findIndex(r => r.button_payload === rule.button_payload)

        if (rule.followup_template_name) {
          const ruleEntry = {
            button_payload: rule.button_payload,
            button_title: rule.button_title,
            card_index: rule.card_index,
            followup_template_name: rule.followup_template_name,
            followup_template_language: rule.followup_template_language
          }
          if (idx >= 0) updatedRules[idx] = ruleEntry
          else updatedRules.push(ruleEntry)
        } else {
          // Rule was cleared
          if (idx >= 0) updatedRules.splice(idx, 1)
        }
      }

      if (existingRow) {
        const { error } = await supabase
          .from('template_followups')
          .update({ rules: updatedRules })
          .eq('id', existingRow.id)
        if (error) console.error('Supabase update error:', error)
      } else {
        if (updatedRules.length > 0) {
          await supabase
            .from('template_followups')
            .insert({
              user_email: user.email,
              source_template_name: sourceTemplateName,
              template_type: 'carousel',
              rules: updatedRules
            })
        }
      }
    } else {
      // ── Standard: one row per button ──
      for (const rule of rules) {
        if (!rule.followup_template_name) {
          // Delete rule if it was cleared
          await supabase
            .from('template_followups')
            .delete()
            .eq('user_email', user.email)
            .eq('source_template_name', rule.source_template_name)
            .eq('button_payload', rule.button_payload)
            .is('card_index', null)
          continue
        }

        const { data: existingRows } = await supabase
          .from('template_followups')
          .select('id')
          .eq('user_email', user.email)
          .eq('source_template_name', rule.source_template_name)
          .eq('button_payload', rule.button_payload)
          .is('card_index', null)

        if (existingRows && existingRows.length > 0) {
          const mainId = existingRows[0].id
          await supabase
            .from('template_followups')
            .update({
              followup_template_name: rule.followup_template_name,
              followup_template_language: rule.followup_template_language,
              button_title: rule.button_title
            })
            .eq('id', mainId)

          if (existingRows.length > 1) {
            const duplicateIds = existingRows.slice(1).map(r => r.id)
            await supabase.from('template_followups').delete().in('id', duplicateIds)
          }
        } else {
          await supabase
            .from('template_followups')
            .insert({
              user_email: user.email,
              source_template_name: rule.source_template_name,
              template_type: 'standard',
              button_payload: rule.button_payload,
              button_title: rule.button_title,
              card_index: null,
              followup_template_name: rule.followup_template_name,
              followup_template_language: rule.followup_template_language
            })
        }
      }
    }

    // Refresh state
    await fetchFollowupRules()
    return { error: null }
  }

  const deleteFollowupRule = async (id) => {
    const { error } = await supabase
      .from('template_followups')
      .delete()
      .eq('id', id)
      .eq('user_email', user.email)
    if (!error) setFollowupRules(prev => prev.filter(r => r.id !== id))
    return { error }
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
    fetchWhatsAppTemplateDetails,
    parseTemplateComponents,
    // Follow-up rules
    followupRules,
    fetchFollowupRules,
    saveFollowupRule,
    deleteFollowupRule,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
