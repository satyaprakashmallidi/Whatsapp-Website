# City Campaign Manager

A WhatsApp campaign management platform built with React, Vite, Tailwind CSS, and Supabase authentication.

## Tech Stack

- **React 18.3** - UI library
- **Vite 6.0** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Supabase** - Authentication and backend
- **React Router** - Client-side routing
- **ESLint** - Code linting

## Getting Started

### 1. Create Environment File

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

### 5. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
whatsapp-website/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   └── ProtectedRoute.jsx
│   ├── context/         # React contexts
│   │   └── AuthContext.jsx
│   ├── lib/             # Utilities and configurations
│   │   └── supabase.js
│   ├── pages/           # Page components
│   │   ├── SignUp.jsx
│   │   ├── SignIn.jsx
│   │   └── Dashboard.jsx
│   ├── App.jsx          # Main App component with routing
│   ├── main.jsx         # Application entry point
│   └── index.css        # Tailwind CSS imports
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Project dependencies
```

## Features

- 🔐 **Complete Authentication System**
  - Email/Password authentication
  - Google OAuth sign-in
  - Protected routes with Supabase
- 🎨 **Modern SaaS Dashboard**
  - Collapsible dark sidebar navigation
  - Warm yellow/golden accents
  - Clean, professional card-based layout
- 📊 **Campaign Management**
  - Create and manage WhatsApp campaigns
  - Message templates
  - Audience segmentation
  - Contact management
- 🛡️ **Protected Routes** - Authentication required for all dashboard pages
- ⚡️ **Fast Development** - Vite HMR for instant updates
- 🎯 **Tailwind CSS** - Modern, responsive styling
- ⚛️ **React 18** - Latest React features with JSX
- 📦 **Production Ready** - Optimized builds

## Pages

### Public Pages
- **Sign Up** - User registration with email/password or Google OAuth
- **Sign In** - User login with email/password or Google OAuth

### Protected Pages (Requires Authentication)
- **Dashboard** - Campaign performance overview with stats and quick actions
- **Contacts** - Manage contacts with CSV import and add contact modal
- **Audiences** - Create and manage audience segments
- **Campaigns** - Create and manage WhatsApp campaigns with different message types
- **Templates** - Create reusable message templates
- **Reports** - Analytics and reporting (Coming Soon)

## Authentication

The app uses Supabase for authentication. Make sure to:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to the `.env` file
3. Set up authentication in your Supabase project dashboard
