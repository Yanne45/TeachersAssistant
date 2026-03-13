// ============================================================================
// TypesEvaluationSettings — CRUD des types d'évaluation / d'activité
// ============================================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { assignmentTypeService, generalCompetencyService, skillService } from '../../services';
import type { AssignmentType, GeneralCompetency } from '../../services';
import type { Skill } from '../../types';
import './ParametresPage.css';

interface TypeWithLinks extends AssignmentType {
  linkedSkillIds: number[];
  linkedCompetencyIds: number[];
}

interface Draft {
  id: number | null;
  label: string;
  default_max_score: number;
  linkedSkillIds: number[];
  linkedCompetencyIds: number[];
}

export const TypesEvaluationSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [types, setTypes] = useState<TypeWithLinks[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [competencies, setCompetencies] = useState<GeneralCompetency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TypeWithLinks | null>(null);
  const [draft, setDraft] = useState<Draft>({
    id: null,
    label: '',
    default_max_score: 20,
    linkedSkillIds: [],
    linkedCompetencyIds: [],
  });

  const reload = useCallback(async () => {
    const typeRows = await assignmentTypeService.getAll();
    const typesWithLinks: TypeWithLinks[] = await Promise.all(
      typeRows.map(async (t) => {
        const [skillIds, competencyIds] = await Promise.all([
          assignmentTypeService.getSkillIds(t.id),
          assignmentTypeService.getCompetencyIds(t.id),
        ]);
        return { ...t, linkedSkillIds: skillIds, linkedCompetencyIds: competencyIds };
      })
    );
    setTypes(typesWithLinks);

    if (activeYear?.id) {
      const [skillRows, compRows] = await Promise.all([
        skillService.getAll(activeYear.id),
        generalCompetencyService.getAll(activeYear.id),
      ]);
      setSkills(skillRows);
      setCompetencies(compRows);
    }
  }, [activeYear]);

  useEffect(() => {
    void reload().catch((err) => {
      console.error('[TypesEvaluationSettings] reload error:', err);
      addToast('error', 'Impossible de charger les types d\'évaluation');
    });
  }, [reload, addToast]);

  const resetDraft = () => setDraft({ id: null, label: '', default_max_score: 20, linkedSkillIds: [], linkedCompetencyIds: [] });

  const startCreate = () => { resetDraft(); setShowForm(true); };

  const startEdit = async (t: TypeWithLinks) => {
    const [skillIds, competencyIds] = await Promise.all([
      assignmentTypeService.getSkillIds(t.id),
      assignmentTypeService.getCompetencyIds(t.id),
    ]);
    setDraft({
      id: t.id,
      label: t.label,
      default_max_score: t.default_max_score,
      linkedSkillIds: skillIds,
      linkedCompetencyIds: competencyIds,
    });
    setShowForm(true);
  };

  const toggleSkill = (skillId: number) => {
    setDraft((prev) => ({
      ...prev,
      linkedSkillIds: prev.linkedSkillIds.includes(skillId)
        ? prev.linkedSkillIds.filter((id) => id !== skillId)
        : [...prev.linkedSkillIds, skillId],
    }));
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
    if (!draft.label.trim()) { addToast('warn', 'Le libellé est requis'); return; }
    setSaving(true);
    try {
      let savedId: number;
      if (draft.id) {
        await assignmentTypeService.update(draft.id, { label: draft.label, default_max_score: draft.default_max_score });
        savedId = draft.id;
        addToast('success', 'Type modifié');
      } else {
        savedId = await assignmentTypeService.create({ code: draft.label, label: draft.label, default_max_score: draft.default_max_score });
        addToast('success', 'Type créé');
      }
      await Promise.all([
        assignmentTypeService.setSkills(savedId, draft.linkedSkillIds),
        assignmentTypeService.setCompetencies(savedId, draft.linkedCompetencyIds),
      ]);
      await reload();
      setShowForm(false);
      resetDraft();
    } catch {
      addToast('error', 'Échec sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <div className="settings-sub__crud-header">
          <h3 className="settings-sub__title">Types d'évaluation ({types.length})</h3>
          <Button variant="secondary" size="S" onClick={startCreate}>+ Nouveau type</Button>
        </div>

        {showForm && (
          <div className="settings-sub__crud-form">
            <div className="settings-sub__row">
              <div className="settings-sub__field" style={{ flex: 2 }}>
                <label className="settings-sub__label">Libellé *</label>
                <input
                  className="settings-sub__input"
                  value={draft.label}
                  onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Ex : Dissertation, QCM, Exposé…"
                />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 140 }}>
                <label className="settings-sub__label">Barème par défaut</label>
                <input
                  className="settings-sub__input"
                  type="number"
                  min={1}
                  max={100}
                  value={draft.default_max_score}
                  onChange={(e) => setDraft((p) => ({ ...p, default_max_score: Number(e.target.value) || 20 }))}
                />
              </div>
            </div>

            {skills.length > 0 && (
              <div className="settings-sub__field">
                <label className="settings-sub__label">Capacités associées</label>
                <div className="form__badge-select">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className={`form__badge-option${draft.linkedSkillIds.includes(skill.id) ? ' form__badge-option--selected' : ''}`}
                      onClick={() => toggleSkill(skill.id)}
                    >
                      {skill.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {competencies.length > 0 && (
              <div className="settings-sub__field">
                <label className="settings-sub__label">Compétences générales associées</label>
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
              <Button variant="secondary" size="S" onClick={() => { setShowForm(false); resetDraft(); }}>Annuler</Button>
            </div>
          </div>
        )}

        {types.length === 0 ? (
          <EmptyState icon="📋" title="Aucun type défini" actionLabel="+ Ajouter" onAction={startCreate} />
        ) : (
          <table className="settings-sub__table">
            <thead>
              <tr>
                <th className="settings-sub__th">Libellé</th>
                <th className="settings-sub__th">Barème défaut</th>
                <th className="settings-sub__th">Capacités</th>
                <th className="settings-sub__th">Compétences</th>
                <th className="settings-sub__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="settings-sub__tr">
                  <td className="settings-sub__td">{t.label}</td>
                  <td className="settings-sub__td">{t.default_max_score}</td>
                  <td className="settings-sub__td">{t.linkedSkillIds.length > 0 ? `${t.linkedSkillIds.length} capacité(s)` : '—'}</td>
                  <td className="settings-sub__td">{t.linkedCompetencyIds.length > 0 ? `${t.linkedCompetencyIds.length} compétence(s)` : '—'}</td>
                  <td className="settings-sub__td settings-sub__td--actions">
                    <button className="settings-sub__link" onClick={() => void startEdit(t)}>Modifier</button>
                    <button className="settings-sub__link settings-sub__link--danger" onClick={() => setDeleteTarget(t)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await assignmentTypeService.delete(deleteTarget.id);
            await reload();
            addToast('success', 'Type supprimé');
          } catch {
            addToast('error', 'Échec suppression');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="Supprimer le type"
        message={`Supprimer le type « ${deleteTarget?.label ?? ''} » ? Les devoirs existants ne seront pas affectés.`}
      />
    </div>
  );
};
