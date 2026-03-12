// ============================================================================
// DevoirForm — Créer / Modifier un devoir (Drawer)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../ui/Drawer';
import './forms.css';

interface DevoirFormData {
  title: string;
  class_id: string;
  subject_id: string;
  sequence_id: string;
  assignment_type_id: string;
  max_score: string;
  coefficient: string;
  assignment_date: string;
  due_date: string;
  instructions: string;
  skill_ids: string[];
  subject_file: File | null;
  subject_extracted_text: string;
}

const EMPTY: DevoirFormData = {
  title: '', class_id: '', subject_id: '', sequence_id: '',
  assignment_type_id: '', max_score: '20', coefficient: '1',
  assignment_date: '', due_date: '', instructions: '', skill_ids: [],
  subject_file: null, subject_extracted_text: '',
};

const MOCK_TYPES = [
  { id: '1', label: 'Dissertation' }, { id: '2', label: 'Commentaire de document(s)' },
  { id: '3', label: 'Composition' }, { id: '4', label: 'Croquis / Schéma' },
  { id: '5', label: 'Étude de document' }, { id: '6', label: 'Oral / Exposé' },
  { id: '7', label: 'QCM' }, { id: '8', label: 'Travail maison' },
];

const MOCK_SKILLS = [
  { id: '1', label: 'Problématiser' }, { id: '2', label: 'Construire un plan' },
  { id: '3', label: 'Mobiliser connaissances' }, { id: '4', label: 'Rédaction' },
  { id: '5', label: 'Analyser un document' }, { id: '6', label: 'Réaliser un croquis' },
];

const MOCK_CLASSES = [
  { id: '1', label: 'Tle 2' }, { id: '2', label: 'Tle 4' }, { id: '3', label: '1ère 3' },
];

const MOCK_SUBJECTS = [
  { id: '1', label: 'Histoire' }, { id: '2', label: 'Géographie' }, { id: '3', label: 'HGGSP' },
];

const MOCK_SEQUENCES = [
  { id: '1', label: 'De nouveaux espaces de conquête' },
  { id: '2', label: 'Faire la guerre, faire la paix' },
  { id: '4', label: 'La Guerre froide (1947-1991)' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: DevoirFormData) => void;
  initialData?: Partial<DevoirFormData>;
}

export const DevoirForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = useState<DevoirFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DevoirFormData, string>>>({});
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
      setErrors({});
    }
  }, [open, initialData]);

  const handleSubjectFile = async (file: File) => {
    setExtracting(true);
    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: any) => item.str).join(' '));
        }
        text = pages.join('\n\n');
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      setForm(prev => ({ ...prev, subject_file: file, subject_extracted_text: text.trim() }));
    } catch {
      setForm(prev => ({ ...prev, subject_file: file, subject_extracted_text: '' }));
    } finally {
      setExtracting(false);
    }
  };

  const set = (field: keyof DevoirFormData, value: string | string[]) =>
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
    if (!form.class_id) errs.class_id = 'Classe requise';
    if (!form.subject_id) errs.subject_id = 'Matière requise';
    if (!form.assignment_type_id) errs.assignment_type_id = 'Type requis';
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
      title={isEdit ? 'Modifier le devoir' : 'Nouveau devoir'}
      size="large"
      footer={
        <div className="form__footer">
          <button className="form__btn form__btn--secondary" onClick={onClose}>Annuler</button>
          <button className="form__btn form__btn--primary" onClick={handleSave}>
            {isEdit ? 'Enregistrer' : 'Créer le devoir'}
          </button>
        </div>
      }
    >
      <div className="form__grid">
        <div className="form__field form__field--full">
          <label className="form__label">Titre *</label>
          <input className={`form__input ${errors.title ? 'form__input--error' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Dissertation — La Guerre froide" />
          {errors.title && <span className="form__error">{errors.title}</span>}
        </div>

        <div className="form__field">
          <label className="form__label">Classe *</label>
          <select className={`form__select ${errors.class_id ? 'form__select--error' : ''}`} value={form.class_id} onChange={e => set('class_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {errors.class_id && <span className="form__error">{errors.class_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Matière *</label>
          <select className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`} value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
        </div>

        <div className="form__field">
          <label className="form__label">Type d'exercice *</label>
          <select className={`form__select ${errors.assignment_type_id ? 'form__select--error' : ''}`} value={form.assignment_type_id} onChange={e => set('assignment_type_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {MOCK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          {errors.assignment_type_id && <span className="form__error">{errors.assignment_type_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Séquence liée</label>
          <select className="form__select" value={form.sequence_id} onChange={e => set('sequence_id', e.target.value)}>
            <option value="">— Aucune —</option>
            {MOCK_SEQUENCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field">
          <label className="form__label">Barème</label>
          <input className="form__input" type="number" min={1} max={100} value={form.max_score} onChange={e => set('max_score', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Coefficient</label>
          <input className="form__input" type="number" min={0.5} max={5} step={0.5} value={form.coefficient} onChange={e => set('coefficient', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Date du devoir</label>
          <input className="form__input" type="date" value={form.assignment_date} onChange={e => set('assignment_date', e.target.value)} />
        </div>
        <div className="form__field">
          <label className="form__label">Date de rendu</label>
          <input className="form__input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Consignes</label>
          <textarea className="form__textarea" rows={3} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Consignes et sujet…" />
        </div>

        <div className="form__field form__field--full">
          <label className="form__label">Sujet (PDF / DOCX)</label>
          <div className="prog-tree__file-drop" style={{ padding: 14 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="prog-tree__file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleSubjectFile(f);
              }}
            />
            <div className="prog-tree__file-label">
              {extracting ? (
                <span>Extraction en cours…</span>
              ) : form.subject_file ? (
                <span>
                  {form.subject_file.name}
                  {form.subject_extracted_text ? ` (${(form.subject_extracted_text.length / 1000).toFixed(1)}k car.)` : ''}
                  <button
                    type="button"
                    className="settings-sub__link settings-sub__link--danger"
                    style={{ marginLeft: 8, pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm(prev => ({ ...prev, subject_file: null, subject_extracted_text: '' }));
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Retirer
                  </button>
                </span>
              ) : (
                <span>Cliquez pour joindre le sujet (PDF, DOCX)</span>
              )}
            </div>
          </div>
        </div>

        <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

        <div className="form__field form__field--full">
          <label className="form__label">Compétences évaluées</label>
          <div className="form__badge-select">
            {MOCK_SKILLS.map(s => (
              <button
                key={s.id}
                type="button"
                className={`form__badge-option ${form.skill_ids.includes(s.id) ? 'form__badge-option--selected' : ''}`}
                onClick={() => toggleSkill(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
