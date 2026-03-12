// ============================================================================
// CreneauForm — Créer / Modifier un créneau EDT (Modal)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { subjectService, classService, preferenceService } from '../../services';
import type { Subject, Class, RecurrenceMode } from '../../types';
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

const ALL_DAYS: { value: number; label: string }[] = [
  { value: 7, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const RECURRENCE_OPTIONS: Record<RecurrenceMode, { value: string; label: string }[]> = {
  quarters: [
    { value: 'all', label: "Toute l'année" },
    { value: 'q1', label: 'Q1 seulement' },
    { value: 'q2', label: 'Q2 seulement' },
  ],
  trimesters: [
    { value: 'all', label: "Toute l'année" },
    { value: 't1', label: 'T1 seulement' },
    { value: 't2', label: 'T2 seulement' },
    { value: 't3', label: 'T3 seulement' },
  ],
  semesters: [
    { value: 'all', label: "Toute l'année" },
    { value: 's1', label: 'S1 seulement' },
    { value: 's2', label: 'S2 seulement' },
  ],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreneauFormData) => void;
  initialData?: Partial<CreneauFormData>;
}

export const CreneauForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<CreneauFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CreneauFormData, string>>>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('quarters');

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
      // Load real data
      void subjectService.getAll().then(setSubjects);
      void classService.getAll().then(setClasses);
      void preferenceService.getAll().then((prefs) => {
        setWorkingDays(prefs.timetable_working_days);
        setRecurrenceMode(prefs.timetable_recurrence_mode);
        if (!initialData?.day_of_week) {
          setForm((prev) => ({
            ...prev,
            day_of_week: String(prefs.timetable_working_days[0] ?? 1),
            start_time: prefs.timetable_day_start,
            end_time: prefs.timetable_day_end > prefs.timetable_day_start
              ? (() => {
                  // Default end = start + 1h
                  const parts = prefs.timetable_day_start.split(':').map(Number);
                  const h = parts[0] ?? 8;
                  const m = parts[1] ?? 0;
                  const endH = Math.min(h + 1, 23);
                  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                })()
              : prev.end_time,
          }));
        }
      });
    }
  }, [open, initialData]);

  const days = ALL_DAYS.filter((d) => workingDays.includes(d.value));
  const recurrenceOptions = RECURRENCE_OPTIONS[recurrenceMode] ?? RECURRENCE_OPTIONS.quarters;

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
            {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="form__field">
          <label className="form__label">Récurrence</label>
          <select className="form__select" value={form.recurrence} onChange={e => set('recurrence', e.target.value)}>
            {recurrenceOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="form__field">
          <label className="form__label">Heure début *</label>
          <input
            type="time"
            className={`form__input ${errors.start_time ? 'form__input--error' : ''}`}
            value={form.start_time}
            onChange={e => set('start_time', e.target.value)}
          />
        </div>
        <div className="form__field">
          <label className="form__label">Heure fin *</label>
          <input
            type="time"
            className={`form__input ${errors.end_time ? 'form__input--error' : ''}`}
            value={form.end_time}
            onChange={e => set('end_time', e.target.value)}
          />
          {errors.end_time && <span className="form__error">{errors.end_time}</span>}
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field">
          <label className="form__label">Matière *</label>
          <select className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`} value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.short_label || s.label}</option>)}
          </select>
          {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Classe *</label>
          <select className={`form__select ${errors.class_id ? 'form__select--error' : ''}`} value={form.class_id} onChange={e => set('class_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.short_name || c.name}</option>)}
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
