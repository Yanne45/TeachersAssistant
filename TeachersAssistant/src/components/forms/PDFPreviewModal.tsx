// ============================================================================
// PDFPreviewModal — Preview HTML-to-PDF with Print / Download
// ============================================================================

import React, { useRef, useEffect } from 'react';
import { Button } from '../../components/ui';
import './PDFPreviewModal.css';

interface Props {
  html: string;
  title: string;
  filename: string;
  open: boolean;
  onClose: () => void;
}

export const PDFPreviewModal: React.FC<Props> = ({ html, title, filename, open, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [html, open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) win.print();
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="pdf-preview__overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="pdf-preview__modal">
        <div className="pdf-preview__header">
          <h2 className="pdf-preview__title">{title}</h2>
          <div className="pdf-preview__actions">
            <Button variant="secondary" size="S" onClick={handleDownload}>
              📥 Télécharger HTML
            </Button>
            <Button variant="primary" size="S" onClick={handlePrint}>
              🖨 Imprimer / PDF
            </Button>
            <button className="pdf-preview__close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="pdf-preview__body">
          <iframe
            ref={iframeRef}
            className="pdf-preview__iframe"
            title="Aperçu PDF"
          />
        </div>
        <div className="pdf-preview__footer">
          <span className="pdf-preview__footer-hint">
            Utilisez « Imprimer / PDF » puis sélectionnez « Enregistrer en PDF » dans la boîte de dialogue.
          </span>
        </div>
      </div>
    </div>
  );
};
