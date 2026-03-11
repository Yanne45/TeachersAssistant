import React, { useState } from 'react';
import { Button } from '../ui';

interface ImportModalProps {
  files: File[];
  dbPath: string;
  onClose: () => void;
  onSaved: (count: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ files, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Stabilisation: comportement minimal sans bloquer le flux UI.
      onSaved(files.length);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, border: 'var(--border-default)', borderRadius: 8 }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{files.length} fichier(s) pret(s) a importer</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="S" onClick={onClose}>Annuler</Button>
        <Button variant="primary" size="S" onClick={handleSave} disabled={saving}>
          {saving ? 'Import...' : 'Importer'}
        </Button>
      </div>
    </div>
  );
};
