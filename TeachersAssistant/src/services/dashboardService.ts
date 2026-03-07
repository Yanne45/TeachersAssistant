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
};
