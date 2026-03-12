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
  const [renderKey, setRenderKey] = useState(0);
  const hasHtml = html.trim().length > 0;

  const writeToIframe = () => {
    setRenderError(null);

    if (!hasHtml) {
      console.warn('[PDFPreviewModal] Contenu HTML vide');
      setRenderError("Aperçu indisponible : contenu vide. Vérifiez que des données existent pour cette période.");
      return;
    }

    if (!iframeRef.current) {
      console.warn('[PDFPreviewModal] iframeRef non initialisé');
      setRenderError("Aperçu indisponible : composant non initialisé.");
      return;
    }

    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) {
        console.warn('[PDFPreviewModal] Accès contentDocument refusé');
        setRenderError("Aperçu indisponible : accès à l'iframe refusé (sécurité navigateur).");
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();

      // Vérification post-écriture : corps vide = rendu probablement échoué
      setTimeout(() => {
        const body = iframeRef.current?.contentDocument?.body;
        if (body && body.children.length === 0 && body.textContent?.trim() === '') {
          console.warn('[PDFPreviewModal] Iframe body vide après écriture');
          setRenderError("L'aperçu a été chargé mais semble vide. Le contenu est peut-être incompatible.");
        }
      }, 300);
    } catch (err) {
      console.error('[PDFPreviewModal] Échec écriture iframe:', err);
      setRenderError("Échec du chargement de l'aperçu. Format non supporté ou chemin inaccessible.");
    }
  };

  useEffect(() => {
    if (!open) return;
    writeToIframe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, open, hasHtml, renderKey]);

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
            <div className="pdf-preview__error">
              <span>{renderError}</span>
              {hasHtml && (
                <button className="pdf-preview__retry" onClick={() => setRenderKey((k) => k + 1)} type="button">
                  ↺ Recharger
                </button>
              )}
            </div>
          ) : (
            <iframe ref={iframeRef} className="pdf-preview__iframe" title="Aperçu PDF" />
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
