import React, { useEffect, useState } from 'react';
import { Modal, Button } from '../ui';
import {
  assignmentService,
  submissionService,
  correctionService,
  feedbackService,
  skillEvaluationService,
  skillDescriptorService,
} from '../../services';
import type { SkillLevelDescriptor } from '../../services';
import type { Correction, SubmissionFeedback, SubmissionSkillEvaluation } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  submissionId: number;
  assignmentId: number;
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#fca5a5',
  2: '#fcd34d',
  3: '#86efac',
  4: '#4ade80',
};

const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  .modal, .modal__container { position: static !important; }
  .correction-template { page-break-inside: avoid; }
}
`;

interface SkillWithDescriptors {
  skill_id: number;
  skill_label: string;
  descriptors: SkillLevelDescriptor[];
  evalLevel: number | null;
}

export const CorrectionTemplateModal: React.FC<Props> = ({
  open,
  onClose,
  submissionId,
  assignmentId,
}) => {
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [studentName, setStudentName] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [feedbacks, setFeedbacks] = useState<SubmissionFeedback[]>([]);
  const [skillsWithDesc, setSkillsWithDesc] = useState<SkillWithDescriptors[]>([]);

  useEffect(() => {
    if (!open || !submissionId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [asgn, submission, corrs, fbs, skillEvals, skills] = await Promise.all([
          assignmentService.getById(assignmentId),
          submissionService.getById(submissionId),
          correctionService.getBySubmission(submissionId),
          feedbackService.getBySubmission(submissionId),
          skillEvaluationService.getBySubmission(submissionId),
          assignmentService.getSkills(assignmentId),
        ]);

        setAssignment(asgn);
        setScore((submission as any)?.score ?? null);

        // Build student name from submission (fetched via getByAssignment data in parent,
        // but getById returns basic Submission; we use cast for name fields if populated)
        const sub = submission as any;
        const name = [sub?.student_last_name, sub?.student_first_name]
          .filter(Boolean)
          .join(' ') || `Copie #${submissionId}`;
        setStudentName(name);

        setCorrections(corrs);
        setFeedbacks(fbs);

        const skillIds = skills.map(s => s.skill_id as number);
        const descriptorsMap = await skillDescriptorService.getBySkillIds(skillIds);

        const evalMap = new Map<number, number>(
          (skillEvals as SubmissionSkillEvaluation[]).map(e => [e.skill_id as number, e.level])
        );

        const combined: SkillWithDescriptors[] = skills.map(sk => ({
          skill_id: sk.skill_id as number,
          skill_label: sk.skill_label,
          descriptors: descriptorsMap.get(sk.skill_id as number) ?? [],
          evalLevel: evalMap.get(sk.skill_id as number) ?? null,
        }));

        setSkillsWithDesc(combined);
      } catch (err) {
        console.error('[CorrectionTemplateModal] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, submissionId, assignmentId]);

  const strengths = feedbacks.filter(f => f.feedback_type === 'strength');
  const weaknesses = feedbacks.filter(f => f.feedback_type === 'weakness');
  const latestCorrection = corrections[0] ?? null;

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const cellStyle = (isActive: boolean, level: number): React.CSSProperties => ({
    padding: '6px 8px',
    textAlign: 'center',
    background: isActive ? LEVEL_COLORS[level] : 'transparent',
    fontWeight: isActive ? 700 : 400,
    fontSize: '0.85rem',
    verticalAlign: 'middle',
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Template de correction imprimable"
      size="large"
      footer={
        <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="S" onClick={onClose}>Fermer</Button>
          <Button variant="primary" size="S" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      }
    >
      <style>{PRINT_STYLE}</style>

      {loading ? (
        <p style={{ padding: 16, color: 'var(--color-text-secondary)' }}>Chargement…</p>
      ) : (
        <div className="correction-template" style={{ fontFamily: 'serif', fontSize: '0.9rem', color: '#111' }}>

          {/* EN-TÊTE */}
          <div style={{
            border: '2px solid #333',
            borderRadius: 4,
            padding: '12px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{assignment?.title ?? 'Devoir'}</strong>
                <span style={{ marginLeft: 12, color: '#555', fontSize: '0.85rem' }}>
                  {assignment?.class_name}{assignment?.subject_label ? ` — ${assignment.subject_label}` : ''}
                </span>
              </div>
              <div style={{ color: '#555', fontSize: '0.85rem' }}>{today}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>Élève :</strong>{' '}
                <span>{studentName}</span>
              </div>
              <div>
                <strong>Note :</strong>{' '}
                <span>
                  {score !== null ? score : '—'}/{assignment?.max_score ?? 20}
                </span>
              </div>
            </div>
          </div>

          {/* APPRÉCIATION GÉNÉRALE */}
          <section style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #aaa', paddingBottom: 4, marginBottom: 8 }}>
              Appréciation générale
            </h3>
            <div style={{
              minHeight: 60,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '8px 12px',
              whiteSpace: 'pre-wrap',
              background: '#fafafa',
              fontSize: '0.87rem',
              lineHeight: 1.5,
            }}>
              {latestCorrection?.content?.trim() || <em style={{ color: '#999' }}>Aucune correction rédigée.</em>}
            </div>
          </section>

          {/* POINTS FORTS / POINTS À AMÉLIORER */}
          <section style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px', background: '#f0fdf4' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#166534', marginBottom: 6 }}>
                  Points forts
                </h4>
                {strengths.length === 0 ? (
                  <em style={{ color: '#999', fontSize: '0.82rem' }}>—</em>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {strengths.map(f => <li key={f.id}>{f.content}</li>)}
                  </ul>
                )}
              </div>
              <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px', background: '#fff1f2' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#9f1239', marginBottom: 6 }}>
                  Points à améliorer
                </h4>
                {weaknesses.length === 0 ? (
                  <em style={{ color: '#999', fontSize: '0.82rem' }}>—</em>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {weaknesses.map(f => <li key={f.id}>{f.content}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* GRILLE D'ÉVALUATION DES CAPACITÉS */}
          {skillsWithDesc.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #aaa', paddingBottom: 4, marginBottom: 12 }}>
                Grille d'évaluation des capacités
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {skillsWithDesc.map(sk => (
                  <div key={sk.skill_id}>
                    <div style={{ fontWeight: 600, fontSize: '0.87rem', marginBottom: 4 }}>
                      {sk.skill_label}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <colgroup>
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '20.5%' }} />
                        <col style={{ width: '20.5%' }} />
                        <col style={{ width: '20.5%' }} />
                        <col style={{ width: '20.5%' }} />
                      </colgroup>
                      <tbody>
                        {/* Ligne 1 : Libellés des niveaux */}
                        <tr>
                          <td style={{ padding: '5px 8px', fontWeight: 600, border: '1px solid #ccc', background: '#f5f5f5' }}>
                            Niveau
                          </td>
                          {sk.descriptors.map(d => (
                            <td key={d.level} style={{
                              padding: '5px 8px',
                              textAlign: 'center',
                              border: '1px solid #ccc',
                              fontWeight: 600,
                              background: LEVEL_COLORS[d.level],
                              color: '#333',
                            }}>
                              {d.label || `Niveau ${d.level}`}
                            </td>
                          ))}
                        </tr>
                        {/* Ligne 2 : Critères */}
                        <tr>
                          <td style={{ padding: '5px 8px', fontWeight: 600, border: '1px solid #ccc', background: '#f5f5f5', verticalAlign: 'top' }}>
                            Critères
                          </td>
                          {sk.descriptors.map(d => (
                            <td key={d.level} style={{
                              padding: '5px 8px',
                              border: '1px solid #ccc',
                              verticalAlign: 'top',
                              color: d.description ? '#111' : '#bbb',
                              fontStyle: d.description ? 'normal' : 'italic',
                              lineHeight: 1.4,
                            }}>
                              {d.description || '—'}
                            </td>
                          ))}
                        </tr>
                        {/* Ligne 3 : Évaluation */}
                        <tr>
                          <td style={{ padding: '5px 8px', fontWeight: 600, border: '1px solid #ccc', background: '#f5f5f5' }}>
                            Évaluation
                          </td>
                          {sk.descriptors.map(d => {
                            const isActive = sk.evalLevel === d.level;
                            return (
                              <td key={d.level} style={{
                                ...cellStyle(isActive, d.level),
                                border: '1px solid #ccc',
                                height: 28,
                              }}>
                                {isActive ? '✓' : ''}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </Modal>
  );
};
