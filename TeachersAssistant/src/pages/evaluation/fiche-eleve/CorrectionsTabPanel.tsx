import React from 'react';
import { Card, Button, StatusBadge, EmptyState } from '../../../components/ui';
import { SUBMISSION_STATUS_META } from '../../../constants/statuses';
import type { CorrectionRow } from './types';
import '../FicheElevePage.css';

interface CorrectionsTabPanelProps {
  corrections: CorrectionRow[];
  onOpenAssignment: (assignmentId: number) => void;
}

export const CorrectionsTabPanel: React.FC<CorrectionsTabPanelProps> = ({
  corrections,
  onOpenAssignment,
}) => (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Corrections</h3>
          {corrections.length === 0 ? (
            <EmptyState icon="📝" title="Aucune copie pour cet élève" description="Les copies apparaîtront après l'import ou la saisie en correction série." />
          ) : (
            <div className="fiche-eleve__item-list">
              {corrections.map((c) => (
                <div
                  key={c.id}
                  className="fiche-eleve__item-card fiche-eleve__item-card--grid"
                >
                  <div className="fiche-eleve__item-row">
                    <strong className="fiche-eleve__item-title">{c.assignment_title}</strong>
                    <span className="fiche-eleve__item-meta">{c.assignment_date ?? '-'}</span>
                  </div>
                  <div className="fiche-eleve__item-row">
                    <span className="fiche-eleve__item-text">
                      Note: {c.score?.toFixed(1) ?? '-'} / {c.max_score}
                    </span>
                    <StatusBadge meta={SUBMISSION_STATUS_META} value={c.status} />
                    <Button
                      variant="secondary"
                      size="S"
                      onClick={() => onOpenAssignment(c.assignment_id)}
                    >
                      Ouvrir devoir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
);
