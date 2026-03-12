import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, EmptyState } from '../../components/ui';
import { useApp } from '../../stores';
import { reportPeriodService } from '../../services';
import type { ReportPeriod } from '../../types/students';
import { type PeriodeFormData, EMPTY_PERIODE } from './settingsHelpers';
import './ParametresPage.css';

export const PeriodesNotationSettings: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PeriodeFormData>(EMPTY_PERIODE);
  const [errors, setErrors] = useState<Partial<PeriodeFormData>>({});

  const refresh = useCallback(async () => {
    if (!activeYear) return;
    setLoading(true);
    try {
      const data = await reportPeriodService.getByYear(activeYear.id);
      setPeriods(data);
    } catch {
      addToast('error', 'Erreur chargement des périodes');
    } finally {
      setLoading(false);
    }
  }, [activeYear, addToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const setField = (field: keyof PeriodeFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const validate = (): boolean => {
    const errs: Partial<PeriodeFormData> = {};
    if (!form.code.trim()) errs.code = 'Code requis';
    if (!form.label.trim()) errs.label = 'Libellé requis';
    if (!form.start_date) errs.start_date = 'Date début requise';
    if (!form.end_date) errs.end_date = 'Date fin requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => { setForm(EMPTY_PERIODE); setErrors({}); setEditingId(null); setFormOpen(true); };
  const openEdit = (p: ReportPeriod) => {
    setForm({ code: p.code, label: p.label, start_date: p.start_date ?? '', end_date: p.end_date ?? '' });
    setErrors({});
    setEditingId(p.id);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!validate() || !activeYear) return;
    try {
      if (editingId !== null) {
        await reportPeriodService.update(editingId, {
          code: form.code.trim(),
          label: form.label.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
        });
        addToast('success', 'Période mise à jour');
      } else {
        await reportPeriodService.create(
          activeYear.id,
          form.code.trim(),
          form.label.trim(),
          form.start_date,
          form.end_date,
          periods.length + 1,
        );
        addToast('success', 'Période ajoutée');
      }
      setFormOpen(false);
      await refresh();
    } catch {
      addToast('error', 'Échec de la sauvegarde');
    }
  };

  const handlePreset = async (preset: 'trimestres' | 'semestres') => {
    if (!activeYear) return;
    const items =
      preset === 'trimestres'
        ? [
            { code: 'T1', label: 'Trimestre 1' },
            { code: 'T2', label: 'Trimestre 2' },
            { code: 'T3', label: 'Trimestre 3' },
          ]
        : [
            { code: 'S1', label: 'Semestre 1' },
            { code: 'S2', label: 'Semestre 2' },
          ];
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        await reportPeriodService.create(activeYear.id, item.code, item.label, '', '', i + 1);
      }
      addToast('success', `${items.length} périodes créées — renseignez les dates.`);
      await refresh();
    } catch {
      addToast('error', 'Erreur lors de la génération des périodes');
    }
  };

  const handleDelete = async (p: ReportPeriod) => {
    if (!confirm(`Supprimer la période "${p.label}" ? Cette action est irréversible.`)) return;
    try {
      await reportPeriodService.delete(p.id);
      addToast('success', 'Période supprimée');
      await refresh();
    } catch {
      addToast('error', 'Échec de la suppression');
    }
  };

  return (
    <div className="settings-sub">
      <Card noHover>
        <div className="settings-sub__section-header">
          <h3 className="settings-sub__section-title">Périodes de notation</h3>
          <Button variant="primary" size="S" onClick={openCreate}>+ Ajouter</Button>
        </div>
        <p className="settings-sub__section-desc">
          Définissez librement vos périodes : trimestres, semestres, ou toute autre organisation.
          Chaque période peut générer des bulletins exportables.
        </p>

        {loading && <p className="settings-sub__loading">Chargement…</p>}

        {!loading && periods.length === 0 && (
          <>
            <EmptyState
              icon="🗓️"
              title="Aucune période configurée"
              description="Utilisez un modèle pour démarrer rapidement, ou ajoutez vos périodes manuellement."
              actionLabel="+ Ajouter manuellement"
              onAction={openCreate}
            />
            <div className="settings-sub__presets">
              <span className="settings-sub__presets-label">Démarrage rapide :</span>
              <button className="settings-sub__preset-btn" onClick={() => void handlePreset('trimestres')}>
                3 trimestres
              </button>
              <button className="settings-sub__preset-btn" onClick={() => void handlePreset('semestres')}>
                2 semestres
              </button>
            </div>
          </>
        )}

        {!loading && periods.length > 0 && (
          <table className="settings-sub__table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td><span className="settings-sub__badge">{p.code}</span></td>
                  <td>{p.label}</td>
                  <td className="settings-sub__cell-muted">{p.start_date ?? '—'}</td>
                  <td className="settings-sub__cell-muted">{p.end_date ?? '—'}</td>
                  <td>
                    <div className="settings-sub__table-actions">
                      <button className="settings-sub__link" onClick={() => openEdit(p)}>Modifier</button>
                      <button className="settings-sub__link settings-sub__link--danger" onClick={() => void handleDelete(p)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formOpen && (
        <div className="settings-sub__inline-form">
          <h4 className="settings-sub__inline-title">
            {editingId !== null ? 'Modifier la période' : 'Nouvelle période'}
          </h4>
          <div className="settings-sub__form-grid">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Code *</label>
              <input
                className={`settings-sub__input ${errors.code ? 'settings-sub__input--error' : ''}`}
                value={form.code}
                onChange={e => setField('code', e.target.value)}
                placeholder="Ex : T1, S1, P1…"
                maxLength={10}
              />
              {errors.code && <span className="settings-sub__error">{errors.code}</span>}
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libellé *</label>
              <input
                className={`settings-sub__input ${errors.label ? 'settings-sub__input--error' : ''}`}
                value={form.label}
                onChange={e => setField('label', e.target.value)}
                placeholder="Ex : Trimestre 1, Semestre 1, Période 1…"
              />
              {errors.label && <span className="settings-sub__error">{errors.label}</span>}
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Date début *</label>
              <input
                type="date"
                className={`settings-sub__input ${errors.start_date ? 'settings-sub__input--error' : ''}`}
                value={form.start_date}
                onChange={e => setField('start_date', e.target.value)}
              />
              {errors.start_date && <span className="settings-sub__error">{errors.start_date}</span>}
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Date fin *</label>
              <input
                type="date"
                className={`settings-sub__input ${errors.end_date ? 'settings-sub__input--error' : ''}`}
                value={form.end_date}
                onChange={e => setField('end_date', e.target.value)}
              />
              {errors.end_date && <span className="settings-sub__error">{errors.end_date}</span>}
            </div>
          </div>
          <div className="settings-sub__form-actions">
            <button className="settings-sub__btn settings-sub__btn--secondary" onClick={() => setFormOpen(false)}>Annuler</button>
            <button className="settings-sub__btn settings-sub__btn--primary" onClick={() => void handleSave()}>
              {editingId !== null ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
