// ============================================================================
// Teacher Assistant — Timeline Projection Service
// Analyse de couverture programme, projection, scénarios "et si…"
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

// ── Types ──

export interface TopicCoverage {
  topicId: ID;
  topicTitle: string;
  topicCode: string | null;
  subjectLabel: string;
  subjectColor: string;
  levelLabel: string;
  expectedHours: number;
  completedHours: number;
  plannedHours: number;
  coveragePercent: number;
  /** Linked sequences */
  sequences: CoverageSequence[];
}

export interface CoverageSequence {
  id: ID;
  title: string;
  status: string;
  totalHours: number;
  startDate: string | null;
  endDate: string | null;
  doneHours: number;
}

export interface PaceAnalysis {
  subjectLabel: string;
  subjectColor: string;
  levelLabel: string;
  /** Hours expected from Sept 1 to today (proportional) */
  expectedByNow: number;
  /** Hours actually completed */
  completedByNow: number;
  /** Total annual target */
  annualTarget: number;
  /** Pace indicator: >1 = ahead, <1 = behind */
  paceRatio: number;
  /** Remaining teaching weeks */
  remainingWeeks: number;
  /** Hours/week needed to finish on time */
  requiredPace: number;
}

export interface TimelineSlot {
  weekStart: string;
  weekLabel: string;
  isVacation: boolean;
  vacationLabel?: string;
  sequences: {
    id: ID;
    title: string;
    subjectColor: string;
    hoursThisWeek: number;
    status: string;
  }[];
}

export interface WhatIfResult {
  original: TopicCoverage[];
  shifted: TopicCoverage[];
  /** Topics whose coverage changed */
  impacted: {
    topicId: ID;
    topicTitle: string;
    originalPercent: number;
    newPercent: number;
    delta: number;
  }[];
}

// ── Service ──

export const timelineProjectionService = {

  /** Coverage per theme: expected vs completed vs planned hours */
  async getCoverageByTheme(yearId: ID): Promise<TopicCoverage[]> {
    // Get all themes with subject/level info
    const themes: any[] = await db.select<any>(`
      SELECT pt.id, pt.title, pt.code, pt.expected_hours,
             sub.label as subject_label, sub.color as subject_color, sub.short_label,
             l.label as level_label, l.short_label as level_short
      FROM program_topics pt
      JOIN subjects sub ON pt.subject_id = sub.id
      JOIN levels l ON pt.level_id = l.id
      WHERE pt.academic_year_id = ? AND pt.topic_type = 'theme'
      ORDER BY sub.sort_order, pt.sort_order
    `, [yearId]);

    const results: TopicCoverage[] = [];

    for (const theme of themes) {
      // Get sequences linked to this theme or its children
      const seqs: any[] = await db.select<any>(`
        SELECT DISTINCT seq.id, seq.title, seq.status, seq.total_hours, seq.start_date, seq.end_date,
               COALESCE(
                 (SELECT SUM(s.duration_minutes) FROM sessions s
                  WHERE s.sequence_id = seq.id AND s.status = 'done'), 0
               ) / 60.0 as done_hours
        FROM sequences seq
        JOIN sequence_program_topics spt ON spt.sequence_id = seq.id
        JOIN program_topics pt ON spt.program_topic_id = pt.id
        WHERE (pt.id = ? OR pt.parent_id = ?
               OR pt.parent_id IN (SELECT id FROM program_topics WHERE parent_id = ?))
        ORDER BY seq.start_date, seq.sort_order
      `, [theme.id, theme.id, theme.id]);

      const completedHours = seqs.reduce((sum: number, s: any) => sum + (s.done_hours ?? 0), 0);
      const plannedHours = seqs.reduce((sum: number, s: any) => sum + (s.total_hours ?? 0), 0);
      const expectedHours = theme.expected_hours ?? 0;
      const coveragePercent = expectedHours > 0
        ? Math.min(100, Math.round((completedHours / expectedHours) * 100))
        : (completedHours > 0 ? 100 : 0);

      results.push({
        topicId: theme.id,
        topicTitle: theme.title,
        topicCode: theme.code,
        subjectLabel: theme.short_label ?? theme.subject_label,
        subjectColor: theme.subject_color,
        levelLabel: theme.level_short ?? theme.level_label,
        expectedHours,
        completedHours: Math.round(completedHours * 10) / 10,
        plannedHours: Math.round(plannedHours * 10) / 10,
        coveragePercent,
        sequences: seqs.map(s => ({
          id: s.id,
          title: s.title,
          status: s.status,
          totalHours: s.total_hours ?? 0,
          startDate: s.start_date,
          endDate: s.end_date,
          doneHours: Math.round((s.done_hours ?? 0) * 10) / 10,
        })),
      });
    }

    return results;
  },

  /** Pace analysis per subject×level: are we on track? */
  async getPaceAnalysis(yearId: ID): Promise<PaceAnalysis[]> {
    // Get academic year dates
    const year: any = await db.selectOne<any>(
      'SELECT start_date, end_date FROM academic_years WHERE id = ?', [yearId]
    );
    if (!year) return [];

    const yearStart = new Date(year.start_date);
    const yearEnd = new Date(year.end_date);
    const now = new Date();

    // Total teaching weeks (approx, minus vacations)
    const vacations: any[] = await db.select<any>(
      `SELECT start_date, end_date FROM calendar_periods
       WHERE academic_year_id = ? AND impacts_teaching = 1`, [yearId]
    );

    const totalWeeks = diffWeeks(yearStart, yearEnd);
    const vacationWeeks = vacations.reduce((sum: number, v: any) => {
      return sum + diffWeeks(new Date(v.start_date), new Date(v.end_date));
    }, 0);
    const teachingWeeks = Math.max(1, totalWeeks - vacationWeeks);

    const elapsedWeeks = Math.max(0, diffWeeks(yearStart, now > yearEnd ? yearEnd : now));
    const elapsedVacWeeks = vacations.reduce((sum: number, v: any) => {
      const vs = new Date(v.start_date);
      const ve = new Date(v.end_date);
      if (ve < yearStart || vs > now) return sum;
      return sum + diffWeeks(
        vs < yearStart ? yearStart : vs,
        ve > now ? now : ve
      );
    }, 0);
    const elapsedTeaching = Math.max(1, elapsedWeeks - elapsedVacWeeks);
    const remainingWeeks = Math.max(0, teachingWeeks - elapsedTeaching);

    // Get allocations & completed hours per subject×level
    const rows: any[] = await db.select<any>(`
      SELECT sha.subject_id, sha.level_id, sha.total_annual_hours,
             sub.label as subject_label, sub.color as subject_color, sub.short_label,
             l.label as level_label, l.short_label as level_short,
             COALESCE(
               (SELECT SUM(s.duration_minutes) / 60.0 FROM sessions s
                JOIN sequences seq ON s.sequence_id = seq.id
                WHERE seq.academic_year_id = ?
                  AND seq.subject_id = sha.subject_id
                  AND seq.level_id = sha.level_id
                  AND s.status = 'done'), 0
             ) as completed
      FROM subject_hour_allocations sha
      JOIN subjects sub ON sha.subject_id = sub.id
      JOIN levels l ON sha.level_id = l.id
      WHERE sha.academic_year_id = ?
      ORDER BY sub.sort_order, l.sort_order
    `, [yearId, yearId]);

    return rows.map(r => {
      const annualTarget = r.total_annual_hours ?? 0;
      const proportion = elapsedTeaching / teachingWeeks;
      const expectedByNow = Math.round(annualTarget * proportion * 10) / 10;
      const completedByNow = Math.round(r.completed * 10) / 10;
      const paceRatio = expectedByNow > 0 ? completedByNow / expectedByNow : 1;
      const remaining = Math.max(0, annualTarget - completedByNow);
      const requiredPace = remainingWeeks > 0 ? Math.round(remaining / remainingWeeks * 10) / 10 : 0;

      return {
        subjectLabel: r.short_label ?? r.subject_label,
        subjectColor: r.subject_color,
        levelLabel: r.level_short ?? r.level_label,
        expectedByNow,
        completedByNow,
        annualTarget,
        paceRatio: Math.round(paceRatio * 100) / 100,
        remainingWeeks,
        requiredPace,
      };
    });
  },

  /** Week-by-week timeline with sequences and vacations */
  async getWeeklyTimeline(yearId: ID): Promise<TimelineSlot[]> {
    const year: any = await db.selectOne<any>(
      'SELECT start_date, end_date FROM academic_years WHERE id = ?', [yearId]
    );
    if (!year) return [];

    const vacations: any[] = await db.select<any>(
      `SELECT label, start_date, end_date FROM calendar_periods
       WHERE academic_year_id = ? AND impacts_teaching = 1
       ORDER BY start_date`, [yearId]
    );

    const sequences: any[] = await db.select<any>(`
      SELECT seq.id, seq.title, seq.start_date, seq.end_date, seq.total_hours, seq.status,
             sub.color as subject_color
      FROM sequences seq
      LEFT JOIN subjects sub ON seq.subject_id = sub.id
      WHERE seq.academic_year_id = ?
        AND seq.start_date IS NOT NULL
      ORDER BY seq.start_date
    `, [yearId]);

    const slots: TimelineSlot[] = [];
    const start = mondayOf(new Date(year.start_date));
    const end = new Date(year.end_date);

    let current = new Date(start);
    while (current <= end) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStartISO = current.toISOString().slice(0, 10);
      const weekEndISO = weekEnd.toISOString().slice(0, 10);

      // Check vacation
      const vac = vacations.find(v => v.start_date <= weekEndISO && v.end_date >= weekStartISO);

      // Sequences active this week
      const activeSeqs = sequences
        .filter(s => s.start_date <= weekEndISO && (s.end_date ?? s.start_date) >= weekStartISO)
        .map(s => {
          const totalWeeksSeq = Math.max(1, diffWeeks(new Date(s.start_date), new Date(s.end_date ?? s.start_date)));
          return {
            id: s.id,
            title: s.title,
            subjectColor: s.subject_color ?? '#888',
            hoursThisWeek: Math.round(((s.total_hours ?? 0) / totalWeeksSeq) * 10) / 10,
            status: s.status,
          };
        });

      slots.push({
        weekStart: weekStartISO,
        weekLabel: `S${slots.length + 1} — ${formatDateShort(current)}`,
        isVacation: !!vac,
        vacationLabel: vac?.label,
        sequences: activeSeqs,
      });

      current.setDate(current.getDate() + 7);
    }

    return slots;
  },

  /** What-if scenario: shift a sequence and see impact on coverage */
  async whatIfShift(yearId: ID, sequenceId: ID, newStartDate: string, newEndDate: string): Promise<WhatIfResult> {
    // Get original coverage
    const original = await this.getCoverageByTheme(yearId);

    // Compute shifted coverage by temporarily adjusting the sequence in results
    const shifted = original.map(topic => {
      const newSeqs = topic.sequences.map(s => {
        if (s.id === sequenceId) {
          return { ...s, startDate: newStartDate, endDate: newEndDate };
        }
        return s;
      });
      return { ...topic, sequences: newSeqs };
    });

    // Compute impacted topics
    const impacted = original
      .map((orig, i) => {
        const s = shifted[i];
        return {
          topicId: orig.topicId,
          topicTitle: orig.topicTitle,
          originalPercent: orig.coveragePercent,
          newPercent: s?.coveragePercent ?? orig.coveragePercent,
          delta: (s?.coveragePercent ?? orig.coveragePercent) - orig.coveragePercent,
        };
      })
      .filter(d => d.delta !== 0);

    return { original, shifted, impacted };
  },
};

// ── Helpers ──

function diffWeeks(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

function mondayOf(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
