// ============================================================================
// WorkflowGuidePage — Mode guidé : Séquence → Évaluation → Bulletin
// Affiche la progression du workflow pour chaque séquence active.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Stepper, EmptyState } from '../../components/ui';
import type { StepDef } from '../../components/ui';
import { useApp, useRouter } from '../../stores';
import { db } from '../../services';
import './WorkflowGuidePage.css';

// ── Types ──

interface SequenceWorkflow {
  id: number;
  title: string;
  status: string;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  sessionCount: number;
  sessionsDone: number;
  assignmentCount: number;
  assignmentsCorrected: number;
  bulletinCount: number;
  bulletinsFinal: number;
}

// ── Helpers ──

function stepStatus(done: boolean, active: boolean): 'done' | 'active' | 'pending' {
  if (done) return 'done';
  if (active) return 'active';
  return 'pending';
}

// ── Component ──

export const WorkflowGuidePage: React.FC = () => {
  const { activeYear } = useApp();
  const { navigate, setEntity } = useRouter();
  const [workflows, setWorkflows] = useState<SequenceWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeYear) return;
    setLoading(true);
    try {
      const rows: any[] = await db.select<any>(
        `SELECT
           seq.id,
           seq.title,
           seq.status,
           COALESCE(sub.short_label, sub.label, '') as subjectLabel,
           COALESCE(sub.color, '#888') as subjectColor,
           COALESCE(c.short_name, c.name, '') as classLabel,
           (SELECT COUNT(*) FROM sessions s WHERE s.sequence_id = seq.id) as sessionCount,
           (SELECT COUNT(*) FROM sessions s WHERE s.sequence_id = seq.id AND s.status = 'done') as sessionsDone,
           (SELECT COUNT(*) FROM assignments a WHERE a.sequence_id = seq.id) as assignmentCount,
           (SELECT COUNT(*) FROM assignments a WHERE a.sequence_id = seq.id AND a.status IN ('corrected', 'returned')) as assignmentsCorrected,
           (SELECT COUNT(DISTINCT be.id)
            FROM bulletin_entries be
            JOIN assignments a2 ON a2.sequence_id = seq.id
            JOIN submissions sub2 ON sub2.assignment_id = a2.id
            WHERE be.student_id = sub2.student_id
              AND be.subject_id = seq.subject_id) as bulletinCount,
           (SELECT COUNT(DISTINCT be2.id)
            FROM bulletin_entries be2
            JOIN assignments a3 ON a3.sequence_id = seq.id
            JOIN submissions sub3 ON sub3.assignment_id = a3.id
            WHERE be2.student_id = sub3.student_id
              AND be2.subject_id = seq.subject_id
              AND be2.status = 'final') as bulletinsFinal
         FROM sequences seq
         LEFT JOIN subjects sub ON seq.subject_id = sub.id
         LEFT JOIN classes c ON seq.class_id = c.id
         WHERE seq.academic_year_id = ?
           AND seq.status IN ('in_progress', 'planned', 'done')
         ORDER BY
           CASE seq.status WHEN 'in_progress' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END,
           seq.sort_order`,
        [activeYear.id]
      );
      setWorkflows(rows);
    } catch (err) {
      console.warn('[WorkflowGuide] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeYear]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="workflow-guide"><p className="workflow-guide__loading">Chargement…</p></div>;
  }

  if (workflows.length === 0) {
    return (
      <div className="workflow-guide">
        <EmptyState
          icon="🧭"
          title="Aucune séquence active"
          description="Créez une séquence pour démarrer le workflow guidé."
          actionLabel="+ Créer une séquence"
          onAction={() => navigate({ tab: 'preparation', page: 'sequences' })}
        />
      </div>
    );
  }

  return (
    <div className="workflow-guide">
      <h1 className="workflow-guide__title">Workflow guidé</h1>
      <p className="workflow-guide__subtitle">
        Suivez la progression de chaque séquence : préparation, évaluation, bulletins.
      </p>

      <div className="workflow-guide__list">
        {workflows.map(w => {
          // Step 1: Sequence — done if sessions exist and some are done
          const seqDone = w.sessionsDone > 0;
          const seqActive = w.sessionCount > 0 && !seqDone;

          // Step 2: Evaluation — done if all assignments corrected
          const evalDone = w.assignmentCount > 0 && w.assignmentsCorrected === w.assignmentCount;
          const evalActive = w.assignmentCount > 0 && !evalDone;

          // Step 3: Bulletin — done if bulletins finalized
          const bulDone = w.bulletinsFinal > 0;
          const bulActive = evalDone && !bulDone;

          const steps: StepDef[] = [
            {
              label: `Séquence (${w.sessionsDone}/${w.sessionCount})`,
              status: stepStatus(seqDone, seqActive),
              onClick: () => {
                navigate({ tab: 'preparation', page: 'sequences' });
                setEntity(w.id);
              },
            },
            {
              label: `Évaluation (${w.assignmentsCorrected}/${w.assignmentCount})`,
              status: stepStatus(evalDone, evalActive),
              onClick: () => navigate({ tab: 'evaluation', page: 'devoirs' }),
            },
            {
              label: `Bulletins${w.bulletinsFinal > 0 ? ` (${w.bulletinsFinal})` : ''}`,
              status: stepStatus(bulDone, bulActive),
              onClick: () => navigate({ tab: 'evaluation', page: 'bulletins' }),
            },
          ];

          // Determine next action
          let nextAction: { label: string; onClick: () => void } | null = null;
          if (!seqDone && w.sessionCount === 0) {
            nextAction = { label: 'Ajouter des séances', onClick: () => { navigate({ tab: 'preparation', page: 'sequences' }); setEntity(w.id); } };
          } else if (seqDone && w.assignmentCount === 0) {
            nextAction = { label: 'Créer un devoir', onClick: () => navigate({ tab: 'evaluation', page: 'devoirs' }) };
          } else if (evalDone && !bulDone) {
            nextAction = { label: 'Générer les bulletins', onClick: () => navigate({ tab: 'evaluation', page: 'bulletins' }) };
          }

          return (
            <Card key={w.id} className="workflow-guide__card" noHover>
              <div className="workflow-guide__card-header">
                <div className="workflow-guide__card-info">
                  <span
                    className="workflow-guide__subject-dot"
                    style={{ backgroundColor: w.subjectColor }}
                  />
                  <h3 className="workflow-guide__card-title">{w.title}</h3>
                  <Badge variant={w.status === 'done' ? 'success' : w.status === 'in_progress' ? 'info' : 'default'}>
                    {w.status === 'in_progress' ? 'En cours' : w.status === 'done' ? 'Terminée' : 'Planifiée'}
                  </Badge>
                </div>
                <span className="workflow-guide__card-meta">
                  {w.subjectLabel} — {w.classLabel}
                </span>
              </div>

              <div className="workflow-guide__stepper-wrap">
                <Stepper steps={steps} />
              </div>

              {nextAction && (
                <div className="workflow-guide__next">
                  <span className="workflow-guide__next-label">Prochaine étape :</span>
                  <Button variant="primary" size="S" onClick={nextAction.onClick}>
                    {nextAction.label}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
