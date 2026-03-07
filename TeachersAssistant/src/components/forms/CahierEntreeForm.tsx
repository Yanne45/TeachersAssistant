// ============================================================================
// CahierEntreeForm — Nouvelle entrée cahier de textes (Drawer)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
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

const MOCK_CLASSES = [
  { id: '1', label: 'Tle 2' }, { id: '2', label: 'Tle 4' }, { id: '3', label: '1ère 3' },
];

const MOCK_SUBJECTS = [
  { id: '1', label: 'Histoire' }, { id: '2', label: 'Géographie' }, { id: '3', label: 'HGGSP' },
];

const MOCK_SESSIONS = [
  { id: '1', label: 'Séance 1 — Introduction' },
  { id: '2', label: 'Séance 2 — Berlin' },
  { id: '3', label: 'Séance 3 — Crises et détente' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CahierFormData) => void;
  initialData?: Partial<CahierFormData>;
}

export const CahierEntreeForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<CahierFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CahierFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field: keyof CahierFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Titre requis';
    if (!form.class_id) errs.class_id = 'Classe requise';
    if (!form.log_date) errs.log_date = 'Date requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
            {MOCK_CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {errors.class_id && <span className="form__error">{errors.class_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Matière</label>
          <select className="form__select" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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
            {MOCK_SESSIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Titre / contenu du cours *</label>
          <input className={`form__input ${errors.title ? 'form__input--error' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Introduction — Le monde bipolaire" />
          {errors.title && <span className="form__error">{errors.title}</span>}
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Contenu détaillé</label>
          <textarea className="form__textarea" rows={3} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Résumé du cours réalisé…" />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Activités</label>
          <textarea className="form__textarea" rows={2} value={form.activities} onChange={e => set('activities', e.target.value)} placeholder="Activités réalisées en classe…" />
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">📌 Devoirs à faire</label>
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
