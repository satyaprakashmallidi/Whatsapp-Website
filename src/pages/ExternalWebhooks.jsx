import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ExternalWebhooks = () => {
    const { user } = useAuth()
    const [webhookUrl, setWebhookUrl] = useState('')
    const [isActive, setIsActive] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState({ type: '', text: '' })

    useEffect(() => {
        fetchWebhookSettings()
    }, [user])

    const fetchWebhookSettings = async () => {
        if (!user?.email) return

        try {
            const { data, error } = await supabase
                .from('User_details')
                .select('external_webhook_url, external_webhook_active')
                .eq('email', user.email)
                .single()

            if (error) throw error

            if (data) {
                setWebhookUrl(data.external_webhook_url || '')
                setIsActive(data.external_webhook_active || false)
            }
        } catch (error) {
            console.error('Error fetching webhook settings:', error)
            setSaveMessage({ type: 'error', text: 'Failed to load settings.' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        if (!user?.email) return

        setIsSaving(true)
        setSaveMessage({ type: '', text: '' })

        try {
            const { error } = await supabase
                .from('User_details')
                .update({
                    external_webhook_url: webhookUrl,
                    external_webhook_active: isActive
                })
                .eq('email', user.email)

            if (error) throw error

            setSaveMessage({ type: 'success', text: 'Webhook settings saved successfully!' })

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSaveMessage({ type: '', text: '' })
            }, 3000)
        } catch (error) {
            console.error('Error saving webhook settings:', error)
            setSaveMessage({ type: 'error', text: 'Failed to save settings.' })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex-1 overflow-auto bg-[#F0F2F5]">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">External Integrations</h1>
                    <p className="text-gray-500 mt-1">Forward incoming WhatsApp messages to external services like n8n or Make.com.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Webhook Configuration</h2>

                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#128C7E]"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">

                                {/* Toggle Switch */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Enable Webhook Forwarding</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">When enabled, all incoming WhatsApp payloads will be sent via POST to your URL.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsActive(!isActive)}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-[#00a884]' : 'bg-gray-200'}`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </button>
                                </div>

                                {/* URL Input */}
                                <div>
                                    <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                                        Webhook URL
                                    </label>
                                    <input
                                        type="url"
                                        id="webhookUrl"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        placeholder="https://your-n8n-instance.com/webhook/..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#128C7E] focus:border-[#128C7E] outline-none transition-shadow"
                                        disabled={!isActive}
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        The payload will be sent exactly as received from Meta (JSON format).
                                    </p>
                                </div>

                                {/* Save Button & Messages */}
                                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        {saveMessage.text && (
                                            <span className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                {saveMessage.text}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-[#128C7E] text-white rounded-lg hover:bg-[#075E54] focus:ring-4 focus:ring-[#128C7E]/20 transition-all font-medium disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white shadow-sm" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Settings'
                                        )}
                                    </button>
                                </div>

                            </div>
                        )}
                    </div>
                </div>

                {/* Documentation Card */}
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-5 h-5 text-[#128C7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h2 className="text-lg font-semibold text-gray-900">How to create AI Auto-Replies</h2>
                        </div>

                        <div className="prose prose-sm max-w-none text-gray-600">
                            <p>
                                When you receive a WhatsApp message, this system forwards the entire Meta JSON payload to your webhook.
                                Your external service (like n8n) can then process the message and use AI to generate a reply.
                            </p>

                            <h3 className="text-md font-medium text-gray-900 mt-4 mb-2">Sending a Reply</h3>
                            <p>
                                To automatically send a message back to the customer, your webhook simply needs to return a <strong>200 OK</strong> response
                                containing a JSON body with the <code>reply_message</code> key.
                            </p>

                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-3">
                                <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wider">Required JSON Response Format</p>
                                <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
                                    {`{
  "reply_message": "Hello! I am your AI assistant. How can I help you today?"
}`}
                                </pre>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                <strong>💡 Note:</strong> You do NOT need to include the customer's phone number in your response.
                                The system automatically remembers who sent the message and routes your <code>reply_message</code> back to them instantly.
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default ExternalWebhooks
