import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms, default 3000
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
    warn: '!',
    info: 'i',
  };

  const titles: Record<ToastType, string> = {
    success: 'Succès',
    error: 'Erreur',
    warn: 'Attention',
    info: 'Info',
  };

  return (
    <div className={`toast toast--${toast.type} ${exiting ? 'toast--exit' : ''}`} role="status" aria-live="polite">
      <span className="toast__icon">{icons[toast.type]}</span>
      <span className="toast__content">
        <span className="toast__title">{titles[toast.type]}</span>
        <span className="toast__message">{toast.message}</span>
      </span>
      <button
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
      >
        ✕
      </button>
    </div>
  );
};

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
