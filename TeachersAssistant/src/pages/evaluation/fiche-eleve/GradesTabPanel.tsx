import React from 'react';
import { Card, EmptyState } from '../../../components/ui';
import type { GradeRow } from './types';
import '../FicheElevePage.css';

interface GradesTabPanelProps {
  gradesAverage: number | null;
  grades: GradeRow[];
}

export const GradesTabPanel: React.FC<GradesTabPanelProps> = ({
  gradesAverage,
  grades,
}) => (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Dernières notes</h3>
          <div className="fiche-eleve__grades-summary">
            Moyenne récente: <strong>{gradesAverage !== null ? gradesAverage.toFixed(1) : '-'}</strong>
          </div>
          {grades.length === 0 ? (
            <EmptyState icon="📊" title="Aucune note disponible" description="Les notes apparaîtront après la correction des devoirs." />
          ) : (
            <div className="fiche-eleve__item-list">
              {grades.map((g) => (
                <div
                  key={g.submission_id}
                  className="fiche-eleve__item-card fiche-eleve__item-row"
                >
                  <span className="fiche-eleve__item-text">{g.assignment_title}</span>
                  <span className="fiche-eleve__item-text fiche-eleve__item-text--bold">
                    {g.score?.toFixed(1) ?? '-'} / {g.max_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
);
