import { useEffect } from 'react'

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50'
      case 'error': return 'bg-red-50'
      case 'warning': return 'bg-yellow-50'
      default: return 'bg-blue-50'
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fadeIn">
        <div className={`${getBgColor()} px-6 py-5 rounded-t-xl flex items-center justify-center`}>
          {getIcon()}
        </div>
        
        <div className="px-6 py-5">
          {title && (
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              {title}
            </h3>
          )}
          
          <div className="text-gray-700 text-center whitespace-pre-line">
            {message}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#FFC107] text-gray-900 font-semibold rounded-lg hover:bg-[#FFB300] transition-colors min-w-[100px]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default AlertModal
