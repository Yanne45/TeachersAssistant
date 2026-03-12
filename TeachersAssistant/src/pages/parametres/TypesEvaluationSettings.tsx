// ============================================================================
// TypesEvaluationSettings — CRUD des types d'évaluation / d'activité
// ============================================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, EmptyState, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import { assignmentTypeService } from '../../services';
import type { AssignmentType } from '../../services';
import './ParametresPage.css';

export const TypesEvaluationSettings: React.FC = () => {
  const { addToast } = useApp();
  const [types, setTypes] = useState<AssignmentType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentType | null>(null);
  const [draft, setDraft] = useState<{ id: number | null; label: string; default_max_score: number }>({
    id: null, label: '', default_max_score: 20,
  });

  const reload = useCallback(async () => {
    setTypes(await assignmentTypeService.getAll());
  }, []);

  useEffect(() => {
    void reload().catch(() => addToast('error', 'Impossible de charger les types'));
  }, [reload, addToast]);

  const resetDraft = () => setDraft({ id: null, label: '', default_max_score: 20 });

  const startCreate = () => { resetDraft(); setShowForm(true); };
  const startEdit = (t: AssignmentType) => {
    setDraft({ id: t.id, label: t.label, default_max_score: t.default_max_score });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!draft.label.trim()) { addToast('warn', 'Le libellé est requis'); return; }
    setSaving(true);
    try {
      if (draft.id) {
        await assignmentTypeService.update(draft.id, { label: draft.label, default_max_score: draft.default_max_score });
        addToast('success', 'Type modifié');
      } else {
        await assignmentTypeService.create({ code: draft.label, label: draft.label, default_max_score: draft.default_max_score });
        addToast('success', 'Type créé');
      }
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
                <th className="settings-sub__th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="settings-sub__tr">
                  <td className="settings-sub__td">{t.label}</td>
                  <td className="settings-sub__td">{t.default_max_score}</td>
                  <td className="settings-sub__td settings-sub__td--actions">
                    <button className="settings-sub__link" onClick={() => startEdit(t)}>Modifier</button>
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
