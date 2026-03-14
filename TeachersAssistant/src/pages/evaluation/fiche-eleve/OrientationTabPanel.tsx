import React, { useState } from 'react';
import { Card, Button, ConfirmDialog } from '../../../components/ui';
import type { OrientationReportRow, OrientationInterviewRow } from './types';
import '../FicheElevePage.css';

interface OrientationTabPanelProps {
  orientationReports: OrientationReportRow[];
  orientationInterviews: OrientationInterviewRow[];
  onDeleteReport?: (id: number) => Promise<void>;
  onDeleteInterview?: (id: number) => Promise<void>;
}

export const OrientationTabPanel: React.FC<OrientationTabPanelProps> = ({
  orientationReports,
  orientationInterviews,
  onDeleteReport,
  onDeleteInterview,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'report' | 'interview'; id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'report' && onDeleteReport) {
        await onDeleteReport(deleteTarget.id);
      } else if (deleteTarget.type === 'interview' && onDeleteInterview) {
        await onDeleteInterview(deleteTarget.id);
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
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
                    <div className="fiche-eleve__item-row" style={{ gap: 6 }}>
                      <span className="fiche-eleve__item-meta">{r.created_at}</span>
                      {onDeleteReport && (
                        <Button variant="ghost" size="S" onClick={() => setDeleteTarget({ type: 'report', id: r.id, label: r.title || `Rapport #${r.id}` })}>✕</Button>
                      )}
                    </div>
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
                    <div className="fiche-eleve__item-row" style={{ gap: 6 }}>
                      <span className="fiche-eleve__item-meta">{i.interview_date}</span>
                      {onDeleteInterview && (
                        <Button variant="ghost" size="S" onClick={() => setDeleteTarget({ type: 'interview', id: i.id, label: `Entretien du ${i.interview_date}` })}>✕</Button>
                      )}
                    </div>
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'report' ? 'Supprimer le rapport' : 'Supprimer l\'entretien'}
        message={`Supprimer « ${deleteTarget?.label ?? ''} » ? Cette action est irréversible.`}
        loading={deleting}
      />
    </Card>
  );
};
