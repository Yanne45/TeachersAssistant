// ============================================================================
// PDFPreviewModal - Preview HTML-to-PDF with Print / Download
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
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
  const [renderError, setRenderError] = useState<string | null>(null);
  const hasHtml = html.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    setRenderError(null);

    if (!hasHtml) {
      setRenderError('Apercu indisponible: contenu HTML vide.');
      return;
    }

    if (!iframeRef.current) {
      setRenderError('Apercu indisponible: iframe non initialisee.');
      return;
    }

    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) {
        setRenderError('Apercu indisponible: document iframe inaccessible.');
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
    } catch {
      setRenderError('Echec de chargement de l apercu PDF.');
    }
  }, [html, open, hasHtml]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handlePrint = () => {
    if (renderError || !hasHtml) return;
    const win = iframeRef.current?.contentWindow;
    if (win) win.print();
  };

  const handleDownload = () => {
    if (renderError || !hasHtml) return;
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
    <div
      className="pdf-preview__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pdf-preview__modal">
        <div className="pdf-preview__header">
          <h2 className="pdf-preview__title">{title}</h2>
          <div className="pdf-preview__actions">
            <Button variant="secondary" size="S" onClick={handleDownload} disabled={!!renderError || !hasHtml}>
              Telecharger HTML
            </Button>
            <Button variant="primary" size="S" onClick={handlePrint} disabled={!!renderError || !hasHtml}>
              Imprimer / PDF
            </Button>
            <button className="pdf-preview__close" onClick={onClose}>x</button>
          </div>
        </div>
        <div className="pdf-preview__body">
          {renderError ? (
            <div className="pdf-preview__error">{renderError}</div>
          ) : (
            <iframe ref={iframeRef} className="pdf-preview__iframe" title="Apercu PDF" />
          )}
        </div>
        <div className="pdf-preview__footer">
          <span className="pdf-preview__footer-hint">
            Utilisez "Imprimer / PDF" puis selectionnez "Enregistrer en PDF" dans la boite de dialogue.
          </span>
        </div>
      </div>
    </div>
  );
};
