import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageLoader from '../components/PageLoader'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatDate = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

// Generate a consistent avatar color from name
const AVATAR_COLORS = [
  '#075E54', '#128C7E', '#25D366', '#34B7F1',
  '#6B5EA6', '#E91E63', '#FF5722', '#FF9800',
  '#2196F3', '#00BCD4'
]
const getAvatarColor = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Components ─────────────────────────────────────────────────────────────

const Avatar = ({ name, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-sm'
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{ background: getAvatarColor(name) }}
    >
      {getInitials(name)}
    </div>
  )
}

const TickIcon = ({ status }) => {
  if (status === 'sending') return <span className="text-gray-400 text-xs">⏳</span>
  if (status === 'sent')
    return (
      <svg className="w-4 h-4 text-gray-400 inline" viewBox="0 0 16 15" fill="currentColor">
        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.576a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.512z" />
      </svg>
    )
  // read (blue double tick)
  return (
    <svg className="w-4 h-4 text-blue-400 inline" viewBox="0 0 16 15" fill="currentColor">
      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.576a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.512z" />
    </svg>
  )
}

// Group messages by date for date separators
const groupMessagesByDate = (messages) => {
  const groups = []
  let currentDate = null
  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at).toDateString()
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groups.push({ type: 'date', label: formatDate(msg.created_at), id: `date-${msg.created_at}` })
    }
    groups.push({ type: 'message', ...msg })
  })
  return groups
}

// ─── Main Component ──────────────────────────────────────────────────────────

const Chats = () => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConvo, setSelectedConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showChatMobile, setShowChatMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Fetch conversations ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!user?.email) return
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_email', user.email)
      .order('last_message_time', { ascending: false })
    if (!error) setConversations(data || [])
    setLoadingConvos(false)
  }, [user?.email])

  // ── Fetch messages for selected conversation ───────────────────────────────
  const fetchMessages = useCallback(async (phone) => {
    if (!user?.email || !phone) return
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_email', user.email)
      .eq('contact_phone', phone)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data || [])
    setLoadingMessages(false)
  }, [user?.email])

  // ── Mark conversation as read ──────────────────────────────────────────────
  const markAsRead = useCallback(async (phone) => {
    if (!user?.email || !phone) return
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('user_email', user.email)
      .eq('contact_phone', phone)
    setConversations(prev => prev.map(c =>
      c.contact_phone === phone ? { ...c, unread_count: 0 } : c
    ))
  }, [user?.email])

  // ── On mount: load conversations ────────────────────────────────────────────
  useEffect(() => { fetchConversations() }, [fetchConversations])

  // ── Selected conversation: load messages ───────────────────────────────────
  useEffect(() => {
    if (selectedConvo) {
      fetchMessages(selectedConvo.contact_phone)
      markAsRead(selectedConvo.contact_phone)
    }
  }, [selectedConvo, fetchMessages, markAsRead])

  // ── Real-time: subscribe to new messages ───────────────────────────────────
  useEffect(() => {
    if (!user?.email) return

    const channel = supabase
      .channel('chat-messages-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_email=eq.${user.email}` },
        (payload) => {
          const newMsg = payload.new
          // Update message list if this phone is selected
          setMessages(prev => {
            if (selectedConvo?.contact_phone === newMsg.contact_phone) {
              const exists = prev.some(m => m.id === newMsg.id)
              return exists ? prev : [...prev, newMsg]
            }
            return prev
          })
          // Refresh conversation list
          fetchConversations()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.email, selectedConvo?.contact_phone, fetchConversations])

  // ── Real-time: subscribe to conversation updates ───────────────────────────
  useEffect(() => {
    if (!user?.email) return
    const channel = supabase
      .channel('chat-convos-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `user_email=eq.${user.email}` },
        () => fetchConversations()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.email, fetchConversations])

  // ── Scroll messages to bottom ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    if (!messageInput.trim() || !selectedConvo || isSending) return

    const text = messageInput.trim()
    setMessageInput('')
    setIsSending(true)

    // Optimistic UI — show message immediately
    const tempMsg = {
      id: `temp-${Date.now()}`,
      user_email: user.email,
      contact_phone: selectedConvo.contact_phone,
      message: text,
      direction: 'outbound',
      status: 'sending',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke('send-message', {
        body: { phone: selectedConvo.contact_phone, message: text, userEmail: user.email }
      })

      if (invokeError || !result?.success) {
        setMessages(prev => prev.map(m =>
          m.id === tempMsg.id ? { ...m, status: 'failed' } : m
        ))
        console.error('Send failed:', invokeError || result?.error)
      } else {
        // Replace temp with real from DB
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        fetchMessages(selectedConvo.contact_phone)
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === tempMsg.id ? { ...m, status: 'failed' } : m
      ))
      console.error('Send error:', err)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ── Select conversation ────────────────────────────────────────────────────
  const handleSelectConvo = (convo) => {
    setSelectedConvo(convo)
    setShowChatMobile(true)
  }

  // ── Filter conversations ───────────────────────────────────────────────────
  const filteredConvos = conversations.filter(c =>
    !searchQuery ||
    c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_phone?.includes(searchQuery)
  )

  // ── Total unread ───────────────────────────────────────────────────────────
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  // ── Grouped messages with date separators ─────────────────────────────────
  const groupedMessages = groupMessagesByDate(messages)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageLoader delay={200}>
      {/* Full-height container — fills the main area inside Layout */}
      <div className="flex flex-1 w-full h-full overflow-hidden bg-white" style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif" }}>

        {/* ── LEFT PANEL: Conversations ────────────────────────────────── */}
        <div
          className={`
              ${showChatMobile ? 'hidden' : 'flex'} lg:flex
              flex-col w-full lg:w-[360px] xl:w-[400px] flex-shrink-0
              border-r border-gray-200
              bg-white
            `}
          style={{ minWidth: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-lg select-none">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 leading-tight">Chats</h2>
                {totalUnread > 0 && (
                  <p className="text-xs text-[#00a884] font-medium">{totalUnread} unread</p>
                )}
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-gray-100">
            <div className="relative flex items-center">
              <svg className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full pl-9 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0 border-none"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-6 w-6 border-2 border-[#00a884] border-t-transparent rounded-full" />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-[#f0f2f5] flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500 mb-1">No conversations yet</p>
                <p className="text-xs text-gray-400">Conversations appear when your contacts message you or when you send a campaign.</p>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const isActive = selectedConvo?.id === convo.id
                return (
                  <button
                    key={convo.id}
                    onClick={() => handleSelectConvo(convo)}
                    className={`w-full flex items-center px-4 py-3 gap-3 border-b border-gray-100 transition-colors text-left
                        ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f5f5]'}`}
                  >
                    <Avatar name={convo.contact_name || convo.contact_phone} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {convo.contact_name || convo.contact_phone}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap ml-1 flex-shrink-0">
                          {formatTime(convo.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {convo.last_message || 'No messages yet'}
                        </p>
                        {convo.unread_count > 0 && (
                          <span className="ml-2 bg-[#00a884] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                            {convo.unread_count > 99 ? '99+' : convo.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Chat Window ──────────────────────────────────── */}
        <div
          className={`
              ${showChatMobile ? 'flex' : 'hidden'} lg:flex
              flex-1 flex-col min-w-0 overflow-hidden
            `}
        >
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] shadow-sm flex-shrink-0"
                style={{ minHeight: 60 }}
              >
                {/* Back button (mobile only) */}
                <button
                  onClick={() => { setShowChatMobile(false); setSelectedConvo(null) }}
                  className="lg:hidden p-1 -ml-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <Avatar name={selectedConvo.contact_name || selectedConvo.contact_phone} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-sm leading-tight">
                    {selectedConvo.contact_name || selectedConvo.contact_phone}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{selectedConvo.contact_phone}</p>
                </div>
                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto px-3 py-2 lg:px-4 lg:py-4"
                style={{
                  background: '#efeae2',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 0h80v80H0z' fill='%23e5ddd5'/%3E%3Cpath d='M0 40h80M40 0v80' stroke='%23d4cfc8' stroke-width='.5'/%3E%3C/svg%3E")`
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-6 w-6 border-2 border-[#00a884] border-t-transparent rounded-full" />
                  </div>
                ) : groupedMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="bg-[#fff9c4] text-gray-600 text-xs px-5 py-2 rounded-full shadow-sm text-center max-w-xs">
                      👋 No messages yet. Send a message to start the conversation!
                    </div>
                  </div>
                ) : (
                  <>
                    {groupedMessages.map((item) => {
                      if (item.type === 'date') {
                        return (
                          <div key={item.id} className="flex justify-center my-3">
                            <span className="bg-[#e1f3fb] text-gray-600 text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                              {item.label}
                            </span>
                          </div>
                        )
                      }

                      const isOutbound = item.direction === 'outbound'
                      const isFailed = item.status === 'failed'
                      const isTemplate = item.message_type === 'template' && item.template_data

                      // WhatsApp-style Template Bubble
                      if (isTemplate) {
                        const td = item.template_data
                        const bubbleBg = isOutbound ? (isFailed ? '#fee2e2' : '#d9fdd3') : '#ffffff'
                        return (
                          <div key={item.id} className={`flex mb-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                            <div style={{
                              background: bubbleBg,
                              borderRadius: isOutbound ? '8px 2px 8px 8px' : '2px 8px 8px 8px',
                              maxWidth: '72%',
                              minWidth: 200,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.13)',
                              overflow: 'hidden',
                              position: 'relative'
                            }}>
                              {/* Bubble tail */}
                              <div style={{
                                width: 0, height: 0,
                                borderTop: isOutbound ? `8px solid ${bubbleBg}` : `8px solid ${bubbleBg}`,
                                borderLeft: isOutbound ? '8px solid transparent' : '0',
                                borderRight: isOutbound ? '0' : '8px solid transparent',
                                position: 'absolute',
                                top: 0,
                                [isOutbound ? 'right' : 'left']: -8
                              }} />

                              {/* Template content */}
                              <div className="px-3 pt-2 pb-1">
                                {/* Header text */}
                                {td.header && (
                                  <p className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{td.header}</p>
                                )}

                                {/* Body */}
                                <p className="text-sm text-gray-800 leading-snug break-words whitespace-pre-wrap">{td.body}</p>

                                {/* Footer */}
                                {td.footer && (
                                  <p className="text-[11px] text-gray-400 mt-1 leading-snug">{td.footer}</p>
                                )}

                                {/* Timestamp */}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[10px] text-gray-400">{formatTime(item.created_at)}</span>
                                  {isOutbound && <TickIcon status={isFailed ? 'failed' : item.status} />}
                                </div>
                              </div>

                              {/* Buttons */}
                              {td.buttons && td.buttons.length > 0 && (
                                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                  {td.buttons.map((btn, bi) => (
                                    <div key={bi} style={{ borderTop: bi > 0 ? '1px solid rgba(0,0,0,0.06)' : undefined }}>
                                      {btn.type === 'URL' ? (
                                        <a
                                          href={btn.url || '#'}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-1.5 py-2 text-[#00a884] text-sm font-medium hover:bg-black/5 transition-colors w-full"
                                          style={{ textDecoration: 'none' }}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          {btn.text}
                                        </a>
                                      ) : (
                                        <button className="flex items-center justify-center gap-1.5 py-2 text-[#00a884] text-sm font-medium hover:bg-black/5 transition-colors w-full">
                                          {btn.type === 'QUICK_REPLY' && (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            </svg>
                                          )}
                                          {btn.text}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }

                      // Regular text bubble
                      return (
                        <div
                          key={item.id}
                          className={`flex mb-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`
                                relative max-w-[75%] lg:max-w-[60%] px-3 py-2 rounded-lg shadow-sm
                                ${isOutbound
                                ? isFailed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-[#d9fdd3] text-gray-900'
                                : 'bg-white text-gray-900'
                              }
                              `}
                            style={{
                              borderRadius: isOutbound
                                ? '8px 2px 8px 8px'
                                : '2px 8px 8px 8px'
                            }}
                          >
                            {/* Bubble tail */}
                            <div
                              className={`absolute top-0 w-2 h-2 overflow-hidden
                                  ${isOutbound ? '-right-2' : '-left-2'}`}
                              style={{
                                borderTop: isOutbound ? '8px solid #d9fdd3' : '8px solid white',
                                borderLeft: isOutbound ? '8px solid transparent' : '0',
                                borderRight: isOutbound ? '0' : '8px solid transparent',
                                width: 0, height: 0,
                                position: 'absolute',
                                top: 0,
                                [isOutbound ? 'right' : 'left']: -8
                              }}
                            />

                            <p className="text-sm leading-snug break-words whitespace-pre-wrap">{item.message}</p>
                            <div className={`flex items-center justify-end gap-1 mt-0.5`}>
                              <span className="text-[10px] text-gray-400">{formatTime(item.created_at)}</span>
                              {isOutbound && <TickIcon status={isFailed ? 'failed' : item.status} />}
                            </div>
                          </div>
                        </div>
                      )

                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Bar */}
              <div className="flex items-end gap-2 px-3 py-3 bg-[#f0f2f5] flex-shrink-0">
                {/* Emoji placeholder */}
                <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Text input */}
                <div className="flex-1 bg-white rounded-2xl flex items-end overflow-hidden shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    rows={1}
                    className="flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent resize-none focus:outline-none leading-5"
                    style={{ maxHeight: 120, overflowY: 'auto' }}
                  />
                </div>

                {/* Send / Mic button */}
                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !messageInput.trim()}
                  className={`
                      p-3 rounded-full transition-all flex-shrink-0 shadow-sm
                      ${messageInput.trim()
                      ? 'bg-[#00a884] hover:bg-[#008f72] text-white scale-100 active:scale-95'
                      : 'bg-[#00a884] text-white opacity-60 cursor-default'
                    }
                    `}
                >
                  {isSending ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* No conversation selected — desktop placeholder */
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#f0f2f5]">
              <div className="text-center max-w-sm px-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white shadow-md flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00a884]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-light text-gray-600 mb-2">WhatsApp Business</h3>
                <p className="text-sm text-gray-400">
                  Select a conversation from the left to start messaging your customers in real time.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  End-to-end encrypted
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </PageLoader>
  )
}

export default Chats
