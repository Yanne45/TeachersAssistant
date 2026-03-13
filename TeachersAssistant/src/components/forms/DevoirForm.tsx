// ============================================================================
// DevoirForm — Créer / Modifier un devoir (Drawer)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer } from '../ui/Drawer';
import { AITaskButtons } from '../ui/AITaskButtons';
import { useApp } from '../../stores';
import {
  assignmentTypeService,
  classService,
  subjectService,
  sequenceService,
  skillService,
} from '../../services';
import { useScreenAITasks, AI_SCREEN } from '../../hooks';
import type { ScreenAIContext } from '../../hooks';
import type { AssignmentType } from '../../services';
import type { ClassWithLevel } from '../../types/academic';
import type { Subject } from '../../types/academic';
import type { SequenceWithDetails } from '../../types/sequences';
import type { Skill } from '../../types/programme';
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

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: DevoirFormData) => void;
  initialData?: Partial<DevoirFormData>;
}

export const DevoirForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const { activeYear } = useApp();
  const [form, setForm] = useState<DevoirFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DevoirFormData, string>>>({});
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference data
  const [assignmentTypes, setAssignmentTypes] = useState<AssignmentType[]>([]);
  const [classes, setClasses] = useState<ClassWithLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sequences, setSequences] = useState<SequenceWithDetails[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  // ── Declarative AI tasks for devoir form ──
  const getDevoirAIContext = useCallback((): ScreenAIContext => {
    const cls = classes.find(c => String(c.id) === form.class_id);
    const sub = subjects.find(s => String(s.id) === form.subject_id);
    const seq = sequences.find(s => String(s.id) === form.sequence_id);
    const typ = assignmentTypes.find(t => String(t.id) === form.assignment_type_id);
    const selectedSkills = skills.filter(s => form.skill_ids.includes(String(s.id)));
    return {
      variables: {
        matiere: sub?.label ?? '',
        niveau: cls?.level_label ?? cls?.name ?? '',
        theme: seq?.title ?? '',
        titre_devoir: form.title,
        type_exercice: typ?.label ?? '',
        consignes: form.instructions,
        bareme: form.max_score,
        competences: selectedSkills.map(s => s.label).join(', '),
        sujet_texte: form.subject_extracted_text,
      },
      subjectId: form.subject_id ? Number(form.subject_id) : undefined,
    };
  }, [form, classes, subjects, sequences, assignmentTypes, skills]);

  const { actions: devoirAIActions, generatingCode } = useScreenAITasks(AI_SCREEN.DEVOIR_FORM, getDevoirAIContext);

  /** Handle AI result — page-specific post-processing */
  const handleDevoirAIResult = useCallback((taskCode: string, result: any) => {
    if ('queued' in result) return;
    const content = String(result?.output_content ?? result?.processed_result ?? '').trim();
    if (!content) return;

    if (taskCode === 'generate_exam_subject') {
      // Append generated subject to instructions
      setForm(prev => ({
        ...prev,
        instructions: (prev.instructions ? prev.instructions + '\n\n' : '') + content,
      }));
    } else if (taskCode === 'generate_exam_answer') {
      // Append correction to extracted text area
      setForm(prev => ({
        ...prev,
        subject_extracted_text: (prev.subject_extracted_text ? prev.subject_extracted_text + '\n\n--- CORRIGÉ ---\n\n' : '') + content,
      }));
    }
  }, []);

  // Load reference data when the drawer opens
  useEffect(() => {
    if (!open) return;
    setForm(initialData ? { ...EMPTY, ...initialData } : EMPTY);
    setErrors({});

    void (async () => {
      const [types, cls, subs] = await Promise.all([
        assignmentTypeService.getAll(),
        classService.getAll(),
        subjectService.getAll(),
      ]);
      setAssignmentTypes(types);
      setClasses(cls);
      setSubjects(subs);

      if (activeYear?.id) {
        const [seqs, sks] = await Promise.all([
          sequenceService.getByYear(activeYear.id),
          skillService.getAll(activeYear.id),
        ]);
        setSequences(seqs);
        setSkills(sks);
      }
    })();
  }, [open, initialData, activeYear]);

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

  const handleTypeChange = (typeId: string) => {
    set('assignment_type_id', typeId);
    // Auto-fill max_score with the type's default if score is still at default
    if (typeId) {
      const selectedType = assignmentTypes.find(t => String(t.id) === typeId);
      if (selectedType && (form.max_score === '20' || form.max_score === '' || form.max_score === EMPTY.max_score)) {
        set('max_score', String(selectedType.default_max_score));
      }
    }
  };

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

  // Filter skills by selected subject if applicable
  const filteredSkills = form.subject_id
    ? skills.filter(s => s.subject_id === null || String(s.subject_id) === form.subject_id)
    : skills;

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
            {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          {errors.class_id && <span className="form__error">{errors.class_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Matière *</label>
          <select className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`} value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
          </select>
          {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
        </div>

        <div className="form__field">
          <label className="form__label">Type d'exercice *</label>
          <select className={`form__select ${errors.assignment_type_id ? 'form__select--error' : ''}`} value={form.assignment_type_id} onChange={e => handleTypeChange(e.target.value)}>
            <option value="">— Choisir —</option>
            {assignmentTypes.map(t => <option key={t.id} value={String(t.id)}>{t.label}</option>)}
          </select>
          {errors.assignment_type_id && <span className="form__error">{errors.assignment_type_id}</span>}
        </div>
        <div className="form__field">
          <label className="form__label">Séquence liée</label>
          <select className="form__select" value={form.sequence_id} onChange={e => set('sequence_id', e.target.value)}>
            <option value="">— Aucune —</option>
            {sequences.map(s => <option key={s.id} value={String(s.id)}>{s.title}</option>)}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <AITaskButtons
              actions={devoirAIActions}
              size="S"
              disabled={generatingCode !== null || !form.assignment_type_id || !form.subject_id}
              onResult={handleDevoirAIResult}
              onError={(code, err) => console.error(`[DevoirForm] Erreur ${code}:`, err)}
            />
          </div>
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
            {filteredSkills.map(s => (
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
      </div>
    </Drawer>
  );
};
