import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useAlert } from '../hooks/useAlert'

const ProfileSettings = ({ isOpen, onClose }) => {
  const { user } = useAuth()
  const { showAlert, AlertComponent } = useAlert()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)

  const [settings, setSettings] = useState({
    metaAccessToken: '',
    metaPhoneNumberId: '',
    metaBusinessAccountId: '',
    metaAppId: ''
  })

  // Fetch existing settings when modal opens
  useEffect(() => {
    if (isOpen && user?.email) {
      fetchSettings()
    }
  }, [isOpen, user])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('User_details')
        .select('meta_access_token, meta_phone_number_id, meta_business_account_id, meta_app_id, whatsapp_credentials_validated, credentials_last_validated_at')
        .eq('email', user.email)
        .single()

      if (!error && data) {
        setSettings({
          metaAccessToken: data.meta_access_token || '',
          metaPhoneNumberId: data.meta_phone_number_id || '',
          metaBusinessAccountId: data.meta_business_account_id || '',
          metaAppId: data.meta_app_id || ''
        })
        
        // Set validation result if credentials are already validated
        if (data.whatsapp_credentials_validated) {
          setValidationResult({
            valid: true,
            details: `Credentials validated ${data.credentials_last_validated_at ? `on ${new Date(data.credentials_last_validated_at).toLocaleDateString()}` : ''}`
          })
          console.log('✅ Credentials validation status loaded:', data.credentials_last_validated_at)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('User_details')
        .update({
          meta_access_token: settings.metaAccessToken,
          meta_phone_number_id: settings.metaPhoneNumberId,
          meta_business_account_id: settings.metaBusinessAccountId,
          meta_app_id: settings.metaAppId
        })
        .eq('email', user.email)

      if (error) {
        console.error('Error saving settings:', error)
        showAlert({
          title: 'Save Failed',
          message: 'Failed to save settings',
          type: 'error'
        })
      } else {
        showAlert({
          title: 'Settings Saved',
          message: 'Settings saved successfully!',
          type: 'success'
        })
        setTimeout(() => onClose(), 1000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showAlert({
        title: 'Save Failed',
        message: 'Failed to save settings',
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    // Check if all fields are filled
    if (!settings.metaAccessToken || !settings.metaPhoneNumberId || !settings.metaBusinessAccountId || !settings.metaAppId) {
      setValidationResult({
        valid: false,
        error: 'Please fill in all four fields before validating.'
      })
      return
    }

    setValidating(true)
    setValidationResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('validate-whatsapp-credentials', {
        body: {
          accessToken: settings.metaAccessToken,
          phoneNumberId: settings.metaPhoneNumberId,
          businessAccountId: settings.metaBusinessAccountId
        }
      })

      if (error) {
        console.error('Edge function error:', error)
        setValidationResult({
          valid: false,
          error: 'Failed to validate credentials. Please try again.'
        })
      } else if (data) {
        // Auto-save if validation successful
        if (data.valid) {
          console.log('Validation successful, auto-saving credentials...')
          await handleAutoSave()
          // Set success validation result after auto-save completes
          setValidationResult({
            valid: true,
            details: data.details || 'Account Connected - Credentials validated successfully!'
          })
        } else {
          setValidationResult(data)
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidationResult({
        valid: false,
        error: 'Network error during validation.'
      })
    } finally {
      setValidating(false)
    }
  }

  const handleAutoSave = async () => {
    try {
      const { error } = await supabase
        .from('User_details')
        .update({
          meta_access_token: settings.metaAccessToken,
          meta_phone_number_id: settings.metaPhoneNumberId,
          meta_business_account_id: settings.metaBusinessAccountId,
          meta_app_id: settings.metaAppId,
          whatsapp_credentials_validated: true,
          credentials_last_validated_at: new Date().toISOString()
        })
        .eq('email', user.email)

      if (error) {
        console.error('Auto-save error:', error)
        throw error
      }

      console.log('Credentials auto-saved and marked as validated successfully')
      
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        whatsappCredentialsValidated: true,
        credentialsLastValidatedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Auto-save error:', error)
      throw error
    }
  }

  if (!isOpen) return null

  return (
    <>
    <AlertComponent />
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#FFC107] px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-yellow-600 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900">
                  {user?.user_metadata?.full_name || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Integration Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Business API</h3>
            <p className="text-sm text-gray-600 mb-2">
              Configure your Meta WhatsApp Business API credentials to enable automated messaging.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Credentials are automatically saved after successful validation. You must validate before using WhatsApp features.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC107]"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Meta Access Token */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Access Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.metaAccessToken}
                    onChange={(e) => {
                      setSettings({ ...settings, metaAccessToken: e.target.value })
                      setValidationResult(null)
                    }}
                    placeholder="Enter your Meta Access Token"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-transparent password-black-dots"
                  />
                </div>

                {/* Meta Phone Number ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Phone Number ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.metaPhoneNumberId}
                    onChange={(e) => {
                      setSettings({ ...settings, metaPhoneNumberId: e.target.value })
                      setValidationResult(null)
                    }}
                    placeholder="Enter your Meta Phone Number ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-transparent password-black-dots"
                  />
                </div>

                {/* Meta Business Account ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Business Account ID (WABA ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.metaBusinessAccountId}
                    onChange={(e) => {
                      setSettings({ ...settings, metaBusinessAccountId: e.target.value })
                      setValidationResult(null)
                    }}
                    placeholder="Enter your WhatsApp Business Account ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-transparent password-black-dots"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for creating templates and sending messages</p>
                </div>

                {/* Meta App ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta App ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.metaAppId}
                    onChange={(e) => {
                      setSettings({ ...settings, metaAppId: e.target.value })
                      setValidationResult(null)
                    }}
                    placeholder="Enter your Facebook App ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFC107] focus:border-transparent password-black-dots"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for uploading media (images) for templates</p>
                </div>

                {/* Validate Button */}
                <div className="pt-2">
                  <button
                    onClick={handleValidate}
                    disabled={validating || !settings.metaAccessToken || !settings.metaPhoneNumberId || !settings.metaBusinessAccountId || !settings.metaAppId}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {validating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Validating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Validate Credentials</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Validation Result */}
                {validationResult && (
                  <div className={`p-4 rounded-lg border ${
                    validationResult.valid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start">
                      {validationResult.valid ? (
                        <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div className="flex-1">
                        <p className={`font-bold text-lg ${validationResult.valid ? 'text-green-900' : 'text-red-800'}`}>
                          {validationResult.valid ? '✓ Account Connected' : '✗ Validation Failed'}
                        </p>
                        <p className={`text-sm mt-1 ${validationResult.valid ? 'text-green-700' : 'text-red-700'}`}>
                          {validationResult.valid 
                            ? (validationResult.details || 'All credentials are valid and have been automatically saved.')
                            : (validationResult.error || 'Please check your credentials and try again.')
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Help Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Where to find these credentials:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Meta for Developers</a></li>
                        <li>Navigate to your App Dashboard</li>
                        <li><strong>App ID:</strong> Found at the top of your App Dashboard (e.g., "App ID: 123456789")</li>
                        <li>Select WhatsApp &gt; API Setup</li>
                        <li>Copy your Access Token, Phone Number ID, and Business Account ID (WABA ID)</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3 border-t border-gray-200">
          {validationResult?.valid ? (
            // After successful validation, just show Close button
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FFC107] text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors font-medium"
            >
              Close
            </button>
          ) : (
            // Before validation, show Cancel and Save buttons
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#FFC107] text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Without Validating</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default ProfileSettings
