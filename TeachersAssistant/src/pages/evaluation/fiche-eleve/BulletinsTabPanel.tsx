import React, { useState } from 'react';
import { Card, Badge, Button, EmptyState, StatusBadge, ConfirmDialog } from '../../../components/ui';
import { BULLETIN_STATUS_META } from '../../../constants/statuses';
import '../FicheElevePage.css';

interface BulletinsTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  bulletins: any[];
  onPeriodChange: (periodId: number) => void;
  onEdit?: (bulletin: any, content: string) => Promise<void>;
  onDelete?: (bulletinId: number) => Promise<void>;
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  class_teacher: 'Professeur principal',
  subject_teacher: 'Enseignant matière',
  life_advisor: 'CPE',
  head_teacher: 'Chef d\'établissement',
};

export const BulletinsTabPanel: React.FC<BulletinsTabPanelProps> = ({
  periods,
  selectedPeriodId,
  bulletins,
  onPeriodChange,
  onEdit,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleStartEdit = (b: any) => {
    setEditingId(b.id);
    setEditContent(b.content ?? '');
  };

  const handleSaveEdit = async () => {
    if (!onEdit || editingId === null) return;
    const b = bulletins.find((x) => x.id === editingId);
    if (!b) return;
    setSaving(true);
    try {
      await onEdit(b, editContent);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Card noHover className="fiche-eleve__placeholder">
      <h3 className="fiche-eleve__section-title">Bulletins</h3>
      {periods.length > 0 && (
        <div className="fiche-eleve__period-badges">
          {periods.map((period) => (
            <Badge
              key={period.id}
              variant="filter"
              active={selectedPeriodId === period.id}
              onClick={() => onPeriodChange(period.id)}
            >
              {period.label}
            </Badge>
          ))}
        </div>
      )}
      {bulletins.length === 0 ? (
        <EmptyState icon="📄" title="Aucune entrée de bulletin" description="Les appréciations apparaîtront après rédaction dans l'onglet Bulletins." />
      ) : (
        <div className="fiche-eleve__item-list">
          {bulletins.map((b) => (
            <div key={b.id} className="fiche-eleve__item-card">
              <div className="fiche-eleve__item-row fiche-eleve__item-row--mb">
                <strong className="fiche-eleve__item-title">
                  {ENTRY_TYPE_LABELS[b.entry_type] ?? b.entry_type}
                </strong>
                <div className="fiche-eleve__item-row" style={{ gap: 6 }}>
                  <StatusBadge meta={BULLETIN_STATUS_META} value={b.status} />
                  {onEdit && editingId !== b.id && (
                    <Button variant="ghost" size="S" onClick={() => handleStartEdit(b)}>✎</Button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="S" onClick={() => setDeleteTarget(b)}>✕</Button>
                  )}
                </div>
              </div>
              {editingId === b.id ? (
                <div className="fiche-eleve__item-card--grid">
                  <textarea
                    className="fiche-eleve__profile-notes"
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="fiche-eleve__profile-actions">
                    <Button variant="ghost" size="S" onClick={() => setEditingId(null)}>Annuler</Button>
                    <Button variant="primary" size="S" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="fiche-eleve__item-text">{b.content}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer l'appréciation"
        message={`Supprimer l'appréciation « ${ENTRY_TYPE_LABELS[deleteTarget?.entry_type] ?? deleteTarget?.entry_type ?? ''} » ? Cette action est irréversible.`}
        loading={deleting}
      />
    </Card>
  );
};
