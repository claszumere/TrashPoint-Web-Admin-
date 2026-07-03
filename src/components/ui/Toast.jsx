// src/components/ui/Toast.jsx

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, Megaphone } from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

// Toast types configuration
const TOAST_TYPES = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700',
    progressColor: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-700',
    progressColor: 'bg-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700',
    progressColor: 'bg-blue-500',
  },
  announcement: {
    icon: Megaphone,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    iconColor: 'text-purple-500',
    titleColor: 'text-purple-800',
    messageColor: 'text-purple-700',
    progressColor: 'bg-purple-500',
  },
};

// Individual Toast Component
const ToastItem = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (toast.duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

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
          {/* Icon */}
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon size={24} />
          </div>

          {/* Content */}
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
            
            {/* Action Button (optional) */}
            {toast.action && (
              <button
                onClick={() => {
                  toast.action.onClick();
                  handleClose();
                }}
                className={`mt-2 text-sm font-medium ${config.iconColor} hover:underline`}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast, position = 'top-right' }) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`
        fixed z-50 ${positionClasses[position]}
        flex flex-col gap-3
        pointer-events-none
      `}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      type: 'info',
      duration: 5000,
      ...options,
    };
    
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const toast = useCallback((message, options = {}) => {
    return addToast({ message, ...options });
  }, [addToast]);

  toast.success = (message, options = {}) => {
    return addToast({ message, type: 'success', ...options });
  };

  toast.error = (message, options = {}) => {
    return addToast({ message, type: 'error', ...options });
  };

  toast.warning = (message, options = {}) => {
    return addToast({ message, type: 'warning', ...options });
  };

  toast.info = (message, options = {}) => {
    return addToast({ message, type: 'info', ...options });
  };

  toast.announcement = (message, options = {}) => {
    return addToast({ message, type: 'announcement', ...options });
  };

  const value = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    toast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

// Custom Hook to use Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

// Standalone Toast component (for backward compatibility)
const Toast = ({ 
  show, 
  onClose, 
  type = 'success', 
  title, 
  message, 
  duration = 5000 
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          max-w-md w-full pointer-events-auto
          ${config.bgColor} ${config.borderColor}
          border-l-4 rounded-lg shadow-lg
          transform transition-all duration-300
          animate-slide-in
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${config.iconColor}`}>
              <Icon size={24} />
            </div>
            <div className="flex-1">
              {title && (
                <p className={`text-sm font-semibold ${config.titleColor}`}>
                  {title}
                </p>
              )}
              {message && (
                <p className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}>
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;