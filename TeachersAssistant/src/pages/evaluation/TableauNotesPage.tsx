// ============================================================================
// TableauNotesPage — Tableau de notes (grille élèves × évaluations)
// Filtres : classe, matière, période. Moyennes pondérées par coefficient.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../../stores';
import { classService, subjectService, reportPeriodService, gradeTableService } from '../../services';
import { EmptyState } from '../../components/ui';
import { PronoteGradeImportModal } from '../../components/evaluation/PronoteGradeImportModal';
import type { GradeTableResult, ReportPeriod } from '../../types';
import type { ClassWithLevel, Subject } from '../../types/academic';
import './TableauNotesPage.css';

// ── Helpers ──

/** Moyenne pondérée (note ramenée sur 20) en tenant compte du coefficient */
function computeWeightedAverage(
  studentId: number | string,
  result: GradeTableResult,
): number | null {
  let sumWeighted = 0;
  let sumCoeff = 0;
  for (const a of result.assignments) {
    const sc = result.scores.find(
      s => s.student_id === studentId && s.assignment_id === a.id && s.score !== null,
    );
    if (sc && sc.score !== null) {
      // Ramener la note sur 20 puis pondérer
      const sur20 = (sc.score / a.max_score) * 20;
      sumWeighted += sur20 * a.coefficient;
      sumCoeff += a.coefficient;
    }
  }
  return sumCoeff > 0 ? Math.round((sumWeighted / sumCoeff) * 100) / 100 : null;
}

/** Moyenne de classe pour un devoir */
function assignmentClassAverage(
  assignmentId: number | string,
  result: GradeTableResult,
): number | null {
  const scores = result.scores.filter(
    s => s.assignment_id === assignmentId && s.score !== null,
  );
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + (s.score ?? 0), 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/** Couleur de la note selon le pourcentage du barème */
function scoreColor(score: number | null, maxScore: number): string {
  if (score === null) return '';
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 50) return 'var(--color-text)';
  if (pct >= 30) return 'var(--color-warning, #e67e22)';
  return 'var(--color-danger)';
}

/** Couleur de la moyenne /20 */
function avgColor(avg: number | null): string {
  if (avg === null) return '';
  if (avg >= 16) return 'var(--color-success)';
  if (avg >= 10) return 'var(--color-text)';
  if (avg >= 6) return 'var(--color-warning, #e67e22)';
  return 'var(--color-danger)';
}

const VIRTUAL_ROW_HEIGHT = 32;
const VIRTUAL_OVERSCAN = 8;
const VIRTUAL_THRESHOLD = 50;

// ── Composant ──

export const TableauNotesPage: React.FC = () => {
  const { activeYear, addToast } = useApp();

  const [classes, setClasses] = useState<ClassWithLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all'); // 'all' | period id
  const [data, setData] = useState<GradeTableResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Virtualization
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Charger classes, matières, périodes
  useEffect(() => {
    if (!activeYear) return;
    Promise.all([
      classService.getByYear(activeYear.id),
      subjectService.getAll(),
      reportPeriodService.getByYear(activeYear.id),
    ]).then(([cls, subs, pds]) => {
      setClasses(cls);
      setSubjects(subs);
      setPeriods(pds);
      if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0]!.id);
      if (subs.length > 0 && !selectedSubjectId) setSelectedSubjectId(subs[0]!.id);
    });
  }, [activeYear]);

  // Charger le tableau
  const loadData = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId || !activeYear) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      // Déterminer les bornes de la période sélectionnée
      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      if (selectedPeriodId !== 'all') {
        const p = periods.find(pp => String(pp.id) === selectedPeriodId);
        if (p) {
          periodStart = p.start_date;
          periodEnd = p.end_date;
        }
      }
      const result = await gradeTableService.getGradeTable(
        selectedClassId, selectedSubjectId, activeYear.id,
        periodStart, periodEnd,
      );
      setData(result);
    } catch (err) {
      console.error('[TableauNotes] Erreur:', err);
      addToast('error', 'Impossible de charger le tableau de notes');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSubjectId, activeYear, selectedPeriodId, periods, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Lookup rapide des notes : clé "studentId-assignmentId"
  const scoreLookup = useMemo(() => {
    const map = new Map<string, number | null>();
    if (data) {
      for (const s of data.scores) {
        map.set(`${s.student_id}-${s.assignment_id}`, s.score);
      }
    }
    return map;
  }, [data]);

  // Moyennes par élève
  const studentAverages = useMemo(() => {
    if (!data) return new Map<string | number, number | null>();
    const map = new Map<string | number, number | null>();
    for (const st of data.students) {
      map.set(st.id, computeWeightedAverage(st.id, data));
    }
    return map;
  }, [data]);

  // Moyenne générale de la classe (moyenne des moyennes élèves)
  const classGeneralAvg = useMemo(() => {
    const avgs = Array.from(studentAverages.values()).filter((v): v is number => v !== null);
    if (avgs.length === 0) return null;
    return Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100;
  }, [studentAverages]);

  // Virtual row calculations
  const studentCount = data?.students.length ?? 0;
  const useVirtual = studentCount > VIRTUAL_THRESHOLD;
  const rowStart = useVirtual ? Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN) : 0;
  const rowCount = useVirtual ? Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2 : studentCount;
  const rowEnd = Math.min(studentCount, rowStart + rowCount);
  const topSpacer = useVirtual ? rowStart * VIRTUAL_ROW_HEIGHT : 0;
  const bottomSpacer = useVirtual ? (studentCount - rowEnd) * VIRTUAL_ROW_HEIGHT : 0;
  const visibleStudents = useMemo(
    () => data?.students.slice(rowStart, rowEnd) ?? [],
    [data, rowStart, rowEnd],
  );

  useEffect(() => {
    if (!useVirtual || !tableWrapRef.current) return;
    const el = tableWrapRef.current;
    setViewportHeight(el.clientHeight);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [useVirtual]);

  const className = classes.find(c => c.id === selectedClassId)?.name ?? '';
  const subjectLabel = subjects.find(s => s.id === selectedSubjectId)?.label ?? '';

  return (
    <div className="grade-table">
      <div className="grade-table__header">
        <h1 className="grade-table__title">Tableau de notes</h1>
        {selectedClassId && selectedSubjectId && activeYear && (
          <button
            className="grade-table__import-btn"
            onClick={() => setImportOpen(true)}
          >
            📥 Importer notes PDF (Pronote)
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="grade-table__filters">
        <div className="grade-table__filter">
          <label className="grade-table__filter-label">Classe</label>
          <select
            className="grade-table__select"
            value={selectedClassId ?? ''}
            onChange={e => setSelectedClassId(Number(e.target.value) || null)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grade-table__filter">
          <label className="grade-table__filter-label">Matière</label>
          <select
            className="grade-table__select"
            value={selectedSubjectId ?? ''}
            onChange={e => setSelectedSubjectId(Number(e.target.value) || null)}
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="grade-table__filter">
          <label className="grade-table__filter-label">Période</label>
          <select
            className="grade-table__select"
            value={selectedPeriodId}
            onChange={e => setSelectedPeriodId(e.target.value)}
          >
            <option value="all">Année complète</option>
            {periods.map(p => (
              <option key={p.id} value={String(p.id)}>{p.label}</option>
            ))}
          </select>
        </div>
        {data && (
          <span className="grade-table__meta">
            {data.students.length} élèves · {data.assignments.length} évaluations
            {classGeneralAvg !== null && ` · Moy. classe : ${classGeneralAvg.toFixed(2)}/20`}
          </span>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="grade-table__loading">Chargement…</p>
      ) : !data || data.assignments.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Aucune évaluation notée"
          description={`Aucun devoir noté trouvé pour ${className || 'cette classe'} en ${subjectLabel || 'cette matière'}${selectedPeriodId !== 'all' ? ' sur cette période' : ''}.`}
        />
      ) : (
        <div className="grade-table__table-wrap" ref={tableWrapRef} style={useVirtual ? { maxHeight: 600, overflow: 'auto' } : undefined}>
          <table className="grade-table__table">
            <thead>
              <tr>
                <th className="grade-table__th grade-table__th--rank">#</th>
                <th className="grade-table__th grade-table__th--student">Élève</th>
                {data.assignments.map(a => (
                  <th key={a.id as number} className="grade-table__th grade-table__th--score"
                    title={`${a.title}\nBarème : /${a.max_score} — Coeff. ${a.coefficient}\nDate : ${a.assignment_date || a.due_date || '?'}`}
                  >
                    <div className="grade-table__th-title">{a.title}</div>
                    <div className="grade-table__th-meta">
                      /{a.max_score}
                      {a.coefficient !== 1 && <span className="grade-table__coeff"> x{a.coefficient}</span>}
                    </div>
                  </th>
                ))}
                <th className="grade-table__th grade-table__th--avg">Moy. /20</th>
              </tr>
            </thead>
            <tbody>
              {topSpacer > 0 && <tr aria-hidden="true"><td colSpan={3 + data.assignments.length} style={{ height: topSpacer, padding: 0, border: 'none' }} /></tr>}
              {visibleStudents.map((st, localIdx) => {
                const globalIdx = rowStart + localIdx;
                const avg = studentAverages.get(st.id) ?? null;
                return (
                  <tr key={st.id as number} className="grade-table__row">
                    <td className="grade-table__td grade-table__td--rank">{globalIdx + 1}</td>
                    <td className="grade-table__td grade-table__td--student">
                      {st.last_name} {st.first_name}
                    </td>
                    {data.assignments.map(a => {
                      const score = scoreLookup.get(`${st.id}-${a.id}`) ?? null;
                      return (
                        <td
                          key={a.id as number}
                          className="grade-table__td grade-table__td--score"
                          style={{ color: scoreColor(score, a.max_score) }}
                        >
                          {score !== null ? score.toString().replace('.', ',') : '–'}
                        </td>
                      );
                    })}
                    <td
                      className="grade-table__td grade-table__td--avg"
                      style={{ color: avgColor(avg) }}
                    >
                      {avg !== null ? avg.toFixed(2).replace('.', ',') : '–'}
                    </td>
                  </tr>
                );
              })}
              {bottomSpacer > 0 && <tr aria-hidden="true"><td colSpan={3 + data.assignments.length} style={{ height: bottomSpacer, padding: 0, border: 'none' }} /></tr>}
            </tbody>
            <tfoot>
              <tr className="grade-table__row grade-table__row--footer">
                <td className="grade-table__td"></td>
                <td className="grade-table__td grade-table__td--student">Moy. classe</td>
                {data.assignments.map(a => {
                  const avg = assignmentClassAverage(a.id, data);
                  return (
                    <td key={a.id as number} className="grade-table__td grade-table__td--score"
                      style={{ color: avg !== null ? scoreColor(avg, a.max_score) : '' }}
                    >
                      {avg !== null ? avg.toFixed(1).replace('.', ',') : '–'}
                    </td>
                  );
                })}
                <td className="grade-table__td grade-table__td--avg"
                  style={{ color: avgColor(classGeneralAvg) }}
                >
                  {classGeneralAvg !== null ? classGeneralAvg.toFixed(2).replace('.', ',') : '–'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal import Pronote */}
      {selectedClassId && selectedSubjectId && activeYear && (
        <PronoteGradeImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          classId={selectedClassId}
          subjectId={selectedSubjectId}
          yearId={activeYear.id as number}
          students={data?.students.map(s => ({ id: s.id as number, last_name: s.last_name, first_name: s.first_name })) ?? []}
          onImported={() => {
            addToast('success', 'Notes importées avec succès');
            loadData();
          }}
        />
      )}
    </div>
  );
};
