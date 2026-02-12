import { useState } from 'react'
import AlertModal from '../components/AlertModal'

export const useAlert = () => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onClose: null,
    onConfirm: null,
    confirmText: 'Delete',
    cancelText: 'Cancel'
  })

  const showAlert = ({
    title = '',
    message,
    type = 'info',
    onClose = null,
    onConfirm = null,
    confirmText = 'Delete',
    cancelText = 'Cancel'
  }) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      onClose,
      onConfirm,
      confirmText,
      cancelText
    })
  }

  const hideAlert = () => {
    // If there's a custom onClose callback, call it after hiding the alert
    if (alertState.onClose) {
      alertState.onClose()
    }
    setAlertState(prev => ({ ...prev, isOpen: false, onClose: null, onConfirm: null }))
  }

  const AlertComponent = () => (
    <AlertModal
      isOpen={alertState.isOpen}
      onClose={hideAlert}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      onConfirm={alertState.onConfirm}
      confirmText={alertState.confirmText}
      cancelText={alertState.cancelText}
    />
  )

  return { showAlert, AlertComponent }
}
