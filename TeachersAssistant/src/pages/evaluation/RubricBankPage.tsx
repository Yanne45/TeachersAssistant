// ============================================================================
// RubricBankPage — Banque de grilles d'évaluation réutilisables
// Permet de créer, cloner, éditer et appliquer des rubriques-types.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { useApp } from '../../stores';
import {
  rubricTemplateService,
  assignmentTypeService,
  subjectService,
} from '../../services';
import type { RubricTemplate, RubricCriterion } from '../../services';
import type { Subject } from '../../types';
import './RubricBankPage.css';

const LEVEL_COLORS = ['#fca5a5', '#fcd34d', '#86efac', '#4ade80'];
const LEVEL_SHORT = ['N1', 'N2', 'N3', 'N4'];

export const RubricBankPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentTypes, setAssignmentTypes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RubricTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTypeId, setFormTypeId] = useState<number | null>(null);
  const [formSubjectId, setFormSubjectId] = useState<number | null>(null);
  const [formMaxScore, setFormMaxScore] = useState(20);

  // Detail view
  const [detailId, setDetailId] = useState<number | null>(null);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [detailTemplate, setDetailTemplate] = useState<RubricTemplate | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<RubricTemplate | null>(null);

  // Filter
  const [filterType, setFilterType] = useState<string>('all');

  const yearId = activeYear?.id ?? null;

  const refresh = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [t, types, subs] = await Promise.all([
        rubricTemplateService.getByYear(yearId),
        assignmentTypeService.getAll(),
        subjectService.getAll(),
      ]);
      setTemplates(t);
      setAssignmentTypes(types);
      setSubjects(subs);
    } catch (e) {
      console.error('[RubricBankPage] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [yearId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Load detail
  useEffect(() => {
    if (detailId === null) { setCriteria([]); setDetailTemplate(null); return; }
    rubricTemplateService.getById(detailId).then(data => {
      if (!data) return;
      setDetailTemplate(data.template);
      setCriteria(data.criteria);
    });
  }, [detailId]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle('');
    setFormDesc('');
    setFormTypeId(null);
    setFormSubjectId(null);
    setFormMaxScore(20);
    setFormOpen(true);
  };

  const openEdit = (t: RubricTemplate) => {
    setEditing(t);
    setFormTitle(t.title);
    setFormDesc(t.description ?? '');
    setFormTypeId(t.assignment_type_id as number | null);
    setFormSubjectId(t.subject_id as number | null);
    setFormMaxScore(t.max_score);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!yearId || !formTitle.trim()) return;
    try {
      if (editing) {
        await rubricTemplateService.update(editing.id, {
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          assignment_type_id: formTypeId,
          subject_id: formSubjectId,
          max_score: formMaxScore,
        });
        addToast('success', 'Grille mise à jour');
      } else {
        const id = await rubricTemplateService.create({
          academic_year_id: yearId,
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          assignment_type_id: formTypeId,
          subject_id: formSubjectId,
          max_score: formMaxScore,
        });
        setDetailId(id);
        addToast('success', 'Grille créée');
      }
      setFormOpen(false);
      await refresh();
    } catch (e) {
      console.error('[RubricBankPage] Save error:', e);
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  const handleClone = async (t: RubricTemplate) => {
    try {
      const newId = await rubricTemplateService.clone(t.id, `${t.title} (copie)`);
      addToast('success', 'Grille clonée');
      setDetailId(newId);
      await refresh();
    } catch (e) {
      console.error('[RubricBankPage] Clone error:', e);
      addToast('error', 'Erreur de clonage');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await rubricTemplateService.delete(deleteTarget.id);
      if (detailId === deleteTarget.id) setDetailId(null);
      addToast('success', 'Grille supprimée');
      await refresh();
    } catch (e) {
      addToast('error', 'Erreur suppression');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Add criterion to current detail
  const handleAddCriterion = async () => {
    if (detailId === null) return;
    try {
      await rubricTemplateService.addCriterion(detailId, { label: 'Nouveau critère' });
      const data = await rubricTemplateService.getById(detailId);
      if (data) setCriteria(data.criteria);
      await refresh();
    } catch (e) {
      addToast('error', 'Erreur ajout critère');
    }
  };

  const handleUpdateDescriptor = (criterionIdx: number, level: number, field: 'label' | 'description', value: string) => {
    setCriteria(prev => prev.map((c, i) => {
      if (i !== criterionIdx) return c;
      return {
        ...c,
        descriptors: c.descriptors.map(d =>
          d.level === level ? { ...d, [field]: value } : d
        ),
      };
    }));
  };

  const handleSaveCriterion = async (criterion: RubricCriterion) => {
    try {
      await rubricTemplateService.updateCriterion(criterion.id, {
        label: criterion.label,
        weight: criterion.weight,
      });
      await rubricTemplateService.saveDescriptors(criterion.id, criterion.descriptors);
      addToast('success', 'Critère enregistré');
    } catch (e) {
      addToast('error', 'Erreur sauvegarde critère');
    }
  };

  const handleDeleteCriterion = async (criterionId: number) => {
    try {
      await rubricTemplateService.deleteCriterion(criterionId);
      setCriteria(prev => prev.filter(c => c.id !== criterionId));
      await refresh();
    } catch (e) {
      addToast('error', 'Erreur suppression critère');
    }
  };

  const filtered = filterType === 'all'
    ? templates
    : templates.filter(t => String(t.assignment_type_id) === filterType);

  if (!yearId) {
    return <EmptyState icon="📅" title="Aucune année active" description="Activez une année scolaire dans Paramètres." />;
  }

  return (
    <div className="rubric-bank">
      <div className="rubric-bank__header">
        <h1 className="rubric-bank__title">Banque de grilles d'évaluation</h1>
        <Button variant="primary" size="S" onClick={openCreate}>+ Nouvelle grille</Button>
      </div>

      {/* Filters */}
      <div className="rubric-bank__filters">
        <Badge variant="filter" active={filterType === 'all'} onClick={() => setFilterType('all')}>
          Toutes ({templates.length})
        </Badge>
        {assignmentTypes.map((at: any) => {
          const count = templates.filter(t => t.assignment_type_id === at.id).length;
          if (count === 0) return null;
          return (
            <Badge key={at.id} variant="filter" active={filterType === String(at.id)} onClick={() => setFilterType(String(at.id))}>
              {at.label} ({count})
            </Badge>
          );
        })}
      </div>

      <div className="rubric-bank__layout">
        {/* List */}
        <div className="rubric-bank__list">
          {loading ? (
            <p className="loading-text">Chargement…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucune grille d'évaluation"
              description="Créez votre première grille pour standardiser vos critères d'évaluation."
              actionLabel="+ Nouvelle grille"
              onAction={openCreate}
            />
          ) : (
            filtered.map(t => (
              <Card
                key={t.id}
                className={`rubric-bank__card ${detailId === t.id ? 'rubric-bank__card--active' : ''}`}
                onClick={() => setDetailId(t.id as number)}
              >
                <div className="rubric-bank__card-header">
                  <strong className="rubric-bank__card-title">{t.title}</strong>
                  <span className="rubric-bank__card-meta">
                    {t.criteria_count} critère{(t.criteria_count ?? 0) > 1 ? 's' : ''}
                  </span>
                </div>
                {t.description && <p className="rubric-bank__card-desc">{t.description}</p>}
                <div className="rubric-bank__card-tags">
                  {t.assignment_type_label && <Badge variant="info">{t.assignment_type_label}</Badge>}
                  {t.subject_label && <Badge variant="default">{t.subject_label}</Badge>}
                  <span className="rubric-bank__card-score">/ {t.max_score}</span>
                </div>
                <div className="rubric-bank__card-actions">
                  <Button variant="ghost" size="S" onClick={(e) => { e.stopPropagation(); openEdit(t); }}>Modifier</Button>
                  <Button variant="ghost" size="S" onClick={(e) => { e.stopPropagation(); handleClone(t); }}>Cloner</Button>
                  <Button variant="ghost" size="S" onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}>Supprimer</Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="rubric-bank__detail">
          {detailId && detailTemplate ? (
            <>
              <div className="rubric-bank__detail-header">
                <h2 className="rubric-bank__detail-title">{detailTemplate.title}</h2>
                <Button variant="secondary" size="S" onClick={handleAddCriterion}>+ Critère</Button>
              </div>

              {criteria.length === 0 ? (
                <EmptyState icon="📝" title="Aucun critère" description="Ajoutez des critères pour construire la grille." actionLabel="+ Ajouter un critère" onAction={handleAddCriterion} />
              ) : (
                <div className="rubric-bank__criteria">
                  {criteria.map((c, idx) => (
                    <Card key={c.id} noHover className="rubric-bank__criterion">
                      <div className="rubric-bank__criterion-header">
                        <input
                          className="rubric-bank__criterion-label"
                          value={c.label}
                          onChange={e => setCriteria(prev => prev.map((cr, i) => i === idx ? { ...cr, label: e.target.value } : cr))}
                        />
                        <label className="rubric-bank__criterion-weight">
                          Poids:
                          <input
                            type="number"
                            min={0.1}
                            step={0.1}
                            value={c.weight}
                            onChange={e => setCriteria(prev => prev.map((cr, i) => i === idx ? { ...cr, weight: parseFloat(e.target.value) || 1 } : cr))}
                          />
                        </label>
                      </div>

                      <table className="rubric-bank__levels-table">
                        <thead>
                          <tr>
                            <th>Niveau</th>
                            <th>Label</th>
                            <th>Observables</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 4].map(level => {
                            const desc = c.descriptors.find(d => d.level === level);
                            return (
                              <tr key={level}>
                                <td>
                                  <span className="rubric-bank__level-badge" style={{ background: LEVEL_COLORS[level - 1] }}>
                                    {LEVEL_SHORT[level - 1]}
                                  </span>
                                </td>
                                <td>
                                  <input
                                    className="rubric-bank__desc-input"
                                    value={desc?.label ?? ''}
                                    onChange={e => handleUpdateDescriptor(idx, level, 'label', e.target.value)}
                                    placeholder="Label…"
                                  />
                                </td>
                                <td>
                                  <textarea
                                    className="rubric-bank__desc-textarea"
                                    value={desc?.description ?? ''}
                                    onChange={e => handleUpdateDescriptor(idx, level, 'description', e.target.value)}
                                    placeholder="Critères observables…"
                                    rows={2}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="rubric-bank__criterion-actions">
                        <Button variant="secondary" size="S" onClick={() => handleSaveCriterion(c)}>Enregistrer</Button>
                        <Button variant="ghost" size="S" onClick={() => handleDeleteCriterion(c.id as number)}>Supprimer</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rubric-bank__detail-empty">
              Sélectionnez une grille pour voir ses critères.
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Modifier la grille' : 'Nouvelle grille'}>
        <div className="rubric-bank__form">
          <label>
            Titre *
            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ex: Commentaire composé — Terminale" />
          </label>
          <label>
            Description
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} placeholder="Optionnel" />
          </label>
          <label>
            Type de devoir
            <select value={formTypeId ?? ''} onChange={e => setFormTypeId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Aucun —</option>
              {assignmentTypes.map((at: any) => <option key={at.id} value={at.id}>{at.label}</option>)}
            </select>
          </label>
          <label>
            Matière
            <select value={formSubjectId ?? ''} onChange={e => setFormSubjectId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Toutes —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.short_label || s.label}</option>)}
            </select>
          </label>
          <label>
            Barème
            <input type="number" value={formMaxScore} onChange={e => setFormMaxScore(Number(e.target.value))} min={1} />
          </label>
          <div className="rubric-bank__form-actions">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={!formTitle.trim()}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la grille"
        message={`Supprimer « ${deleteTarget?.title ?? ''} » ? Cette action est irréversible.`}
      />
    </div>
  );
};
