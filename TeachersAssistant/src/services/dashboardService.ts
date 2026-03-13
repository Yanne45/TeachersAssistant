// ============================================================================
// Teacher Assistant — Service : Dashboard (agrégations)
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

export interface DashboardData {
  activeSequences: number;
  weekSessions: number;
  hoursCompleted: number;
  hoursTarget: number;
  cahierMissing: number;
  pendingCorrections: number;
}

// ── Types pour le copilote hebdo ──

export interface PrepTask {
  dayOfWeek: number;          // 1=lun..5=ven
  startTime: string;          // "HH:MM"
  endTime: string;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  /** Session liée à ce créneau */
  sessionTitle: string | null;
  sessionStatus: 'planned' | 'ready' | 'done' | 'cancelled' | null;
  sequenceTitle: string | null;
}

export interface WeeklyPrepData {
  weekLabel: string;
  tasks: PrepTask[];
  /** Devoirs à rendre cette semaine */
  upcomingAssignments: {
    title: string;
    classLabel: string;
    dueDate: string;
    status: string;
    subjectColor: string;
  }[];
  /** Séances faites sans entrée cahier */
  missingCahier: number;
}

export const dashboardService = {
  /** Récupère les compteurs pour les indicateurs rapides */
  async getIndicators(yearId: ID): Promise<DashboardData> {
    const [seq, sessions, hours, cahier, corrections] = await Promise.all([
      db.selectOne<{ c: number }>(
        "SELECT COUNT(*) as c FROM sequences WHERE academic_year_id = ? AND status = 'in_progress'",
        [yearId]
      ),
      db.selectOne<{ c: number }>(
        'SELECT COUNT(*) as c FROM timetable_slots WHERE academic_year_id = ?',
        [yearId]
      ),
      db.selectOne<{ done: number; target: number }>(
        `SELECT
           COALESCE(SUM(CASE WHEN s.status = 'done' THEN s.duration_minutes ELSE 0 END) / 60.0, 0) as done,
           COALESCE(SUM(sha.total_annual_hours), 0) as target
         FROM subject_hour_allocations sha
         WHERE sha.academic_year_id = ?`,
        [yearId]
      ),
      db.selectOne<{ c: number }>(
        `SELECT COUNT(*) as c FROM sessions s
         JOIN sequences seq ON s.sequence_id = seq.id
         WHERE seq.academic_year_id = ?
           AND s.status = 'done'
           AND s.id NOT IN (SELECT session_id FROM lesson_log WHERE session_id IS NOT NULL)`,
        [yearId]
      ),
      db.selectOne<{ c: number }>(
        `SELECT COUNT(*) as c FROM submissions sub
         JOIN assignments a ON sub.assignment_id = a.id
         WHERE a.academic_year_id = ? AND sub.status != 'final'`,
        [yearId]
      ),
    ]);

    return {
      activeSequences: seq?.c ?? 0,
      weekSessions: sessions?.c ?? 0,
      hoursCompleted: Math.round(hours?.done ?? 0),
      hoursTarget: Math.round(hours?.target ?? 0),
      cahierMissing: cahier?.c ?? 0,
      pendingCorrections: corrections?.c ?? 0,
    };
  },

  /** Couverture programme par thème */
  async getCoverage(yearId: ID): Promise<{ label: string; percentage: number; color: string }[]> {
    return db.select(
      `SELECT
         sub.short_label || ' ' || l.short_label || ' — ' || pt.title as label,
         sub.color as color,
         CAST(
           COALESCE(
             (SELECT COUNT(DISTINCT spt.program_topic_id)
              FROM sequence_program_topics spt
              JOIN program_topics child ON spt.program_topic_id = child.id
              WHERE child.parent_id = pt.id) * 100.0
             / NULLIF((SELECT COUNT(*) FROM program_topics child WHERE child.parent_id = pt.id), 0)
           , 0)
         AS INTEGER) as percentage
       FROM program_topics pt
       JOIN subjects sub ON pt.subject_id = sub.id
       JOIN levels l ON pt.level_id = l.id
       WHERE pt.academic_year_id = ? AND pt.topic_type = 'theme'
       ORDER BY sub.sort_order, pt.sort_order`,
      [yearId]
    );
  },

  /** Copilote hebdo : croise EDT × sessions × devoirs */
  async getWeeklyPrep(yearId: ID): Promise<WeeklyPrepData> {
    // Compute Monday and Friday ISO dates for current week
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay(); // 1=lun
    const mon = new Date(now);
    mon.setDate(now.getDate() - (dow - 1));
    const fri = new Date(mon);
    fri.setDate(mon.getDate() + 4);
    const monISO = mon.toISOString().slice(0, 10);
    const friISO = fri.toISOString().slice(0, 10);
    const weekLabel = `Semaine du ${mon.getDate()} ${mon.toLocaleDateString('fr-FR', { month: 'long' })}`;

    const [tasks, assignments, cahier] = await Promise.all([
      // 1. Timetable slots + linked session status
      db.select<any>(
        `SELECT
           ts.day_of_week as dayOfWeek,
           ts.start_time as startTime,
           ts.end_time as endTime,
           COALESCE(sub.short_label, sub.label, '') as subjectLabel,
           COALESCE(sub.color, '#888') as subjectColor,
           COALESCE(c.short_name, c.name, '') as classLabel,
           se.title as sessionTitle,
           se.status as sessionStatus,
           seq.title as sequenceTitle
         FROM timetable_slots ts
         LEFT JOIN subjects sub ON ts.subject_id = sub.id
         LEFT JOIN classes c ON ts.class_id = c.id
         LEFT JOIN sessions se ON se.timetable_slot_id = ts.id
           AND se.id = (SELECT se2.id FROM sessions se2
                        WHERE se2.timetable_slot_id = ts.id
                        AND se2.status != 'cancelled'
                        ORDER BY se2.sort_order DESC LIMIT 1)
         LEFT JOIN sequences seq ON se.sequence_id = seq.id
         WHERE ts.academic_year_id = ?
           AND ts.day_of_week BETWEEN 1 AND 5
         ORDER BY ts.day_of_week, ts.start_time`,
        [yearId]
      ),

      // 2. Assignments due this week
      db.select<any>(
        `SELECT
           a.title,
           COALESCE(c.short_name, c.name, '') as classLabel,
           a.due_date as dueDate,
           a.status,
           COALESCE(sub.color, '#888') as subjectColor
         FROM assignments a
         LEFT JOIN classes c ON a.class_id = c.id
         LEFT JOIN subjects sub ON a.subject_id = sub.id
         WHERE a.academic_year_id = ?
           AND a.due_date BETWEEN ? AND ?
         ORDER BY a.due_date`,
        [yearId, monISO, friISO]
      ),

      // 3. Missing cahier count
      db.selectOne<{ c: number }>(
        `SELECT COUNT(*) as c FROM sessions s
         JOIN sequences seq ON s.sequence_id = seq.id
         WHERE seq.academic_year_id = ?
           AND s.status = 'done'
           AND s.id NOT IN (SELECT session_id FROM lesson_log WHERE session_id IS NOT NULL)`,
        [yearId]
      ),
    ]);

    return {
      weekLabel,
      tasks: tasks as PrepTask[],
      upcomingAssignments: assignments,
      missingCahier: cahier?.c ?? 0,
    };
  },
};
