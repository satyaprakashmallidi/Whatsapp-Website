import { createContext, useContext, useState, useEffect } from 'react'

const DataContext = createContext({})

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

// Demo fake data
const initialContacts = [
  { id: 1, name: 'Rajesh Kumar', phone: '+919876543210', email: 'rajesh.kumar@city.gov.in', createdAt: '2024-01-15' },
  { id: 2, name: 'Priya Sharma', phone: '+919876543211', email: 'priya.sharma@business.in', createdAt: '2024-01-16' },
  { id: 3, name: 'Amit Patel', phone: '+919876543212', email: 'amit.patel@gmail.com', createdAt: '2024-01-17' },
  { id: 4, name: 'Sneha Reddy', phone: '+919876543213', email: 'sneha.reddy@downtown.org', createdAt: '2024-01-18' },
  { id: 5, name: 'Vikram Singh', phone: '+919876543214', email: 'vikram.singh@company.in', createdAt: '2024-01-19' },
  { id: 6, name: 'Anita Desai', phone: '+919876543215', email: 'anita.desai@email.com', createdAt: '2024-01-20' },
  { id: 7, name: 'Arjun Mehta', phone: '+919876543216', email: 'arjun.mehta@downtown.org', createdAt: '2024-01-21' },
  { id: 8, name: 'Kavya Iyer', phone: '+919876543217', email: 'kavya.iyer@business.in', createdAt: '2024-01-22' },
]

const initialAudiences = [
  { 
    id: 1, 
    name: 'City Center Residents', 
    description: 'All residents living in the city center area',
    members: [1, 4, 7],
    createdAt: '2024-01-10'
  },
  { 
    id: 2, 
    name: 'Business Owners', 
    description: 'Local business owners and entrepreneurs',
    members: [2, 5, 8],
    createdAt: '2024-01-12'
  },
  { 
    id: 3, 
    name: 'Community Leaders', 
    description: 'Community leaders and organization heads',
    members: [1, 2, 3],
    createdAt: '2024-01-14'
  },
]

const initialTemplates = [
  {
    id: 1,
    name: 'Weekly Update Template',
    type: 'text',
    content: 'Hello {{name}}! Here\'s your weekly city update: {{message}}. Stay informed and engaged with your community!',
    createdAt: '2024-01-05'
  },
  {
    id: 2,
    name: 'Event Announcement',
    type: 'image',
    content: 'Join us for {{event_name}} on {{date}}! Location: {{location}}. We look forward to seeing you there!',
    createdAt: '2024-01-08'
  },
  {
    id: 3,
    name: 'Emergency Alert',
    type: 'text',
    content: 'URGENT: {{alert_message}}. Please take necessary precautions. For more info: {{contact}}',
    createdAt: '2024-01-10'
  },
]

const initialCampaigns = [
  {
    id: 1,
    name: 'January Development Update',
    description: 'Monthly infrastructure and development updates for citizens',
    messageType: 'text',
    audience: 'City Center Residents',
    audienceId: 1,
    message: 'Great news! The new community park construction is 60% complete. Expected opening: March 2024.',
    status: 'Sent',
    sentDate: '2024-01-15',
    recipients: 3,
    delivered: 3,
    read: 2
  },
  {
    id: 2,
    name: 'Business Tax Deadline Reminder',
    description: 'Reminder for Q1 business tax filing deadline',
    messageType: 'text',
    audience: 'Business Owners',
    audienceId: 2,
    message: 'Reminder: Q1 business tax filing deadline is January 31st. File online at city.gov/taxes',
    status: 'Sent',
    sentDate: '2024-01-20',
    recipients: 3,
    delivered: 3,
    read: 3
  },
  {
    id: 3,
    name: 'Community Meeting Invitation',
    description: 'Invite community leaders to monthly town hall',
    messageType: 'image',
    audience: 'Community Leaders',
    audienceId: 3,
    message: 'Join us for our monthly town hall on February 5th at City Hall, 6 PM. Your voice matters!',
    status: 'Draft',
    sentDate: null,
    recipients: 0,
    delivered: 0,
    read: 0
  },
]

export const DataProvider = ({ children }) => {
  // Force clear old data and use Indian data
  const [contacts, setContacts] = useState(() => {
    localStorage.removeItem('demo_contacts') // Clear old data
    localStorage.setItem('demo_contacts', JSON.stringify(initialContacts))
    return initialContacts
  })

  const [audiences, setAudiences] = useState(() => {
    localStorage.removeItem('demo_audiences') // Clear old data
    localStorage.setItem('demo_audiences', JSON.stringify(initialAudiences))
    return initialAudiences
  })

  const [templates, setTemplates] = useState(() => {
    localStorage.removeItem('demo_templates') // Clear old data
    localStorage.setItem('demo_templates', JSON.stringify(initialTemplates))
    return initialTemplates
  })

  const [campaigns, setCampaigns] = useState(() => {
    localStorage.removeItem('demo_campaigns') // Clear old data
    localStorage.setItem('demo_campaigns', JSON.stringify(initialCampaigns))
    return initialCampaigns
  })

  const [reports, setReports] = useState(() => {
    // Check if we need to clear demo reports (one time)
    if (!localStorage.getItem('demo_reports_cleared')) {
      localStorage.removeItem('demo_reports')
      localStorage.setItem('demo_reports_cleared', 'true')
    }
    const saved = localStorage.getItem('demo_reports')
    return saved ? JSON.parse(saved) : []
  })

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('demo_contacts', JSON.stringify(contacts))
  }, [contacts])

  useEffect(() => {
    localStorage.setItem('demo_audiences', JSON.stringify(audiences))
  }, [audiences])

  useEffect(() => {
    localStorage.setItem('demo_templates', JSON.stringify(templates))
  }, [templates])

  useEffect(() => {
    localStorage.setItem('demo_campaigns', JSON.stringify(campaigns))
  }, [campaigns])

  useEffect(() => {
    localStorage.setItem('demo_reports', JSON.stringify(reports))
  }, [reports])

  // Contact functions
  const addContact = (contact) => {
    const newContact = {
      ...contact,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    setContacts([...contacts, newContact])
    return newContact
  }

  const deleteContact = (id) => {
    setContacts(contacts.filter(c => c.id !== id))
    // Also remove from audiences
    setAudiences(audiences.map(a => ({
      ...a,
      members: a.members.filter(m => m !== id)
    })))
  }

  // Audience functions
  const addAudience = (audience) => {
    const newAudience = {
      ...audience,
      id: Date.now(),
      members: audience.members || [],
      createdAt: new Date().toISOString().split('T')[0]
    }
    setAudiences([...audiences, newAudience])
    return newAudience
  }

  const updateAudience = (id, updates) => {
    setAudiences(audiences.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  const deleteAudience = (id) => {
    setAudiences(audiences.filter(a => a.id !== id))
  }

  // Template functions
  const addTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    setTemplates([...templates, newTemplate])
    return newTemplate
  }

  const updateTemplate = (id, updates) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const deleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id))
  }

  // Campaign functions
  const addCampaign = (campaign) => {
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
    setCampaigns([...campaigns, newCampaign])
    return newCampaign
  }

  const updateCampaign = (id, updates) => {
    setCampaigns(campaigns.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const deleteCampaign = (id) => {
    setCampaigns(campaigns.filter(c => c.id !== id))
  }

  const sendCampaign = (id) => {
    setCampaigns(campaigns.map(c => 
      c.id === id 
        ? { 
            ...c, 
            status: 'Sent', 
            sentDate: new Date().toISOString().split('T')[0],
            delivered: c.recipients,
            read: Math.floor(c.recipients * 0.7) // 70% read rate
          } 
        : c
    ))
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

  // Get audience by ID
  const getAudienceById = (id) => audiences.find(a => a.id === id)

  // Get contacts in audience
  const getAudienceContacts = (audienceId) => {
    const audience = audiences.find(a => a.id === audienceId)
    if (!audience) return []
    return contacts.filter(c => audience.members.includes(c.id))
  }

  // Report functions
  const addReport = (report) => {
    const newReport = {
      ...report,
      id: Date.now(),
      createdAt: new Date().toISOString().split('T')[0]
    }
    setReports([...reports, newReport])
    return newReport
  }

  const deleteReport = (id) => {
    setReports(reports.filter(r => r.id !== id))
  }

  const value = {
    contacts,
    audiences,
    templates,
    campaigns,
    reports,
    stats,
    addContact,
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
