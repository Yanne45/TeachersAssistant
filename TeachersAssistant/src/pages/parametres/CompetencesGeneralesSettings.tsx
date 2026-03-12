// ============================================================================
// CompetencesGeneralesSettings — CRUD des compétences générales
// ============================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { generalCompetencyService, skillService } from '../../services';
import type { GeneralCompetency } from '../../services';
import type { Skill } from '../../types';
import './ParametresPage.css';

interface CompetencyWithSkills extends GeneralCompetency {
  linkedSkillIds: number[];
}

interface Draft {
  id: number | null;
  label: string;
  description: string;
  color: string;
  linkedSkillIds: number[];
}

const DEFAULT_COLOR = '#6366f1';

export const CompetencesGeneralesSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [competencies, setCompetencies] = useState<CompetencyWithSkills[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompetencyWithSkills | null>(null);
  const [draft, setDraft] = useState<Draft>({
    id: null,
    label: '',
    description: '',
    color: DEFAULT_COLOR,
    linkedSkillIds: [],
  });

  const reload = useCallback(async () => {
    if (!activeYear?.id) {
      setCompetencies([]);
      setSkills([]);
      return;
    }
    const [compRows, skillRows] = await Promise.all([
      generalCompetencyService.getAll(activeYear.id),
      skillService.getAll(activeYear.id),
    ]);
    setSkills(skillRows);
    // Charger les skillIds pour chaque compétence
    const withSkills: CompetencyWithSkills[] = await Promise.all(
      compRows.map(async (c) => {
        const skillIds = await generalCompetencyService.getSkillIds(c.id);
        return { ...c, linkedSkillIds: skillIds };
      })
    );
    setCompetencies(withSkills);
  }, [activeYear]);

  useEffect(() => {
    void reload().catch(() => addToast('error', 'Impossible de charger les compétences'));
  }, [reload, addToast]);

  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const resetDraft = () => {
    setDraft({ id: null, label: '', description: '', color: DEFAULT_COLOR, linkedSkillIds: [] });
  };

  const startCreate = () => {
    resetDraft();
    setShowForm(true);
  };

  const startEdit = async (comp: CompetencyWithSkills) => {
    const skillIds = await generalCompetencyService.getSkillIds(comp.id);
    setDraft({
      id: comp.id,
      label: comp.label,
      description: comp.description ?? '',
      color: comp.color,
      linkedSkillIds: skillIds,
    });
    setShowForm(true);
  };

  const toggleSkill = (skillId: number) => {
    setDraft((prev) => {
      const already = prev.linkedSkillIds.includes(skillId);
      return {
        ...prev,
        linkedSkillIds: already
          ? prev.linkedSkillIds.filter((id) => id !== skillId)
          : [...prev.linkedSkillIds, skillId],
      };
    });
  };

  const handleSave = async () => {
    if (!activeYear?.id) { addToast('error', 'Aucune année active'); return; }
    if (!draft.label.trim()) { addToast('warn', 'Le libellé est requis'); return; }
    setSaving(true);
    try {
      let id: number;
      if (draft.id) {
        await generalCompetencyService.update(draft.id, {
          label: draft.label,
          description: draft.description || undefined,
          color: draft.color,
        });
        id = draft.id;
        addToast('success', 'Compétence modifiée');
      } else {
        id = await generalCompetencyService.create({
          academic_year_id: activeYear.id,
          label: draft.label,
          description: draft.description || undefined,
          color: draft.color,
        });
        addToast('success', 'Compétence créée');
      }
      await generalCompetencyService.setSkills(id, draft.linkedSkillIds);
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
          <h3 className="settings-sub__title">Compétences générales ({competencies.length})</h3>
          <Button variant="secondary" size="S" onClick={startCreate}>+ Nouvelle compétence</Button>
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
                  placeholder="Ex : Raisonnement, Communication…"
                />
              </div>
              <div className="settings-sub__field" style={{ maxWidth: 100 }}>
                <label className="settings-sub__label">Couleur</label>
                <input
                  type="color"
                  className="settings-sub__input"
                  value={draft.color}
                  onChange={(e) => setDraft((p) => ({ ...p, color: e.target.value }))}
                  style={{ padding: '2px 4px', height: 36, cursor: 'pointer' }}
                />
              </div>
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Description</label>
              <textarea
                className="settings-sub__input"
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Description optionnelle…"
                style={{ resize: 'vertical' }}
              />
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
            <div className="settings-sub__crud-actions">
              <Button variant="primary" size="S" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Enregistrement…' : (draft.id ? 'Mettre à jour' : 'Créer')}
              </Button>
              <Button variant="secondary" size="S" onClick={() => { setShowForm(false); resetDraft(); }}>Annuler</Button>
            </div>
          </div>
        )}

        {competencies.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="Aucune compétence générale définie"
            actionLabel="+ Ajouter"
            onAction={startCreate}
          />
        ) : (
          <div className="capacites-grid">
            {competencies.map((comp) => (
              <div key={comp.id} className="capacite-item">
                <div className="capacite-item__header">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: comp.color,
                      marginRight: 6,
                      flexShrink: 0,
                    }}
                  />
                  <span className="capacite-item__label">{comp.label}</span>
                </div>
                {comp.description && (
                  <div className="capacite-item__meta" style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6b7280)' }}>
                    {comp.description}
                  </div>
                )}
                {comp.linkedSkillIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {comp.linkedSkillIds.map((sid) => {
                      const sk = skillById.get(sid);
                      return sk ? (
                        <span
                          key={sid}
                          style={{
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: comp.color + '22',
                            border: `1px solid ${comp.color}55`,
                            color: 'var(--text-primary, #111)',
                          }}
                        >
                          {sk.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="capacite-item__actions">
                  <button className="settings-sub__link" onClick={() => void startEdit(comp)}>Modifier</button>
                  <button className="settings-sub__link settings-sub__link--danger" onClick={() => setDeleteTarget(comp)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await generalCompetencyService.delete(deleteTarget.id);
            await reload();
            addToast('success', 'Compétence supprimée');
          } catch {
            addToast('error', 'Échec suppression');
          } finally {
            setDeleteTarget(null);
          }
        }}
        title="Supprimer la compétence"
        message={`Supprimer la compétence « ${deleteTarget?.label ?? ''} » ? Cette action est irréversible.`}
      />
    </div>
  );
};
