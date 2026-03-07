// ============================================================================
// SequenceForm — Créer / Modifier une séquence (Drawer)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import './forms.css';

interface SequenceFormData {
  title: string;
  subject_id: string;
  level_id: string;
  description: string;
  total_hours: string;
  start_date: string;
  end_date: string;
  status: string;
  class_ids: string[];
  topic_ids: string[];
}

const EMPTY: SequenceFormData = {
  title: '', subject_id: '', level_id: '', description: '',
  total_hours: '', start_date: '', end_date: '', status: 'draft',
  class_ids: [], topic_ids: [],
};

// Mock data — sera remplacé par les vrais services
const MOCK_SUBJECTS = [
  { id: '1', label: 'Histoire' }, { id: '2', label: 'Géographie' }, { id: '3', label: 'HGGSP' },
];
const MOCK_LEVELS = [{ id: '1', label: 'Première' }, { id: '2', label: 'Terminale' }];
const MOCK_CLASSES = [
  { id: '1', label: 'Tle 2' }, { id: '2', label: 'Tle 4' }, { id: '3', label: '1ère 3' },
];
const MOCK_TOPICS = [
  { id: '1', label: 'T1 — De nouveaux espaces de conquête' },
  { id: '2', label: 'T2 — Faire la guerre, faire la paix' },
  { id: '3', label: 'T3 — Histoire et mémoires' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SequenceFormData) => void;
  /** Si présent = édition, sinon = création */
  initialData?: Partial<SequenceFormData>;
}

export const SequenceForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<SequenceFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SequenceFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field: keyof SequenceFormData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleArray = (field: 'class_ids' | 'topic_ids', id: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(v => v !== id)
        : [...prev[field], id],
    }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = 'Titre requis';
    if (!form.subject_id) errs.subject_id = 'Matière requise';
    if (!form.level_id) errs.level_id = 'Niveau requis';
    if (form.class_ids.length === 0) errs.class_ids = 'Au moins une classe';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(form);
      onClose();
    }
  };

  const isEdit = !!initialData;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier la séquence' : 'Nouvelle séquence'}
      size="large"
      footer={
        <div className="form__footer">
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>
            {isEdit ? 'Enregistrer' : 'Créer la séquence'}
          </button>
        </div>
      }
    >
      <div className="form__grid">
        {/* Titre */}
        <div className="form__field form__field--full">
          <label className="form__label">Titre *</label>
          <input
            className={`form__input ${errors.title ? 'form__input--error' : ''}`}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Ex : Faire la guerre, faire la paix"
          />
          {errors.title && <span className="form__error">{errors.title}</span>}
        </div>

        {/* Matière + Niveau */}
        <div className="form__field">
          <label className="form__label">Matière *</label>
          <select className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`} value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Niveau *</label>
          <select className={`form__select ${errors.level_id ? 'form__select--error' : ''}`} value={form.level_id} onChange={e => set('level_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          {errors.level_id && <span className="form__error">{errors.level_id}</span>}
        </div>

        {/* Classes */}
        <div className="form__field form__field--full">
          <label className="form__label">Classes *</label>
          <div className="form__badge-select">
            {MOCK_CLASSES.map(c => (
              <button
                key={c.id}
                type="button"
                className={`form__badge-option ${form.class_ids.includes(c.id) ? 'form__badge-option--selected' : ''}`}
                onClick={() => toggleArray('class_ids', c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.class_ids && <span className="form__error">{errors.class_ids}</span>}
        </div>

        {/* Description */}
        <div className="form__field form__field--full">
          <label className="form__label">Description</label>
          <textarea className="form__textarea" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description de la séquence…" />
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        {/* Heures + Dates */}
        <div className="form__field">
          <label className="form__label">Volume horaire</label>
          <input className="form__input" type="number" min={1} max={100} value={form.total_hours} onChange={e => set('total_hours', e.target.value)} placeholder="Ex : 16" />
        </div>
        <div className="form__field">
          <label className="form__label">Statut</label>
          <select className="form__select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="draft">Brouillon</option>
            <option value="planned">Planifiée</option>
            <option value="in_progress">En cours</option>
            <option value="done">Terminée</option>
          </select>
        </div>
        <div className="form__field">
          <label className="form__label">Date de début</label>
          <input className="form__input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Date de fin</label>
          <input className="form__input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        {/* Thèmes du programme */}
        <div className="form__field form__field--full">
          <label className="form__label">Thèmes du programme liés</label>
          <div className="form__check-group">
            {MOCK_TOPICS.map(t => (
              <label key={t.id} className="form__check-item">
                <input
                  type="checkbox"
                  checked={form.topic_ids.includes(t.id)}
                  onChange={() => toggleArray('topic_ids', t.id)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
