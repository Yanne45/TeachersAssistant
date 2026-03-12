import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { skillService, subjectService, levelService } from '../../services';
import type { Level, Skill, Subject } from '../../types';
import {
  type SortDirection,
  includesQuery,
  compareText,
} from './settingsHelpers';
import './ParametresPage.css';

export const CapacitesSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'label' | 'skill_type' | 'category' | 'subject' | 'level'>('label');
  const [direction, setDirection] = useState<SortDirection>('asc');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<Skill | null>(null);
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

  const handleDelete = (row: Skill) => {
    setDeleteSkillTarget(row);
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
              {filteredSkills.map((skill) => (
                <div key={skill.id} className="capacite-item">
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
                  <div className="capacite-item__actions">
                    <button className="settings-sub__link" onClick={() => startEdit(skill)}>Modifier</button>
                    <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDelete(skill)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="settings-sub__table-meta">
              <span>{filteredSkills.length} capacité(s)</span>
            </div>
          </>
        )}
      </Card>

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
