import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, variant = 'success', delay = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, variant, delay }]);
    setTimeout(() => removeToast(id), delay);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const badgeFor = (variant) => {
    switch (variant) {
      case 'danger':
        return { icon: '⚠️', title: 'تنبيه' };
      case 'warning':
        return { icon: '⚡', title: 'ملاحظة' };
      case 'info':
        return { icon: 'ℹ️', title: 'معلومة' };
      default:
        return { icon: '✅', title: 'تم' };
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-portal" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const meta = badgeFor(toast.variant);
          return (
            <div key={toast.id} className={`toast-card toast-${toast.variant || 'success'}`}>
              <div className="toast-icon" aria-hidden="true">{meta.icon}</div>
              <div className="toast-text">
                <div className="toast-title">{meta.title}</div>
                <div className="toast-message">{toast.message}</div>
              </div>
              <button className="toast-close" onClick={() => removeToast(toast.id)} aria-label="إغلاق">
                ×
              </button>
              <div className="toast-progress" style={{ animationDuration: `${toast.delay}ms` }} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
