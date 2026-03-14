// ============================================================================
// CahierEntreeForm — Nouvelle entrée cahier de textes (Drawer)
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Drawer } from '../ui/Drawer';
import { VoiceInput } from '../ui/VoiceInput';
import { classService, subjectService, db } from '../../services';
import { useScreenAITasks, AI_SCREEN } from '../../hooks';
import type { ClassWithLevel } from '../../types/academic';
import type { Subject } from '../../types/academic';
import './forms.css';

interface CahierFormData {
  class_id: string;
  subject_id: string;
  session_id: string;
  log_date: string;
  title: string;
  content: string;
  activities: string;
  homework: string;
  homework_due_date: string;
}

const EMPTY: CahierFormData = {
  class_id: '', subject_id: '', session_id: '', log_date: '',
  title: '', content: '', activities: '', homework: '', homework_due_date: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CahierFormData) => void;
  initialData?: Partial<CahierFormData>;
}

export const CahierEntreeForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<CahierFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CahierFormData, string>>>({});
  const [classes, setClasses] = useState<ClassWithLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<{ id: number; title: string; lesson_plan?: string }[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Ref stable pour le contexte IA (évite re-render en boucle) ──────────
  const formRef = React.useRef(form);
  formRef.current = form;
  const classesRef = React.useRef(classes);
  classesRef.current = classes;
  const subjectsRef = React.useRef(subjects);
  subjectsRef.current = subjects;
  const sessionsRef = React.useRef(sessions);
  sessionsRef.current = sessions;

  const getAIContext = useCallback(() => {
    const f = formRef.current;
    const cls = classesRef.current.find(c => String(c.id) === f.class_id);
    const sub = subjectsRef.current.find(s => String(s.id) === f.subject_id);
    const session = sessionsRef.current.find(s => String(s.id) === f.session_id);

    const notesParts: string[] = [];
    if (f.content.trim()) notesParts.push(f.content.trim());
    if (f.activities.trim()) notesParts.push('Activités : ' + f.activities.trim());
    if (f.homework.trim()) notesParts.push('Devoirs : ' + f.homework.trim());

    return {
      variables: {
        matiere: sub?.label ?? '',
        classe: cls?.name ?? '',
        seance_date: f.log_date || '',
        seance_titre: f.title.trim(),
        session_outline: session?.lesson_plan || notesParts.join('\n') || '',
        document_list: '',
        // Extra: notes brutes si séance liée ET notes saisies
        ...(session?.lesson_plan && notesParts.length > 0
          ? { notes_enseignant: notesParts.join('\n') }
          : {}),
      },
      subjectId: sub ? sub.id : undefined,
      sessionId: session ? session.id : undefined,
    };
  }, []);

  const { actions, generatingCode } = useScreenAITasks(AI_SCREEN.CAHIER_ENTREE, getAIContext);

  const generating = generatingCode !== null;

  useEffect(() => {
    if (!open) return;
    setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
    setErrors({});
    setAiError(null);
    Promise.all([
      classService.getAll(),
      subjectService.getAll(),
      db.select<{ id: number; title: string; lesson_plan?: string }[]>(
        'SELECT id, title, lesson_plan FROM sessions ORDER BY sort_order DESC LIMIT 50'
      ),
    ]).then(([cls, subs, sess]) => {
      setClasses(cls);
      setSubjects(subs);
      setSessions(sess);
    }).catch(() => {});
  }, [open, initialData]);

  const set = (field: keyof CahierFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const appendVoice = (field: keyof CahierFormData) => (text: string) =>
    setForm(prev => ({ ...prev, [field]: prev[field] ? prev[field] + ' ' + text : text }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Titre requis';
    if (!form.class_id) errs.class_id = 'Classe requise';
    if (!form.log_date) errs.log_date = 'Date requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canGenerate = !!form.title.trim() && !!form.class_id && !!form.subject_id;

  // Trouver l'action generate_lesson_log parmi les tâches déclarées
  const lessonLogAction = useMemo(
    () => actions.find(a => a.task.code === 'generate_lesson_log'),
    [actions],
  );

  const handleGenerate = useCallback(async () => {
    if (!lessonLogAction || !canGenerate || generating) return;
    setAiError(null);
    try {
      const result = await lessonLogAction.execute();

      if (result && !result.queued) {
        const output: string = result.output_content || result.processed_result || '';
        if (!output.trim()) {
          setAiError('Réponse IA vide');
          return;
        }
        // Parse structured sections from AI output
        const lines = output.trim();
        const contentMatch = lines.match(/(?:contenu|cours)\s*(?:du cours)?\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:activit|devoir)|$)/i);
        const activitiesMatch = lines.match(/activit[ée]s?\s*(?:r[ée]alis[ée]es?)?\s*[:：]\s*([\s\S]*?)(?=\n\s*devoir|$)/i);
        const homeworkMatch = lines.match(/devoir[s]?\s*(?:[ée]ventuels?)?\s*[:：]\s*([\s\S]*?)$/i);

        if (contentMatch || activitiesMatch || homeworkMatch) {
          setForm(prev => ({
            ...prev,
            content: contentMatch?.[1]?.trim() || prev.content,
            activities: activitiesMatch?.[1]?.trim() || prev.activities,
            homework: homeworkMatch?.[1]?.trim() || prev.homework,
          }));
        } else {
          // Fallback: put everything in content
          setForm(prev => ({ ...prev, content: lines }));
        }
      } else if (result?.queued) {
        setAiError('Hors ligne — génération mise en file d\'attente');
      }
    } catch (err: any) {
      console.error('[CahierEntreeForm] AI generation failed:', err);
      setAiError(err.message || 'Erreur lors de la génération IA');
    }
  }, [lessonLogAction, canGenerate, generating]);

  const handleSave = () => {
    if (validate()) { onSave(form); onClose(); }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nouvelle entrée — Cahier de textes"
      size="large"
      footer={
        <div className="form__footer">
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>Enregistrer</button>
        </div>
      }
    >
      <div className="form__grid">
        <div className="form__field">
          <label className="form__label">Classe *</label>
          <select className={`form__select ${errors.class_id ? 'form__select--error' : ''}`} value={form.class_id} onChange={e => set('class_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          {errors.class_id && <span className="form__error">{errors.class_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Matière</label>
          <select className="form__select" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
          </select>
        </div>

        <div className="form__field">
          <label className="form__label">Date *</label>
          <input className={`form__input ${errors.log_date ? 'form__input--error' : ''}`} type="date" value={form.log_date} onChange={e => set('log_date', e.target.value)} />
          {errors.log_date && <span className="form__error">{errors.log_date}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Séance liée</label>
          <select className="form__select" value={form.session_id} onChange={e => set('session_id', e.target.value)}>
            <option value="">— Aucune —</option>
            {sessions.map(s => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
          </select>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Titre / contenu du cours * <VoiceInput onResult={appendVoice('title')} /></label>
          <input className={`form__input ${errors.title ? 'form__input--error' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Introduction — Le monde bipolaire" />
          {errors.title && <span className="form__error">{errors.title}</span>}
        </div>

        {lessonLogAction && (
          <div className="form__field form__field--full" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="form__btn form__btn--ai"
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
              title={!canGenerate ? 'Renseignez titre, classe et matière pour générer' : 'Générer le résumé via IA'}
            >
              {generating ? '⏳ Génération…' : `${lessonLogAction.task.icon || '✨'} Générer le résumé IA`}
            </button>
            {aiError && <span className="form__error">{aiError}</span>}
          </div>
        )}

        <div className="form__field form__field--full">
          <label className="form__label">Contenu détaillé <VoiceInput onResult={appendVoice('content')} /></label>
          <textarea className="form__textarea" rows={3} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Résumé du cours réalisé…" />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Activités <VoiceInput onResult={appendVoice('activities')} /></label>
          <textarea className="form__textarea" rows={2} value={form.activities} onChange={e => set('activities', e.target.value)} placeholder="Activités réalisées en classe…" />
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Devoirs à faire <VoiceInput onResult={appendVoice('homework')} /></label>
          <textarea className="form__textarea" rows={2} value={form.homework} onChange={e => set('homework', e.target.value)} placeholder="Travail à réaliser pour la prochaine séance…" />
        </div>
        <div className="form__field">
          <label className="form__label">Pour le</label>
          <input className="form__input" type="date" value={form.homework_due_date} onChange={e => set('homework_due_date', e.target.value)} />
        </div>
      </div>
    </Drawer>
  );
};
