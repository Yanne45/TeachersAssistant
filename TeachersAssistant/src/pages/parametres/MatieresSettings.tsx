import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { classService, levelService, subjectService } from '../../services';
import type { Class, Level, Subject } from '../../types';
import {
  type SubjectDraft,
  type ClassDraft,
  type LevelDraft,
  type SortDirection,
  EMPTY_SUBJECT,
  EMPTY_CLASS,
  EMPTY_LEVEL,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  includesQuery,
  compareText,
  compareNumber,
} from './settingsHelpers';
import './ParametresPage.css';

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'subject' | 'class' | 'level'; item: any } | null>(null);

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

  const handleDeleteSubject = (row: Subject) => {
    setDeleteConfirm({ type: 'subject', item: row });
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

  const handleDeleteClass = (row: Class) => {
    setDeleteConfirm({ type: 'class', item: row });
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

  const handleDeleteLevel = (row: Level) => {
    setDeleteConfirm({ type: 'level', item: row });
  };

  return (
    <div className="settings-sub settings-sub--two-col">
      <div className="settings-sub__col-left">
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
              <label className="settings-sub__label">Libellé</label>
              <input className="settings-sub__input" value={subjectDraft.label} onChange={(e) => setSubjectDraft((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSaveSubject()} disabled={savingSubject}>
                {savingSubject ? 'Enregistrement…' : (subjectDraft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowSubjectForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une matière…"
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
                {savingLevel ? 'Enregistrement…' : (levelDraft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowLevelForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher un niveau…"
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
      </div>

      <div className="settings-sub__col-right">
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
                {savingClass ? 'Enregistrement…' : (classDraft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowClassForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une classe…"
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

      <ConfirmDialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          const { type, item } = deleteConfirm;
          try {
            if (type === 'subject') await subjectService.delete(item.id);
            else if (type === 'class') await classService.delete(item.id);
            else if (type === 'level') await levelService.delete(item.id);
            await reloadAll();
            const labels = { subject: 'Matière supprimée', class: 'Classe supprimée', level: 'Niveau supprimé' };
            addToast('success', labels[type]);
          } catch (error) {
            console.error('[MatieresSettings] Erreur suppression:', error);
            addToast('error', 'Échec de la suppression');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title={
          deleteConfirm?.type === 'subject' ? 'Supprimer la matière' :
          deleteConfirm?.type === 'class' ? 'Supprimer la classe' :
          deleteConfirm?.type === 'level' ? 'Supprimer le niveau' : 'Supprimer'
        }
        message={
          deleteConfirm?.type === 'subject' ? `Supprimer la matière « ${deleteConfirm.item.label} » ? Cette action est irréversible.` :
          deleteConfirm?.type === 'class' ? `Supprimer la classe « ${deleteConfirm.item.name} » ? Cette action est irréversible.` :
          deleteConfirm?.type === 'level' ? `Supprimer le niveau « ${deleteConfirm.item.label} » ? Cette action est irréversible.` : ''
        }
      />
    </div>
  );
};
