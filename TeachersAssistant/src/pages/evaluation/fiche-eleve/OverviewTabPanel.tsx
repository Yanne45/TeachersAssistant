import React from 'react';
import { Card, Button } from '../../../components/ui';
import type { GradeRow, CorrectionRow, OrientationReportRow, StudentDocumentRow } from './types';
import '../FicheElevePage.css';

interface OverviewTabPanelProps {
  gradesAverage: number | null;
  finalizedCorrections: number;
  correctionsCount: number;
  skillLevelsCount: number;
  studentDocumentsCount: number;
  latestGrade: GradeRow | null;
  latestCorrection: CorrectionRow | null;
  latestBulletin: any | null;
  currentPeriodLabel: string;
  latestOrientationReport: OrientationReportRow | null;
  latestDocument: StudentDocumentRow | null;
  onNavigateGrades: () => void;
  onNavigateCorrections: () => void;
  onNavigateProfile: () => void;
  onNavigateDocs: () => void;
}

export const OverviewTabPanel: React.FC<OverviewTabPanelProps> = ({
  gradesAverage,
  finalizedCorrections,
  correctionsCount,
  skillLevelsCount,
  studentDocumentsCount,
  latestGrade,
  latestCorrection,
  latestBulletin,
  currentPeriodLabel,
  latestOrientationReport,
  latestDocument,
  onNavigateGrades,
  onNavigateCorrections,
  onNavigateProfile,
  onNavigateDocs,
}) => (
        <div className="fiche-eleve__skills">
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Synthèse</h3>
            <div className="fiche-eleve__stat-grid">
              <div className="fiche-eleve__stat-card">
                <div className="fiche-eleve__stat-label">Moyenne récente</div>
                <div className="fiche-eleve__stat-value">{gradesAverage !== null ? gradesAverage.toFixed(1) : '-'}</div>
              </div>
              <div className="fiche-eleve__stat-card">
                <div className="fiche-eleve__stat-label">Copies finalisées</div>
                <div className="fiche-eleve__stat-value">{finalizedCorrections}/{correctionsCount}</div>
              </div>
              <div className="fiche-eleve__stat-card">
                <div className="fiche-eleve__stat-label">Compétences suivies</div>
                <div className="fiche-eleve__stat-value">{skillLevelsCount}</div>
              </div>
              <div className="fiche-eleve__stat-card">
                <div className="fiche-eleve__stat-label">Documents liés</div>
                <div className="fiche-eleve__stat-value">{studentDocumentsCount}</div>
              </div>
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Derniers éléments</h3>
            <div className="fiche-eleve__item-list">
              <div className="fiche-eleve__item-card">
                <div className="fiche-eleve__item-label">Dernière note</div>
                {latestGrade ? (
                  <div className="fiche-eleve__item-text">
                    {latestGrade.assignment_title} - {latestGrade.score?.toFixed(1) ?? '-'} / {latestGrade.max_score}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune note.</span>
                )}
              </div>

              <div className="fiche-eleve__item-card">
                <div className="fiche-eleve__item-label">Dernière correction</div>
                {latestCorrection ? (
                  <div className="fiche-eleve__item-text">
                    {latestCorrection.assignment_title} - statut: {latestCorrection.status}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune copie.</span>
                )}
              </div>

              <div className="fiche-eleve__item-card">
                <div className="fiche-eleve__item-label">
                  Bulletin ({currentPeriodLabel})
                </div>
                {latestBulletin ? (
                  <div className="fiche-eleve__item-text">
                    {latestBulletin.entry_type} - {latestBulletin.status}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune entrée bulletin.</span>
                )}
              </div>

              <div className="fiche-eleve__item-card">
                <div className="fiche-eleve__item-label">Dernier rapport orientation</div>
                {latestOrientationReport ? (
                  <div className="fiche-eleve__item-text">
                    {latestOrientationReport.title || `Rapport #${latestOrientationReport.id}`}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucun rapport.</span>
                )}
              </div>

              <div className="fiche-eleve__item-card">
                <div className="fiche-eleve__item-label">Dernier document</div>
                {latestDocument ? (
                  <div className="fiche-eleve__item-text">{latestDocument.label || latestDocument.document_title}</div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucun document.</span>
                )}
              </div>
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Accès rapide</h3>
            <div className="fiche-eleve__quick-actions">
              <Button variant="secondary" size="S" onClick={onNavigateGrades}>Voir notes</Button>
              <Button variant="secondary" size="S" onClick={onNavigateCorrections}>Voir corrections</Button>
              <Button variant="secondary" size="S" onClick={onNavigateProfile}>Voir profil</Button>
              <Button variant="secondary" size="S" onClick={onNavigateDocs}>Voir docs</Button>
            </div>
          </Card>
        </div>
);
