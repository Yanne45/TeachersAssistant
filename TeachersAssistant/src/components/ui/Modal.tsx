import React, { useEffect, useRef } from 'react';
import './Modal.css';

export interface ModalProps {
  /** Visible ou non */
  open: boolean;
  /** Callback fermeture */
  onClose: () => void;
  /** Titre du modal */
  title?: string;
  /** Taille : standard (720px) ou large (960px) */
  size?: 'standard' | 'large';
  children: React.ReactNode;
  /** Actions (boutons) en pied de modal */
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'standard',
  children,
  footer,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Fermer sur Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        // Fermer en cliquant sur le backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal__container">
        {title && (
          <div className="modal__header">
            <h2 className="modal__title" id="modal-title">{title}</h2>
            <button className="modal__close" onClick={onClose} aria-label="Fermer">
              ✕
            </button>
          </div>
        )}
        <div className="modal__body">
          {children}
        </div>
        {footer && (
          <div className="modal__footer">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
};
