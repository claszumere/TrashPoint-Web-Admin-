// src/components/ui/ConfirmModal.jsx

import { useEffect, useRef, useState, useCallback, createContext, useContext, isValidElement } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  HelpCircle, 
  X,
  Loader2
} from 'lucide-react';

// ============================================================
// CONFIRM MODAL CONTEXT (for useConfirm hook)
// ============================================================

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  
  return context;
};

// ============================================================
// CONFIRM PROVIDER
// ============================================================

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    icon: null,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        type: options.type || 'danger',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        icon: options.icon || null,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const confirmAsync = useCallback(async (options, asyncAction) => {
    const confirmed = await confirm(options);
    
    if (confirmed && asyncAction) {
      setIsLoading(true);
      setConfirmState(prev => ({ ...prev, isOpen: true }));
      
      try {
        await asyncAction();
      } finally {
        setIsLoading(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    }
    
    return confirmed;
  }, [confirm]);

  const closeConfirm = useCallback(() => {
    if (!isLoading) {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
    }
  }, [isLoading]);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmAsync }}>
      {children}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={confirmState.onCancel}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        icon={confirmState.icon}
        isLoading={isLoading}
      />
    </ConfirmContext.Provider>
  );
};

// ============================================================
// TYPE CONFIGURATIONS
// ============================================================

const MODAL_TYPES = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    confirmShadow: 'shadow-red-500/25',
    Icon: Trash2,
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
    confirmShadow: 'shadow-amber-500/25',
    Icon: AlertTriangle,
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmBg: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    confirmShadow: 'shadow-blue-500/25',
    Icon: Info,
  },
  success: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    confirmBg: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    confirmShadow: 'shadow-green-500/25',
    Icon: CheckCircle,
  },
  default: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    confirmBg: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700',
    confirmShadow: 'shadow-gray-500/25',
    Icon: HelpCircle,
  },
};

// ============================================================
// ✅ FIXED: HELPER FUNCTION TO RENDER MESSAGE SAFELY
// ============================================================

const renderMessage = (message) => {
  // If message is null or undefined
  if (message == null) {
    return null;
  }
  
  // If message is a string
  if (typeof message === 'string') {
    return <p className="whitespace-pre-line">{message}</p>;
  }
  
  // If message is a number or boolean
  if (typeof message === 'number' || typeof message === 'boolean') {
    return <p>{String(message)}</p>;
  }
  
  // ✅ FIX: Use React's isValidElement to properly check for React elements
  if (isValidElement(message)) {
    return message;
  }
  
  // If message is an array, render each item
  if (Array.isArray(message)) {
    return (
      <>
        {message.map((item, index) => {
          const rendered = renderMessage(item);
          // Only wrap in span if it's not already a valid element
          if (isValidElement(rendered)) {
            return <span key={index}>{rendered}</span>;
          }
          return rendered;
        })}
      </>
    );
  }
  
  // ✅ FIX: For any other object, try to handle it safely
  if (typeof message === 'object') {
    // Check if it might be a React element-like object (has $$typeof)
    if (message.$$typeof) {
      // This shouldn't happen if isValidElement works, but just in case
      console.warn('ConfirmModal: Received element-like object that isValidElement did not catch:', message);
      try {
        return message;
      } catch (e) {
        console.error('Failed to render element-like object:', e);
        return <p>Error rendering content</p>;
      }
    }
    
    // For plain objects, stringify them
    console.warn('ConfirmModal received an object as message:', message);
    try {
      return <p>{JSON.stringify(message, null, 2)}</p>;
    } catch (e) {
      return <p>Error: Unable to display message</p>;
    }
  }
  
  // If it's a function (shouldn't happen, but handle it)
  if (typeof message === 'function') {
    console.warn('ConfirmModal received a function as message');
    return <p>Invalid message type</p>;
  }
  
  // Fallback: convert to string
  return <p>{String(message)}</p>;
};

// ============================================================
// CONFIRM MODAL COMPONENT
// ============================================================

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon: CustomIcon,
  isLoading = false,
  children,
}) => {
  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const [isExiting, setIsExiting] = useState(false);

  // Get type configuration
  const config = MODAL_TYPES[type] || MODAL_TYPES.default;
  const IconComponent = CustomIcon || config.Icon;

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        handleClose();
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      if (onClose) onClose();
    }, 200);
  }, [isLoading, onClose]);

  const handleConfirm = useCallback(() => {
    if (isLoading) return;
    if (onConfirm) onConfirm();
  }, [isLoading, onConfirm]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200
          ${isExiting ? 'opacity-0' : 'opacity-100'}
        `}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          className={`
            relative bg-white rounded-2xl shadow-2xl max-w-md w-full
            transform transition-all duration-200
            ${isExiting 
              ? 'opacity-0 scale-95' 
              : 'opacity-100 scale-100'
            }
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="
              absolute top-4 right-4 p-1.5 rounded-lg
              text-gray-400 hover:text-gray-600 hover:bg-gray-100
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              z-10
            "
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          <div className="p-6">
            {/* Icon */}
            <div className={`
              mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4
              ${config.iconBg}
            `}>
              <div className={config.iconColor}>
                {typeof IconComponent === 'function' ? (
                  <IconComponent size={32} />
                ) : isValidElement(IconComponent) ? (
                  IconComponent
                ) : (
                  <HelpCircle size={32} />
                )}
              </div>
            </div>

            {/* Title */}
            <h3 
              id="modal-title"
              className="text-xl font-bold text-gray-900 text-center mb-2"
            >
              {typeof title === 'string' ? title : 'Confirm Action'}
            </h3>

            {/* Message - ✅ FIXED with proper rendering */}
            <div 
              id="modal-description"
              className="text-gray-600 text-center mb-6"
            >
              {renderMessage(message)}
            </div>

            {/* Custom Content */}
            {children && (
              <div className="mb-6">
                {children}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={handleClose}
                disabled={isLoading}
                className="
                  flex-1 px-4 py-3 rounded-xl font-semibold
                  bg-gray-100 text-gray-700 
                  hover:bg-gray-200 
                  focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {typeof cancelText === 'string' ? cancelText : 'Cancel'}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                disabled={isLoading}
                className={`
                  flex-1 px-4 py-3 rounded-xl font-semibold text-white
                  ${config.confirmBg}
                  shadow-lg ${config.confirmShadow} hover:shadow-xl
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  typeof confirmText === 'string' ? confirmText : 'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;