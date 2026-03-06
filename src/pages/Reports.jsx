import { useState } from 'react'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/PageLoader'
import { useAlert } from '../hooks/useAlert'
import { useSearchParams } from 'react-router-dom'
import TemplatePreview from '../components/TemplatePreview'
import { generateCarouselTemplate } from '../services/geminiService'

// Language codes to Meta mappings
const LANGUAGE_MAP = {
  'English': 'en_US',
  'Telugu': 'te',
  'Hindi': 'hi'
}

const Reports = () => {
  const { fetchWhatsAppTemplateDetails, user } = useData()
  const { showAlert, AlertComponent } = useAlert()
  const [searchParams, setSearchParams] = useSearchParams()

  // Form state
  const [purpose, setPurpose] = useState('')
  const [tone, setTone] = useState('formal')
  const [language, setLanguage] = useState('English')

  // Card images (2 to 10 max)
  const [cardImages, setCardImages] = useState([])

  // Button types (allows the user to guide the AI if they want specific buttons on every card)
  const [buttonTypes, setButtonTypes] = useState(['QUICK_REPLY'])

  // Generation & Status state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')

  // The generated result
  const [generatedTemplate, setGeneratedTemplate] = useState(null)

  // ── Image Handling ──
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)

    // Check limit
    if (cardImages.length + files.length > 10) {
      showAlert({
        title: 'Limit Exceeded',
        message: 'You can only upload up to 10 images for a WhatsApp carousel.',
        type: 'warning'
      })
      return
    }

    // Reset input value so same file can be uploaded again
    if (e.target) e.target.value = '';

    setCardImages(prev => [...prev, ...files])
  }

  const removeImage = (index) => {
    setCardImages(prev => prev.filter((_, i) => i !== index))
  }

  // ── Button Handlers ──
  const toggleButtonType = (type) => {
    setButtonTypes(prev => {
      // Max 2 buttons supported usually for generic AI carousel, but Meta allows 2 per card
      if (prev.includes(type)) {
        if (prev.length === 1) {
          showAlert({
            title: 'Minimum buttons',
            message: 'Carousel templates require at least one button.',
            type: 'warning'
          })
          return prev
        }
        return prev.filter(t => t !== type)
      } else {
        if (prev.length >= 2) {
          showAlert({
            title: 'Max buttons reached',
            message: 'You can only choose up to 2 button types for AI generation.',
            type: 'warning'
          })
          return prev
        }
        return [...prev, type]
      }
    })
  }

  // ── AI Generator ──
  const handleGenerateAI = async () => {
    if (!purpose.trim()) {
      setErrorText('Please provide a prompt/purpose for your report.')
      return
    }
    if (cardImages.length < 2) {
      setErrorText('Please upload at least 2 images for the carousel.')
      return
    }

    setIsGenerating(true)
    setErrorText('')
    setGeneratedTemplate(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      // Step 1: Upload images to Meta to get Handles
      setStatusText('📤 Uploading images to Meta Cloud…')

      const imageHandles = await Promise.all(
        cardImages.map(async (file, idx) => {
          setStatusText(`📤 Uploading image ${idx + 1} of ${cardImages.length} to Meta…`)
          const formData = new FormData()
          formData.append('file', file)
          formData.append('fileType', file.type)

          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-header-image`,
            { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
          )
          const data = await res.json()

          if (!res.ok || !data.success || !data.handle) {
            throw new Error(data.error || data.message || `Failed to upload image ${idx + 1}`)
          }
          return data.handle
        })
      )

      // Step 2: Call Gemini AI
      setStatusText('✨ AI is writing the report copy…')

      const result = await generateCarouselTemplate({
        purpose: purpose,
        tone: tone,
        language: language,
        buttonTypes: buttonTypes,
        cardTopics: Array(cardImages.length).fill(''), // Let AI infer from image
        cardImages: cardImages,
      })

      // Step 3: Parse and Display
      setStatusText('🎨 Building the carousel preview…')

      // We don't populate URL/Phone values from AI, we'll prompt the user to fill them in the preview step if needed
      // but for "Weekly Report", they might just want QUICK_REPLY for feedback, or a plain "Read More" URL

      const formattedTemplate = {
        name: result.templateName ? result.templateName.replace(/[^a-z0-9_]/g, '_').slice(0, 512) : `weekly_report_${Date.now()}`,
        category: 'MARKETING', // Carousel uses MARKETING category mostly
        language: LANGUAGE_MAP[language] || 'en_US',
        mainBody: result.mainBody || '',
        cards: result.cards.map((card, idx) => ({
          id: crypto.randomUUID(),
          headerImageFile: cardImages[idx],
          headerImageHandle: imageHandles[idx],
          bodyText: card.bodyText || '',
          buttons: (buttonTypes || []).filter(Boolean).map((type, btnIdx) => ({
            id: btnIdx + 1,
            type: type.toLowerCase(),
            text: type === 'QUICK_REPLY' ? (card.buttonTexts?.[btnIdx] || 'Yes') : (card.buttonTexts?.[btnIdx] || 'Link'),
            // Hardcode dummy value for now, user can edit before saving if we implement edits
            value: type === 'PHONE_NUMBER' ? '+910000000000' : type === 'URL' ? 'https://example.com' : (card.buttonTexts?.[btnIdx] || 'Yes')
          }))
        }))
      }

      setGeneratedTemplate(formattedTemplate)
      setStatusText('')

      showAlert({
        title: 'Report Generated!',
        message: 'Review the generated carousel below, then save to WhatsApp.',
        type: 'success'
      })

    } catch (err) {
      console.error('AI Generation error:', err)
      setErrorText(err.message || 'Failed to generate the report. Please try again.')
    } finally {
      setIsGenerating(false)
      setStatusText('')
    }
  }


  // ── Save/Submit to Meta ──
  const handleSaveToMeta = async () => {
    if (!generatedTemplate) return;

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      // Format the payload exactly for `create-carousel-template`
      const payload = {
        name: generatedTemplate.name,
        category: 'MARKETING',
        language: generatedTemplate.language,
        mainBody: generatedTemplate.mainBody,
        cards: generatedTemplate.cards.map(card => {
          return {
            headerHandle: card.headerHandleId || card.headerImageHandle,
            bodyText: card.bodyText,
            buttons: card.buttons && card.buttons.length > 0
              ? card.buttons.map(btn => ({
                type: btn.type.toLowerCase(),
                text: btn.text,
                value: btn.value
              }))
              : [{ type: 'quick_reply', text: 'View Details', value: 'view_details' }] // Default button as function requires at least one
          }
        })
      };

      const fnResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-carousel-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await fnResponse.json()

      if (!fnResponse.ok || result.error) {
        throw new Error(result.error?.message || result.error || 'Failed to create template on Meta')
      }

      // Success!
      showAlert({
        title: 'Success!',
        message: 'Weekly Report Carousel has been saved to your Templates!',
        type: 'success'
      })

      // Reset everything so they can make another
      setGeneratedTemplate(null)
      setPurpose('')
      setCardImages([])

    } catch (error) {
      console.error('Error saving carousel:', error)
      showAlert({
        title: 'Save Failed',
        message: error.message || 'Failed to push to Meta. Please check your config.',
        type: 'error'
      })
    } finally {
      setIsSaving(false);
    }
  }


  return (
    <PageLoader delay={350}>
      <AlertComponent />
      <div className="p-6 pb-0 flex flex-col overflow-hidden h-[calc(100vh-20px)]">
        {/* Header */}
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Weekly Report Builder</h1>
          <p className="text-sm text-gray-600">Upload progress photos and let AI build a perfect WhatsApp Carousel.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Generation Form */}
          <div className="lg:col-span-5 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#FFC107]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                AI Config
              </h2>

              <div className="space-y-4">

                {/* Images Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide flex justify-between">
                    <span>Photos (Minimum 2 required) *</span>
                    <span className="text-blue-500 font-normal normal-case flex items-center gap-1">
                      Max 10 images
                      <button
                        onClick={() => window.location.href = '/templates?openCarouselAI=true'}
                        className="ml-3 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1 animate-pulse hover:animate-none"
                        title="Click for advanced AI generation with more controls"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Try Advanced?
                      </button>
                    </span>
                  </label>
                  <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <span className="text-sm text-gray-500 font-medium">Click to Add Images</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>

                  {/* Selected Images Preview */}
                  {cardImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {cardImages.map((file, i) => (
                        <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br">
                            {i + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prompt */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Prompt / Details *
                  </label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                    placeholder="E.g., Summarize the site progress for the first week of October. Highlight the new foundation being laid."
                  />
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Tone
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="formal">Formal & Professional</option>
                      <option value="informal">Informal & Friendly</option>
                      <option value="urgent">Urgent & Important</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>
                </div>

                {/* Button Types */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                    Card Buttons *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['QUICK_REPLY', 'URL', 'PHONE_NUMBER'].map(type => (
                      <button
                        key={type}
                        onClick={() => toggleButtonType(type)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${buttonTypes.includes(type)
                          ? 'bg-blue-100 text-blue-800 border-2 border-blue-400'
                          : 'bg-gray-50 text-gray-500 border-2 border-gray-200 hover:bg-gray-100'
                          }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-2">
                  {errorText && <p className="text-red-600 text-xs font-medium mb-3">{errorText}</p>}

                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating || cardImages.length < 2 || !purpose.trim()}
                    className="w-full px-4 py-3 bg-[#FFC107] text-gray-900 text-sm font-bold rounded-xl hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{statusText || 'Generating...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Weekly Report</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT: Preview & Actions */}
          <div className="lg:col-span-7 h-full flex flex-col overflow-hidden">
            {generatedTemplate ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                  <h3 className="font-bold text-gray-900">Review Template</h3>
                  <button
                    onClick={handleSaveToMeta}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:bg-green-400"
                  >
                    {isSaving ? 'Saving...' : 'Approve & Save to Meta'}
                    {!isSaving && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                </div>

                {/* Live Preview UI reusing our TemplatePreview logic roughly */}
                <div className="p-5 flex-1 relative bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-repeat bg-opacity-10 overflow-y-auto" style={{ backgroundColor: '#efeae2', backgroundSize: '400px' }}>

                  {/* Fake UI header */}
                  <div className="max-w-md mx-auto mb-6 bg-yellow-100/80 text-yellow-900 text-[11px] font-bold px-4 py-1.5 rounded-full text-center shadow-sm border border-yellow-200/50 backdrop-blur-sm">
                    Preview
                  </div>

                  {/* Standard WhatsApp Bubble wrapper for the intro text */}
                  {generatedTemplate.mainBody && (
                    <div className="w-full max-w-[85%] sm:max-w-md mb-2 relative flex items-end pl-4">
                      <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm w-full relative">
                        <p className="text-[#111111] text-[14.2px] font-normal leading-[1.35] whitespace-pre-wrap font-sans">
                          {generatedTemplate.mainBody}
                        </p>
                        <span className="block text-[11px] text-gray-500 text-right mt-1 pt-0.5 select-none" style={{ lineHeight: '15px' }}>
                          12:00
                        </span>
                        {/* Tail SVG */}
                        <div className="absolute top-0 -left-2 text-white">
                          <svg viewBox="0 0 8 13" width="8" height="13" className="">
                            <path opacity=".13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" fill="currentColor"></path>
                            <path d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" fill="currentColor"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Carousel Cards Container */}
                  <div className="w-full overflow-x-auto snap-x snap-mandatory flex gap-2 pb-4 pt-1 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                    {generatedTemplate.cards.map((card, i) => (
                      <div key={card.id} className="snap-center shrink-0 w-[240px] sm:w-[280px] bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100 relative mb-1">

                        {/* Header Image */}
                        <div className="relative aspect-[1.91]">
                          <img
                            src={card.headerImageFile ? URL.createObjectURL(card.headerImageFile) : ''}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Body Text */}
                        <div className="p-3 pb-6 flex-1 relative bg-white">
                          <p className="text-[#111111] text-[14.2px] font-normal leading-[1.35] whitespace-pre-wrap font-sans break-words">
                            {card.bodyText || "..."}
                          </p>

                          {/* Card Time */}
                          <div className="absolute bottom-1 right-2 text-[11px] text-gray-500 float-right pt-2 select-none" style={{ lineHeight: '15px' }}>
                            12:00
                          </div>
                        </div>

                        {/* Buttons inside card */}
                        {card.buttons && card.buttons.length > 0 && (
                          <div className="border-t border-gray-100 bg-white">
                            {card.buttons.map((btn, btnIdx) => (
                              <button
                                key={btnIdx}
                                className={`w-full py-2.5 text-[14.5px] font-medium text-[#00a884] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors ${btnIdx > 0 ? 'border-t border-gray-100' : ''}`}
                              >
                                {btn.type === 'URL' || btn.type === 'url' ? (
                                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="opacity-90"><path fillRule="evenodd" clipRule="evenodd" d="M12.793 2.5H4v-1h9.5c.32 0 .5.244.5.5v9.5h-1V3.207L3.354 12.854l-.708-.708L12.793 2.5z"></path></svg>
                                ) : btn.type === 'PHONE_NUMBER' || btn.type === 'phone_number' ? (
                                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="opacity-90"><path fillRule="evenodd" clipRule="evenodd" d="M3.201 2h2.24l.951 2.376-1.157 1.34a8.211 8.211 0 0 0 4.108 4.108l1.34-1.157L13.06 9.62v2.24a.8.8 0 0 1-.723.79c-4.482.433-8.694-3.778-8.261-8.261A.8.8 0 0 1 4.869 3.6h-1.668z"></path></svg>
                                ) : (
                                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="opacity-90"><path d="M13.25 11l2-2.316a.4.4 0 0 0-.306-.684H2V3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9c0 .664-.43 1.226-1 1.423V11h.25z"></path><path d="M10 14h-8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1z"></path></svg>
                                )}
                                {btn.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center p-8 bg-gray-50/50">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-gray-900 font-bold mb-2 text-center text-lg">Report Preview</h3>
                <p className="text-gray-500 text-sm text-center max-w-sm">
                  Upload images and enter a prompt on the left to generate an AI-powered WhatsApp Carousel Weekly Report.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </PageLoader>
  )
}

export default Reports
