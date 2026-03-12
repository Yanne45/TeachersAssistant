// ============================================================================
// ConfirmDialog — Modale de confirmation (suppression, action destructrice)
// ============================================================================

import React from 'react';
import { Modal } from './Modal';
import { Button, type ButtonVariant } from './Button';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warn' | 'primary';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
}) => {
  const btnVariant: ButtonVariant = variant === 'danger' ? 'danger' : variant === 'warn' ? 'secondary' : 'primary';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="confirm-dialog__footer">
          <Button variant="ghost" size="M" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={btnVariant} size="M" onClick={onConfirm} disabled={loading}>
            {loading ? '…' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="confirm-dialog__message">{message}</p>
    </Modal>
  );
};
