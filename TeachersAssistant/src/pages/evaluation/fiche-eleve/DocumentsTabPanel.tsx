import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import type { StudentDocumentRow } from './types';
import '../FicheElevePage.css';

function toPreviewSrc(filePath: string): string {
  const trimmed = filePath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }

  if (/^[A-Za-z]:\\/.test(trimmed)) {
    return `file:///${trimmed.replace(/\\/g, '/')}`;
  }

  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  return trimmed;
}

interface DocumentsTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  studentDocuments: StudentDocumentRow[];
  onPeriodChange: (periodId: number) => void;
}

export const DocumentsTabPanel: React.FC<DocumentsTabPanelProps> = ({
  periods,
  selectedPeriodId,
  studentDocuments,
  onPeriodChange,
}) => (
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
            <span className="fiche-eleve__placeholder-text">Aucun document lié à cet élève.</span>
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
                    <Button
                      variant="secondary"
                      size="S"
                      onClick={() => window.open(toPreviewSrc(doc.file_path), '_blank', 'noopener,noreferrer')}
                    >
                      Ouvrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
);
