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

            setSaveMessage({ type: 'success', text: 'Saved successfully!' })

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

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F0F2F5]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#128C7E] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-auto bg-[#F0F2F5]">
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">WhatsApp Integrations</h1>
                    <p className="text-gray-500 mt-1">Connect AI auto-replies to your WhatsApp messages</p>
                </div>

                {/* AI Auto-Reply Configuration */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Auto-Replies</h2>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Enable Auto-Replies</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Send automatic AI responses to incoming messages</p>
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
                    <div className="mb-4">
                        <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                            Webhook URL
                        </label>
                        <input
                            type="url"
                            id="webhookUrl"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-n8n-instance.com/webhook/whatsapp"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-[#128C7E] focus:border-[#128C7E] outline-none transition-shadow"
                            disabled={!isActive}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Your AI service URL (n8n, Make.com, or custom)
                        </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-[#128C7E] text-white rounded-lg hover:bg-[#075E54] transition-colors font-medium disabled:opacity-70 flex items-center gap-2"
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        {saveMessage.text && (
                            <span className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {saveMessage.text}
                            </span>
                        )}
                    </div>
                </div>

                {/* How It Works */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center font-bold text-sm">
                                1
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Customer sends a message</h3>
                                <p className="text-sm text-gray-500 mt-1">A customer texts your WhatsApp business number</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Your AI processes the message</h3>
                                <p className="text-sm text-gray-500 mt-1">The message is forwarded to your webhook URL for AI processing</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center font-bold text-sm">
                                3
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">Auto-reply is sent</h3>
                                <p className="text-sm text-gray-500 mt-1">Your AI returns a response which is automatically sent back to the customer</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Response Format */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Format</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Your AI service should return a JSON response with a <code className="bg-gray-100 px-1 rounded">reply_message</code> field:
                    </p>

                    <div className="bg-gray-900 rounded-lg p-4 mb-4">
                        <pre className="text-sm text-gray-100 font-mono overflow-x-auto">
{`{
  "reply_message": "Hello! How can I help you?"
}`}
                        </pre>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">Sending multiple messages</h3>
                        <p className="text-sm text-gray-500">
                            Use <code className="bg-gray-100 px-1 rounded">||</code> to split into separate messages:
                        </p>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <pre className="text-sm text-gray-100 font-mono overflow-x-auto">
{`{
  "reply_message": "Hello!||Here is your information..."
}`}
                            </pre>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        <h3 className="text-sm font-medium text-gray-700">Newlines in message</h3>
                        <p className="text-sm text-gray-500">
                            Use <code className="bg-gray-100 px-1 rounded">\n</code> for newlines:
                        </p>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <pre className="text-sm text-gray-100 font-mono overflow-x-auto">
{`{
  "reply_message": "Line 1\\nLine 2\\nLine 3"
}`}
                            </pre>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        <h3 className="text-sm font-medium text-gray-700">No auto-reply</h3>
                        <p className="text-sm text-gray-500">
                            Return any response without <code className="bg-gray-100 px-1 rounded">reply_message</code> to skip the auto-reply:
                        </p>
                        <div className="bg-gray-900 rounded-lg p-4">
                            <pre className="text-sm text-gray-100 font-mono overflow-x-auto">
{`// Return empty body or any JSON without reply_message
{}`}
                            </pre>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> You don't need to include the customer's phone number.
                            The system automatically routes your reply back to the sender.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExternalWebhooks
