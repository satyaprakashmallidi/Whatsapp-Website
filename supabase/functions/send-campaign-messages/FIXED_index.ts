// The problematic section that needs to be replaced in index.ts

// REPLACE LINES 91-108 WITH THIS:

// audience_list contains contact timestamp IDs  
// Contacts are stored in User_details.contacts JSONB field
const contactIds = audience.audience_list || []
console.log(`📋 Contact IDs in audience:`, contactIds)

// Filter contacts from userData.contacts array
const allContacts = (userData as any).contacts || []
console.log(`👥 Total contacts available:`, allContacts.length)

const contacts = allContacts.filter((contact: any) => contactIds.includes(contact.id))
console.log(`✅ Filtered ${contacts.length} contacts for this campaign`)
