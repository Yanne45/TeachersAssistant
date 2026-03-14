// ============================================================================
// Teacher Assistant — Service : Suivi élèves
// ============================================================================

import { db } from './db';
import type {
  Student, StudentInsert, StudentWithClass,
  ReportPeriod,
  StudentPeriodProfile,
  StudentSkillObservation, SkillEvolutionRow,
  BulletinEntry, BulletinEntryInsert, BulletinEntryVersion,
  OrientationReport, OrientationInterview,
  StudentDocumentWithDetails,
  ID,
} from '../types';

// ── Élèves ──

export const studentService = {
  async getByClass(classId: ID): Promise<StudentWithClass[]> {
    return db.select(
      `SELECT s.*, sce.class_id, c.name as class_name, l.label as level_label
       FROM students s
       JOIN student_class_enrollments sce ON s.id = sce.student_id
       JOIN classes c ON sce.class_id = c.id
       JOIN levels l ON c.level_id = l.id
       WHERE sce.class_id = ? AND sce.is_active = 1
       ORDER BY s.last_name, s.first_name`,
      [classId]
    );
  },

  async getById(id: ID): Promise<Student | null> {
    return db.selectOne('SELECT * FROM students WHERE id = ?', [id]);
  },

  async create(data: StudentInsert): Promise<ID> {
    return db.insert(
      'INSERT INTO students (last_name, first_name, birth_year, gender, email, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [data.last_name, data.first_name, data.birth_year, data.gender, data.email, data.notes]
    );
  },

  async update(id: ID, data: Partial<StudentInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM students WHERE id = ?', [id]);
  },

  async enroll(studentId: ID, classId: ID): Promise<void> {
    await db.execute(
      `INSERT OR IGNORE INTO student_class_enrollments (student_id, class_id, enrollment_date, is_active)
       VALUES (?, ?, date('now'), 1)`,
      [studentId, classId]
    );
  },

  async unenroll(studentId: ID, classId: ID): Promise<void> {
    await db.execute(
      'UPDATE student_class_enrollments SET is_active = 0 WHERE student_id = ? AND class_id = ?',
      [studentId, classId]
    );
  },

  /** Import batch (ex: depuis CSV) */
  async importBatch(classId: ID, students: { last_name: string; first_name: string; birth_year?: number }[]): Promise<ID[]> {
    const ids: ID[] = [];
    await db.transaction(async () => {
      for (const s of students) {
        const id = await this.create({
          last_name: s.last_name, first_name: s.first_name,
          birth_year: s.birth_year ?? null, gender: null, email: null, notes: null,
        });
        await this.enroll(id, classId);
        ids.push(id);
      }
    });
    return ids;
  },

  async getRecentGrades(studentId: ID, limit = 20): Promise<Array<{
    submission_id: ID;
    assignment_id: ID;
    assignment_title: string;
    assignment_date: string | null;
    score: number | null;
    max_score: number;
  }>> {
    return db.select(
      `SELECT s.id as submission_id,
         a.id as assignment_id,
         a.title as assignment_title,
         a.assignment_date,
         s.score,
         a.max_score
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = ? AND s.score IS NOT NULL
       ORDER BY COALESCE(a.assignment_date, a.due_date, a.created_at) DESC
       LIMIT ?`,
      [studentId, limit]
    );
  },

  /**
   * Enrichit les élèves d'une classe avec signaux de risque :
   * avg (moyenne notes), trend (compétences), behavior, alerts[]
   */
  async getWithRiskSignals(classId: ID, yearId: ID): Promise<(StudentWithClass & {
    avg: number;
    trend: 'up' | 'down' | 'stable' | 'unknown';
    behavior: number;
    alerts: string[];
  })[]> {
    // 1. Base students
    const students = await this.getByClass(classId);
    if (students.length === 0) return [];

    const ids = students.map(s => s.id);
    const placeholders = ids.map(() => '?').join(',');

    // 2. Average grades per student
    const grades: any[] = await db.select<any>(
      `SELECT s.student_id,
         AVG(s.score) as avg_score,
         AVG(s.score * 20.0 / NULLIF(a.max_score, 0)) as avg_pct,
         COUNT(s.id) as submission_count
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id IN (${placeholders})
         AND a.academic_year_id = ?
         AND s.score IS NOT NULL
       GROUP BY s.student_id`,
      [...ids, yearId]
    );
    const gradeMap = new Map(grades.map((g: any) => [g.student_id as ID, g]));

    // 3. Latest period behavior
    const latestPeriod = await db.selectOne<{ id: ID }>(
      'SELECT id FROM report_periods WHERE academic_year_id = ? ORDER BY sort_order DESC LIMIT 1',
      [yearId]
    );
    let behaviorMap = new Map<ID, number>();
    if (latestPeriod) {
      const profiles: any[] = await db.select<any>(
        `SELECT student_id,
           (COALESCE(behavior, 3) + COALESCE(work_ethic, 3) + COALESCE(participation, 3)) / 3.0 as avg_behavior
         FROM student_period_profiles
         WHERE student_id IN (${placeholders})
           AND report_period_id = ?`,
        [...ids, latestPeriod.id]
      );
      behaviorMap = new Map(profiles.map((p: any) => [p.student_id as ID, Math.round(p.avg_behavior)]));
    }

    // 4. Skill trends (simplified: latest vs previous period average level)
    const trendMap = new Map<ID, 'up' | 'down' | 'stable' | 'unknown'>();
    const periods: any[] = await db.select<any>(
      'SELECT id FROM report_periods WHERE academic_year_id = ? ORDER BY sort_order',
      [yearId]
    );
    if (periods.length >= 2) {
      const prevId = periods[periods.length - 2].id as ID;
      const lastId = periods[periods.length - 1].id as ID;
      const skillAvgs: any[] = await db.select<any>(
        `SELECT student_id, report_period_id as period_id, AVG(level) as avg_level
         FROM student_skill_observations
         WHERE student_id IN (${placeholders})
           AND report_period_id IN (?, ?)
         GROUP BY student_id, report_period_id`,
        [...ids, prevId, lastId]
      );
      const byStudent = new Map<ID, { prev?: number; last?: number }>();
      for (const row of skillAvgs) {
        const entry = byStudent.get(row.student_id) ?? {};
        if (row.period_id === prevId) entry.prev = row.avg_level;
        if (row.period_id === lastId) entry.last = row.avg_level;
        byStudent.set(row.student_id, entry);
      }
      for (const [sid, vals] of byStudent) {
        if (vals.prev != null && vals.last != null) {
          trendMap.set(sid, vals.last > vals.prev ? 'up' : vals.last < vals.prev ? 'down' : 'stable');
        }
      }
    }

    // 5. Missing submissions (assigned but not submitted/graded)
    const missing: any[] = await db.select<any>(
      `SELECT sce.student_id,
         COUNT(CASE WHEN sub.id IS NULL THEN 1 END) as missing_count
       FROM student_class_enrollments sce
       JOIN assignments a ON a.class_id = sce.class_id AND a.academic_year_id = ?
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = sce.student_id
       WHERE sce.class_id = ? AND sce.is_active = 1
         AND a.status NOT IN ('draft')
       GROUP BY sce.student_id`,
      [yearId, classId]
    );
    const missingMap = new Map(missing.map((m: any) => [m.student_id as ID, m.missing_count as number]));

    // 6. Assemble risk signals
    return students.map(s => {
      const g = gradeMap.get(s.id);
      const avg = g ? Math.round(g.avg_pct * 10) / 10 : 0;
      const trend = trendMap.get(s.id) ?? 'unknown';
      const behavior = behaviorMap.get(s.id) ?? 3;
      const missingCount = missingMap.get(s.id) ?? 0;

      const alerts: string[] = [];
      if (avg > 0 && avg < 8) alerts.push('Moyenne faible');
      if (trend === 'down') alerts.push('En baisse');
      if (behavior <= 2) alerts.push('Comportement');
      if (missingCount >= 3) alerts.push(`${missingCount} copies manquantes`);

      return { ...s, avg, trend, behavior, alerts };
    });
  },

  async getDocuments(studentId: ID, reportPeriodId?: ID | null): Promise<StudentDocumentWithDetails[]> {
    const withPeriodFilter = typeof reportPeriodId === 'number';

    return db.select(
      `SELECT sd.*,
         d.title as document_title,
         d.file_path,
         d.file_name,
         d.file_type,
         dt.label as document_type_label,
         sub.label as subject_label,
         rp.label as period_label
       FROM student_documents sd
       JOIN documents d ON d.id = sd.document_id
       LEFT JOIN document_types dt ON dt.id = d.document_type_id
       LEFT JOIN subjects sub ON sub.id = d.subject_id
       LEFT JOIN report_periods rp ON rp.id = sd.report_period_id
       WHERE sd.student_id = ?
         AND (? = 0 OR sd.report_period_id = ? OR sd.report_period_id IS NULL)
       ORDER BY sd.created_at DESC`,
      [studentId, withPeriodFilter ? 1 : 0, reportPeriodId ?? null]
    );
  },

  async unlinkDocument(studentDocumentId: ID): Promise<void> {
    await db.execute('DELETE FROM student_documents WHERE id = ?', [studentDocumentId]);
  },

  async linkDocument(studentId: ID, documentId: ID, reportPeriodId: ID | null, label: string | null): Promise<ID> {
    return db.insert(
      'INSERT INTO student_documents (student_id, document_id, report_period_id, label) VALUES (?, ?, ?, ?)',
      [studentId, documentId, reportPeriodId, label]
    );
  },
};

// ── Périodes de bulletin ──

export const reportPeriodService = {
  async getByYear(yearId: ID): Promise<ReportPeriod[]> {
    return db.select(
      'SELECT * FROM report_periods WHERE academic_year_id = ? ORDER BY sort_order',
      [yearId]
    );
  },

  async create(yearId: ID, code: string, label: string, startDate: string, endDate: string, order: number): Promise<ID> {
    return db.insert(
      'INSERT INTO report_periods (academic_year_id, code, label, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [yearId, code, label, startDate, endDate, order]
    );
  },

  async update(id: ID, data: { label?: string; code?: string; start_date?: string; end_date?: string }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE report_periods SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM report_periods WHERE id = ?', [id]);
  },
};

// ── Profil période ──

export const periodProfileService = {
  async get(studentId: ID, periodId: ID): Promise<StudentPeriodProfile | null> {
    return db.selectOne(
      'SELECT * FROM student_period_profiles WHERE student_id = ? AND report_period_id = ?',
      [studentId, periodId]
    );
  },

  async upsert(studentId: ID, periodId: ID, data: Partial<StudentPeriodProfile>): Promise<void> {
    const existing = await this.get(studentId, periodId);
    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (['behavior', 'work_ethic', 'participation', 'autonomy', 'methodology', 'notes'].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(val);
        }
      }
      fields.push("updated_at = datetime('now')");
      values.push(existing.id);
      await db.execute(`UPDATE student_period_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
    } else {
      await db.insert(
        `INSERT INTO student_period_profiles
         (student_id, report_period_id, behavior, work_ethic, participation, autonomy, methodology, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, periodId, data.behavior ?? null, data.work_ethic ?? null,
         data.participation ?? null, data.autonomy ?? null, data.methodology ?? null, data.notes ?? null]
      );
    }
  },
};

// ── Observations compétences ──

export const skillObservationService = {
  async getByStudent(studentId: ID): Promise<StudentSkillObservation[]> {
    return db.select(
      'SELECT * FROM student_skill_observations WHERE student_id = ? ORDER BY report_period_id',
      [studentId]
    );
  },

  /** Évolution T1/T2/T3 pour toutes les compétences d'un élève */
  async getEvolution(studentId: ID, yearId: ID): Promise<SkillEvolutionRow[]> {
    const periods = await reportPeriodService.getByYear(yearId);
    if (periods.length === 0) return [];

    const observations = await db.select<(StudentSkillObservation & { skill_label: string })[]>(
      `SELECT sso.*, sk.label as skill_label
       FROM student_skill_observations sso
       JOIN skills sk ON sso.skill_id = sk.id
       WHERE sso.student_id = ? AND sso.report_period_id IN (${periods.map(() => '?').join(',')})
       ORDER BY sk.sort_order, sso.report_period_id`,
      [studentId, ...periods.map(p => p.id)]
    );

    // Regrouper par compétence
    const bySkill = new Map<ID, SkillEvolutionRow>();
    for (const obs of observations) {
      if (!bySkill.has(obs.skill_id)) {
        bySkill.set(obs.skill_id, {
          skill_id: obs.skill_id, skill_label: obs.skill_label,
          t1: null, t2: null, t3: null, trend: 'unknown',
        });
      }
      const row = bySkill.get(obs.skill_id)!;
      const periodIdx = periods.findIndex(p => p.id === obs.report_period_id);
      if (periodIdx === 0) row.t1 = obs.level;
      else if (periodIdx === 1) row.t2 = obs.level;
      else if (periodIdx === 2) row.t3 = obs.level;
    }

    // Calculer tendance
    for (const row of bySkill.values()) {
      const values = [row.t1, row.t2, row.t3].filter(v => v !== null) as number[];
      if (values.length >= 2) {
        const first = values[0];
        const last = values[values.length - 1];
        if (first === undefined || last === undefined) continue;
        row.trend = last > first ? 'up' : last < first ? 'down' : 'stable';
      }
    }

    return Array.from(bySkill.values());
  },

  async upsert(studentId: ID, skillId: ID, periodId: ID, level: number, source: string): Promise<void> {
    await db.execute(
      `INSERT INTO student_skill_observations (student_id, skill_id, report_period_id, level, source)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, skill_id, report_period_id)
       DO UPDATE SET level = excluded.level, source = excluded.source, updated_at = datetime('now')`,
      [studentId, skillId, periodId, level, source]
    );
  },
};

// ── Bulletins ──

export const bulletinService = {
  async getByStudentPeriod(studentId: ID, periodId: ID): Promise<BulletinEntry[]> {
    return db.select(
      'SELECT * FROM bulletin_entries WHERE student_id = ? AND report_period_id = ?',
      [studentId, periodId]
    );
  },

  async create(data: BulletinEntryInsert): Promise<ID> {
    const id = await db.insert(
      `INSERT INTO bulletin_entries (student_id, report_period_id, entry_type, subject_id, content, status, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.student_id, data.report_period_id, data.entry_type, data.subject_id, data.content, data.status, data.source]
    );
    // Créer première version
    await db.insert(
      'INSERT INTO bulletin_entry_versions (bulletin_entry_id, content, version_number, source) VALUES (?, ?, 1, ?)',
      [id, data.content, data.source]
    );
    return id;
  },

  async update(id: ID, content: string, source: 'manual' | 'ai'): Promise<void> {
    await db.execute(
      "UPDATE bulletin_entries SET content = ?, source = ?, updated_at = datetime('now') WHERE id = ?",
      [content, source, id]
    );
    // Nouvelle version
    const maxV = await db.selectOne<{ v: number }>(
      'SELECT MAX(version_number) as v FROM bulletin_entry_versions WHERE bulletin_entry_id = ?',
      [id]
    );
    await db.insert(
      'INSERT INTO bulletin_entry_versions (bulletin_entry_id, content, version_number, source) VALUES (?, ?, ?, ?)',
      [id, content, (maxV?.v ?? 0) + 1, source]
    );
  },

  async updateStatus(id: ID, status: 'draft' | 'review' | 'final'): Promise<void> {
    await db.execute(
      "UPDATE bulletin_entries SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
  },

  async getVersions(entryId: ID): Promise<BulletinEntryVersion[]> {
    return db.select(
      'SELECT * FROM bulletin_entry_versions WHERE bulletin_entry_id = ? ORDER BY version_number DESC',
      [entryId]
    );
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM bulletin_entry_versions WHERE bulletin_entry_id = ?', [id]);
    await db.execute('DELETE FROM bulletin_entries WHERE id = ?', [id]);
  },
};

// ── Orientation ──

export const orientationService = {
  async getReports(studentId: ID): Promise<OrientationReport[]> {
    return db.select(
      'SELECT * FROM orientation_reports WHERE student_id = ? ORDER BY created_at DESC',
      [studentId]
    );
  },

  async getInterviews(studentId: ID): Promise<OrientationInterview[]> {
    return db.select(
      'SELECT * FROM orientation_interviews WHERE student_id = ? ORDER BY interview_date DESC',
      [studentId]
    );
  },

  async createReport(studentId: ID, data: Partial<OrientationReport>): Promise<ID> {
    return db.insert(
      `INSERT INTO orientation_reports (student_id, report_period_id, title, content, strengths, areas_for_improvement, recommendations, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, data.report_period_id ?? null, data.title ?? '', data.content ?? '',
       data.strengths ?? null, data.areas_for_improvement ?? null, data.recommendations ?? null, data.source ?? 'manual']
    );
  },

  async createInterview(studentId: ID, data: Partial<OrientationInterview>): Promise<ID> {
    return db.insert(
      `INSERT INTO orientation_interviews
       (student_id, interview_date, attendees, summary, decisions, next_steps, parcoursup_wishes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, data.interview_date ?? new Date().toISOString().split('T')[0],
       data.attendees ?? null, data.summary ?? '', data.decisions ?? null,
       data.next_steps ?? null, data.parcoursup_wishes ?? null]
    );
  },

  async deleteReport(id: ID): Promise<void> {
    await db.execute('DELETE FROM orientation_reports WHERE id = ?', [id]);
  },

  async deleteInterview(id: ID): Promise<void> {
    await db.execute('DELETE FROM orientation_interviews WHERE id = ?', [id]);
  },
};
