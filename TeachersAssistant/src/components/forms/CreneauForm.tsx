// ============================================================================
// CreneauForm — Créer / Modifier un créneau EDT (Modal)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import './forms.css';

interface CreneauFormData {
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_id: string;
  class_id: string;
  room: string;
  recurrence: string;
}

const EMPTY: CreneauFormData = {
  day_of_week: '1', start_time: '08:00', end_time: '10:00',
  subject_id: '', class_id: '', room: '', recurrence: 'all',
};

const DAYS = [
  { value: '1', label: 'Lundi' }, { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' }, { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
];

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const MOCK_SUBJECTS = [
  { id: '1', label: 'Histoire' }, { id: '2', label: 'Géographie' }, { id: '3', label: 'HGGSP' },
];

const MOCK_CLASSES = [
  { id: '1', label: 'Tle 2' }, { id: '2', label: 'Tle 4' }, { id: '3', label: '1ère 3' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreneauFormData) => void;
  initialData?: Partial<CreneauFormData>;
}

export const CreneauForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<CreneauFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CreneauFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field: keyof CreneauFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.subject_id) errs.subject_id = 'Matière requise';
    if (!form.class_id) errs.class_id = 'Classe requise';
    if (form.start_time >= form.end_time) errs.end_time = 'Fin après début';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (validate()) { onSave(form); onClose(); }
  };

  const isEdit = !!initialData;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier le créneau' : 'Nouveau créneau'}
      footer={
        <div className="form__footer">
          {isEdit && (
            <button className="form__btn form__btn--danger" style={{ marginRight: 'auto' }}>
              Supprimer
            </button>
          )}
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      }
    >
      <div className="form__grid">
        <div className="form__field">
          <label className="form__label">Jour *</label>
          <select className="form__select" value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
            {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label">Récurrence</label>
          <select className="form__select" value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
            <option value="all">Toute l'année</option>
            <option value="q1">Q1 seulement</option>
            <option value="q2">Q2 seulement</option>
          </select>
        </div>

        <div className="form__field">
          <label className="form__label">Heure début *</label>
          <select className="form__select" value={form.start_time} onChange={e => set('start_time', e.target.value)}>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label">Heure fin *</label>
          <select className={`form__select ${errors.end_time ? 'form__select--error' : ''}`} value={form.end_time} onChange={e => set('end_time', e.target.value)}>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          {errors.end_time && <span className="form__error">{errors.end_time}</span>}
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field">
          <label className="form__label">Matière *</label>
          <select className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`} value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Classe *</label>
          <select className={`form__select ${errors.class_id ? 'form__select--error' : ''}`} value={form.class_id} onChange={e => set('class_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {errors.class_id && <span className="form__error">{errors.class_id}</span>}
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Salle</label>
          <input className="form__input" value={form.room} onChange={e => set('room', e.target.value)} placeholder="Ex : A102" />
        </div>
      </div>
    </Modal>
  );
};
