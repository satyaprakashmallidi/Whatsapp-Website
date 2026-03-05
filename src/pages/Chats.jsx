import { useState } from 'react'
import { useData } from '../context/DataContext'
import PageLoader from '../components/PageLoader'
import { FaBicycle } from 'react-icons/fa'

const Chats = () => {
  const { contacts, campaigns } = useData()
  const [selectedContact, setSelectedContact] = useState(null)
  const [showChatMobile, setShowChatMobile] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [conversations, setConversations] = useState(() => {
    // Generate conversations from sent campaigns
    const convos = {}

    campaigns.filter(c => c.status === 'Sent').forEach(campaign => {
      const audienceContacts = contacts.slice(0, campaign.recipients)
      audienceContacts.forEach(contact => {
        if (!convos[contact.id]) {
          convos[contact.id] = {
            contact,
            messages: [],
            lastMessage: '',
            lastMessageTime: '',
            unread: 0
          }
        }
        convos[contact.id].messages.push({
          id: `campaign-${campaign.id}-${contact.id}`,
          text: campaign.message,
          sender: 'me',
          time: campaign.sentDate,
          campaignName: campaign.name,
          status: 'read'
        })
        convos[contact.id].lastMessage = campaign.message
        convos[contact.id].lastMessageTime = campaign.sentDate
      })
    })

    return convos
  })

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedContact) return

    // Show sending animation
    setIsSending(true)

    // Simulate sending delay
    setTimeout(() => {
      const newMessage = {
        id: Date.now(),
        text: messageInput,
        sender: 'me',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'sent'
      }

      setConversations(prev => ({
        ...prev,
        [selectedContact.id]: {
          ...prev[selectedContact.id],
          messages: [...(prev[selectedContact.id]?.messages || []), newMessage],
          lastMessage: messageInput,
          lastMessageTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      }))

      setMessageInput('')
      setIsSending(false)
    }, 800) // Animation duration
  }

  const conversationList = Object.values(conversations).sort((a, b) =>
    new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
  )

  return (
    <PageLoader delay={400}>
      <div className="h-full p-2 lg:p-4 pb-24 lg:pb-4">
        {/* WhatsApp-style Chat Interface */}
        <div className="h-full bg-white rounded-xl shadow-sm overflow-hidden flex relative">
          {/* Conversations List */}
          <div className={`${showChatMobile ? 'hidden' : 'flex'} w-full lg:w-1/3 border-r border-gray-200 flex flex-col min-h-0`}>
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 bg-[#F5F5F5] flex-shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full px-4 py-2 pl-10 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {conversationList.length > 0 ? (
                conversationList.map(({ contact, lastMessage, lastMessageTime, unread }) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setSelectedContact(contact)
                      setShowChatMobile(true)
                    }}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedContact?.id === contact.id ? 'bg-[#F5F5F5]' : ''
                      }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-[#FFC107] rounded-full flex items-center justify-center">
                        <span className="text-gray-900 font-semibold text-lg">{contact.name[0]}</span>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{contact.name}</h3>
                          <span className="text-xs text-gray-500">{lastMessageTime}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            <svg className="w-4 h-4 inline mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            {lastMessage?.substring(0, 30)}...
                          </p>
                          {unread > 0 && (
                            <span className="bg-[#FFC107] text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No conversations yet</p>
                  <p className="text-sm mt-2">Send a campaign to start chatting</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${showChatMobile ? 'flex' : 'hidden'} lg:flex flex-1 flex flex-col min-h-0`}>
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-3 lg:p-4 border-b border-gray-200 bg-[#F5F5F5] flex-shrink-0">
                  <div className="flex items-center">
                    <button
                      onClick={() => setShowChatMobile(false)}
                      className="lg:hidden mr-3 text-gray-600 hover:text-gray-900"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#FFC107] rounded-full flex items-center justify-center">
                      <span className="text-gray-900 font-semibold text-sm lg:text-base">{selectedContact.name[0]}</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900 text-sm lg:text-base">{selectedContact.name}</h3>
                      <p className="text-[10px] lg:text-xs text-gray-600">{selectedContact.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#E5DDD5]" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,.02) 35px, rgba(0,0,0,.02) 70px)',
                  minHeight: 0
                }}>
                  <div className="flex flex-col space-y-2">
                    {conversations[selectedContact.id]?.messages.map((message) => (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-lg">
                          {message.campaignName && (
                            <p className="text-xs text-gray-500 mb-1 text-right px-2">
                              📢 From campaign: {message.campaignName}
                            </p>
                          )}
                          <div className="bg-[#DCF8C6] rounded-lg px-4 py-2 shadow-sm">
                            <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">{message.text}</p>
                            <div className="flex items-center justify-end mt-1 space-x-1">
                              <span className="text-xs text-gray-600">{message.time}</span>
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="p-4 bg-[#F5F5F5] border-t border-gray-200 flex-shrink-0">
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <button type="button" className="text-gray-500 hover:text-gray-700">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button type="button" className="text-gray-500 hover:text-gray-700">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || isSending}
                      className="bg-[#FFC107] text-gray-900 p-3 rounded-full hover:bg-[#FFB300] transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    >
                      {isSending ? (
                        <FaBicycle className="w-5 h-5 animate-bicycle-slide" />
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#F5F5F5]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Business Chats</h3>
                  <p className="text-gray-600">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLoader>
  )
}

export default Chats
