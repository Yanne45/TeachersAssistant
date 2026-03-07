// ============================================================================
// EleveForm — Créer / Modifier un élève (Drawer)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import './forms.css';

interface EleveFormData {
  last_name: string;
  first_name: string;
  birth_year: string;
  gender: string;
  class_ids: string[];
}

const EMPTY: EleveFormData = {
  last_name: '', first_name: '', birth_year: '', gender: '', class_ids: [],
};

const MOCK_CLASSES = [
  { id: '1', label: 'Tle 2' }, { id: '2', label: 'Tle 4' }, { id: '3', label: '1ère 3' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: EleveFormData) => void;
  initialData?: Partial<EleveFormData>;
}

export const EleveForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<EleveFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof EleveFormData, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const set = (field: keyof EleveFormData, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleClass = (id: string) => {
    setForm(prev => ({
      ...prev,
      class_ids: prev.class_ids.includes(id)
        ? prev.class_ids.filter(v => v !== id)
        : [...prev.class_ids, id],
    }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.last_name.trim()) errs.last_name = 'Nom requis';
    if (!form.first_name.trim()) errs.first_name = 'Prénom requis';
    if (form.class_ids.length === 0) errs.class_ids = 'Au moins une classe';
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
      title={isEdit ? 'Modifier l\'élève' : 'Nouvel élève'}
      footer={
        <div className="form__footer">
          {isEdit && (
            <button className="form__btn form__btn--danger" style={{ marginRight: 'auto' }}>
              Supprimer
            </button>
          )}
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>
            {isEdit ? 'Enregistrer' : 'Ajouter l\'élève'}
          </button>
        </div>
      }
    >
      <div className="form__grid">
        <div className="form__field">
          <label className="form__label">Nom *</label>
          <input className={`form__input ${errors.last_name ? 'form__input--error' : ''}`} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="DUPONT" />
          {errors.last_name && <span className="form__error">{errors.last_name}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Prénom *</label>
          <input className={`form__input ${errors.first_name ? 'form__input--error' : ''}`} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Léa" />
          {errors.first_name && <span className="form__error">{errors.first_name}</span>}
        </div>

        <div className="form__field">
          <label className="form__label">Année de naissance</label>
          <input className="form__input" type="number" min={2000} max={2015} value={form.birth_year} onChange={e => set('birth_year', e.target.value)} placeholder="2008" />
        </div>
        <div className="form__field">
          <label className="form__label">Genre</label>
          <select className="form__select" value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="">— Non renseigné —</option>
            <option value="F">Féminin</option>
            <option value="M">Masculin</option>
          </select>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Inscription aux classes *</label>
          <div className="form__badge-select">
            {MOCK_CLASSES.map(c => (
              <button
                key={c.id}
                type="button"
                className={`form__badge-option ${form.class_ids.includes(c.id) ? 'form__badge-option--selected' : ''}`}
                onClick={() => toggleClass(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.class_ids && <span className="form__error">{errors.class_ids}</span>}
        </div>
      </div>
    </Drawer>
  );
};
