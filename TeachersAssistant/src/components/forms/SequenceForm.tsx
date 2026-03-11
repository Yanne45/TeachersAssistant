// ============================================================================
// SequenceForm — Créer / Modifier une séquence (Drawer)
// Nouveau flux : matière + niveau → chapitre ou 'autre' → titre auto → classes → docs
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '../ui/Drawer';
import { subjectService, levelService, classService, programTopicService, timetableService, calendarPeriodService } from '../../services';
import { documentService } from '../../services/documentService';
import { useApp } from '../../stores';
import type { Subject, Level, ProgramTopic } from '../../types';
import './forms.css';
import './SequenceForm.css';

// ── Types ──

interface ClassOption {
  id: number;
  name: string;
  level_id: number;
  level_short: string;
}

interface DocItem {
  id: number;
  title: string;
  file_type: string;
  subject_color?: string | null;
}

export interface SequenceFormResult {
  title: string;
  subject_id: number;
  level_id: number;
  description: string;
  total_hours: number;
  start_date: string;
  end_date: string;
  status: string;
  class_ids: number[];
  topic_id: number | null;
  document_ids: number[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SequenceFormResult) => void;
  /** Pré-rempli en mode édition */
  initialData?: Partial<SequenceFormResult> & { id?: number };
}

// ── Calcul de date de fin ──

/** Convertit getDay() JS (0=dim) en DayOfWeek ISO (1=lun, 7=dim) */
function jsToIsoDow(day: number): number { return day === 0 ? 7 : day; }

async function calcEndDate(
  startDate: string,
  totalHours: number,
  yearId: number,
  subjectId: number,
  classIds: number[],
): Promise<string | null> {
  if (!startDate || totalHours <= 0 || classIds.length === 0) return null;

  const [allSlots, periods] = await Promise.all([
    timetableService.getByYear(yearId),
    calendarPeriodService.getByYear(yearId),
  ]);

  const relevantSlots = allSlots.filter(
    s => s.subject_id === subjectId && classIds.some(id => id === s.class_id)
  );
  if (relevantSlots.length === 0) return null;

  const vacations = periods.filter(p =>
    p.period_type === 'vacation' || p.period_type === 'holiday' || p.period_type === 'closure'
  );

  const isVacationDay = (dateStr: string) =>
    vacations.some(v => v.start_date <= dateStr && dateStr <= v.end_date);

  let current = new Date(startDate + 'T12:00:00');
  let accumulated = 0;
  const target = totalHours * 60;

  for (let i = 0; i < 400; i++) {
    const dow = jsToIsoDow(current.getDay());
    if (dow <= 5) { // Lun–Ven
      const [dateStr = ''] = current.toISOString().split('T');
      if (!isVacationDay(dateStr)) {
        const daySlots = relevantSlots.filter(s => s.day_of_week === dow);
        for (const slot of daySlots) accumulated += slot.duration_minutes;
        if (accumulated >= target) return dateStr;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

// ── Helpers ──

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', default: '📎',
};
function fileIcon(ext: string) { return FILE_ICONS[ext?.toLowerCase()] ?? FILE_ICONS.default; }

// ── Composant ──

export const SequenceForm: React.FC<Props> = ({ open, onClose, onSave, initialData }) => {
  const { activeYear } = useApp();
  const yearId = activeYear?.id ?? null;

  // ── Listes de référence ──
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [topics, setTopics] = useState<ProgramTopic[]>([]);

  // ── Champs du formulaire ──
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [levelId, setLevelId] = useState<number | ''>('');
  const [topicMode, setTopicMode] = useState<'chapter' | 'other'>('other');
  const [topicId, setTopicId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false); // true si l'utilisateur a modifié le titre manuellement
  const [showDesc, setShowDesc] = useState(false);
  const [description, setDescription] = useState('');
  const [classIds, setClassIds] = useState<number[]>([]);
  const [totalHours, setTotalHours] = useState('');
  const [hoursEdited, setHoursEdited] = useState(false); // true si l'utilisateur a changé les heures manuellement
  const [status, setStatus] = useState('draft');
  const [startDate, setStartDate] = useState('');
  const [endDateCalc, setEndDateCalc] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [docIds, setDocIds] = useState<number[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<DocItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const isEdit = !!(initialData?.id);

  // ── Chargement sujets + niveaux au premier open ──
  useEffect(() => {
    if (!open) return;
    Promise.all([
      subjectService.getAll(),
      levelService.getAll(),
    ]).then(([subs, lvls]) => {
      setSubjects(subs);
      setLevels(lvls);
    }).catch(console.error);
  }, [open]);

  // ── Initialisation des champs quand open ──
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setSubjectId(initialData.subject_id ?? '');
      setLevelId(initialData.level_id ?? '');
      setTopicId(initialData.topic_id ?? '');
      setTopicMode(initialData.topic_id ? 'chapter' : 'other');
      setTitle(initialData.title ?? '');
      setTitleEdited(true); // En édition, on considère le titre comme déjà édité
      setShowDesc(!!initialData.description);
      setDescription(initialData.description ?? '');
      setClassIds(initialData.class_ids ?? []);
      setTotalHours(initialData.total_hours?.toString() ?? '');
      setHoursEdited(true);
      setStatus(initialData.status ?? 'draft');
      setStartDate(initialData.start_date ?? '');
      setEndDateCalc(initialData.end_date ?? null);
      setDocIds(initialData.document_ids ?? []);
    } else {
      setSubjectId('');
      setLevelId('');
      setTopicMode('other');
      setTopicId('');
      setTitle('');
      setTitleEdited(false);
      setShowDesc(false);
      setDescription('');
      setClassIds([]);
      setTotalHours('');
      setHoursEdited(false);
      setStatus('draft');
      setStartDate('');
      setEndDateCalc(null);
      setDocIds([]);
      setLinkedDocs([]);
    }
    setErrors({});
    setGalleryOpen(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Charger classes filtrées par niveau ──
  useEffect(() => {
    if (!open || !yearId || levelId === '') { setAllClasses([]); return; }
    classService.getByYear(yearId)
      .then(cls => setAllClasses(cls.filter((c: any) => c.level_id === levelId) as ClassOption[]))
      .catch(() => setAllClasses([]));
  }, [open, yearId, levelId]);

  // ── Charger chapitres du programme filtrés par matière + niveau ──
  useEffect(() => {
    if (!open || !yearId || subjectId === '' || levelId === '') { setTopics([]); return; }
    programTopicService.getBySubjectLevel(yearId, subjectId as number, levelId as number)
      .then(t => setTopics(t))
      .catch(() => setTopics([]));
  }, [open, yearId, subjectId, levelId]);

  // ── Quand le niveau change, retirer les classes sélectionnées qui ne correspondent plus ──
  useEffect(() => {
    if (levelId !== '') {
      setClassIds(prev => prev.filter(id => allClasses.some(c => c.id === id)));
    }
  }, [levelId, allClasses]);

  // ── Auto-fill du titre depuis le chapitre sélectionné ──
  useEffect(() => {
    if (topicMode === 'chapter' && topicId !== '' && !titleEdited) {
      const topic = topics.find(t => t.id === topicId);
      if (topic) setTitle(topic.title);
    }
    if (topicMode === 'other' && !titleEdited) {
      setTitle('');
    }
  }, [topicMode, topicId, topics]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fill volume horaire depuis expected_hours du chapitre ──
  useEffect(() => {
    if (topicMode === 'chapter' && topicId !== '' && !hoursEdited) {
      const topic = topics.find(t => t.id === topicId);
      if (topic?.expected_hours) setTotalHours(String(topic.expected_hours));
    }
  }, [topicId, topics, topicMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calcul automatique de la date de fin ──
  useEffect(() => {
    const h = parseFloat(totalHours);
    if (!startDate || !h || h <= 0 || !yearId || subjectId === '' || classIds.length === 0) {
      setEndDateCalc(null);
      return;
    }
    let cancelled = false;
    setCalcLoading(true);
    calcEndDate(startDate, h, yearId, subjectId as number, classIds)
      .then(d => { if (!cancelled) { setEndDateCalc(d); setCalcLoading(false); } })
      .catch(() => { if (!cancelled) { setEndDateCalc(null); setCalcLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, totalHours, yearId, subjectId, JSON.stringify(classIds)]);

  // ── Charger les docs liés quand docIds change ──
  useEffect(() => {
    if (docIds.length === 0) { setLinkedDocs([]); return; }
    documentService.getRecent(200).then(all => {
      setLinkedDocs(docIds.map(id => all.find((d: any) => d.id === id)).filter(Boolean) as DocItem[]);
    }).catch(() => {});
  }, [docIds]);

  // ── Classes : add / remove ──
  const toggleClass = (id: number) => {
    setClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const removeClass = (id: number) => setClassIds(prev => prev.filter(x => x !== id));

  // ── Documents : add / remove / reorder ──
  const addDoc = (doc: DocItem) => {
    if (!docIds.includes(doc.id)) {
      setDocIds(prev => [...prev, doc.id]);
    }
  };
  const removeDoc = (id: number) => setDocIds(prev => prev.filter(x => x !== id));

  // Drag-and-drop simple pour réordonner les docs dans la liste
  const dragIndex = useRef<number | null>(null);
  const handleDocDragStart = (i: number) => { dragIndex.current = i; };
  const handleDocDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === i) return;
    setDocIds(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex.current!, 1);
      if (moved === undefined) return prev;
      arr.splice(i, 0, moved);
      dragIndex.current = i;
      return arr;
    });
  };

  // ── Validation ──
  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Titre requis';
    if (subjectId === '') errs.subject_id = 'Matière requise';
    if (levelId === '') errs.level_id = 'Niveau requis';
    if (classIds.length === 0) errs.class_ids = 'Au moins une classe requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      title: title.trim(),
      subject_id: subjectId as number,
      level_id: levelId as number,
      description,
      total_hours: parseFloat(totalHours) || 0,
      start_date: startDate,
      end_date: endDateCalc ?? '',
      status,
      class_ids: classIds,
      topic_id: topicMode === 'chapter' && topicId !== '' ? topicId as number : null,
      document_ids: docIds,
    });
    onClose();
  };

  // ── Classes disponibles (non encore sélectionnées) ──
  const availableClasses = allClasses.filter(c => !classIds.includes(c.id));
  const selectedClassObjs = allClasses.filter(c => classIds.includes(c.id));

  return (
    <>
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

          {/* ── Matière + Niveau ── */}
          <div className="form__field">
            <label className="form__label">Matière *</label>
            <select
              className={`form__select ${errors.subject_id ? 'form__select--error' : ''}`}
              value={subjectId}
              onChange={e => {
                setSubjectId(e.target.value === '' ? '' : Number(e.target.value));
                setTopicId('');
                setTitleEdited(false);
              }}
            >
              <option value="">— Choisir —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {errors.subject_id && <span className="form__error">{errors.subject_id}</span>}
          </div>

          <div className="form__field">
            <label className="form__label">Niveau *</label>
            <select
              className={`form__select ${errors.level_id ? 'form__select--error' : ''}`}
              value={levelId}
              onChange={e => {
                setLevelId(e.target.value === '' ? '' : Number(e.target.value));
                setTopicId('');
                setTitleEdited(false);
              }}
            >
              <option value="">— Choisir —</option>
              {levels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            {errors.level_id && <span className="form__error">{errors.level_id}</span>}
          </div>

          {/* ── Rattachement programme ── */}
          {subjectId !== '' && levelId !== '' && (
            <div className="form__field form__field--full">
              <label className="form__label">Rattachement</label>
              <div className="seqform__topic-radios">
                <label className="seqform__radio">
                  <input
                    type="radio"
                    checked={topicMode === 'chapter'}
                    onChange={() => { setTopicMode('chapter'); setTitleEdited(false); }}
                  />
                  <span>Chapitre du programme</span>
                </label>
                <label className="seqform__radio">
                  <input
                    type="radio"
                    checked={topicMode === 'other'}
                    onChange={() => { setTopicMode('other'); setTopicId(''); setTitleEdited(false); }}
                  />
                  <span>Autre (transversal, méthode…)</span>
                </label>
              </div>

              {topicMode === 'chapter' && (
                topics.length > 0 ? (
                  <select
                    className="form__select seqform__topic-select"
                    value={topicId}
                    onChange={e => {
                      setTopicId(e.target.value === '' ? '' : Number(e.target.value));
                      setTitleEdited(false);
                    }}
                  >
                    <option value="">— Choisir un chapitre —</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.code ? `${t.code} — ` : ''}{t.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="seqform__no-topics">
                    Aucun chapitre trouvé pour cette matière / ce niveau.
                    Créez-en dans l'onglet Programme.
                  </p>
                )
              )}
            </div>
          )}

          {/* ── Titre ── */}
          <div className="form__field form__field--full">
            <label className="form__label">Titre *</label>
            <input
              className={`form__input ${errors.title ? 'form__input--error' : ''}`}
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleEdited(true); }}
              placeholder={topicMode === 'chapter' ? 'Sélectionnez un chapitre ou saisissez un titre…' : 'Titre de la séquence…'}
            />
            {errors.title && <span className="form__error">{errors.title}</span>}
          </div>

          {/* ── Description (optionnelle) ── */}
          <div className="form__field form__field--full">
            <label className="seqform__desc-toggle">
              <input
                type="checkbox"
                checked={showDesc}
                onChange={e => setShowDesc(e.target.checked)}
              />
              <span className="form__label" style={{ cursor: 'pointer' }}>Ajouter une description</span>
            </label>
            {showDesc && (
              <textarea
                className="form__textarea"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description de la séquence…"
                style={{ marginTop: 6 }}
              />
            )}
          </div>

          {/* ── Classes ── */}
          <div className="form__field form__field--full">
            <label className="form__label">
              Classes *
              {levelId === '' && <span className="form__label-hint"> — choisissez d'abord un niveau</span>}
            </label>

            {/* Chips des classes sélectionnées */}
            <div className="seqform__class-chips">
              {selectedClassObjs.map(c => (
                <span key={c.id} className="seqform__class-chip">
                  {c.name}
                  <button
                    type="button"
                    className="seqform__class-chip-remove"
                    onClick={() => removeClass(c.id)}
                    title="Retirer cette classe"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedClassObjs.length === 0 && levelId !== '' && (
                <span className="seqform__class-empty">Aucune classe sélectionnée</span>
              )}
            </div>

            {/* Classes disponibles à ajouter */}
            {availableClasses.length > 0 && (
              <div className="form__badge-select" style={{ marginTop: 6 }}>
                {availableClasses.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className="form__badge-option"
                    onClick={() => toggleClass(c.id)}
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            )}
            {errors.class_ids && <span className="form__error">{errors.class_ids}</span>}
          </div>

          <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

          {/* ── Heures + Statut ── */}
          <div className="form__field">
            <label className="form__label">
              Volume horaire
              {topicMode === 'chapter' && topicId !== '' && (
                <span className="form__label-hint"> (prévu au programme)</span>
              )}
            </label>
            <input
              className="form__input"
              type="number" min={1} max={200}
              value={totalHours}
              onChange={e => { setTotalHours(e.target.value); setHoursEdited(true); }}
              placeholder="Ex : 16"
            />
          </div>
          <div className="form__field">
            <label className="form__label">Statut</label>
            <select className="form__select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="draft">Brouillon</option>
              <option value="planned">Planifiée</option>
              <option value="in_progress">En cours</option>
              <option value="done">Terminée</option>
            </select>
          </div>

          {/* ── Date début + Date fin calculée ── */}
          <div className="form__field">
            <label className="form__label">Date de début</label>
            <input
              className="form__input"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form__field">
            <label className="form__label">
              Date de fin estimée
              <span className="form__label-hint"> (calculée)</span>
            </label>
            <div className={`seqform__date-calc ${calcLoading ? 'seqform__date-calc--loading' : ''}`}>
              {calcLoading ? (
                <span className="seqform__date-calc-text">Calcul…</span>
              ) : endDateCalc ? (
                <span className="seqform__date-calc-text">
                  {new Date(endDateCalc + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              ) : startDate && totalHours ? (
                <span className="seqform__date-calc-text seqform__date-calc-text--na">
                  {subjectId !== '' && classIds.length > 0
                    ? 'Aucun créneau EDT trouvé pour cette matière'
                    : 'Choisissez matière + classes'}
                </span>
              ) : (
                <span className="seqform__date-calc-text seqform__date-calc-text--na">
                  Renseignez date de début et volume horaire
                </span>
              )}
            </div>
          </div>

          <hr className="form__separator" style={{ gridColumn: '1 / -1' }} />

          {/* ── Documents liés ── */}
          <div className="form__field form__field--full">
            <div className="seqform__docs-header">
              <label className="form__label">Documents liés ({docIds.length})</label>
              <button
                type="button"
                className="seqform__gallery-btn"
                onClick={() => setGalleryOpen(true)}
              >
                📚 Parcourir la bibliothèque
              </button>
            </div>

            {linkedDocs.length > 0 ? (
              <div className="seqform__doc-list">
                {linkedDocs.map((doc, i) => (
                  <div
                    key={doc.id}
                    className="seqform__doc-item"
                    draggable
                    onDragStart={() => handleDocDragStart(i)}
                    onDragOver={e => handleDocDragOver(e, i)}
                  >
                    <span className="seqform__doc-handle">⠿</span>
                    <span className="seqform__doc-icon" style={{ color: doc.subject_color ?? undefined }}>
                      {fileIcon(doc.file_type)}
                    </span>
                    <span className="seqform__doc-title">{doc.title}</span>
                    <button
                      type="button"
                      className="seqform__doc-remove"
                      onClick={() => removeDoc(doc.id)}
                    >×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="seqform__doc-empty">
                Glissez des documents depuis la galerie ou cliquez sur « Parcourir la bibliothèque »
              </div>
            )}
          </div>

        </div>
      </Drawer>

      {/* Panneau galerie coulissant */}
      {galleryOpen && (
        <DocumentGalleryPanel
          onClose={() => setGalleryOpen(false)}
          onAddDoc={addDoc}
          selectedIds={docIds}
        />
      )}
    </>
  );
};

// ── DocumentGalleryPanel (panneau coulissant droit) ──

interface GalleryPanelProps {
  onClose: () => void;
  onAddDoc: (doc: DocItem) => void;
  selectedIds: number[];
}

const DocumentGalleryPanel: React.FC<GalleryPanelProps> = ({
  onClose, onAddDoc, selectedIds,
}) => {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    documentService.getRecent(100)
      .then((all: any[]) => setDocs(all))
      .catch(() => {});
  }, []);

  const filtered = docs.filter(d =>
    (!search || d.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="seqform__gallery-overlay" onClick={onClose}>
      <div className="seqform__gallery-panel" onClick={e => e.stopPropagation()}>
        <div className="seqform__gallery-header">
          <span className="seqform__gallery-title">Bibliothèque</span>
          <button className="seqform__gallery-close" onClick={onClose}>✕</button>
        </div>
        <div className="seqform__gallery-search">
          <input
            className="form__input"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="seqform__gallery-grid">
          {filtered.length === 0 && (
            <p className="seqform__gallery-empty">Aucun document</p>
          )}
          {filtered.map(doc => {
            const already = selectedIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                className={`seqform__gallery-card ${already ? 'seqform__gallery-card--added' : ''}`}
                onClick={() => { if (!already) onAddDoc(doc); }}
                title={already ? 'Déjà ajouté' : 'Cliquer pour ajouter'}
              >
                <span
                  className="seqform__gallery-card-icon"
                  style={{ color: doc.subject_color ?? undefined }}
                >
                  {fileIcon(doc.file_type)}
                </span>
                <span className="seqform__gallery-card-title">{doc.title}</span>
                {already && <span className="seqform__gallery-card-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
