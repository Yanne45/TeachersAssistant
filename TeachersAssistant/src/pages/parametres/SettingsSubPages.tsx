import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, EmptyState } from '../../components/ui';
import { useApp } from '../../stores';
import {
  classService,
  db,
  levelService,
  newYearService,
  skillService,
  subjectService,
} from '../../services';
import type { Class, Level, Skill, Subject } from '../../types';

export const AnneeSettings: React.FC = () => {
  const { addToast } = useApp();
  const [label, setLabel] = useState('2025-2026');
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2026-07-04');

  const [showNewYear, setShowNewYear] = useState(false);
  const [newYearLabel, setNewYearLabel] = useState('2026-2027');
  const [newYearStart, setNewYearStart] = useState('2026-09-01');
  const [newYearEnd, setNewYearEnd] = useState('2027-07-04');
  const [creatingYear, setCreatingYear] = useState(false);

  useEffect(() => {
    db.selectOne<any>('SELECT * FROM academic_years WHERE is_active = 1').then((year) => {
      if (!year) return;
      setLabel(year.label);
      setStartDate(year.start_date ?? '2025-09-01');
      setEndDate(year.end_date ?? '2026-07-04');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await db.execute(
        "UPDATE academic_years SET label = ?, start_date = ?, end_date = ?, updated_at = datetime('now') WHERE is_active = 1",
        [label, startDate, endDate],
      );
      addToast('success', 'Année scolaire mise à jour');
    } catch {
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  const handleCreateYear = async () => {
    setCreatingYear(true);
    try {
      const result = await newYearService.createFromExisting(1, newYearLabel.trim(), newYearStart, newYearEnd);
      const summary = Object.entries(result.copied)
        .filter(([, value]) => value > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      addToast('success', `Année "${newYearLabel}" créée (${summary})`);
      setShowNewYear(false);
    } catch (err: any) {
      addToast('error', 'Erreur: ' + (err?.message || 'inconnue'));
    } finally {
      setCreatingYear(false);
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Année scolaire active</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Libellé</label>
          <input className="settings-sub__input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de début</label>
            <input className="settings-sub__input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de fin</label>
            <input className="settings-sub__input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>

      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Nouvelle année depuis existante</h3>
        <p className="settings-sub__desc">
          Copie les programmes, templates de séquences, capacités et paramètres IA.
          Les élèves, notes, bulletins et cahier de textes ne sont pas copiés.
        </p>

        {!showNewYear ? (
          <Button variant="secondary" size="S" onClick={() => setShowNewYear(true)}>Créer nouvelle année</Button>
        ) : (
          <div className="settings-sub__new-year">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libellé nouvelle année</label>
              <input className="settings-sub__input" value={newYearLabel} onChange={(e) => setNewYearLabel(e.target.value)} />
            </div>
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Début</label>
                <input className="settings-sub__input" type="date" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)} />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Fin</label>
                <input className="settings-sub__input" type="date" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="S" disabled={creatingYear || !newYearLabel.trim()} onClick={handleCreateYear}>
                {creatingYear ? 'Création...' : 'Confirmer la création'}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowNewYear(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

type SubjectDraft = {
  id: number | null;
  code: string;
  label: string;
  short_label: string;
  color: string;
};

type ClassDraft = {
  id: number | null;
  level_id: number | null;
  name: string;
  short_name: string;
  student_count: string;
};

type LevelDraft = {
  id: number | null;
  code: string;
  label: string;
  short_label: string;
};

const EMPTY_SUBJECT: SubjectDraft = {
  id: null,
  code: '',
  label: '',
  short_label: '',
  color: '#2C3E7B',
};

const EMPTY_CLASS: ClassDraft = {
  id: null,
  level_id: null,
  name: '',
  short_name: '',
  student_count: '',
};

const EMPTY_LEVEL: LevelDraft = {
  id: null,
  code: '',
  label: '',
  short_label: '',
};

type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
const DEFAULT_PAGE_SIZE = 10;

const includesQuery = (query: string, ...values: Array<string | number | null | undefined>) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized));
};

const compareText = (a: string | null | undefined, b: string | null | undefined, direction: SortDirection) =>
  direction === 'asc'
    ? String(a ?? '').localeCompare(String(b ?? ''), 'fr')
    : String(b ?? '').localeCompare(String(a ?? ''), 'fr');

const compareNumber = (a: number | null | undefined, b: number | null | undefined, direction: SortDirection) => {
  const left = a ?? 0;
  const right = b ?? 0;
  return direction === 'asc' ? left - right : right - left;
};

export const MatieresSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  const [subjectDraft, setSubjectDraft] = useState<SubjectDraft>(EMPTY_SUBJECT);
  const [classDraft, setClassDraft] = useState<ClassDraft>(EMPTY_CLASS);
  const [levelDraft, setLevelDraft] = useState<LevelDraft>(EMPTY_LEVEL);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);

  const [savingSubject, setSavingSubject] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectSort, setSubjectSort] = useState<'label' | 'code' | 'short_label'>('label');
  const [subjectDirection, setSubjectDirection] = useState<SortDirection>('asc');
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectPageSize, setSubjectPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [levelQuery, setLevelQuery] = useState('');
  const [levelSort, setLevelSort] = useState<'label' | 'code' | 'short_label'>('label');
  const [levelDirection, setLevelDirection] = useState<SortDirection>('asc');
  const [levelPage, setLevelPage] = useState(1);
  const [levelPageSize, setLevelPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [classQuery, setClassQuery] = useState('');
  const [classSort, setClassSort] = useState<'name' | 'level' | 'student_count'>('name');
  const [classDirection, setClassDirection] = useState<SortDirection>('asc');
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(DEFAULT_PAGE_SIZE);

  const reloadAll = async () => {
    const [subjectRows, levelRows, classRows] = await Promise.all([
      subjectService.getAll(),
      levelService.getAll(),
      classService.getAll(),
    ]);
    setSubjects(subjectRows);
    setLevels(levelRows);
    setClasses(classRows);
  };

  useEffect(() => {
    void reloadAll().catch((error) => {
      console.error('[MatieresSettings] Erreur chargement:', error);
      addToast('error', 'Impossible de charger les paramètres');
    });
  }, [addToast]);

  const visibleClasses = useMemo(() => {
    if (!activeYear?.id) return classes;
    return classes.filter((c) => c.academic_year_id === activeYear.id);
  }, [classes, activeYear]);

  const levelById = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels]);

  const filteredSubjects = useMemo(() => (
    subjects
      .filter((row) => includesQuery(subjectQuery, row.label, row.code, row.short_label))
      .sort((a, b) => compareText(a[subjectSort], b[subjectSort], subjectDirection))
  ), [subjects, subjectQuery, subjectSort, subjectDirection]);
  const subjectTotalPages = Math.max(1, Math.ceil(filteredSubjects.length / subjectPageSize));
  const pagedSubjects = useMemo(() => {
    const safePage = Math.min(subjectPage, subjectTotalPages);
    const start = (safePage - 1) * subjectPageSize;
    return filteredSubjects.slice(start, start + subjectPageSize);
  }, [filteredSubjects, subjectPage, subjectPageSize, subjectTotalPages]);

  const filteredLevels = useMemo(() => (
    levels
      .filter((row) => includesQuery(levelQuery, row.label, row.code, row.short_label))
      .sort((a, b) => compareText(a[levelSort], b[levelSort], levelDirection))
  ), [levels, levelQuery, levelSort, levelDirection]);
  const levelTotalPages = Math.max(1, Math.ceil(filteredLevels.length / levelPageSize));
  const pagedLevels = useMemo(() => {
    const safePage = Math.min(levelPage, levelTotalPages);
    const start = (safePage - 1) * levelPageSize;
    return filteredLevels.slice(start, start + levelPageSize);
  }, [filteredLevels, levelPage, levelPageSize, levelTotalPages]);

  const filteredClasses = useMemo(() => (
    visibleClasses
      .filter((row) => {
        const levelLabel = levelById.get(row.level_id)?.label ?? '';
        return includesQuery(classQuery, row.name, row.short_name, levelLabel, row.student_count);
      })
      .sort((a, b) => {
        if (classSort === 'student_count') return compareNumber(a.student_count, b.student_count, classDirection);
        if (classSort === 'level') {
          const aLevel = levelById.get(a.level_id)?.label ?? '';
          const bLevel = levelById.get(b.level_id)?.label ?? '';
          return compareText(aLevel, bLevel, classDirection);
        }
        return compareText(a.name, b.name, classDirection);
      })
  ), [visibleClasses, classQuery, classSort, classDirection, levelById]);
  const classTotalPages = Math.max(1, Math.ceil(filteredClasses.length / classPageSize));
  const pagedClasses = useMemo(() => {
    const safePage = Math.min(classPage, classTotalPages);
    const start = (safePage - 1) * classPageSize;
    return filteredClasses.slice(start, start + classPageSize);
  }, [filteredClasses, classPage, classPageSize, classTotalPages]);

  useEffect(() => {
    setSubjectPage((current) => Math.min(current, subjectTotalPages));
  }, [subjectTotalPages]);

  useEffect(() => {
    setLevelPage((current) => Math.min(current, levelTotalPages));
  }, [levelTotalPages]);

  useEffect(() => {
    setClassPage((current) => Math.min(current, classTotalPages));
  }, [classTotalPages]);

  const startCreateSubject = () => {
    setSubjectDraft(EMPTY_SUBJECT);
    setShowSubjectForm(true);
  };

  const startEditSubject = (row: Subject) => {
    setSubjectDraft({
      id: row.id,
      code: row.code,
      label: row.label,
      short_label: row.short_label,
      color: row.color,
    });
    setShowSubjectForm(true);
  };

  const handleSaveSubject = async () => {
    if (!subjectDraft.code.trim() || !subjectDraft.label.trim() || !subjectDraft.short_label.trim()) {
      addToast('warn', 'Code, libellé et abréviation sont requis');
      return;
    }
    setSavingSubject(true);
    try {
      if (subjectDraft.id) {
        await subjectService.update(subjectDraft.id, {
          code: subjectDraft.code.trim().toUpperCase(),
          label: subjectDraft.label.trim(),
          short_label: subjectDraft.short_label.trim(),
          color: subjectDraft.color.trim() || '#2C3E7B',
        });
        addToast('success', 'Matière modifiée');
      } else {
        await subjectService.create({
          code: subjectDraft.code.trim().toUpperCase(),
          label: subjectDraft.label.trim(),
          short_label: subjectDraft.short_label.trim(),
          color: subjectDraft.color.trim() || '#2C3E7B',
          icon: null,
          sort_order: subjects.length,
        });
        addToast('success', 'Matière créée');
      }
      await reloadAll();
      setShowSubjectForm(false);
      setSubjectDraft(EMPTY_SUBJECT);
    } catch (error) {
      console.error('[MatieresSettings] Erreur sauvegarde matiere:', error);
      addToast('error', 'Échec sauvegarde matière');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (row: Subject) => {
    if (!window.confirm(`Supprimer la matière "${row.label}" ?`)) return;
    try {
      await subjectService.delete(row.id);
      await reloadAll();
      addToast('success', 'Matière supprimée');
    } catch (error) {
      console.error('[MatieresSettings] Erreur suppression matiere:', error);
      addToast('error', 'Suppression impossible');
    }
  };

  const startCreateClass = () => {
    setClassDraft({ ...EMPTY_CLASS, level_id: levels[0]?.id ?? null });
    setShowClassForm(true);
  };

  const startEditClass = (row: Class) => {
    setClassDraft({
      id: row.id,
      level_id: row.level_id,
      name: row.name,
      short_name: row.short_name,
      student_count: row.student_count === null ? '' : String(row.student_count),
    });
    setShowClassForm(true);
  };

  const handleSaveClass = async () => {
    if (!activeYear?.id) {
      addToast('error', 'Aucune année active');
      return;
    }
    if (!classDraft.level_id || !classDraft.name.trim() || !classDraft.short_name.trim()) {
      addToast('warn', 'Niveau, nom et nom court sont requis');
      return;
    }

    const parsedCount = classDraft.student_count.trim() ? Number.parseInt(classDraft.student_count, 10) : null;
    const studentCount = Number.isFinite(parsedCount ?? NaN) ? parsedCount : null;

    setSavingClass(true);
    try {
      if (classDraft.id) {
        await classService.update(classDraft.id, {
          level_id: classDraft.level_id,
          name: classDraft.name.trim(),
          short_name: classDraft.short_name.trim(),
          student_count: studentCount,
        });
        addToast('success', 'Classe modifiée');
      } else {
        await classService.create({
          academic_year_id: activeYear.id,
          level_id: classDraft.level_id,
          name: classDraft.name.trim(),
          short_name: classDraft.short_name.trim(),
          student_count: studentCount,
          sort_order: visibleClasses.length,
        });
        addToast('success', 'Classe créée');
      }
      await reloadAll();
      setShowClassForm(false);
      setClassDraft(EMPTY_CLASS);
    } catch (error) {
      console.error('[MatieresSettings] Erreur sauvegarde classe:', error);
      addToast('error', 'Échec sauvegarde classe');
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (row: Class) => {
    if (!window.confirm(`Supprimer la classe "${row.name}" ?`)) return;
    try {
      await classService.delete(row.id);
      await reloadAll();
      addToast('success', 'Classe supprimée');
    } catch (error) {
      console.error('[MatieresSettings] Erreur suppression classe:', error);
      addToast('error', 'Suppression impossible');
    }
  };

  const startCreateLevel = () => {
    setLevelDraft(EMPTY_LEVEL);
    setShowLevelForm(true);
  };

  const startEditLevel = (row: Level) => {
    setLevelDraft({
      id: row.id,
      code: row.code,
      label: row.label,
      short_label: row.short_label,
    });
    setShowLevelForm(true);
  };

  const handleSaveLevel = async () => {
    if (!levelDraft.code.trim() || !levelDraft.label.trim() || !levelDraft.short_label.trim()) {
      addToast('warn', 'Code, libellé et nom court sont requis');
      return;
    }
    setSavingLevel(true);
    try {
      if (levelDraft.id) {
        await levelService.update(levelDraft.id, {
          code: levelDraft.code.trim().toUpperCase(),
          label: levelDraft.label.trim(),
          short_label: levelDraft.short_label.trim(),
        });
        addToast('success', 'Niveau modifié');
      } else {
        await levelService.create({
          code: levelDraft.code.trim().toUpperCase(),
          label: levelDraft.label.trim(),
          short_label: levelDraft.short_label.trim(),
          sort_order: levels.length,
        });
        addToast('success', 'Niveau créé');
      }
      await reloadAll();
      setShowLevelForm(false);
      setLevelDraft(EMPTY_LEVEL);
    } catch (error) {
      console.error('[MatieresSettings] Erreur sauvegarde niveau:', error);
      addToast('error', 'Échec sauvegarde niveau');
    } finally {
      setSavingLevel(false);
    }
  };

  const handleDeleteLevel = async (row: Level) => {
    if (!window.confirm(`Supprimer le niveau "${row.label}" ?`)) return;
    try {
      await levelService.delete(row.id);
      await reloadAll();
      addToast('success', 'Niveau supprimé');
    } catch (error) {
      console.error('[MatieresSettings] Erreur suppression niveau:', error);
      addToast('error', 'Suppression impossible');
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <div className="settings-sub__crud-header">
          <h3 className="settings-sub__title">Matières enseignées</h3>
          <Button variant="secondary" size="S" onClick={startCreateSubject}>+ Nouvelle matière</Button>
        </div>

        {showSubjectForm && (
          <div className="settings-sub__crud-form">
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Code</label>
                <input className="settings-sub__input" value={subjectDraft.code} onChange={(e) => setSubjectDraft((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Abreviation</label>
                <input className="settings-sub__input" value={subjectDraft.short_label} onChange={(e) => setSubjectDraft((p) => ({ ...p, short_label: e.target.value }))} />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 120 }}>
                <label className="settings-sub__label">Couleur</label>
                <input className="settings-sub__input" value={subjectDraft.color} onChange={(e) => setSubjectDraft((p) => ({ ...p, color: e.target.value }))} />
              </div>
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libelle</label>
              <input className="settings-sub__input" value={subjectDraft.label} onChange={(e) => setSubjectDraft((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSaveSubject()} disabled={savingSubject}>
                {savingSubject ? 'Enregistrement...' : (subjectDraft.id ? 'Mettre a jour' : 'Creer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowSubjectForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une matière..."
            value={subjectQuery}
            onChange={(e) => {
              setSubjectQuery(e.target.value);
              setSubjectPage(1);
            }}
          />
          <select
            className="settings-sub__input settings-sub__table-select"
            value={`${subjectSort}:${subjectDirection}`}
            onChange={(e) => {
              const [nextSort, nextDirection] = e.target.value.split(':') as [typeof subjectSort, SortDirection];
              setSubjectSort(nextSort);
              setSubjectDirection(nextDirection);
              setSubjectPage(1);
            }}
          >
            <option value="label:asc">Tri: libellé A-Z</option>
            <option value="label:desc">Tri: libellé Z-A</option>
            <option value="code:asc">Tri: code A-Z</option>
            <option value="code:desc">Tri: code Z-A</option>
            <option value="short_label:asc">Tri: abréviation A-Z</option>
            <option value="short_label:desc">Tri: abréviation Z-A</option>
          </select>
          <select
            className="settings-sub__input settings-sub__table-select settings-sub__table-select--small"
            value={subjectPageSize}
            onChange={(e) => {
              setSubjectPageSize(Number.parseInt(e.target.value, 10) || DEFAULT_PAGE_SIZE);
              setSubjectPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        </div>

        {filteredSubjects.length === 0 ? (
          <EmptyState icon="📚" title="Aucune matière configurée" actionLabel="+ Ajouter" onAction={startCreateSubject} />
        ) : (
          <>
            <table className="settings-sub__table">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Code</th>
                <th>Abréviation</th>
                <th>Couleur</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedSubjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.label}</td>
                  <td>{s.code}</td>
                  <td>{s.short_label}</td>
                  <td><span className="settings-sub__color-dot" style={{ background: s.color }} /></td>
                  <td>
                    <div className="settings-sub__table-actions">
                      <button className="settings-sub__link" onClick={() => startEditSubject(s)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDeleteSubject(s)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            <div className="settings-sub__table-meta">
            <span>{filteredSubjects.length} résultat(s)</span>
            <div className="settings-sub__table-pagination">
              <button className="settings-sub__link" disabled={subjectPage <= 1} onClick={() => setSubjectPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <span>Page {Math.min(subjectPage, subjectTotalPages)} / {subjectTotalPages}</span>
              <button className="settings-sub__link" disabled={subjectPage >= subjectTotalPages} onClick={() => setSubjectPage((p) => Math.min(subjectTotalPages, p + 1))}>Suivant</button>
            </div>
            </div>
          </>
        )}
      </Card>

      <Card className="settings-sub__card">
        <div className="settings-sub__crud-header">
          <h3 className="settings-sub__title">Niveaux ({levels.length})</h3>
          <Button variant="secondary" size="S" onClick={startCreateLevel}>+ Nouveau niveau</Button>
        </div>

        {showLevelForm && (
          <div className="settings-sub__crud-form">
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Code</label>
                <input
                  className="settings-sub__input"
                  value={levelDraft.code}
                  onChange={(e) => setLevelDraft((p) => ({ ...p, code: e.target.value }))}
                />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Libellé</label>
                <input
                  className="settings-sub__input"
                  value={levelDraft.label}
                  onChange={(e) => setLevelDraft((p) => ({ ...p, label: e.target.value }))}
                />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Nom court</label>
                <input
                  className="settings-sub__input"
                  value={levelDraft.short_label}
                  onChange={(e) => setLevelDraft((p) => ({ ...p, short_label: e.target.value }))}
                />
              </div>
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSaveLevel()} disabled={savingLevel}>
                {savingLevel ? 'Enregistrement...' : (levelDraft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowLevelForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher un niveau..."
            value={levelQuery}
            onChange={(e) => {
              setLevelQuery(e.target.value);
              setLevelPage(1);
            }}
          />
          <select
            className="settings-sub__input settings-sub__table-select"
            value={`${levelSort}:${levelDirection}`}
            onChange={(e) => {
              const [nextSort, nextDirection] = e.target.value.split(':') as [typeof levelSort, SortDirection];
              setLevelSort(nextSort);
              setLevelDirection(nextDirection);
              setLevelPage(1);
            }}
          >
            <option value="label:asc">Tri: libellé A-Z</option>
            <option value="label:desc">Tri: libellé Z-A</option>
            <option value="code:asc">Tri: code A-Z</option>
            <option value="code:desc">Tri: code Z-A</option>
            <option value="short_label:asc">Tri: nom court A-Z</option>
            <option value="short_label:desc">Tri: nom court Z-A</option>
          </select>
          <select
            className="settings-sub__input settings-sub__table-select settings-sub__table-select--small"
            value={levelPageSize}
            onChange={(e) => {
              setLevelPageSize(Number.parseInt(e.target.value, 10) || DEFAULT_PAGE_SIZE);
              setLevelPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        </div>

        {filteredLevels.length === 0 ? (
          <EmptyState icon="🏷️" title="Aucun niveau configuré" actionLabel="+ Ajouter" onAction={startCreateLevel} />
        ) : (
          <>
            <table className="settings-sub__table">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Code</th>
                <th>Nom court</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedLevels.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <td>{l.code}</td>
                  <td>{l.short_label}</td>
                  <td>
                    <div className="settings-sub__table-actions">
                      <button className="settings-sub__link" onClick={() => startEditLevel(l)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDeleteLevel(l)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            <div className="settings-sub__table-meta">
            <span>{filteredLevels.length} résultat(s)</span>
            <div className="settings-sub__table-pagination">
              <button className="settings-sub__link" disabled={levelPage <= 1} onClick={() => setLevelPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <span>Page {Math.min(levelPage, levelTotalPages)} / {levelTotalPages}</span>
              <button className="settings-sub__link" disabled={levelPage >= levelTotalPages} onClick={() => setLevelPage((p) => Math.min(levelTotalPages, p + 1))}>Suivant</button>
            </div>
            </div>
          </>
        )}
      </Card>

      <Card className="settings-sub__card">
        <div className="settings-sub__crud-header">
          <h3 className="settings-sub__title">Classes ({visibleClasses.length})</h3>
          <Button variant="secondary" size="S" onClick={startCreateClass}>+ Nouvelle classe</Button>
        </div>

        {showClassForm && (
          <div className="settings-sub__crud-form">
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Niveau</label>
                <select
                  className="settings-sub__input"
                  value={classDraft.level_id ?? ''}
                  onChange={(e) => setClassDraft((p) => ({ ...p, level_id: Number.parseInt(e.target.value, 10) || null }))}
                >
                  <option value="">Selectionner</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Nom</label>
                <input className="settings-sub__input" value={classDraft.name} onChange={(e) => setClassDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Nom court</label>
                <input className="settings-sub__input" value={classDraft.short_name} onChange={(e) => setClassDraft((p) => ({ ...p, short_name: e.target.value }))} />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 120 }}>
                <label className="settings-sub__label">Effectif</label>
                <input className="settings-sub__input" value={classDraft.student_count} onChange={(e) => setClassDraft((p) => ({ ...p, student_count: e.target.value }))} />
              </div>
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSaveClass()} disabled={savingClass}>
                {savingClass ? 'Enregistrement...' : (classDraft.id ? 'Mettre a jour' : 'Creer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowClassForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une classe..."
            value={classQuery}
            onChange={(e) => {
              setClassQuery(e.target.value);
              setClassPage(1);
            }}
          />
          <select
            className="settings-sub__input settings-sub__table-select"
            value={`${classSort}:${classDirection}`}
            onChange={(e) => {
              const [nextSort, nextDirection] = e.target.value.split(':') as [typeof classSort, SortDirection];
              setClassSort(nextSort);
              setClassDirection(nextDirection);
              setClassPage(1);
            }}
          >
            <option value="name:asc">Tri: classe A-Z</option>
            <option value="name:desc">Tri: classe Z-A</option>
            <option value="level:asc">Tri: niveau A-Z</option>
            <option value="level:desc">Tri: niveau Z-A</option>
            <option value="student_count:asc">Tri: effectif croissant</option>
            <option value="student_count:desc">Tri: effectif décroissant</option>
          </select>
          <select
            className="settings-sub__input settings-sub__table-select settings-sub__table-select--small"
            value={classPageSize}
            onChange={(e) => {
              setClassPageSize(Number.parseInt(e.target.value, 10) || DEFAULT_PAGE_SIZE);
              setClassPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        </div>

        {filteredClasses.length === 0 ? (
          <EmptyState icon="🏫" title="Aucune classe configurée" actionLabel="+ Ajouter" onAction={startCreateClass} />
        ) : (
          <>
            <table className="settings-sub__table">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Niveau</th>
                <th>Effectif</th>
                <th>Année</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedClasses.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{levelById.get(c.level_id)?.label ?? '-'}</td>
                  <td>{c.student_count ?? '-'}</td>
                  <td>{c.academic_year_id}</td>
                  <td>
                    <div className="settings-sub__table-actions">
                      <button className="settings-sub__link" onClick={() => startEditClass(c)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDeleteClass(c)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            <div className="settings-sub__table-meta">
            <span>{filteredClasses.length} résultat(s)</span>
            <div className="settings-sub__table-pagination">
              <button className="settings-sub__link" disabled={classPage <= 1} onClick={() => setClassPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <span>Page {Math.min(classPage, classTotalPages)} / {classTotalPages}</span>
              <button className="settings-sub__link" disabled={classPage >= classTotalPages} onClick={() => setClassPage((p) => Math.min(classTotalPages, p + 1))}>Suivant</button>
            </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export const ExportPDFSettings: React.FC = () => {
  const { addToast } = useApp();
  const [schoolName, setSchoolName] = useState('Lycée Victor Hugo');
  const [teacherName, setTeacherName] = useState('M. Durand');
  const [teacherSubject, setTeacherSubject] = useState('HGGSP');
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    db.selectOne<any>('SELECT * FROM export_settings LIMIT 1').then((row) => {
      if (!row) return;
      setSchoolName(row.school_name ?? '');
      setTeacherName(row.teacher_name ?? '');
      setTeacherSubject(row.teacher_subject ?? '');
      setFooterText(row.footer_text ?? '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const existing = await db.selectOne('SELECT id FROM export_settings LIMIT 1');
      if (existing) {
        await db.execute(
          'UPDATE export_settings SET school_name = ?, teacher_name = ?, teacher_subject = ?, footer_text = ? WHERE id = ?',
          [schoolName, teacherName, teacherSubject, footerText, (existing as any).id],
        );
      } else {
        await db.insert(
          'INSERT INTO export_settings (school_name, teacher_name, teacher_subject, footer_text) VALUES (?, ?, ?, ?)',
          [schoolName, teacherName, teacherSubject, footerText],
        );
      }
      addToast('success', 'Identite PDF enregistree');
    } catch {
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Identite des documents PDF</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Etablissement</label>
          <input className="settings-sub__input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Enseignant</label>
            <input className="settings-sub__input" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Matière</label>
            <input className="settings-sub__input" value={teacherSubject} onChange={(e) => setTeacherSubject(e.target.value)} />
          </div>
        </div>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Pied de page</label>
          <input className="settings-sub__input" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texte optionnel" />
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>
    </div>
  );
};

export const CapacitesSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'label' | 'skill_type' | 'category' | 'subject' | 'level'>('label');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{
    id: number | null;
    skill_type: 'exercise_specific' | 'general';
    category: string;
    label: string;
    description: string;
    subject_id: number | null;
    level_id: number | null;
    max_level: number;
  }>({
    id: null,
    skill_type: 'general',
    category: '',
    label: '',
    description: '',
    subject_id: null,
    level_id: null,
    max_level: 4,
  });

  const reload = useCallback(async () => {
    if (!activeYear?.id) {
      setSkills([]);
      return;
    }
    const [skillRows, subjectRows, levelRows] = await Promise.all([
      skillService.getAll(activeYear.id),
      subjectService.getAll(),
      levelService.getAll(),
    ]);
    setSkills(skillRows);
    setSubjects(subjectRows);
    setLevels(levelRows);
  }, [activeYear]);

  const subjectById = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const levelById = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels]);

  const filteredSkills = useMemo(() => (
    skills
      .filter((row) => {
        const subjectLabel = subjectById.get(row.subject_id ?? -1)?.short_label ?? '';
        const levelLabel = levelById.get(row.level_id ?? -1)?.short_label ?? '';
        return includesQuery(query, row.label, row.category, row.description, subjectLabel, levelLabel);
      })
      .sort((a, b) => {
        if (sort === 'skill_type') return compareText(a.skill_type, b.skill_type, direction);
        if (sort === 'category') return compareText(a.category, b.category, direction);
        if (sort === 'subject') {
          const aSubject = subjectById.get(a.subject_id ?? -1)?.short_label ?? '';
          const bSubject = subjectById.get(b.subject_id ?? -1)?.short_label ?? '';
          return compareText(aSubject, bSubject, direction);
        }
        if (sort === 'level') {
          const aLevel = levelById.get(a.level_id ?? -1)?.short_label ?? '';
          const bLevel = levelById.get(b.level_id ?? -1)?.short_label ?? '';
          return compareText(aLevel, bLevel, direction);
        }
        return compareText(a.label, b.label, direction);
      })
  ), [skills, query, sort, direction, subjectById, levelById]);
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / pageSize));
  const pagedSkills = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredSkills.slice(start, start + pageSize);
  }, [filteredSkills, page, pageSize, totalPages]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    void reload().catch((error) => {
      console.error('[CapacitesSettings] Erreur chargement:', error);
      addToast('error', 'Impossible de charger les capacités');
    });
  }, [reload, addToast]);

  const resetDraft = () => {
    setDraft({
      id: null,
      skill_type: 'general',
      category: '',
      label: '',
      description: '',
      subject_id: null,
      level_id: null,
      max_level: 4,
    });
  };

  const startCreate = () => {
    resetDraft();
    setShowForm(true);
  };

  const startEdit = (row: Skill) => {
    setDraft({
      id: row.id,
      skill_type: row.skill_type,
      category: row.category ?? '',
      label: row.label,
      description: row.description ?? '',
      subject_id: row.subject_id ?? null,
      level_id: row.level_id ?? null,
      max_level: row.max_level,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!activeYear?.id) {
      addToast('error', 'Aucune année active');
      return;
    }
    if (!draft.label.trim()) {
      addToast('warn', 'Le libellé est requis');
      return;
    }

    setSaving(true);
    try {
      if (draft.id) {
        await skillService.update(draft.id, {
          skill_type: draft.skill_type,
          category: draft.category.trim() || null,
          label: draft.label.trim(),
          description: draft.description.trim() || null,
          subject_id: draft.subject_id,
          level_id: draft.level_id,
          max_level: draft.max_level,
        });
        addToast('success', 'Capacité modifiée');
      } else {
        await skillService.create({
          academic_year_id: activeYear.id,
          skill_type: draft.skill_type,
          category: draft.category.trim() || null,
          label: draft.label.trim(),
          description: draft.description.trim() || null,
          subject_id: draft.subject_id,
          level_id: draft.level_id,
          max_level: draft.max_level,
          sort_order: skills.length,
        });
        addToast('success', 'Capacité créée');
      }
      await reload();
      setShowForm(false);
      resetDraft();
    } catch (error) {
      console.error('[CapacitesSettings] Erreur sauvegarde:', error);
      addToast('error', 'Échec sauvegarde capacité');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Skill) => {
    if (!window.confirm(`Supprimer la capacité "${row.label}" ?`)) return;
    try {
      await skillService.delete(row.id);
      await reload();
      addToast('success', 'Capacité supprimée');
    } catch (error) {
      console.error('[CapacitesSettings] Erreur suppression:', error);
      addToast('error', 'Suppression impossible');
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <div className="settings-sub__crud-header">
          <h3 className="settings-sub__title">Capacites ({skills.length})</h3>
          <Button variant="secondary" size="S" onClick={startCreate}>+ Nouvelle capacité</Button>
        </div>

        {showForm && (
          <div className="settings-sub__crud-form">
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Type</label>
                <select
                  className="settings-sub__input"
                  value={draft.skill_type}
                  onChange={(e) => setDraft((p) => ({ ...p, skill_type: e.target.value as 'exercise_specific' | 'general' }))}
                >
                  <option value="general">Generale</option>
                  <option value="exercise_specific">Specifique exercice</option>
                </select>
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Categorie</label>
                <input className="settings-sub__input" value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 120 }}>
                <label className="settings-sub__label">Max niveau</label>
                <input
                  className="settings-sub__input"
                  value={draft.max_level}
                  onChange={(e) => setDraft((p) => ({ ...p, max_level: Number.parseInt(e.target.value, 10) || 4 }))}
                />
              </div>
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libelle</label>
              <input className="settings-sub__input" value={draft.label} onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Description</label>
              <input className="settings-sub__input" value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Matière (optionnel)</label>
                <select
                  className="settings-sub__input"
                  value={draft.subject_id ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, subject_id: Number.parseInt(e.target.value, 10) || null }))}
                >
                  <option value="">Toutes</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.short_label || s.code}</option>
                  ))}
                </select>
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Niveau (optionnel)</label>
                <select
                  className="settings-sub__input"
                  value={draft.level_id ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, level_id: Number.parseInt(e.target.value, 10) || null }))}
                >
                  <option value="">Tous</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.short_label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Enregistrement...' : (draft.id ? 'Mettre a jour' : 'Creer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une capacité..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="settings-sub__input settings-sub__table-select"
            value={`${sort}:${direction}`}
            onChange={(e) => {
              const [nextSort, nextDirection] = e.target.value.split(':') as [typeof sort, SortDirection];
              setSort(nextSort);
              setDirection(nextDirection);
              setPage(1);
            }}
          >
            <option value="label:asc">Tri: libellé A-Z</option>
            <option value="label:desc">Tri: libellé Z-A</option>
            <option value="category:asc">Tri: catégorie A-Z</option>
            <option value="category:desc">Tri: catégorie Z-A</option>
            <option value="skill_type:asc">Tri: type A-Z</option>
            <option value="skill_type:desc">Tri: type Z-A</option>
            <option value="subject:asc">Tri: matière A-Z</option>
            <option value="subject:desc">Tri: matière Z-A</option>
            <option value="level:asc">Tri: niveau A-Z</option>
            <option value="level:desc">Tri: niveau Z-A</option>
          </select>
          <select
            className="settings-sub__input settings-sub__table-select settings-sub__table-select--small"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number.parseInt(e.target.value, 10) || DEFAULT_PAGE_SIZE);
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </select>
        </div>

        {filteredSkills.length === 0 ? (
          <EmptyState icon="🎯" title="Aucune capacité définie" actionLabel="+ Ajouter" onAction={startCreate} />
        ) : (
          <>
            <table className="settings-sub__table">
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Type</th>
                <th>Catégorie</th>
                <th>Matière</th>
                <th>Niveau</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedSkills.map((skill) => (
                <tr key={skill.id}>
                  <td>{skill.label}</td>
                  <td>{skill.skill_type === 'exercise_specific' ? 'Spécifique' : 'Générale'}</td>
                  <td>{skill.category ?? '-'}</td>
                  <td>{subjectById.get(skill.subject_id ?? -1)?.short_label ?? '-'}</td>
                  <td>{levelById.get(skill.level_id ?? -1)?.short_label ?? '-'}</td>
                  <td>
                    <div className="settings-sub__table-actions">
                      <button className="settings-sub__link" onClick={() => startEdit(skill)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDelete(skill)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
            <div className="settings-sub__table-meta">
            <span>{filteredSkills.length} résultat(s)</span>
            <div className="settings-sub__table-pagination">
              <button className="settings-sub__link" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
              <span>Page {Math.min(page, totalPages)} / {totalPages}</span>
              <button className="settings-sub__link" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</button>
            </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

