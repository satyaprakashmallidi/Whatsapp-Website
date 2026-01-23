# Campaign Hub - WhatsApp Business Campaign Manager

## Project Overview

A React-based web application for managing WhatsApp business campaigns, contacts, audiences, and reporting. Designed for city/government communication teams to manage citizen communications.

## Tech Stack

- **Frontend:** React 18.3.1 with React Router DOM 7.12.0
- **Build Tool:** Vite 6.0.5
- **Backend/Database:** Supabase (BaaS)
- **Styling:** Tailwind CSS 3.4.17
- **PDF Generation:** jsPDF 4.0.0 with autotable
- **CSV Parsing:** PapaParse 5.5.3
- **Excel Support:** XLSX 0.18.5
- **Icons:** React Icons 5.5.0

## Project Structure

```
src/
├── context/
│   ├── AuthContext.jsx      # Authentication & user management
│   └── DataContext.jsx      # Application data (contacts, audiences, campaigns, etc.)
├── pages/
│   ├── SignUp.jsx           # User registration
│   ├── SignIn.jsx           # User login
│   ├── NewDashboard.jsx     # Main dashboard with stats
│   ├── Contacts.jsx         # Contact management & CSV import
│   ├── Audiences.jsx        # Audience segment management
│   ├── Campaigns.jsx        # Campaign creation & sending
│   ├── Templates.jsx        # Message template management
│   ├── Chats.jsx            # WhatsApp-style messaging UI
│   └── Reports.jsx          # PDF report generation
├── components/
│   ├── Layout.jsx           # Main layout wrapper with sidebar
│   ├── Sidebar.jsx          # Collapsible navigation sidebar
│   ├── ProtectedRoute.jsx   # Auth route protection HOC
│   ├── PageLoader.jsx       # Page transition loading
│   └── LoadingSpinner.jsx   # Animated bicycle loader
├── lib/
│   └── supabase.js          # Supabase client initialization
├── App.jsx                  # Main routing configuration
├── main.jsx                 # Entry point
└── index.css                # Global styles & animations
```

## State Management

### AuthContext (`src/context/AuthContext.jsx`)

Handles all authentication operations:

- `signUp(email, password, fullName)` - Register new user
- `signIn(email, password)` - Login user
- `signOut()` - Logout user
- `signInWithGoogle()` - Google OAuth authentication
- `ensureUserRecord(userEmail)` - Create user record if doesn't exist

Exposes: `user`, `loading` state

### DataContext (`src/context/DataContext.jsx`)

Manages all application data with Supabase sync:

**Contacts:**
- `addContact(contact)` - Add new contact
- `deleteContact(id)` - Remove contact (also removes from all audiences)

**Audiences:**
- `addAudience(audience)` - Create audience segment
- `updateAudience(id, updates)` - Modify audience
- `deleteAudience(id)` - Remove audience
- `getAudienceById(id)` - Get specific audience
- `getAudienceContacts(audienceId)` - Get contacts in audience

**Campaigns:**
- `addCampaign(campaign)` - Create draft campaign
- `updateCampaign(id, updates)` - Modify campaign
- `deleteCampaign(id)` - Remove campaign
- `sendCampaign(id)` - Send campaign (status → "Sent", 70% read rate)

**Templates:**
- `addTemplate(template)` - Create template
- `updateTemplate(id, updates)` - Edit template
- `deleteTemplate(id)` - Remove template

**Reports:**
- `addReport(report)` - Save generated report
- `deleteReport(id)` - Remove report

**Stats:**
```javascript
stats = {
  totalContacts,
  totalAudiences,
  totalTemplates,
  totalCampaigns,
  sentCampaigns,
  draftCampaigns,
  messagesSent
}
```

## Database Schema (Supabase)

**Table: `User_details`**

| Field | Type | Description |
|-------|------|-------------|
| email | string (PK) | User's email address |
| total_contacts | number | Contact count |
| campaigns | number | Campaign count |
| templates | number | Template count |
| messages_sent | number | Total messages sent |
| contacts | array | Contact objects |
| audiences | array | Audience segments |
| campaigns_data | array | Campaign records |
| templates_data | array | Message templates |
| reports | array | Generated reports |

### Entity Structures

**Contact:**
```javascript
{ id, name, phone, email, createdAt }
```

**Audience:**
```javascript
{ id, name, description, members: [contactIds], createdAt }
```

**Campaign:**
```javascript
{
  id, name, description, messageType, audienceId, audience,
  message, status, sentDate, recipients, delivered, read, createdAt
}
```

**Template:**
```javascript
{ id, name, type, content, createdAt }
```

**Report:**
```javascript
{ id, title, description, imageCount, pdfUrl, pdfName, createdAt }
```

## Routing

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/signin` | SignIn | No |
| `/signup` | SignUp | No |
| `/dashboard` | NewDashboard | Yes |
| `/contacts` | Contacts | Yes |
| `/audiences` | Audiences | Yes |
| `/campaigns` | Campaigns | Yes |
| `/templates` | Templates | Yes |
| `/chats` | Chats | Yes |
| `/reports` | Reports | Yes |

All protected routes wrapped in `<ProtectedRoute>` component.

## Key Features

### Contact Management
- Add contacts manually or import via CSV
- International phone number support with country codes
- Auto-removal from audiences when deleted

### Audience Segmentation
- Create custom audience segments
- Checkbox-based contact selection
- Track audience sizes

### Campaign Management
- Create draft campaigns with audiences and templates
- Message types: text, image, carousel
- Auto-calculated delivery metrics (70% read rate)
- Status tracking: Draft → Sent

### Message Templates
- Reusable templates (text/image/video/carousel)
- Quick reference in campaign creation

### PDF Reports
- Professional reports with images
- Yellow branded header
- Auto-pagination with captions
- Download functionality

### WhatsApp-Style Chat UI
- Split-screen conversation view
- Message history with timestamps
- Read receipts
- Message search

## Styling

**Color Scheme:**
- Primary: Yellow `#FFC107` (buttons, highlights, active states)
- Secondary: Dark gray `#1F1F1F` (sidebar)
- Background: Gray `#F5F5F5`
- WhatsApp green: `#DCF8C6` (message bubbles)

**Custom Animations (index.css):**
- `animate-spin-wheel` - Rotating bicycle wheel
- `animate-bicycle-ride` - Bouncing bicycle motion
- `animate-bicycle-slide` - Bicycle sliding on send button

## Environment Variables

```env
VITE_SUPABASE_URL=https://cxmolmsrnofplxvsqsdp.supabase.co
VITE_SUPABASE_ANON_KEY=[JWT token]
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Data Flow

```
User Login → AuthContext.signIn() → Supabase Auth
    ↓
Supabase creates/checks User_details record
    ↓
App wraps with AuthProvider + DataProvider
    ↓
DataContext fetches user data from Supabase
    ↓
Pages use useAuth() and useData() hooks
    ↓
CRUD operations update local state
    ↓
DataContext.updateUserData() syncs to Supabase
```

## Important Files

- `src/context/AuthContext.jsx` - All authentication logic
- `src/context/DataContext.jsx` - All data operations and Supabase sync
- `src/lib/supabase.js` - Supabase client configuration
- `src/components/Sidebar.jsx` - Navigation with collapsible state
- `src/pages/Campaigns.jsx` - Core campaign creation/sending logic
- `src/pages/Reports.jsx` - PDF generation with jsPDF
