// ============================================================================
// ListeDevoirsPage — Liste des devoirs (spec §5.9) — branché DataProvider
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { EmptyState } from '../../components/ui';
import { useApp, useData, useRouter } from '../../stores';
import { assignmentService, submissionService } from '../../services';
import { MOCK_ASSIGNMENTS } from '../../stores/mockData';
import { DevoirForm } from '../../components/forms';
import './ListeDevoirsPage.css';

type StatusFilter = 'all' | 'draft' | 'correcting' | 'corrected';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'var(--color-text-muted)' },
  assigned: { label: 'Distribué', color: 'var(--color-info)' },
  correcting: { label: 'En correction', color: 'var(--color-warn)' },
  corrected: { label: 'Corrigé', color: 'var(--color-success)' },
  returned: { label: 'Rendu', color: 'var(--color-primary)' },
};

export const ListeDevoirsPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { loadAssignments } = useData();
  const { navigate } = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const refreshAssignments = useCallback(async () => {
    setLoading(true);
    const data = await loadAssignments();
    setAssignments(data.length > 0 ? data : MOCK_ASSIGNMENTS);
    setLoading(false);
  }, [loadAssignments]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAssignments().then(data => {
      if (cancelled) return;
      setAssignments(data.length > 0 ? data : MOCK_ASSIGNMENTS);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadAssignments]);

  const filtered = assignments.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !(d.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="devoirs-page">
      <div className="devoirs-page__header">
        <h1 className="devoirs-page__title">Devoirs & Corrections</h1>
        <div className="devoirs-page__header-actions">
          <input className="devoirs-page__search" type="text" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="devoirs-page__btn-new" onClick={() => setFormOpen(true)}>+ Nouveau devoir</button>
        </div>
      </div>

      <div className="devoirs-page__filters">
        {(['all', 'draft', 'correcting', 'corrected'] as const).map(s => (
          <button key={s} className={`devoirs-page__filter ${statusFilter === s ? 'devoirs-page__filter--active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Tous' : STATUS_CONFIG[s]?.label ?? s}
            {s !== 'all' && <span className="devoirs-page__filter-count">{assignments.filter(d => d.status === s).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement…</p>
      ) : (
        <div className="devoirs-page__table-wrap">
          <table className="devoirs-page__table">
            <thead>
              <tr>
                <th>Date</th><th>Devoir</th><th>Type</th><th>Classe</th><th>Corrections</th><th>Compétences</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const st = STATUS_CONFIG[d.status] ?? { label: d.status, color: 'var(--color-text-muted)' };
                const corrected = d.corrected_count ?? 0;
                const total = d.total_count ?? 0;
                const skills: string[] = d.skill_labels ?? [];
                return (
                  <tr
                    key={d.id}
                    className="devoirs-page__row"
                    onClick={() => navigate({ tab: 'evaluation', page: 'correction-serie', entityId: d.id })}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="devoirs-page__cell-date">{d.assignment_date ?? d.date ?? '—'}</td>
                    <td><span className="devoirs-page__title-text" style={{ borderLeftColor: d.subject_color ?? d.subjectColor ?? '#888' }}>{d.title}</span></td>
                    <td className="devoirs-page__cell-type">{d.type_label ?? d.type ?? '—'}</td>
                    <td><span className="devoirs-page__badge-class">{d.class_short_name ?? d.class ?? '—'}</span></td>
                    <td>
                      <div className="devoirs-page__progress">
                        <div className="devoirs-page__progress-bar"><div className="devoirs-page__progress-fill" style={{ width: total > 0 ? `${(corrected / total) * 100}%` : '0%' }} /></div>
                        <span className="devoirs-page__progress-text">{corrected}/{total}</span>
                      </div>
                    </td>
                    <td><div className="devoirs-page__skills">{skills.map(s => <span key={s} className="devoirs-page__skill-badge">{s}</span>)}</div></td>
                    <td><span className="devoirs-page__status-badge" style={{ color: st.color, backgroundColor: `color-mix(in srgb, ${st.color} 10%, transparent)` }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📝"
          title="Aucun devoir trouvé"
          description="Créez un premier devoir pour commencer les évaluations."
          actionLabel="+ Nouveau devoir"
          onAction={() => setFormOpen(true)}
        />
      )}

      <DevoirForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={async (data) => {
          if (!activeYear) {
            addToast('error', 'Aucune année scolaire active');
            return;
          }

          const classId = Number.parseInt(data.class_id, 10);
          const subjectId = Number.parseInt(data.subject_id, 10);
          const assignmentTypeId = Number.parseInt(data.assignment_type_id, 10);
          if (!Number.isFinite(classId) || !Number.isFinite(subjectId) || !Number.isFinite(assignmentTypeId)) {
            addToast('error', 'Impossible de créer le devoir: données invalides');
            return;
          }

          const sequenceIdRaw = Number.parseInt(data.sequence_id, 10);
          const maxScoreRaw = Number.parseFloat(data.max_score);
          const coefficientRaw = Number.parseFloat(data.coefficient);
          const skillIds = data.skill_ids
            .map((skillId) => Number.parseInt(skillId, 10))
            .filter(Number.isFinite);

          try {
            const assignmentId = await assignmentService.create({
              academic_year_id: activeYear.id,
              class_id: classId,
              subject_id: subjectId,
              sequence_id: Number.isFinite(sequenceIdRaw) ? sequenceIdRaw : null,
              assignment_type_id: assignmentTypeId,
              title: data.title.trim(),
              description: null,
              instructions: data.instructions.trim() || null,
              max_score: Number.isFinite(maxScoreRaw) ? maxScoreRaw : 20,
              coefficient: Number.isFinite(coefficientRaw) ? coefficientRaw : 1,
              assignment_date: data.assignment_date || null,
              due_date: data.due_date || null,
              status: 'draft',
              is_graded: true,
            });
            await assignmentService.setSkills(assignmentId, skillIds);
            await submissionService.createBatch(assignmentId, classId);
            await refreshAssignments();
            addToast('success', 'Devoir créé');
          } catch (error) {
            console.error('[ListeDevoirsPage] Erreur création devoir:', error);
            addToast('error', 'Échec de création du devoir');
          }
        }}
      />
    </div>
  );
};
