// ============================================================================
// TimelinePedagogiquePage — Projection dynamique de couverture programme
// Onglets : Couverture thèmes | Rythme | Timeline semaine
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Card, Badge, EmptyState } from '../../components/ui';
import { useApp } from '../../stores';
import { sequenceService } from '../../services';
import { timelineProjectionService } from '../../services/timelineProjectionService';
import type { TopicCoverage, PaceAnalysis, TimelineSlot } from '../../services/timelineProjectionService';
import './TimelinePedagogiquePage.css';

type Tab = 'coverage' | 'pace' | 'weekly';

export const TimelinePedagogiquePage: React.FC = () => {
  const { activeYear } = useApp();
  const yearId = activeYear?.id ?? null;
  const [tab, setTab] = useState<Tab>('coverage');
  const [coverage, setCoverage] = useState<TopicCoverage[]>([]);
  const [pace, setPace] = useState<PaceAnalysis[]>([]);
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!yearId) return;
    setLoading(true);
    try {
      if (tab === 'coverage') {
        setCoverage(await timelineProjectionService.getCoverageByTheme(yearId));
      } else if (tab === 'pace') {
        setPace(await timelineProjectionService.getPaceAnalysis(yearId));
      } else {
        setTimeline(await timelineProjectionService.getWeeklyTimeline(yearId));
      }
    } catch (err) {
      console.error('[Timeline]', err);
    } finally {
      setLoading(false);
    }
  }, [yearId, tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="timeline-page">
      <div className="timeline-page__header">
        <h2 className="timeline-page__title">Timeline pédagogique</h2>
        <div className="timeline-page__tabs">
          <button className={`timeline-page__tab ${tab === 'coverage' ? 'timeline-page__tab--active' : ''}`} onClick={() => setTab('coverage')}>
            Couverture programme
          </button>
          <button className={`timeline-page__tab ${tab === 'pace' ? 'timeline-page__tab--active' : ''}`} onClick={() => setTab('pace')}>
            Rythme
          </button>
          <button className={`timeline-page__tab ${tab === 'weekly' ? 'timeline-page__tab--active' : ''}`} onClick={() => setTab('weekly')}>
            Timeline semaine
          </button>
        </div>
      </div>

      {loading && <div className="timeline-page__loading">Chargement…</div>}

      {!loading && tab === 'coverage' && (
        <CoveragePanel coverage={coverage} expandedTopic={expandedTopic} onToggle={setExpandedTopic} />
      )}
      {!loading && tab === 'pace' && <PacePanel pace={pace} />}
      {!loading && tab === 'weekly' && <WeeklyPanel timeline={timeline} yearId={yearId} onRefresh={load} />}
    </div>
  );
};

// ── Coverage Panel ──

const CoveragePanel: React.FC<{
  coverage: TopicCoverage[];
  expandedTopic: number | null;
  onToggle: (id: number | null) => void;
}> = ({ coverage, expandedTopic, onToggle }) => {
  if (coverage.length === 0) {
    return <EmptyState icon="📊" title="Aucun thème de programme" description="Importez un programme officiel pour voir la couverture." />;
  }

  return (
    <div className="timeline-page__coverage-list">
      {coverage.map(t => (
        <Card key={t.topicId} noHover className="timeline-page__coverage-card">
          <div className="timeline-page__coverage-header" onClick={() => onToggle(expandedTopic === t.topicId ? null : t.topicId)}>
            <div className="timeline-page__coverage-info">
              <span className="timeline-page__coverage-badge" style={{ backgroundColor: t.subjectColor + '20', color: t.subjectColor }}>
                {t.subjectLabel} {t.levelLabel}
              </span>
              <span className="timeline-page__coverage-title">
                {t.topicCode ? `${t.topicCode} — ` : ''}{t.topicTitle}
              </span>
            </div>
            <div className="timeline-page__coverage-stats">
              <span className="timeline-page__coverage-hours">
                {t.completedHours}h / {t.expectedHours}h
              </span>
              <span className="timeline-page__coverage-planned" title="Heures planifiées">
                ({t.plannedHours}h prévues)
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="timeline-page__progress-track">
            <div
              className="timeline-page__progress-done"
              style={{ width: `${Math.min(100, t.coveragePercent)}%`, backgroundColor: t.subjectColor }}
            />
            {t.plannedHours > t.completedHours && t.expectedHours > 0 && (
              <div
                className="timeline-page__progress-planned"
                style={{
                  left: `${Math.min(100, t.coveragePercent)}%`,
                  width: `${Math.min(100 - t.coveragePercent, Math.round(((t.plannedHours - t.completedHours) / t.expectedHours) * 100))}%`,
                  backgroundColor: t.subjectColor,
                }}
              />
            )}
          </div>
          <div className="timeline-page__progress-label">
            <Badge variant={t.coveragePercent >= 80 ? 'success' : t.coveragePercent >= 40 ? 'filter' : 'info'}>
              {t.coveragePercent}%
            </Badge>
            {t.coveragePercent < 100 && t.expectedHours > 0 && (
              <span className="timeline-page__coverage-remaining">
                Reste {Math.max(0, Math.round((t.expectedHours - t.completedHours) * 10) / 10)}h
              </span>
            )}
          </div>

          {/* Expanded: linked sequences */}
          {expandedTopic === t.topicId && t.sequences.length > 0 && (
            <div className="timeline-page__sequences">
              {t.sequences.map(s => (
                <div key={s.id} className="timeline-page__sequence-row">
                  <Badge variant={s.status === 'done' ? 'success' : s.status === 'in_progress' ? 'filter' : 'info'}>
                    {s.status === 'done' ? 'Terminée' : s.status === 'in_progress' ? 'En cours' : 'Planifiée'}
                  </Badge>
                  <span className="timeline-page__sequence-title">{s.title}</span>
                  <span className="timeline-page__sequence-hours">{s.doneHours}h / {s.totalHours}h</span>
                  {s.startDate && (
                    <span className="timeline-page__sequence-dates">
                      {s.startDate}{s.endDate ? ` → ${s.endDate}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {expandedTopic === t.topicId && t.sequences.length === 0 && (
            <div className="timeline-page__sequences-empty">Aucune séquence liée à ce thème</div>
          )}
        </Card>
      ))}
    </div>
  );
};

// ── Pace Panel ──

const PacePanel: React.FC<{ pace: PaceAnalysis[] }> = ({ pace }) => {
  if (pace.length === 0) {
    return <EmptyState icon="🏃" title="Aucune allocation horaire" description="Configurez les volumes horaires pour voir l'analyse de rythme." />;
  }

  return (
    <div className="timeline-page__pace-list">
      {pace.map((p, i) => {
        const status = p.paceRatio >= 0.9 ? 'ahead' : p.paceRatio >= 0.7 ? 'ok' : 'behind';
        return (
          <Card key={i} noHover className="timeline-page__pace-card">
            <div className="timeline-page__pace-header">
              <span className="timeline-page__pace-subject" style={{ color: p.subjectColor }}>
                {p.subjectLabel} {p.levelLabel}
              </span>
              <Badge variant={status === 'ahead' ? 'success' : status === 'ok' ? 'filter' : 'danger'}>
                {status === 'ahead' ? 'En avance / à jour' : status === 'ok' ? 'Léger retard' : 'En retard'}
              </Badge>
            </div>

            <div className="timeline-page__pace-bars">
              <div className="timeline-page__pace-row">
                <span className="timeline-page__pace-label">Attendu à ce jour</span>
                <div className="timeline-page__pace-bar-track">
                  <div
                    className="timeline-page__pace-bar timeline-page__pace-bar--expected"
                    style={{ width: `${Math.min(100, (p.expectedByNow / p.annualTarget) * 100)}%` }}
                  />
                </div>
                <span className="timeline-page__pace-value">{p.expectedByNow}h</span>
              </div>
              <div className="timeline-page__pace-row">
                <span className="timeline-page__pace-label">Réalisé</span>
                <div className="timeline-page__pace-bar-track">
                  <div
                    className="timeline-page__pace-bar timeline-page__pace-bar--done"
                    style={{ width: `${Math.min(100, (p.completedByNow / p.annualTarget) * 100)}%`, backgroundColor: p.subjectColor }}
                  />
                </div>
                <span className="timeline-page__pace-value">{p.completedByNow}h</span>
              </div>
            </div>

            <div className="timeline-page__pace-footer">
              <span>Objectif annuel : {p.annualTarget}h</span>
              <span>{p.remainingWeeks} semaines restantes</span>
              {p.requiredPace > 0 && (
                <span className="timeline-page__pace-required">
                  Rythme requis : {p.requiredPace}h/sem
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ── Weekly Timeline Panel (with drag & drop) ──

interface WeeklyPanelProps {
  timeline: TimelineSlot[];
  yearId: number | string | null;
  onRefresh: () => void;
}

const WeeklyPanel: React.FC<WeeklyPanelProps> = ({ timeline, yearId, onRefresh }) => {
  const [activeSeq, setActiveSeq] = useState<{ id: string | number; title: string; subjectColor: string; hoursThisWeek: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (timeline.length === 0) {
    return <EmptyState icon="📅" title="Aucune donnée de calendrier" description="Configurez l'année scolaire et les vacances." />;
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentIdx = timeline.findIndex(s => s.weekStart <= today && s.weekStart > (timeline[timeline.indexOf(s) - 1]?.weekStart ?? ''));

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSeq(null);
    const { active, over } = event;
    if (!over || !yearId) return;

    // active.id = "seq-{seqId}-week-{fromWeekStart}"
    // over.id = "drop-{toWeekStart}"
    const activeId = String(active.id);
    const overId = String(over.id);

    const seqIdMatch = activeId.match(/^seq-(.+?)-week-(.+)$/);
    const dropMatch = overId.match(/^drop-(.+)$/);
    if (!seqIdMatch || !dropMatch) return;

    const seqId = seqIdMatch[1]!;
    const fromWeek = seqIdMatch[2]!;
    const toWeek = dropMatch[1]!;

    if (fromWeek === toWeek) return;

    // Compute day delta between weeks and shift start_date/end_date
    const fromDate = new Date(fromWeek);
    const toDate = new Date(toWeek);
    const daysDelta = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    try {
      // Load current sequence to get its dates
      const seqs = await sequenceService.getByYear(Number(yearId));
      const seq = seqs.find(s => String(s.id) === seqId);
      if (!seq || !seq.start_date) return;

      const newStart = shiftDate(seq.start_date, daysDelta);
      const newEnd = seq.end_date ? shiftDate(seq.end_date, daysDelta) : undefined;

      await sequenceService.update(seq.id, {
        start_date: newStart,
        ...(newEnd ? { end_date: newEnd } : {}),
      });
      onRefresh();
    } catch (err) {
      console.error('[WeeklyPanel] drag error:', err);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={({ active }) => {
      // Find the sequence data for overlay
      for (const slot of timeline) {
        const seq = slot.sequences.find(s => `seq-${s.id}-week-${slot.weekStart}` === String(active.id));
        if (seq) { setActiveSeq(seq); break; }
      }
    }} onDragEnd={handleDragEnd}>
      <div className="timeline-page__weekly">
        <div className="timeline-page__weekly-scroll">
          {timeline.map((slot, i) => {
            const nextSlot = timeline[i + 1];
            const isCurrent = i === currentIdx || (currentIdx === -1 && slot.weekStart <= today &&
              (i === timeline.length - 1 || (nextSlot != null && nextSlot.weekStart > today)));
            return (
              <DroppableWeek key={slot.weekStart} weekStart={slot.weekStart} isVacation={slot.isVacation} isCurrent={isCurrent}>
                <div className="timeline-page__week-label">{slot.weekLabel}</div>
                {slot.isVacation && (
                  <div className="timeline-page__week-vacation">{slot.vacationLabel ?? 'Vacances'}</div>
                )}
                {slot.sequences.map(s => (
                  <DraggableSeq key={s.id} seqId={s.id} weekStart={slot.weekStart} title={s.title} subjectColor={s.subjectColor} hoursThisWeek={s.hoursThisWeek} />
                ))}
              </DroppableWeek>
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {activeSeq && (
          <div className="timeline-page__week-seq timeline-page__week-seq--dragging" style={{ borderLeftColor: activeSeq.subjectColor }}>
            <span className="timeline-page__week-seq-title">{activeSeq.title}</span>
            <span className="timeline-page__week-seq-hours">{activeSeq.hoursThisWeek}h</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

// ── Droppable week row ──

const DroppableWeek: React.FC<{
  weekStart: string;
  isVacation: boolean;
  isCurrent: boolean;
  children: React.ReactNode;
}> = ({ weekStart, isVacation, isCurrent, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${weekStart}` });

  return (
    <div
      ref={setNodeRef}
      className={`timeline-page__week ${isVacation ? 'timeline-page__week--vacation' : ''} ${isCurrent ? 'timeline-page__week--current' : ''} ${isOver ? 'timeline-page__week--drop-over' : ''}`}
    >
      {children}
    </div>
  );
};

// ── Draggable sequence block ──

const DraggableSeq: React.FC<{
  seqId: string | number;
  weekStart: string;
  title: string;
  subjectColor: string;
  hoursThisWeek: number;
}> = ({ seqId, weekStart, title, subjectColor, hoursThisWeek }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `seq-${seqId}-week-${weekStart}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`timeline-page__week-seq ${isDragging ? 'timeline-page__week-seq--ghost' : ''}`}
      style={{ borderLeftColor: subjectColor, cursor: 'grab' }}
    >
      <span className="timeline-page__week-seq-title">{title}</span>
      <span className="timeline-page__week-seq-hours">{hoursThisWeek}h</span>
    </div>
  );
};

// ── Date shift helper ──

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
