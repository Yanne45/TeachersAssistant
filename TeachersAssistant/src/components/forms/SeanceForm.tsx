// ============================================================================
// SeanceForm — Créer / Modifier une séance (Drawer)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { skillService } from '../../services';
import type { Skill } from '../../types';
import './forms.css';

export interface SeanceFormData {
  title: string;
  session_number: string;
  duration_minutes: string;
  session_date: string;
  status: string;
  objectives: string;
  activities: string;
  lesson_plan: string;
  skill_ids: string[];
}

const EMPTY: SeanceFormData = {
  title: '', session_number: '', duration_minutes: '120',
  session_date: '', status: 'planned', objectives: '',
  activities: '', lesson_plan: '', skill_ids: [],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SeanceFormData) => void;
  sequenceTitle?: string;
  initialData?: Partial<SeanceFormData>;
  /** ID année active pour charger les capacités */
  yearId?: number;
  /** Filtre matière optionnel (pour ne montrer que les capacités de la matière de la séquence) */
  subjectId?: number;
}

export const SeanceForm: React.FC<Props> = ({ open, onClose, onSave, sequenceTitle, initialData, yearId, subjectId }) => {
  const [form, setForm] = useState<SeanceFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SeanceFormData, string>>>({});
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  // Load skills
  useEffect(() => {
    if (!open || !yearId) { setSkills([]); return; }
    (async () => {
      const allSkills = await skillService.getAll(yearId);
      setSkills(subjectId
        ? allSkills.filter(s => !s.subject_id || s.subject_id === subjectId)
        : allSkills
      );
    })().catch(() => setSkills([]));
  }, [open, yearId, subjectId]);

  const set = (field: keyof SeanceFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleSkill = (id: string) => {
    setForm(prev => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(id)
        ? prev.skill_ids.filter(v => v !== id)
        : [...prev.skill_ids, id],
    }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Titre requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) { onSave(form); onClose(); }
  };

  const isEdit = !!initialData;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la séance' : 'Nouvelle séance'}
      size="large"
      footer={
        <div className="form__footer">
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>
            {isEdit ? 'Enregistrer' : 'Ajouter la séance'}
          </button>
        </div>
      }
    >
      {sequenceTitle && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
          Séquence : <strong>{sequenceTitle}</strong>
        </div>
      )}

      <div className="form__grid">
        <div className="form__field form__field--full">
          <label className="form__label">Titre *</label>
          <input className={`form__input ${errors.title ? 'form__input--error' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Introduction — Le monde bipolaire" />
          {errors.title && <span className="form__error">{errors.title}</span>}
        </div>

        <div className="form__field">
          <label className="form__label">N° séance</label>
          <input className="form__input" type="number" min={1} value={form.session_number} onChange={e => set('session_number', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Durée (minutes)</label>
          <select className="form__select" value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)}>
            <option value="55">55 min (1h)</option>
            <option value="110">110 min (2h)</option>
            <option value="120">120 min (2h)</option>
            <option value="180">180 min (3h)</option>
          </select>
        </div>

        <div className="form__field">
          <label className="form__label">Date</label>
          <input className="form__input" type="date" value={form.session_date} onChange={e => set('session_date', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Statut</label>
          <select className="form__select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="planned">Prévue</option>
            <option value="ready">Prête</option>
            <option value="done">Réalisée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Objectifs</label>
          <textarea className="form__textarea" rows={2} value={form.objectives} onChange={e => set('objectives', e.target.value)} placeholder="Objectifs pédagogiques de la séance…" />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Activités</label>
          <textarea className="form__textarea" rows={2} value={form.activities} onChange={e => set('activities', e.target.value)} placeholder="Activités prévues…" />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Déroulé <span className="form__label-hint">(étapes numérotées)</span></label>
          <textarea className="form__textarea" rows={5} value={form.lesson_plan} onChange={e => set('lesson_plan', e.target.value)} placeholder="1. Accroche (10 min)&#10;2. Cours dialogué (30 min)&#10;3. Travail en groupe (40 min)&#10;4. Trace écrite (10 min)" />
        </div>

        {skills.length > 0 && (
          <>
            <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />
            <div className="form__field form__field--full">
              <label className="form__label">Capacités travaillées</label>
              <div className="form__badge-select">
                {skills.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`form__badge-option ${form.skill_ids.includes(String(s.id)) ? 'form__badge-option--selected' : ''}`}
                    onClick={() => toggleSkill(String(s.id))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
};
