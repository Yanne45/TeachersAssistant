import React from 'react';
import { Card } from '../../../components/ui';
import type { OrientationReportRow, OrientationInterviewRow } from './types';
import '../FicheElevePage.css';

interface OrientationTabPanelProps {
  orientationReports: OrientationReportRow[];
  orientationInterviews: OrientationInterviewRow[];
}

export const OrientationTabPanel: React.FC<OrientationTabPanelProps> = ({
  orientationReports,
  orientationInterviews,
}) => (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Orientation</h3>

          <div className="fiche-eleve__item-list fiche-eleve__item-list--gap-lg">
            <div>
              <strong className="fiche-eleve__item-title">Rapports</strong>
              {orientationReports.length === 0 ? (
                <div className="fiche-eleve__placeholder-text">Aucun rapport d'orientation.</div>
              ) : (
                <div className="fiche-eleve__item-list fiche-eleve__item-list--mt">
                  {orientationReports.map((r) => (
                    <div key={r.id} className="fiche-eleve__item-card">
                      <div className="fiche-eleve__item-row fiche-eleve__item-row--mb">
                        <strong className="fiche-eleve__item-title">{r.title || `Rapport #${r.id}`}</strong>
                        <span className="fiche-eleve__item-meta">{r.created_at}</span>
                      </div>
                      <div className="fiche-eleve__item-text">{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <strong className="fiche-eleve__item-title">Entretiens</strong>
              {orientationInterviews.length === 0 ? (
                <div className="fiche-eleve__placeholder-text">Aucun entretien d'orientation.</div>
              ) : (
                <div className="fiche-eleve__item-list fiche-eleve__item-list--mt">
                  {orientationInterviews.map((i) => (
                    <div key={i.id} className="fiche-eleve__item-card">
                      <div className="fiche-eleve__item-row fiche-eleve__item-row--mb">
                        <strong className="fiche-eleve__item-title">Entretien</strong>
                        <span className="fiche-eleve__item-meta">{i.interview_date}</span>
                      </div>
                      <div className="fiche-eleve__item-text fiche-eleve__item-text--mb">{i.summary}</div>
                      {i.decisions && <div className="fiche-eleve__item-text"><strong>Décisions :</strong> {i.decisions}</div>}
                      {i.next_steps && <div className="fiche-eleve__item-text"><strong>Étapes suivantes :</strong> {i.next_steps}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
);
