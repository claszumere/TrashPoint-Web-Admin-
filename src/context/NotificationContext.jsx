// src/context/NotificationContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react'
import ConfirmModal from '../components/ui/ConfirmModal'

const NotificationContext = createContext(null)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

// ============================================================
// TOAST ITEM COMPONENT (inline)
// ============================================================
const ToastItem = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  const TOAST_TYPES = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      iconColor: 'text-green-500',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      progressColor: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      progressColor: 'bg-red-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      progressColor: 'bg-yellow-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      progressColor: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }

  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info

  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (toast.duration / 100))
          return newProgress <= 0 ? 0 : newProgress
        })
      }, 100)

      const timer = setTimeout(() => {
        handleClose()
      }, toast.duration)

      return () => {
        clearInterval(interval)
        clearTimeout(timer)
      }
    }
  }, [toast.duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 300)
  }

  return (
    <div
      className={`
        relative overflow-hidden
        max-w-md w-full pointer-events-auto
        ${config.bgColor} ${config.borderColor}
        border-l-4 rounded-lg shadow-lg
        transform transition-all duration-300 ease-out
        ${isExiting 
          ? 'translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100'
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className={`text-sm font-semibold ${config.titleColor}`}>
                {toast.title}
              </p>
            )}
            {toast.message && (
              <p className={`text-sm ${config.messageColor} ${toast.title ? 'mt-1' : ''}`}>
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// TOAST CONTAINER COMPONENT (inline)
// ============================================================
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  )
}

// ============================================================
// NOTIFICATION PROVIDER
// ============================================================
export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
    isLoading: false
  })

  // Toast Functions
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message, title = 'Success', duration = 5000) => {
    return addToast({ type: 'success', message, title, duration })
  }, [addToast])

  const showError = useCallback((message, title = 'Error', duration = 6000) => {
    return addToast({ type: 'error', message, title, duration })
  }, [addToast])

  const showWarning = useCallback((message, title = 'Warning', duration = 5000) => {
    return addToast({ type: 'warning', message, title, duration })
  }, [addToast])

  const showInfo = useCallback((message, title = 'Info', duration = 5000) => {
    return addToast({ type: 'info', message, title, duration })
  }, [addToast])

  // ✅ FIXED: Confirm Modal Functions with better error handling
  const showConfirm = useCallback(({
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    type = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm = async () => {},
  }) => {
    return new Promise((resolve) => {
      // Store the original onConfirm callback
      const wrappedOnConfirm = async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }))
        
        try {
          await onConfirm()
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
          resolve(true)
        } catch (error) {
          console.error('Confirm action error:', error)
          // Close modal even on error
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
          // Show error toast
          addToast({ 
            type: 'error', 
            message: error.message || 'An error occurred', 
            title: 'Error', 
            duration: 6000 
          })
          resolve(false)
        }
      }

      const wrappedOnCancel = () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
        resolve(false)
      }

      setConfirmModal({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        isLoading: false,
        onConfirm: wrappedOnConfirm,
        onCancel: wrappedOnCancel
      })
    })
  }, [addToast])

  const closeConfirm = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }))
  }, [])

  const value = {
    // Toast methods
    showSuccess,
    showError,
    showWarning,
    showInfo,
    addToast,
    removeToast,
    
    // Confirm modal methods
    showConfirm,
    closeConfirm
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={confirmModal.onCancel || closeConfirm}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          isLoading={confirmModal.isLoading}
        />
      )}
    </NotificationContext.Provider>
  )
}

export default NotificationContext