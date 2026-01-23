# Quick Start Guide - City Campaign Manager

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
The `.env` file is already configured with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://cxmolmsrnofplxvsqsdp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Run the Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see your application!

## 📱 First Time User Flow

### Sign Up
1. Navigate to the app (defaults to `/signin`)
2. Click "Sign up" link
3. Choose either:
   - **Email/Password**: Fill in name, email, and password
   - **Google OAuth**: Click "Sign up with Google"
4. You'll be automatically logged in and redirected to the dashboard

### Sign In
1. Enter your email and password, OR
2. Click "Sign in with Google"
3. Access the dashboard instantly

## 🎯 Exploring Features

### Dashboard
- View campaign statistics (Total Contacts, Campaigns, Templates, Messages Sent)
- Quick actions for common tasks
- Recent campaigns overview

### Contacts
- Click "Add Contact" to add a contact (UI only)
- Download "Example CSV" to see import format
- Try "Import CSV" button

### Audiences
- Click "Create Audience" to segment your contacts
- Fill in audience name and description
- Created audiences appear as cards

### Campaigns
- Click "New Campaign" to create a campaign
- Fill in campaign details
- Choose message type (Text, Image, Carousel)
- Select target audience
- Write your message
- Save as draft

### Templates
- Click "New Template" to create reusable content
- Enter template name and content
- Select template type
- Templates appear as cards with edit/delete options

### Reports
- Currently shows "In Development" placeholder
- Future analytics and insights will appear here

## 🎨 UI Features to Try

### Sidebar
- Click the collapse/expand button in the sidebar
- Navigate between different pages
- Notice the yellow highlight on active pages

### Modals
- All forms open in clean modal overlays
- Click outside or use cancel button to close
- Forms have validation

### Empty States
- Notice the helpful empty states when you first visit pages
- Each has a clear call-to-action button

## 🔒 Authentication Features

### Google OAuth
**Important**: To enable Google sign-in:
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Add your authorized redirect URLs:
   - Development: `http://localhost:5173`
   - Production: Your deployed URL

### Session Management
- Authentication state persists across page refreshes
- Automatic redirect to sign-in if session expires
- Sign out button in sidebar footer

## 🛠️ Development Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Run Linter
```bash
npm run lint
```

## 📂 Project Structure

```
src/
├── components/          # Reusable components
│   ├── Layout.jsx      # Main layout wrapper
│   ├── ProtectedRoute.jsx  # Auth protection
│   └── Sidebar.jsx     # Navigation sidebar
├── context/
│   └── AuthContext.jsx # Authentication state
├── lib/
│   └── supabase.js     # Supabase client
├── pages/              # Page components
│   ├── NewDashboard.jsx
│   ├── Contacts.jsx
│   ├── Audiences.jsx
│   ├── Campaigns.jsx
│   ├── Templates.jsx
│   ├── Reports.jsx
│   ├── SignIn.jsx
│   └── SignUp.jsx
├── App.jsx             # Route configuration
├── main.jsx            # App entry point
└── index.css           # Global styles
```

## 🎨 Customization Tips

### Change Colors
Edit the color values in your components:
- Yellow accent: `#FFC107` → Change to your brand color
- Sidebar: `#1F1F1F` → Adjust sidebar darkness
- Background: `#F5F5F5` → Modify page background

### Add New Pages
1. Create new component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add menu item in `src/components/Sidebar.jsx`

### Modify Sidebar
Open `src/components/Sidebar.jsx`:
- Add/remove menu items in `menuItems` array
- Adjust collapse width in className
- Customize user profile section

## 🐛 Troubleshooting

### Google OAuth Not Working
- Verify Google provider is enabled in Supabase
- Check authorized redirect URLs
- Ensure `.env` file has correct Supabase URL and key

### Build Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is 16+

### Port Already in Use
- Change port: `npm run dev -- --port 3000`
- Or kill process using port 5173

### Styling Issues
- Ensure Tailwind is properly configured
- Check `tailwind.config.js` content paths
- Verify `postcss.config.js` exists

## 📝 Important Notes

### UI Only Demo
This is a **frontend-only demonstration**:
- ✅ Authentication works (Supabase)
- ✅ UI interactions work
- ❌ No backend API for campaigns/contacts/etc.
- ❌ No real data storage
- ❌ No actual WhatsApp messaging

### Adding Backend
To make this production-ready, you would need to:
1. Create Supabase tables for:
   - Contacts
   - Audiences
   - Campaigns
   - Templates
2. Add API calls in component functions
3. Implement real data persistence
4. Add WhatsApp Business API integration
5. Set up proper error handling and loading states

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Drag and drop 'dist' folder to Netlify
```

### Environment Variables
Remember to add your Supabase credentials to your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🎓 Learning Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

## ✨ Next Steps

1. **Explore the UI** - Click through all pages and features
2. **Test Authentication** - Try both email and Google sign-in
3. **Create Content** - Add contacts, audiences, campaigns, and templates
4. **Customize Design** - Adjust colors and styling to your brand
5. **Add Backend** - Connect to real data storage when ready
6. **Deploy** - Share your app with the world!

Enjoy building with City Campaign Manager! 🎉
