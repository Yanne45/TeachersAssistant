// ============================================================================
// CalendrierPeriodeForm — Ajouter/Modifier période calendrier (Modal)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import './forms.css';

interface PeriodeFormData {
  label: string;
  period_type: string;
  start_date: string;
  end_date: string;
  impacts_teaching: boolean;
}

const EMPTY: PeriodeFormData = {
  label: '', period_type: 'vacation', start_date: '', end_date: '',
  impacts_teaching: true,
};

const PERIOD_TYPES = [
  { value: 'vacation', label: '🏖 Vacances' },
  { value: 'holiday', label: '🔴 Jour férié' },
  { value: 'exam', label: '📝 Examen / Bac blanc' },
  { value: 'closure', label: '🚫 Fermeture exceptionnelle' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: PeriodeFormData) => void;
  initialData?: Partial<PeriodeFormData>;
}

export const CalendrierPeriodeForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<PeriodeFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof PeriodeFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field: keyof PeriodeFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.label.trim()) errs.label = 'Nom requis';
    if (!form.start_date) errs.start_date = 'Date début requise';
    if (!form.end_date) errs.end_date = 'Date fin requise';
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      errs.end_date = 'La fin doit être après le début';
    }
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
      title={isEdit ? 'Modifier la période' : 'Ajouter une période'}
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
        <div className="form__field form__field--full">
          <label className="form__label">Nom *</label>
          <input className={`form__input ${errors.label ? 'form__input--error' : ''}`} value={form.label} onChange={e => set('label', e.target.value)} placeholder="Ex : Vacances de la Toussaint" />
          {errors.label && <span className="form__error">{errors.label}</span>}
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Type</label>
          <div className="form__badge-select">
            {PERIOD_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`form__badge-option ${form.period_type === t.value ? 'form__badge-option--selected' : ''}`}
                onClick={() => set('period_type', t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form__field">
          <label className="form__label">Date de début *</label>
          <input className={`form__input ${errors.start_date ? 'form__input--error' : ''}`} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          {errors.start_date && <span className="form__error">{errors.start_date}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Date de fin *</label>
          <input className={`form__input ${errors.end_date ? 'form__input--error' : ''}`} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          {errors.end_date && <span className="form__error">{errors.end_date}</span>}
        </div>

        <div className="form__field form__field--full">
          <label className="form__check-item">
            <input type="checkbox" checked={form.impacts_teaching} onChange={e => set('impacts_teaching', e.target.checked)} />
            Impacte l'enseignement (compte dans les semaines non travaillées)
          </label>
        </div>
      </div>
    </Modal>
  );
};
