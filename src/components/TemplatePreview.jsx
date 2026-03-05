import React from 'react';

const TemplatePreview = ({ type = 'standard', template, showPreview = true, onTogglePreview }) => {
    // If no template data is provided, show a skeleton/empty state
    if (!template) {
        return (
            <div className="bg-[#E5DDD5] p-4 rounded-lg flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="text-gray-500 text-sm">Waiting for template details...</div>
            </div>
        )
    }

    // --- STANDARD PREVIEW ---
    if (type === 'standard') {
        const exampleParams = {
            first_name: 'Rahul',
            phone_number: '+919876543210',
            email: 'rahul@example.com'
        }

        let previewBody = template.bodyText || template.content || ''
        Object.keys(exampleParams).forEach(key => {
            previewBody = previewBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), exampleParams[key])
        })

        return (
            <div className="bg-[#E5DDD5] p-4 rounded-lg flex flex-col" style={{ minHeight: '400px' }}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
                    <h3 className="font-semibold text-gray-700">WhatsApp Preview</h3>
                    {onTogglePreview && (
                        <button
                            type="button"
                            onClick={onTogglePreview}
                            className="text-sm text-gray-600 hover:text-gray-800"
                        >
                            {showPreview ? 'Hide' : 'Show'}
                        </button>
                    )}
                </div>

                {showPreview && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-white rounded-lg shadow-md max-w-sm w-full p-3 space-y-2">
                            {/* Header */}
                            {template.hasHeader && (
                                <div className="border-b border-gray-200 pb-2">
                                    {template.headerFormat === 'TEXT' && template.headerText && (
                                        <div className="font-bold text-gray-900">{template.headerText}</div>
                                    )}
                                    {template.headerFormat === 'IMAGE' && (
                                        <div className={`bg-gray-200 relative w-full rounded-t-lg overflow-hidden flex items-center justify-center ${!template.headerImageFile && !template.headerImageUrl && !template.headerMediaId ? 'h-56' : ''}`}>
                                            {(template.headerImageFile || template.headerImageUrl || (template.headerMediaId && template.headerMediaId.toString().startsWith('http'))) ? (
                                                <div className="w-full relative">
                                                    <img
                                                        src={template.headerImageFile ? URL.createObjectURL(template.headerImageFile) : (template.headerImageUrl || template.headerMediaId)}
                                                        alt="Header"
                                                        className="w-full h-auto block"
                                                    />
                                                    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                                                </div>
                                            ) : template.headerMediaId ? (
                                                <div className="w-full h-56 flex flex-col items-center justify-center bg-green-50 text-green-700 p-4 text-center border-b border-green-100">
                                                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="text-xs font-bold uppercase tracking-wider">Meta Media Ready</span>
                                                    <span className="text-[10px] mt-1 opacity-75">ID: {template.headerMediaId}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Body */}
                            <div className="text-gray-800 text-sm whitespace-pre-wrap">
                                {previewBody || 'Your message will appear here...'}
                            </div>

                            {/* Footer */}
                            {template.hasFooter && template.footerText && (
                                <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
                                    {template.footerText}
                                </div>
                            )}

                            {/* Buttons */}
                            {template.hasButtons && template.buttons && template.buttons.length > 0 && (
                                <div className="space-y-1 pt-2 border-t border-gray-200">
                                    {template.buttons.map((btn, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className="w-full py-2 text-sm text-center text-[#00A5F4] font-medium border border-gray-300 rounded hover:bg-gray-50 cursor-default"
                                        >
                                            {btn.type === 'URL' && '🔗 '}
                                            {btn.type === 'PHONE_NUMBER' && '📞 '}
                                            {btn.type === 'QUICK_REPLY' && '↩️ '}
                                            {btn.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // --- CAROUSEL PREVIEW ---
    if (type === 'carousel') {
        return (
            <div className="w-full max-w-[500px] font-sans mx-auto">
                <div className="bg-[#E5DDD5] p-4 rounded-lg shadow-lg relative min-h-[500px]" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>

                    {/* Header Controls (Optional) */}
                    <div className="absolute top-2 right-4 z-10">
                        {onTogglePreview && (
                            <button
                                type="button"
                                onClick={onTogglePreview}
                                className="text-xs bg-white/80 px-2 py-1 rounded shadow text-gray-700 hover:bg-white"
                            >
                                {showPreview ? 'Hide' : 'Show'}
                            </button>
                        )}
                    </div>

                    {showPreview && (
                        <div className="mt-6">
                            {/* Header / Main Body */}
                            {template.mainBody && (
                                <div className="bg-white rounded-lg p-3 shadow-sm mb-4 relative max-w-[85%] self-start">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{template.mainBody}</p>
                                    {/* Bubble tail */}
                                    <div className="absolute top-0 -left-2 w-3 h-3 overflow-hidden">
                                        <div className="bg-white transform origin-top-right rotate-45 w-full h-full"></div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 text-right mt-1">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )}

                            {/* Scrollable Cards Container */}
                            {template.cards && template.cards.length > 0 ? (
                                <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                    {template.cards.map((card, index) => (
                                        <div key={index} className="flex-none w-[220px] bg-white rounded-lg shadow-sm overflow-hidden snap-center flex flex-col">
                                            {/* Card Image */}
                                            <div className="bg-gray-100 relative" style={{ aspectRatio: '1.91/1' }}> {/* standard link aspect ratio 1.91:1 close to 17:10 */}
                                                {(card.headerImageFile || card.headerImageUrl || (card.headerMediaId && card.headerMediaId.toString().startsWith('http'))) ? (
                                                    <img
                                                        src={card.headerImageFile ? URL.createObjectURL(card.headerImageFile) : (card.headerImageUrl || card.headerMediaId)}
                                                        alt={`Card ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : card.headerMediaId ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-green-50 text-green-700 p-2 text-center">
                                                        <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-[10px] font-bold uppercase">Meta Media</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-3 flex-grow">
                                                <p className="text-sm text-gray-800 line-clamp-3 leading-snug">
                                                    {card.bodyText || 'Card body text...'}
                                                </p>
                                            </div>

                                            {/* Buttons */}
                                            {card.buttons && card.buttons.length > 0 && (
                                                <div className="border-t border-gray-100">
                                                    {card.buttons.map((btn, btnIdx) => (
                                                        <div key={btnIdx} className="border-t border-gray-100 first:border-t-0 px-3 py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors">
                                                            {btn.type === 'PHONE_NUMBER' && <svg className="w-4 h-4 text-[#00A5F4]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.49-5.15-3.8-6.62-6.62l1.97-1.57c.23-.29.33-.67.24-1.01a17.3 17.3 0 01-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3.3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .72-.63.72-1.19v-3.44c0-.54-.45-.99-.99-.99z" /></svg>}
                                                            {btn.type === 'URL' && <svg className="w-4 h-4 text-[#00A5F4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                                                            {btn.type === 'QUICK_REPLY' && <svg className="w-4 h-4 text-[#00A5F4]" fill="currentColor" viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" /></svg>}

                                                            <span className="text-[#00A5F4] text-sm font-medium truncate max-w-[150px]">
                                                                {btn.text || 'Button'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white/80 backdrop-blur rounded-lg p-6 text-center shadow-sm">
                                    <p className="text-gray-500 text-sm">Add cards to view preview</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
                <p className="text-center text-xs text-gray-400 mt-2">Preview only (rendering may vary by device)</p>
            </div>
        )
    }

    return null;
};

export default TemplatePreview;
