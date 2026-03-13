// ============================================================================
// BulletinsPage - Gestion bulletins (vue classe x periode)
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState, ErrorBoundary, PanelError } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import {
  aiBulletinService,
  bulletinService,
  classService,
  db,
  pdfExportService,
  reportPeriodService,
  studentService,
  subjectService,
} from '../../services';
import { useApp } from '../../stores';
import { usePageLoadTelemetry, trackCacheHit, trackCacheMiss, useUnsavedGuard } from '../../hooks';
import { BULLETIN_STATUS_META } from '../../constants/statuses';
import './BulletinsPage.css';

type BulletinStatus = 'draft' | 'review' | 'final' | 'empty';

interface PeriodInfo {
  id: number;
  code: string;
  label: string;
}

interface StudentRow {
  id: number;
  name: string;
  avg: number | null;
  statuses: Record<string, BulletinStatus>;
}

// Alias local vers le dictionnaire centralisé
const STATUS_DISPLAY = BULLETIN_STATUS_META;
const VIRTUAL_ROW_HEIGHT = 42;
const VIRTUAL_OVERSCAN = 8;

function computeStatus(entries: Array<{ status: 'draft' | 'review' | 'final' }>): BulletinStatus {
  if (entries.some((e) => e.status === 'final')) return 'final';
  if (entries.some((e) => e.status === 'review')) return 'review';
  if (entries.length > 0) return 'draft';
  return 'empty';
}

export const BulletinsPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { isDirty, setDirty, markClean } = useUnsavedGuard();

  const [classes, setClasses] = useState<Array<{ id: number; name: string; short_name: string }>>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; code: string; short_label: string }>>([]);

  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorEntryId, setEditorEntryId] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState('');
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [generatingOne, setGeneratingOne] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listScrollTop, setListScrollTop] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(420);
  const bulletinEntriesCacheRef = useRef<Map<string, any[]>>(new Map());
  const bulletinEntriesPromiseRef = useRef<Map<string, Promise<any[]>>>(new Map());
  const gradesCacheRef = useRef<Map<number, any[]>>(new Map());
  const gradesPromiseRef = useRef<Map<number, Promise<any[]>>>(new Map());

  usePageLoadTelemetry('BulletinsPage', loading);

  const periodCacheKey = (studentId: number, periodId: number) => `${studentId}:${periodId}`;

  const getStudentPeriodEntries = useCallback(async (studentId: number, periodId: number, force = false) => {
    const key = periodCacheKey(studentId, periodId);

    if (force) {
      bulletinEntriesCacheRef.current.delete(key);
      bulletinEntriesPromiseRef.current.delete(key);
    }

    const cached = bulletinEntriesCacheRef.current.get(key);
    if (cached) { trackCacheHit('bulletinEntries'); return cached; }

    const inflight = bulletinEntriesPromiseRef.current.get(key);
    if (inflight) return inflight;

    trackCacheMiss('bulletinEntries');
    const promise = bulletinService.getByStudentPeriod(studentId, periodId)
      .then((entries) => {
        bulletinEntriesCacheRef.current.set(key, entries);
        return entries;
      })
      .finally(() => {
        bulletinEntriesPromiseRef.current.delete(key);
      });

    bulletinEntriesPromiseRef.current.set(key, promise);
    return promise;
  }, []);

  const getRecentGradesCached = useCallback(async (studentId: number, force = false) => {
    if (force) {
      gradesCacheRef.current.delete(studentId);
      gradesPromiseRef.current.delete(studentId);
    }

    const cached = gradesCacheRef.current.get(studentId);
    if (cached) return cached;

    const inflight = gradesPromiseRef.current.get(studentId);
    if (inflight) return inflight;

    const promise = studentService.getRecentGrades(studentId, 20)
      .then((grades) => {
        gradesCacheRef.current.set(studentId, grades);
        return grades;
      })
      .finally(() => {
        gradesPromiseRef.current.delete(studentId);
      });

    gradesPromiseRef.current.set(studentId, promise);
    return promise;
  }, []);

  const invalidateStudentPeriodCache = useCallback((studentId: number, periodId: number) => {
    const key = periodCacheKey(studentId, periodId);
    bulletinEntriesCacheRef.current.delete(key);
    bulletinEntriesPromiseRef.current.delete(key);
  }, []);

  const reloadRowsForClass = useCallback(async (classId: number, periodRows: PeriodInfo[]) => {
    const students = await studentService.getByClass(classId);
    return Promise.all(
      students.map(async (s) => {
        const [grades, byPeriod] = await Promise.all([
          getRecentGradesCached(s.id),
          Promise.all(periodRows.map((p) => getStudentPeriodEntries(s.id, p.id))),
        ]);
        const avg = grades.length > 0 ? grades.reduce((sum, g) => sum + (g.score ?? 0), 0) / grades.length : null;
        const statuses: Record<string, BulletinStatus> = {};
        periodRows.forEach((p, idx) => {
          const entries = byPeriod[idx] ?? [];
          statuses[String(p.id)] = computeStatus(entries as Array<{ status: 'draft' | 'review' | 'final' }>);
        });
        return { id: s.id, name: `${s.last_name} ${s.first_name}`.trim(), avg, statuses } satisfies StudentRow;
      }),
    );
  }, [getRecentGradesCached, getStudentPeriodEntries]);

  useEffect(() => {
    bulletinEntriesCacheRef.current.clear();
    bulletinEntriesPromiseRef.current.clear();
    gradesCacheRef.current.clear();
    gradesPromiseRef.current.clear();
  }, [activeYear?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadContext = async () => {
      if (!activeYear?.id) {
        setClasses([]);
        setPeriods([]);
        setSubjects([]);
        return;
      }

      setLoadError(null);
      try {
        const [classRows, periodRows, subjectRows] = await Promise.all([
          classService.getByYear(activeYear.id),
          reportPeriodService.getByYear(activeYear.id),
          subjectService.getAll(),
        ]);
        if (cancelled) return;

        const mappedClasses = classRows.map((c) => ({ id: c.id, name: c.name, short_name: c.short_name }));
        const mappedPeriods = periodRows.map((p) => ({ id: p.id, code: p.code, label: p.label }));
        const mappedSubjects = subjectRows.map((s) => ({ id: s.id, code: s.code, short_label: s.short_label }));

        setClasses(mappedClasses);
        setPeriods(mappedPeriods);
        setSubjects(mappedSubjects);

        setActiveClassId((prev) => prev ?? mappedClasses[0]?.id ?? null);
        setActivePeriodId((prev) => prev ?? mappedPeriods[0]?.id ?? null);

        const hggsp = mappedSubjects.find((s) => s.code.toUpperCase() === 'HGGSP');
        setActiveSubjectId((prev) => prev ?? hggsp?.id ?? mappedSubjects[0]?.id ?? null);
      } catch (error) {
        console.error('[BulletinsPage] Erreur chargement contexte:', error);
        if (!cancelled) setLoadError('Impossible de charger les classes et périodes.');
      }
    };

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [activeYear, addToast, loadKey]);

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      if (!activeClassId || periods.length === 0) {
        setRows([]);
        return;
      }

      setLoading(true);
      try {
        const mappedRows = await reloadRowsForClass(activeClassId, periods);

        if (!cancelled) {
          setRows(mappedRows);
          setSelectedStudentId((prev) => (prev && mappedRows.some((r) => r.id === prev) ? prev : mappedRows[0]?.id ?? null));
        }
      } catch (error) {
        console.error('[BulletinsPage] Erreur chargement élèves/bulletins:', error);
        if (!cancelled) {
          setRows([]);
          setLoadError('Impossible de charger les bulletins de la classe.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, [activeClassId, periods, addToast, reloadRowsForClass, loadKey]);

  useEffect(() => {
    let cancelled = false;

    const loadEditor = async () => {
      if (!selectedStudentId || !activePeriodId) {
        setEditorText('');
        setEditorEntryId(null);
        return;
      }

      try {
        const entries = await getStudentPeriodEntries(selectedStudentId, activePeriodId);
        if (cancelled) return;
        const classTeacher = entries.find((e) => e.entry_type === 'class_teacher') ?? entries[0] ?? null;
        setEditorText(classTeacher?.content ?? '');
        setEditorEntryId(classTeacher?.id ?? null);
      } catch (error) {
        console.error('[BulletinsPage] Erreur chargement éditeur:', error);
        if (!cancelled) {
          setEditorText('');
          setEditorEntryId(null);
        }
      }
    };

    void loadEditor();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, activePeriodId, getStudentPeriodEntries]);

  const activePeriod = useMemo(() => periods.find((p) => p.id === activePeriodId) ?? null, [periods, activePeriodId]);
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const selectedName = selectedStudentId ? (rowsById.get(selectedStudentId)?.name ?? null) : null;

  const statusCounts = useMemo(() => {
    const initial: Record<BulletinStatus, number> = { draft: 0, review: 0, final: 0, empty: 0 };
    if (!activePeriodId) return initial;
    const key = String(activePeriodId);
    for (const row of rows) {
      const status = row.statuses[key] ?? 'empty';
      initial[status] += 1;
    }
    return initial;
  }, [rows, activePeriodId]);

  const refreshRowsForCurrentClass = useCallback(async () => {
    if (!activeClassId || periods.length === 0) return;
    const mapped = await reloadRowsForClass(activeClassId, periods);
    setRows(mapped);
  }, [activeClassId, periods, reloadRowsForClass]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const updateHeight = () => setListViewportHeight(node.clientHeight || 420);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const upsertCurrentEntry = async (content: string, status: 'draft' | 'review' | 'final', source: 'manual' | 'ai') => {
    if (!selectedStudentId || !activePeriodId) return;
    if (editorEntryId) {
      await bulletinService.update(editorEntryId, content, source);
      await bulletinService.updateStatus(editorEntryId, status);
      invalidateStudentPeriodCache(selectedStudentId, activePeriodId);
      return;
    }
    const createdId = await bulletinService.create({
      student_id: selectedStudentId,
      report_period_id: activePeriodId,
      entry_type: 'class_teacher',
      subject_id: activeSubjectId,
      content,
      status,
      source,
    });
    setEditorEntryId(createdId);
    invalidateStudentPeriodCache(selectedStudentId, activePeriodId);
  };

  const handleGenerateOne = async () => {
    if (!selectedStudentId || !activePeriodId || !activeSubjectId) {
      addToast('warn', 'Sélectionnez un élève, une période et une matière');
      return;
    }
    setGeneratingOne(true);
    try {
      const text = await aiBulletinService.generateAppreciation(
        selectedStudentId,
        activePeriodId,
        activeSubjectId,
        aiInstructions.trim() || undefined,
      );
      setEditorText(text);
      await upsertCurrentEntry(text, 'draft', 'ai');
      await refreshRowsForCurrentClass();
      addToast('success', 'Appréciation générée');
    } catch (error) {
      console.error('[BulletinsPage] Erreur génération IA:', error);
      addToast('error', 'Erreur lors de la génération');
    } finally {
      setGeneratingOne(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!activeClassId || !activePeriodId || !activeSubjectId) {
      addToast('warn', 'Sélectionnez une classe, une période et une matière');
      return;
    }

    setGeneratingBatch(true);
    setBatchProgress({ current: 0, total: rows.length });
    try {
      const generated = await aiBulletinService.generateBatch(
        activeClassId,
        activePeriodId,
        activeSubjectId,
        aiInstructions.trim() || undefined,
        (current, total) => {
          setBatchProgress({ current, total });
        },
      );

      // Pré-charger les entrées existantes (lectures)
      const entriesByStudent = new Map<number, any>();
      for (const [studentId] of generated.entries()) {
        const existing = await getStudentPeriodEntries(studentId, activePeriodId);
        entriesByStudent.set(studentId, existing);
      }

      // Écriture groupée dans une seule transaction
      await db.transaction(async () => {
        for (const [studentId, content] of generated.entries()) {
          const existing = entriesByStudent.get(studentId) ?? [];
          const classTeacher = existing.find((e: any) => e.entry_type === 'class_teacher');
          if (classTeacher) {
            await bulletinService.update(classTeacher.id, content, 'ai');
            await bulletinService.updateStatus(classTeacher.id, 'draft');
          } else {
            await bulletinService.create({
              student_id: studentId,
              report_period_id: activePeriodId,
              entry_type: 'class_teacher',
              subject_id: activeSubjectId,
              content,
              status: 'draft',
              source: 'ai',
            });
          }
        }
      });

      for (const [studentId] of generated.entries()) {
        invalidateStudentPeriodCache(studentId, activePeriodId);
      }

      await refreshRowsForCurrentClass();
      addToast('success', 'Appréciations batch générées');
    } catch (error) {
      console.error('[BulletinsPage] Erreur batch IA:', error);
      addToast('error', 'Erreur lors de la génération batch');
    } finally {
      setGeneratingBatch(false);
      setBatchProgress(null);
    }
  };

  const handleCopyT1 = async () => {
    if (!selectedStudentId) return;
    const t1 = periods.find((p) => p.code.toUpperCase() === 'T1');
    if (!t1) {
      addToast('warn', 'Période T1 introuvable');
      return;
    }
    try {
      const entries = await getStudentPeriodEntries(selectedStudentId, t1.id);
      const classTeacher = entries.find((e) => e.entry_type === 'class_teacher') ?? entries[0] ?? null;
      if (!classTeacher?.content) {
        addToast('info', 'Aucun contenu T1 à copier');
        return;
      }
      setEditorText(classTeacher.content);
      addToast('success', "Contenu T1 copié dans l'éditeur");
    } catch (error) {
      console.error('[BulletinsPage] Erreur copie T1:', error);
      addToast('error', 'Impossible de copier T1');
    }
  };

  const handleSaveStatus = async (status: 'review' | 'final') => {
    if (!selectedStudentId || !activePeriodId) return;
    if (!editorText.trim()) {
      addToast('warn', 'Le texte est vide');
      return;
    }
    try {
      await upsertCurrentEntry(editorText.trim(), status, 'manual');
      markClean();
      await refreshRowsForCurrentClass();
      addToast('success', status === 'final' ? 'Bulletin finalisé' : 'Bulletin passé en relecture');
    } catch (error) {
      console.error('[BulletinsPage] Erreur sauvegarde bulletin:', error);
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  const rowRenderStart = Math.max(0, Math.floor(listScrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
  const rowRenderCount = Math.ceil(listViewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
  const rowRenderEnd = Math.min(rows.length, rowRenderStart + rowRenderCount);
  const topSpacerHeight = rowRenderStart * VIRTUAL_ROW_HEIGHT;
  const bottomSpacerHeight = (rows.length - rowRenderEnd) * VIRTUAL_ROW_HEIGHT;
  const visibleRows = useMemo(() => rows.slice(rowRenderStart, rowRenderEnd), [rows, rowRenderStart, rowRenderEnd]);

  const tableRows = useMemo(
    () => visibleRows.map((s) => (
      <tr
        key={s.id}
        className={`bulletins-page__row ${selectedStudentId === s.id ? 'bulletins-page__row--active' : ''}`}
        onClick={() => setSelectedStudentId(s.id)}
      >
        <td className="bulletins-page__cell-name">{s.name}</td>
        <td className="bulletins-page__cell-avg">{s.avg !== null ? s.avg.toFixed(1) : '-'}</td>
        {periods.map((p) => {
          const st = STATUS_DISPLAY[s.statuses[String(p.id)] ?? 'empty'];
          return (
            <td key={p.id}>
              <span className="bulletins-page__status" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            </td>
          );
        })}
      </tr>
    )),
    [visibleRows, selectedStudentId, periods],
  );

  if (!activeYear?.id) {
    return <EmptyState icon="📅" title="Aucune année active" description="Activez une année scolaire dans Paramètres." />;
  }

  return (
    <div className="bulletins-page">
      <div className="bulletins-page__header">
        <h1 className="bulletins-page__title">
          Bulletins
          {isDirty && <span className="bulletins-page__unsaved-badge">Non enregistré</span>}
        </h1>
        <div className="bulletins-page__header-actions">
          <button className="bulletins-page__btn" onClick={() => void handleGenerateBatch()} disabled={generatingBatch || rows.length === 0}>
            {generatingBatch ? `Génération ${batchProgress?.current ?? 0}/${batchProgress?.total ?? '?'}...` : 'Générer batch (IA)'}
          </button>
          <button
            className="bulletins-page__btn bulletins-page__btn--primary"
            onClick={async () => {
              if (!selectedStudentId || !activePeriodId) return;
              setExportingPdf(true);
              try {
                const html = await pdfExportService.buildBulletinHTML(selectedStudentId, activePeriodId);
                if (!html.trim()) {
                  addToast('error', 'Aperçu PDF vide');
                  return;
                }
                setPdfHtml(html);
              } catch (error) {
                console.error('[BulletinsPage] Erreur export PDF:', error);
                addToast('error', 'Erreur génération PDF');
              } finally {
                setExportingPdf(false);
              }
            }}
            disabled={!selectedStudentId || !activePeriodId || exportingPdf}
          >
            {exportingPdf ? '⏳ Export…' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      <div className="bulletins-page__controls">
        <div className="bulletins-page__class-pills">
          {classes.map((c) => (
            <button
              key={c.id}
              className={`bulletins-page__pill ${activeClassId === c.id ? 'bulletins-page__pill--active' : ''}`}
              onClick={() => setActiveClassId(c.id)}
            >
              {c.short_name || c.name}
            </button>
          ))}
        </div>

        <div className="bulletins-page__period-pills">
          {periods.map((p) => (
            <button
              key={p.id}
              className={`bulletins-page__pill ${activePeriodId === p.id ? 'bulletins-page__pill--active' : ''}`}
              onClick={() => setActivePeriodId(p.id)}
            >
              {p.code || p.label}
            </button>
          ))}
        </div>

        <div className="bulletins-page__summary">
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-success)' }}>OK {statusCounts.final} finaux</span>
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-warn)' }}>! {statusCounts.review} relecture</span>
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-text-muted)' }}>- {statusCounts.draft + statusCounts.empty} restants</span>
        </div>
      </div>

      {loadError && (
        <PanelError
          message={loadError}
          onRetry={() => { setLoadError(null); setLoadKey((k) => k + 1); }}
        />
      )}

      <ErrorBoundary>
      <div className="bulletins-page__body">
        <div
          className="bulletins-page__list"
          ref={listRef}
          onScroll={(e) => setListScrollTop(e.currentTarget.scrollTop)}
        >
          {loading ? (
            <div className="loading-text">Chargement…</div>
          ) : (
            <table className="bulletins-page__table">
              <thead>
                <tr>
                <th>Élève</th>
                  <th>Moy.</th>
                  {periods.map((p) => <th key={p.id}>{p.code || p.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {topSpacerHeight > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={2 + periods.length} style={{ height: topSpacerHeight, padding: 0, border: 'none' }} />
                  </tr>
                )}
                {tableRows}
                {bottomSpacerHeight > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={2 + periods.length} style={{ height: bottomSpacerHeight, padding: 0, border: 'none' }} />
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="bulletins-page__editor">
          {selectedStudentId ? (
            <>
              <div className="bulletins-page__editor-header">
                <h3 className="bulletins-page__editor-title">{selectedName} - {activePeriod?.code ?? activePeriod?.label ?? ''}</h3>
                <select
                  className="bulletins-page__editor-subject"
                  value={activeSubjectId ?? ''}
                  onChange={(e) => setActiveSubjectId(Number.parseInt(e.target.value, 10) || null)}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.short_label || s.code}</option>
                  ))}
                </select>
              </div>

              <textarea
                className="bulletins-page__editor-textarea"
                rows={6}
                value={editorText}
                onChange={(e) => { setEditorText(e.target.value); setDirty(true); }}
                placeholder="Rédiger l'appréciation…"
              />

              <details className="bulletins-page__ia-instructions">
                <summary className="bulletins-page__ia-toggle">Consignes IA complémentaires</summary>
                <textarea
                  className="bulletins-page__ia-textarea"
                  placeholder="Optionnel"
                  rows={2}
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                />
              </details>

              <div className="bulletins-page__editor-actions">
                <button className="bulletins-page__editor-btn" onClick={() => void handleGenerateOne()} disabled={generatingOne}>
                  {generatingOne ? '...' : 'Générer IA'}
                </button>
                <button className="bulletins-page__editor-btn" onClick={() => void handleCopyT1()}>Copier T1</button>
                <div className="bulletins-page__editor-spacer" />
                <button className="bulletins-page__editor-btn bulletins-page__editor-btn--secondary" onClick={() => void handleSaveStatus('review')}>Relecture</button>
                <button className="bulletins-page__editor-btn bulletins-page__editor-btn--primary" onClick={() => void handleSaveStatus('final')}>Finaliser</button>
              </div>
            </>
          ) : (
            <EmptyState icon="📅" title="Aucun élève sélectionné" description="Sélectionnez un élève dans le tableau." />
          )}
        </div>
      </div>
      </ErrorBoundary>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Bulletin scolaire"
        filename="bulletin.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};

