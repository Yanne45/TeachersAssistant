// ============================================================================
// GrandOralPage — Module de suivi du Grand Oral (Terminale)
// Suivi des questions, passages, questions de jury, évaluation critériée
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState, Badge, Card } from '../../components/ui';
import { VoiceInput } from '../../components/ui/VoiceInput';
import { useApp } from '../../stores';
import { db } from '../../services';
import './GrandOralPage.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface GOQuestion {
  id: number;
  student_id: number;
  question_number: number;
  subject_id: number | null;
  title: string;
  problematique: string | null;
  plan_outline: string | null;
  status: 'brouillon' | 'en_cours' | 'validee' | 'presentee';
  teacher_notes: string | null;
  // Joined
  student_name?: string;
  subject_label?: string;
  class_label?: string;
  passage_count?: number;
  jury_question_count?: number;
}

interface GOPassage {
  id: number;
  question_id: number;
  passage_date: string;
  duration_seconds: number | null;
  score_argumentation: number | null;
  score_expression: number | null;
  score_ecoute: number | null;
  score_connaissance: number | null;
  score_engagement: number | null;
  general_comment: string | null;
  strengths: string | null;
  improvements: string | null;
  suggested_score: number | null;
  source: string;
}

interface GOJuryQuestion {
  id: number;
  question_id: number;
  content: string;
  category: string;
  source: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'var(--color-text-muted)' },
  en_cours:  { label: 'En cours', color: 'var(--color-warning)' },
  validee:   { label: 'Validée', color: 'var(--color-success)' },
  presentee: { label: 'Présentée', color: 'var(--color-primary)' },
};

const CRITERIA_LABELS: Record<string, string> = {
  argumentation: 'Argumentation',
  expression: 'Expression',
  ecoute: 'Écoute & échange',
  connaissance: 'Connaissance',
  engagement: 'Engagement',
};

// ── Composant principal ──────────────────────────────────────────────────────

export const GrandOralPage: React.FC = () => {
  const { addToast } = useApp();
  // State
  const [questions, setQuestions] = useState<GOQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQ, setSelectedQ] = useState<GOQuestion | null>(null);
  const [passages, setPassages] = useState<GOPassage[]>([]);
  const [juryQuestions, setJuryQuestions] = useState<GOJuryQuestion[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classes, setClasses] = useState<{ id: number; label: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; label: string }[]>([]);

  // Edit form
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', problematique: '', plan_outline: '', status: 'brouillon', teacher_notes: '', subject_id: '' });

  // New passage form
  const [showPassageForm, setShowPassageForm] = useState(false);
  const [passageForm, setPassageForm] = useState({
    passage_date: new Date().toISOString().split('T')[0],
    duration_seconds: '',
    score_argumentation: '', score_expression: '', score_ecoute: '',
    score_connaissance: '', score_engagement: '',
    general_comment: '', strengths: '', improvements: '', suggested_score: '',
  });

  // New jury question form
  const [showJuryForm, setShowJuryForm] = useState(false);
  const [juryForm, setJuryForm] = useState({ content: '', category: 'general' });

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let where = '1=1';
      const params: any[] = [];
      if (classFilter) { where += ' AND sce.class_id = ?'; params.push(Number(classFilter)); }
      if (statusFilter) { where += ' AND goq.status = ?'; params.push(statusFilter); }

      const rows = await db.select<GOQuestion[]>(`
        SELECT goq.*,
               st.last_name || ' ' || st.first_name as student_name,
               sub.label as subject_label,
               c.label as class_label,
               (SELECT COUNT(*) FROM grand_oral_passages gop WHERE gop.question_id = goq.id) as passage_count,
               (SELECT COUNT(*) FROM grand_oral_jury_questions goj WHERE goj.question_id = goq.id) as jury_question_count
        FROM grand_oral_questions goq
        JOIN students st ON goq.student_id = st.id
        LEFT JOIN subjects sub ON goq.subject_id = sub.id
        LEFT JOIN student_class_enrollments sce ON st.id = sce.student_id
        LEFT JOIN classes c ON sce.class_id = c.id
        WHERE ${where}
        ORDER BY st.last_name, st.first_name, goq.question_number
      `, params);
      setQuestions(rows);
    } catch (err) { console.warn('[GrandOral] Erreur chargement:', err); }
    setLoading(false);
  }, [classFilter, statusFilter]);

  const loadDetail = useCallback(async (q: GOQuestion) => {
    const [p, jq] = await Promise.all([
      db.select<GOPassage[]>('SELECT * FROM grand_oral_passages WHERE question_id = ? ORDER BY passage_date DESC', [q.id]),
      db.select<GOJuryQuestion[]>('SELECT * FROM grand_oral_jury_questions WHERE question_id = ? ORDER BY id', [q.id]),
    ]);
    setPassages(p);
    setJuryQuestions(jq);
  }, []);

  useEffect(() => {
    loadQuestions();
    db.select<{ id: number; label: string }[]>('SELECT id, label FROM classes ORDER BY label').then(setClasses).catch(() => {});
    db.select<{ id: number; label: string }[]>('SELECT id, label FROM subjects ORDER BY label').then(setSubjects).catch(() => {});
  }, [loadQuestions]);

  useEffect(() => {
    if (selectedQ) loadDetail(selectedQ);
  }, [selectedQ, loadDetail]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelect = (q: GOQuestion) => {
    setSelectedQ(q);
    setEditMode(false);
    setShowPassageForm(false);
    setShowJuryForm(false);
  };

  const handleEdit = () => {
    if (!selectedQ) return;
    setEditForm({
      title: selectedQ.title,
      problematique: selectedQ.problematique ?? '',
      plan_outline: selectedQ.plan_outline ?? '',
      status: selectedQ.status,
      teacher_notes: selectedQ.teacher_notes ?? '',
      subject_id: selectedQ.subject_id ? String(selectedQ.subject_id) : '',
    });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedQ) return;
    try {
      await db.execute(
        `UPDATE grand_oral_questions SET title = ?, problematique = ?, plan_outline = ?, status = ?, teacher_notes = ?, subject_id = ? WHERE id = ?`,
        [editForm.title, editForm.problematique || null, editForm.plan_outline || null, editForm.status, editForm.teacher_notes || null, editForm.subject_id ? Number(editForm.subject_id) : null, selectedQ.id]
      );
      addToast('success', 'Question mise à jour');
      setEditMode(false);
      await loadQuestions();
      const updated = await db.selectOne<GOQuestion>('SELECT * FROM grand_oral_questions WHERE id = ?', [selectedQ.id]);
      if (updated) setSelectedQ({ ...selectedQ, ...updated });
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleAddPassage = async () => {
    if (!selectedQ) return;
    try {
      await db.execute(
        `INSERT INTO grand_oral_passages (question_id, passage_date, duration_seconds,
         score_argumentation, score_expression, score_ecoute, score_connaissance, score_engagement,
         general_comment, strengths, improvements, suggested_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          selectedQ.id, passageForm.passage_date,
          passageForm.duration_seconds ? Number(passageForm.duration_seconds) : null,
          passageForm.score_argumentation ? Number(passageForm.score_argumentation) : null,
          passageForm.score_expression ? Number(passageForm.score_expression) : null,
          passageForm.score_ecoute ? Number(passageForm.score_ecoute) : null,
          passageForm.score_connaissance ? Number(passageForm.score_connaissance) : null,
          passageForm.score_engagement ? Number(passageForm.score_engagement) : null,
          passageForm.general_comment || null, passageForm.strengths || null,
          passageForm.improvements || null,
          passageForm.suggested_score ? Number(passageForm.suggested_score) : null,
        ]
      );
      addToast('success', 'Passage enregistré');
      setShowPassageForm(false);
      setPassageForm({ passage_date: new Date().toISOString().split('T')[0], duration_seconds: '', score_argumentation: '', score_expression: '', score_ecoute: '', score_connaissance: '', score_engagement: '', general_comment: '', strengths: '', improvements: '', suggested_score: '' });
      await loadDetail(selectedQ);
      await loadQuestions();
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleAddJuryQuestion = async () => {
    if (!selectedQ || !juryForm.content.trim()) return;
    try {
      await db.execute(
        'INSERT INTO grand_oral_jury_questions (question_id, content, category) VALUES (?, ?, ?)',
        [selectedQ.id, juryForm.content, juryForm.category]
      );
      addToast('success', 'Question de jury ajoutée');
      setJuryForm({ content: '', category: 'general' });
      setShowJuryForm(false);
      await loadDetail(selectedQ);
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleDeleteJuryQuestion = async (id: number) => {
    await db.execute('DELETE FROM grand_oral_jury_questions WHERE id = ?', [id]);
    if (selectedQ) await loadDetail(selectedQ);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="go-page">
      {/* Left panel: question list */}
      <div className="go-page__list">
        <div className="go-page__list-header">
          <h2 className="go-page__title">Grand Oral</h2>
          <div className="go-page__filters">
            <select className="go-page__filter-select" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
              <option value="">Toutes les classes</option>
              {classes.map(c => <option key={c.id} value={String(c.id)}>{c.label}</option>)}
            </select>
            <select className="go-page__filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="en_cours">En cours</option>
              <option value="validee">Validée</option>
              <option value="presentee">Présentée</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="go-page__loading">Chargement…</div>
        ) : questions.length === 0 ? (
          <EmptyState
            icon="🎤"
            title="Aucune question Grand Oral"
            description="Les questions apparaîtront ici lorsque vous les créerez depuis la fiche élève."
          />
        ) : (
          <div className="go-page__question-list">
            {questions.map(q => (
              <div
                key={q.id}
                className={`go-page__question-item ${selectedQ?.id === q.id ? 'go-page__question-item--active' : ''}`}
                onClick={() => handleSelect(q)}
              >
                <div className="go-page__question-item-header">
                  <span className="go-page__student-name">{q.student_name}</span>
                  <Badge variant={q.status === 'validee' ? 'success' : q.status === 'presentee' ? 'info' : 'default'}>
                    Q{q.question_number}
                  </Badge>
                </div>
                <div className="go-page__question-title">{q.title}</div>
                <div className="go-page__question-meta">
                  {q.subject_label && <span>{q.subject_label}</span>}
                  {q.class_label && <span>{q.class_label}</span>}
                  <span style={{ color: STATUS_META[q.status]?.color }}>{STATUS_META[q.status]?.label}</span>
                  {(q.passage_count ?? 0) > 0 && <span>{q.passage_count} passage(s)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: detail */}
      <div className="go-page__detail">
        {!selectedQ ? (
          <div className="go-page__empty-detail">
            <span style={{ fontSize: 48 }}>🎤</span>
            <p>Sélectionnez une question pour voir le détail</p>
          </div>
        ) : editMode ? (
          /* ── Edit form ── */
          <div className="go-page__edit-form">
            <h3>Modifier la question</h3>
            <div className="go-page__form-field">
              <label>Intitulé * <VoiceInput onResult={t => setEditForm(f => ({ ...f, title: f.title ? f.title + ' ' + t : t }))} /></label>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="go-page__form-field">
              <label>Matière</label>
              <select value={editForm.subject_id} onChange={e => setEditForm(f => ({ ...f, subject_id: e.target.value }))}>
                <option value="">—</option>
                {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
              </select>
            </div>
            <div className="go-page__form-field">
              <label>Problématique <VoiceInput onResult={t => setEditForm(f => ({ ...f, problematique: f.problematique ? f.problematique + ' ' + t : t }))} /></label>
              <textarea rows={2} value={editForm.problematique} onChange={e => setEditForm(f => ({ ...f, problematique: e.target.value }))} />
            </div>
            <div className="go-page__form-field">
              <label>Plan détaillé <VoiceInput onResult={t => setEditForm(f => ({ ...f, plan_outline: f.plan_outline ? f.plan_outline + ' ' + t : t }))} /></label>
              <textarea rows={5} value={editForm.plan_outline} onChange={e => setEditForm(f => ({ ...f, plan_outline: e.target.value }))} />
            </div>
            <div className="go-page__form-field">
              <label>Statut</label>
              <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="go-page__form-field">
              <label>Notes professeur <VoiceInput onResult={t => setEditForm(f => ({ ...f, teacher_notes: f.teacher_notes ? f.teacher_notes + ' ' + t : t }))} /></label>
              <textarea rows={2} value={editForm.teacher_notes} onChange={e => setEditForm(f => ({ ...f, teacher_notes: e.target.value }))} />
            </div>
            <div className="go-page__form-actions">
              <button className="go-page__btn go-page__btn--secondary" onClick={() => setEditMode(false)}>Annuler</button>
              <button className="go-page__btn go-page__btn--primary" onClick={handleSaveEdit}>Enregistrer</button>
            </div>
          </div>
        ) : (
          /* ── Detail view ── */
          <>
            <div className="go-page__detail-header">
              <div>
                <h3 className="go-page__detail-title">{selectedQ.title}</h3>
                <div className="go-page__detail-meta">
                  {selectedQ.student_name} · Q{selectedQ.question_number}
                  {selectedQ.subject_label && <> · {selectedQ.subject_label}</>}
                  <span style={{ color: STATUS_META[selectedQ.status]?.color, marginLeft: 8 }}>
                    {STATUS_META[selectedQ.status]?.label}
                  </span>
                </div>
              </div>
              <button className="go-page__btn go-page__btn--secondary" onClick={handleEdit}>Modifier</button>
            </div>

            {selectedQ.problematique && (
              <Card style={{ marginBottom: 12 }}>
                <div className="go-page__section-label">Problématique</div>
                <p>{selectedQ.problematique}</p>
              </Card>
            )}

            {selectedQ.plan_outline && (
              <Card style={{ marginBottom: 12 }}>
                <div className="go-page__section-label">Plan détaillé</div>
                <pre className="go-page__plan-text">{selectedQ.plan_outline}</pre>
              </Card>
            )}

            {selectedQ.teacher_notes && (
              <Card style={{ marginBottom: 12 }}>
                <div className="go-page__section-label">Notes professeur</div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selectedQ.teacher_notes}</p>
              </Card>
            )}

            {/* ── Passages ── */}
            <div className="go-page__section">
              <div className="go-page__section-header">
                <h4>Passages ({passages.length})</h4>
                <button className="go-page__btn go-page__btn--small" onClick={() => setShowPassageForm(v => !v)}>
                  {showPassageForm ? 'Annuler' : '+ Passage'}
                </button>
              </div>

              {showPassageForm && (
                <Card className="go-page__passage-form">
                  <div className="go-page__form-grid">
                    <div className="go-page__form-field">
                      <label>Date</label>
                      <input type="date" value={passageForm.passage_date} onChange={e => setPassageForm(f => ({ ...f, passage_date: e.target.value }))} />
                    </div>
                    <div className="go-page__form-field">
                      <label>Durée (sec)</label>
                      <input type="number" value={passageForm.duration_seconds} onChange={e => setPassageForm(f => ({ ...f, duration_seconds: e.target.value }))} placeholder="300" />
                    </div>
                    {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                      <div key={key} className="go-page__form-field">
                        <label>{label} (1-4)</label>
                        <input type="number" min="1" max="4" value={(passageForm as any)['score_' + key]} onChange={e => setPassageForm(f => ({ ...f, ['score_' + key]: e.target.value }))} />
                      </div>
                    ))}
                    <div className="go-page__form-field">
                      <label>Note suggérée /20</label>
                      <input type="number" min="0" max="20" step="0.5" value={passageForm.suggested_score} onChange={e => setPassageForm(f => ({ ...f, suggested_score: e.target.value }))} />
                    </div>
                  </div>
                  <div className="go-page__form-field" style={{ marginTop: 8 }}>
                    <label>Commentaire <VoiceInput onResult={t => setPassageForm(f => ({ ...f, general_comment: f.general_comment ? f.general_comment + ' ' + t : t }))} /></label>
                    <textarea rows={2} value={passageForm.general_comment} onChange={e => setPassageForm(f => ({ ...f, general_comment: e.target.value }))} />
                  </div>
                  <div className="go-page__form-field">
                    <label>Points forts <VoiceInput onResult={t => setPassageForm(f => ({ ...f, strengths: f.strengths ? f.strengths + ' ' + t : t }))} /></label>
                    <textarea rows={1} value={passageForm.strengths} onChange={e => setPassageForm(f => ({ ...f, strengths: e.target.value }))} />
                  </div>
                  <div className="go-page__form-field">
                    <label>Axes d'amélioration <VoiceInput onResult={t => setPassageForm(f => ({ ...f, improvements: f.improvements ? f.improvements + ' ' + t : t }))} /></label>
                    <textarea rows={1} value={passageForm.improvements} onChange={e => setPassageForm(f => ({ ...f, improvements: e.target.value }))} />
                  </div>
                  <button className="go-page__btn go-page__btn--primary" style={{ marginTop: 8 }} onClick={handleAddPassage}>Enregistrer le passage</button>
                </Card>
              )}

              {passages.map(p => (
                <Card key={p.id} className="go-page__passage-card">
                  <div className="go-page__passage-header">
                    <span>{p.passage_date}</span>
                    {p.duration_seconds && <span>{Math.floor(p.duration_seconds / 60)}min{(p.duration_seconds % 60).toString().padStart(2, '0')}</span>}
                    {p.suggested_score != null && <Badge variant="info">{p.suggested_score}/20</Badge>}
                  </div>
                  <div className="go-page__passage-scores">
                    {Object.entries(CRITERIA_LABELS).map(([key, label]) => {
                      const score = (p as any)['score_' + key];
                      return score != null ? (
                        <span key={key} className="go-page__score-chip">{label}: {score}/4</span>
                      ) : null;
                    })}
                  </div>
                  {p.general_comment && <p className="go-page__passage-comment">{p.general_comment}</p>}
                  {p.strengths && <p className="go-page__passage-strengths">+ {p.strengths}</p>}
                  {p.improvements && <p className="go-page__passage-improvements">- {p.improvements}</p>}
                </Card>
              ))}
            </div>

            {/* ── Questions de jury ── */}
            <div className="go-page__section">
              <div className="go-page__section-header">
                <h4>Questions de jury ({juryQuestions.length})</h4>
                <button className="go-page__btn go-page__btn--small" onClick={() => setShowJuryForm(v => !v)}>
                  {showJuryForm ? 'Annuler' : '+ Question'}
                </button>
              </div>

              {showJuryForm && (
                <Card className="go-page__jury-form">
                  <div className="go-page__form-field">
                    <label>Question <VoiceInput onResult={t => setJuryForm(f => ({ ...f, content: f.content ? f.content + ' ' + t : t }))} /></label>
                    <textarea rows={2} value={juryForm.content} onChange={e => setJuryForm(f => ({ ...f, content: e.target.value }))} placeholder="Question potentielle du jury…" />
                  </div>
                  <div className="go-page__form-field">
                    <label>Catégorie</label>
                    <select value={juryForm.category} onChange={e => setJuryForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="general">Général</option>
                      <option value="approfondissement">Approfondissement</option>
                      <option value="lien_programme">Lien programme</option>
                      <option value="projet_orientation">Projet d'orientation</option>
                      <option value="echange">Échange</option>
                    </select>
                  </div>
                  <button className="go-page__btn go-page__btn--primary" onClick={handleAddJuryQuestion}>Ajouter</button>
                </Card>
              )}

              {juryQuestions.map(jq => (
                <div key={jq.id} className="go-page__jury-item">
                  <div className="go-page__jury-content">
                    <span className="go-page__jury-category">{jq.category}</span>
                    <span>{jq.content}</span>
                  </div>
                  <button className="go-page__jury-delete" onClick={() => handleDeleteJuryQuestion(jq.id)} title="Supprimer">✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
