// ============================================================================
// ImportElevesModal — Import CSV d'élèves (Modal)
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import './forms.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (students: Array<{ last_name: string; first_name: string; birth_year?: string; gender?: string }>) => void;
  className?: string;
}

export const ImportElevesModal: React.FC<Props> = ({ open, onClose, onImport, className }) => {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<Array<{ last_name: string; first_name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const parseCsv = (text: string) => {
    setError(null);
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) { setPreview([]); return; }

    // Détecter le séparateur
    const firstLine = lines[0] ?? '';
    const sep = firstLine.includes(';') ? ';' : ',';
    const rows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));

    // Vérifier la première ligne = header ?
    const first = (rows[0] ?? []).map(c => c.toLowerCase());
    const hasHeader = first.includes('nom') || first.includes('last_name') || first.includes('prénom');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    if (dataRows.length === 0) { setError('Aucune donnée trouvée'); return; }
    const firstDataRow = dataRows[0];
    if (!firstDataRow || firstDataRow.length < 2) {
      setError('Format attendu : Nom ; Prénom [; Année ; Genre]');
      return;
    }

    const parsed = dataRows.map(r => ({
      last_name: r[0] || '',
      first_name: r[1] || '',
      birth_year: r[2] || undefined,
      gender: r[3] || undefined,
    })).filter(s => s.last_name && s.first_name);

    setPreview(parsed);
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    parseCsv(text);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    parseCsv(text);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    onImport(preview as Array<{ last_name: string; first_name: string; birth_year?: string; gender?: string }>);
    setCsvText('');
    setPreview([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Importer des élèves${className ? ` — ${className}` : ''}`}
      size="large"
      footer={
        <div className="form__footer">
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 'auto' }}>
            {preview.length > 0 ? `${preview.length} élèves détectés` : ''}
          </span>
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" disabled={preview.length === 0} onClick={handleImport}>
            Importer {preview.length > 0 ? `(${preview.length})` : ''}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Instructions */}
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Format CSV attendu : <strong>Nom ; Prénom</strong> (optionnel : Année naissance ; Genre).
          La première ligne peut être un en-tête. Séparateur : point-virgule ou virgule.
        </div>

        {/* Upload fichier */}
        <div className="form__field">
          <label className="form__label">Fichier CSV</label>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Ou saisie directe */}
        <div className="form__field">
          <label className="form__label">Ou coller les données ici</label>
          <textarea
            className="form__textarea"
            rows={8}
            value={csvText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="DUPONT;Léa;2008;F&#10;MARTIN;Arthur;2007;M&#10;BERNARD;Emma;2008;F"
          />
        </div>

        {error && <div className="form__error">{error}</div>}

        {/* Prévisualisation */}
        {preview.length > 0 && (
          <div>
            <div className="form__section-title">Prévisualisation ({preview.length} élèves)</div>
            <div style={{
              maxHeight: 160, overflowY: 'auto', fontSize: 12,
              background: 'var(--color-bg)', borderRadius: 'var(--radius-xs)',
              padding: 'var(--space-2)',
            }}>
              {preview.slice(0, 15).map((s, i) => (
                <div key={i} style={{ padding: '2px 0', borderBottom: 'var(--border-default)' }}>
                  <strong>{s.last_name}</strong> {s.first_name}
                </div>
              ))}
              {preview.length > 15 && (
                <div style={{ color: 'var(--color-text-muted)', paddingTop: 4 }}>
                  … et {preview.length - 15} autres
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
