import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const CredentialsWarning = ({ onOpenSettings }) => {
  const { user } = useAuth()
  const [isValidated, setIsValidated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkValidation = async () => {
      if (!user?.email) return

      try {
        const { data, error } = await supabase
          .from('User_details')
          .select('whatsapp_credentials_validated')
          .eq('email', user.email)
          .single()

        if (!error && data) {
          setIsValidated(data.whatsapp_credentials_validated || false)
        }
      } catch (error) {
        console.error('Error checking credentials:', error)
      } finally {
        setLoading(false)
      }
    }

    checkValidation()
  }, [user])

  if (loading || isValidated) return null

  return (
    <div className="mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
      <div className="flex items-start">
        <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-900 mb-1">⚠️ WhatsApp Account Not Connected</h3>
          <p className="text-yellow-800 mb-3">
            To use this feature, you need to connect your WhatsApp Business Account. 
            Please validate your Meta API credentials in Profile Settings.
          </p>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Configure WhatsApp Credentials
          </button>
        </div>
      </div>
    </div>
  )
}

export default CredentialsWarning
