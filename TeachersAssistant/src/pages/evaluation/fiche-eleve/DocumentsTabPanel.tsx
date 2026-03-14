import React, { useState } from 'react';
import { Card, Badge, Button, EmptyState, ConfirmDialog } from '../../../components/ui';
import { toPreviewSrc } from '../../../services';
import type { StudentDocumentRow } from './types';
import '../FicheElevePage.css';

interface DocumentsTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  studentDocuments: StudentDocumentRow[];
  onPeriodChange: (periodId: number) => void;
  onUnlink?: (studentDocumentId: number) => Promise<void>;
}

export const DocumentsTabPanel: React.FC<DocumentsTabPanelProps> = ({
  periods,
  selectedPeriodId,
  studentDocuments,
  onPeriodChange,
  onUnlink,
}) => {
  const [unlinkTarget, setUnlinkTarget] = useState<StudentDocumentRow | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    if (!onUnlink || !unlinkTarget) return;
    setUnlinking(true);
    try {
      await onUnlink(unlinkTarget.id);
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
    }
  };

  return (
    <Card noHover className="fiche-eleve__placeholder">
      <h3 className="fiche-eleve__section-title">Documents élève</h3>
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
      {studentDocuments.length === 0 ? (
        <EmptyState icon="📁" title="Aucun document lié à cet élève" description="Les documents seront rattachés automatiquement ou via l'onglet Documents." />
      ) : (
        <div className="fiche-eleve__item-list">
          {studentDocuments.map((doc) => (
            <div
              key={doc.id}
              className="fiche-eleve__item-card fiche-eleve__item-card--grid"
            >
              <div className="fiche-eleve__item-row">
                <strong className="fiche-eleve__item-title">{doc.label || doc.document_title}</strong>
                <span className="fiche-eleve__item-meta">
                  {doc.period_label ?? 'Toutes périodes'}
                </span>
              </div>
              <div className="fiche-eleve__item-text fiche-eleve__item-text--muted">
                {(doc.document_type_label ?? 'Type non défini')}
                {' • '}
                {(doc.subject_label ?? 'Matière non définie')}
                {' • '}
                {doc.file_type.toUpperCase()}
              </div>
              <div className="fiche-eleve__item-row">
                <span className="fiche-eleve__item-text" title={doc.file_path}>{doc.file_name}</span>
                <div className="fiche-eleve__item-row" style={{ gap: 4 }}>
                  <Button
                    variant="secondary"
                    size="S"
                    onClick={() => void toPreviewSrc(doc.file_path).then(url => window.open(url, '_blank', 'noopener,noreferrer'))}
                  >
                    Ouvrir
                  </Button>
                  {onUnlink && (
                    <Button
                      variant="ghost"
                      size="S"
                      onClick={() => setUnlinkTarget(doc)}
                    >
                      Délier
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={unlinkTarget !== null}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={handleUnlink}
        title="Délier le document"
        message={`Délier le document « ${unlinkTarget?.document_title ?? unlinkTarget?.file_name ?? ''} » de cet élève ? Le document restera dans la bibliothèque.`}
        loading={unlinking}
      />
    </Card>
  );
};
