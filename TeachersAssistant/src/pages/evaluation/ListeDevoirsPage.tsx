// ============================================================================
// ListeDevoirsPage — Liste des devoirs (spec §5.9) — branché DataProvider
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { EmptyState, StatusBadge, ConfirmDialog } from '../../components/ui';
import { useApp, useData, useRouter } from '../../stores';
import { assignmentService, submissionService, documentService, classService, getCurrentPath } from '../../services';
import { ASSIGNMENT_STATUS_META } from '../../constants/statuses';
import type { AssignmentStatus } from '../../constants/statuses';
import { useDebounce } from '../../hooks';
import { DevoirForm } from '../../components/forms';
import './ListeDevoirsPage.css';

type StatusFilter = 'all' | AssignmentStatus;
const STATUS_FILTER_ORDER: StatusFilter[] = ['all', 'draft', 'assigned', 'collecting', 'correcting', 'corrected', 'returned'];

const VIRTUAL_ROW_HEIGHT = 44;
const VIRTUAL_OVERSCAN = 6;
const VIRTUAL_THRESHOLD = 50;

export const ListeDevoirsPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { loadAssignments } = useData();
  const { navigate } = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);
  const tableWrapRef = useRef<HTMLDivElement>(null);

  const refreshAssignments = useCallback(async () => {
    setLoading(true);
    const data = await loadAssignments();
    setAssignments(data);
    setLoading(false);
  }, [loadAssignments]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAssignments().then(data => {
      if (cancelled) return;
      setAssignments(data);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadAssignments]);

  const filtered = useMemo(() => assignments.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (debouncedSearch && !(d.title || '').toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  }), [assignments, statusFilter, debouncedSearch]);

  const useVirtual = filtered.length > VIRTUAL_THRESHOLD;
  const rowStart = useVirtual ? Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN) : 0;
  const rowCount = useVirtual ? Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2 : filtered.length;
  const rowEnd = Math.min(filtered.length, rowStart + rowCount);
  const topSpacer = useVirtual ? rowStart * VIRTUAL_ROW_HEIGHT : 0;
  const bottomSpacer = useVirtual ? (filtered.length - rowEnd) * VIRTUAL_ROW_HEIGHT : 0;
  const visibleRows = useMemo(() => filtered.slice(rowStart, rowEnd), [filtered, rowStart, rowEnd]);

  useEffect(() => {
    if (!useVirtual || !tableWrapRef.current) return;
    const el = tableWrapRef.current;
    setViewportHeight(el.clientHeight);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [useVirtual]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assignmentService.delete(deleteTarget.id);
      await refreshAssignments();
      addToast('success', 'Devoir supprimé');
    } catch (error) {
      console.error('[ListeDevoirsPage] Erreur suppression devoir:', error);
      addToast('error', 'Échec de la suppression');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, refreshAssignments, addToast]);

  const handleEdit = useCallback((d: any) => {
    setEditingAssignment({
      title: d.title ?? '',
      class_id: String(d.class_id ?? ''),
      subject_id: String(d.subject_id ?? ''),
      sequence_id: String(d.sequence_id ?? ''),
      assignment_type_id: String(d.assignment_type_id ?? ''),
      max_score: String(d.max_score ?? '20'),
      coefficient: String(d.coefficient ?? '1'),
      assignment_date: d.assignment_date ?? '',
      due_date: d.due_date ?? '',
      instructions: d.instructions ?? '',
      skill_ids: (d.skill_labels ?? []).map((_: any, i: number) => String(i + 1)),
      _id: d.id,
    });
    setFormOpen(true);
  }, []);

  return (
    <div className="devoirs-page">
      <div className="devoirs-page__header">
        <h1 className="devoirs-page__title">Devoirs & Corrections</h1>
        <div className="devoirs-page__header-actions">
          <input className="devoirs-page__search" type="text" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un devoir" />
          <button className="devoirs-page__btn-new" onClick={() => { setEditingAssignment(null); setFormOpen(true); }}>+ Nouveau devoir</button>
        </div>
      </div>

      <div className="devoirs-page__filters">
        {STATUS_FILTER_ORDER.map(s => (
          <button key={s} className={`devoirs-page__filter ${statusFilter === s ? 'devoirs-page__filter--active' : ''}`} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}>
            {s === 'all' ? 'Tous' : ASSIGNMENT_STATUS_META[s]?.label ?? s}
            {s !== 'all' && <span className="devoirs-page__filter-count">{assignments.filter(d => d.status === s).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : (
        <div className="devoirs-page__table-wrap" ref={tableWrapRef} style={useVirtual ? { maxHeight: 600, overflow: 'auto' } : undefined}>
          <table className="devoirs-page__table">
            <thead>
              <tr>
                <th>Date</th><th>Devoir</th><th>Type</th><th>Classe</th><th>Corrections</th><th>Compétences</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {topSpacer > 0 && <tr style={{ height: topSpacer }} aria-hidden="true" />}
              {visibleRows.map(d => {
                const corrected = d.corrected_count ?? 0;
                const total = d.total_count ?? 0;
                const skills: string[] = d.skill_labels ?? [];
                return (
                  <tr
                    key={d.id}
                    className="devoirs-page__row"
                    onClick={() => navigate({ tab: 'evaluation', page: 'correction-serie', entityId: d.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate({ tab: 'evaluation', page: 'correction-serie', entityId: d.id }); } }}
                    tabIndex={0}
                    role="link"
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
                    <td><StatusBadge meta={ASSIGNMENT_STATUS_META} value={d.status} /></td>
                    <td>
                      <div className="devoirs-page__row-actions" onClick={e => e.stopPropagation()}>
                        <button className="devoirs-page__action-btn" title="Modifier" aria-label={`Modifier ${d.title}`} onClick={() => handleEdit(d)}>✎</button>
                        <button className="devoirs-page__action-btn devoirs-page__action-btn--danger" title="Supprimer" aria-label={`Supprimer ${d.title}`} onClick={() => setDeleteTarget(d)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {bottomSpacer > 0 && <tr style={{ height: bottomSpacer }} aria-hidden="true" />}
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
        onClose={() => { setFormOpen(false); setEditingAssignment(null); }}
        initialData={editingAssignment ?? undefined}
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
            if (editingAssignment?._id) {
              await assignmentService.update(editingAssignment._id, {
                class_id: classId,
                subject_id: subjectId,
                sequence_id: Number.isFinite(sequenceIdRaw) ? sequenceIdRaw : null,
                assignment_type_id: assignmentTypeId,
                title: data.title.trim(),
                instructions: data.instructions.trim() || null,
                max_score: Number.isFinite(maxScoreRaw) ? maxScoreRaw : 20,
                coefficient: Number.isFinite(coefficientRaw) ? coefficientRaw : 1,
                assignment_date: data.assignment_date || null,
                due_date: data.due_date || null,
              });
              await assignmentService.setSkills(editingAssignment._id, skillIds);
              await refreshAssignments();
              addToast('success', 'Devoir modifié');
            } else {
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

              // Attacher le sujet PDF/DOCX si fourni
              if (data.subject_file) {
                try {
                  const dbPath = getCurrentPath();
                  if (dbPath) {
                    const lastSlash = Math.max(dbPath.lastIndexOf('/'), dbPath.lastIndexOf('\\'));
                    const dbDir = lastSlash >= 0 ? dbPath.slice(0, lastSlash) : '.';
                    const docsDir = dbDir + '/documents';

                    // Ensure directory exists
                    const { mkdir, exists, writeFile } = await import('@tauri-apps/plugin-fs');
                    if (!(await exists(docsDir))) {
                      await mkdir(docsDir, { recursive: true });
                    }

                    // Write file to disk
                    const ext = data.subject_file.name.split('.').pop()?.toLowerCase() || '';
                    const safeName = data.subject_file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 60);
                    const destPath = `${docsDir}/${safeName}_${Date.now()}.${ext}`;
                    const buffer = await data.subject_file.arrayBuffer();
                    await writeFile(destPath, new Uint8Array(buffer));

                    // Resolve level_id from class
                    const cls = await classService.getById(classId);
                    const levelId = cls?.level_id ?? null;

                    // Create document in library
                    const docId = await documentService.create({
                      title: `Sujet — ${data.title.trim()}`,
                      file_path: destPath,
                      file_name: data.subject_file.name,
                      file_type: ext,
                      file_size: data.subject_file.size,
                      file_hash: null,
                      mime_type: data.subject_file.type || null,
                      document_type_id: null,
                      subject_id: subjectId,
                      level_id: levelId,
                      thumbnail_path: null,
                      extracted_text: data.subject_extracted_text || null,
                      source: 'import',
                      generated_from_ai_generation_id: null,
                      notes: null,
                    });

                    // Update assignment with subject info
                    await assignmentService.update(assignmentId, {
                      subject_file_path: destPath,
                      subject_document_id: docId,
                      subject_extracted_text: data.subject_extracted_text || null,
                    });
                  }
                } catch (fileErr) {
                  console.error('[ListeDevoirsPage] Erreur attachement sujet:', fileErr);
                  addToast('warn', 'Devoir créé mais échec de l\'attachement du sujet');
                }
              }

              await refreshAssignments();
              addToast('success', 'Devoir créé');
            }
          } catch (error) {
            console.error('[ListeDevoirsPage] Erreur sauvegarde devoir:', error);
            addToast('error', editingAssignment?._id ? 'Échec de la modification' : 'Échec de création du devoir');
          } finally {
            setEditingAssignment(null);
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le devoir"
        message={`Supprimer le devoir « ${deleteTarget?.title ?? ''} » et toutes ses copies ? Cette action est irréversible.`}
        loading={deleting}
      />
    </div>
  );
};
