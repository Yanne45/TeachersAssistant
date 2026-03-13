import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { skillService, subjectService, levelService, generalCompetencyService } from '../../services';
import type { GeneralCompetency } from '../../services';
import type { Level, Skill, Subject } from '../../types';
import {
  type SortDirection,
  includesQuery,
  compareText,
} from './settingsHelpers';
import './ParametresPage.css';

interface Draft {
  id: number | null;
  skill_type: 'exercise_specific' | 'general';
  category: string;
  label: string;
  description: string;
  subject_id: number | null;
  level_id: number | null;
  max_level: number;
  linkedCompetencyIds: number[];
}

interface CtxMenu {
  x: number;
  y: number;
  skill: Skill;
  linkedCompIds: number[];
}

export const CapacitesSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [competencies, setCompetencies] = useState<GeneralCompetency[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'label' | 'skill_type' | 'category' | 'subject' | 'level'>('label');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<Skill | null>(null);
  const [draft, setDraft] = useState<Draft>({
    id: null,
    skill_type: 'general',
    category: '',
    label: '',
    description: '',
    subject_id: null,
    level_id: null,
    max_level: 4,
    linkedCompetencyIds: [],
  });

  const reload = useCallback(async () => {
    if (!activeYear?.id) {
      setSkills([]);
      setCompetencies([]);
      return;
    }
    const [skillRows, subjectRows, levelRows, compRows] = await Promise.all([
      skillService.getAll(activeYear.id),
      subjectService.getAll(),
      levelService.getAll(),
      generalCompetencyService.getAll(activeYear.id),
    ]);
    setSkills(skillRows);
    setSubjects(subjectRows);
    setLevels(levelRows);
    setCompetencies(compRows);
  }, [activeYear]);

  const subjectById = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const levelById = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels]);
  const competencyById = useMemo(() => new Map(competencies.map((c) => [c.id, c])), [competencies]);

  // Map skill id -> linked competency ids (loaded lazily per skill in the grid)
  const [skillCompetencyMap, setSkillCompetencyMap] = useState<Map<number, number[]>>(new Map());

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

  // Load competency ids for all visible skills
  useEffect(() => {
    if (filteredSkills.length === 0) return;
    void (async () => {
      const entries = await Promise.all(
        filteredSkills.map(async (sk) => {
          const ids = await skillService.getCompetencyIds(sk.id);
          return [sk.id, ids] as [number, number[]];
        })
      );
      setSkillCompetencyMap(new Map(entries));
    })();
  }, [filteredSkills]);

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
      linkedCompetencyIds: [],
    });
  };

  const startCreate = () => {
    resetDraft();
    setShowForm(true);
  };

  const startEdit = async (row: Skill) => {
    const compIds = await skillService.getCompetencyIds(row.id);
    setDraft({
      id: row.id,
      skill_type: row.skill_type,
      category: row.category ?? '',
      label: row.label,
      description: row.description ?? '',
      subject_id: row.subject_id ?? null,
      level_id: row.level_id ?? null,
      max_level: row.max_level,
      linkedCompetencyIds: compIds,
    });
    setShowForm(true);
  };

  const toggleCompetency = (compId: number) => {
    setDraft((prev) => ({
      ...prev,
      linkedCompetencyIds: prev.linkedCompetencyIds.includes(compId)
        ? prev.linkedCompetencyIds.filter((id) => id !== compId)
        : [...prev.linkedCompetencyIds, compId],
    }));
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
      let savedId: number;
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
        savedId = draft.id;
        addToast('success', 'Capacité modifiée');
      } else {
        savedId = await skillService.create({
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
      await skillService.setCompetencies(savedId, draft.linkedCompetencyIds);
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

  const handleDelete = (row: Skill) => {
    setDeleteSkillTarget(row);
  };

  // Context menu
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ctxMenu]);

  const handleCtxAddCompetency = async (compId: number) => {
    if (!ctxMenu) return;
    const newIds = ctxMenu.linkedCompIds.includes(compId)
      ? ctxMenu.linkedCompIds
      : [...ctxMenu.linkedCompIds, compId];
    try {
      await skillService.setCompetencies(ctxMenu.skill.id, newIds);
      addToast('success', `Compétence ajoutée à « ${ctxMenu.skill.label} »`);
      await reload();
    } catch { addToast('error', 'Échec'); }
    setCtxMenu(null);
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
              <label className="settings-sub__label">Libellé</label>
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
            {competencies.length > 0 && (
              <div className="settings-sub__field">
                <label className="settings-sub__label">Compétences générales</label>
                <div className="form__badge-select">
                  {competencies.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      className={`form__badge-option${draft.linkedCompetencyIds.includes(comp.id) ? ' form__badge-option--selected' : ''}`}
                      onClick={() => toggleCompetency(comp.id)}
                      style={draft.linkedCompetencyIds.includes(comp.id) ? { borderColor: comp.color, backgroundColor: comp.color + '22' } : {}}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: comp.color,
                          marginRight: 4,
                        }}
                      />
                      {comp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Enregistrement…' : (draft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        <div className="settings-sub__table-toolbar">
          <input
            className="settings-sub__input settings-sub__table-search"
            placeholder="Rechercher une capacité…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="settings-sub__input settings-sub__table-select"
            value={`${sort}:${direction}`}
            onChange={(e) => {
              const [nextSort, nextDirection] = e.target.value.split(':') as [typeof sort, SortDirection];
              setSort(nextSort);
              setDirection(nextDirection);
            }}
          >
            <option value="label:asc">Tri: libellé A-Z</option>
            <option value="label:desc">Tri: libellé Z-A</option>
            <option value="category:asc">Tri: catégorie A-Z</option>
            <option value="category:desc">Tri: catégorie Z-A</option>
            <option value="skill_type:asc">Tri: type A-Z</option>
            <option value="skill_type:desc">Tri: type Z-A</option>
          </select>
        </div>

        {filteredSkills.length === 0 ? (
          <EmptyState icon="🎯" title="Aucune capacité définie" actionLabel="+ Ajouter" onAction={startCreate} />
        ) : (
          <>
            <div className="capacites-grid">
              {filteredSkills.map((skill) => {
                const linkedCompIds = skillCompetencyMap.get(skill.id) ?? [];
                return (
                  <div key={skill.id} className="capacite-item" onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, skill, linkedCompIds }); }}>
                    <div className="capacite-item__header">
                      <span className="capacite-item__label">{skill.label}</span>
                      <span className={`capacite-item__type capacite-item__type--${skill.skill_type === 'exercise_specific' ? 'specific' : 'general'}`}>
                        {skill.skill_type === 'exercise_specific' ? 'Spéc.' : 'Gén.'}
                      </span>
                    </div>
                    <div className="capacite-item__meta">
                      {skill.category && <span>{skill.category}</span>}
                      {skill.subject_id && <span>{subjectById.get(skill.subject_id)?.short_label}</span>}
                      {skill.level_id && <span>{levelById.get(skill.level_id)?.short_label}</span>}
                    </div>
                    {linkedCompIds.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {linkedCompIds.map((cid) => {
                          const comp = competencyById.get(cid);
                          return comp ? (
                            <span
                              key={cid}
                              style={{
                                fontSize: '0.72rem',
                                padding: '1px 6px',
                                borderRadius: 10,
                                background: comp.color + '22',
                                border: `1px solid ${comp.color}55`,
                                color: 'var(--text-primary, #111)',
                              }}
                            >
                              {comp.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div className="capacite-item__actions">
                      <button className="settings-sub__link" onClick={() => void startEdit(skill)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDelete(skill)}>Supprimer</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="settings-sub__table-meta">
              <span>{filteredSkills.length} capacité(s)</span>
            </div>
          </>
        )}
      </Card>

      {ctxMenu && (
        <div className="settings-context-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button className="settings-context-menu__item" onClick={() => { void startEdit(ctxMenu.skill); setCtxMenu(null); }}>
            Modifier
          </button>
          <div className="settings-context-menu__separator" />
          {competencies.filter(c => !ctxMenu.linkedCompIds.includes(c.id)).length > 0 ? (
            <>
              <div style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Ajouter une compétence
              </div>
              {competencies.filter(c => !ctxMenu.linkedCompIds.includes(c.id)).map(c => (
                <button key={c.id} className="settings-context-menu__item" onClick={() => void handleCtxAddCompetency(c.id)}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: c.color, marginRight: 4 }} />
                  + {c.label}
                </button>
              ))}
            </>
          ) : (
            <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--color-text-muted)' }}>
              Toutes les compétences sont déjà liées
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteSkillTarget !== null}
        onClose={() => setDeleteSkillTarget(null)}
        onConfirm={async () => {
          if (!deleteSkillTarget) return;
          try {
            await skillService.delete(deleteSkillTarget.id);
            await reload();
            addToast('success', 'Capacité supprimée');
          } catch (error) {
            console.error('[CapacitesSettings] Erreur suppression:', error);
            addToast('error', 'Échec de la suppression');
          } finally {
            setDeleteSkillTarget(null);
          }
        }}
        title="Supprimer la capacité"
        message={`Supprimer la capacité « ${deleteSkillTarget?.label ?? ''} » ? Cette action est irréversible.`}
      />
    </div>
  );
};
