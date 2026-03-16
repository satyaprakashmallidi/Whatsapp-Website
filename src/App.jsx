import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import NewDashboard from './pages/NewDashboard'
import Contacts from './pages/Contacts'
import Chats from './pages/Chats'
import Audiences from './pages/Audiences'
import Campaigns from './pages/Campaigns'
import Templates from './pages/Templates'
import TestTemplateCreation from './pages/TestTemplateCreation'
import Reports from './pages/Reports'
import ExternalWebhooks from './pages/ExternalWebhooks'

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Contacts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Chats />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audiences"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Audiences />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Campaigns />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Templates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/test-template"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TestTemplateCreation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/external-webhooks"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExternalWebhooks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  )
}

export default App
