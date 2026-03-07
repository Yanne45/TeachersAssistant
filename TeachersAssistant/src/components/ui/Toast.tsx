import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms, défaut 3000
}

export interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warn: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : ''}`}>
      <span className="toast__icon">{icons[toast.type]}</span>
      <span className="toast__message">{toast.message}</span>
      <button className="toast__close" onClick={() => onDismiss(toast.id)}>✕</button>
    </div>
  );
};

/** Container pour afficher plusieurs toasts */
export const ToastContainer: React.FC<{
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <Toast key={t.id} toast={t} onDismiss={onDismiss} />
    ))}
  </div>
);
