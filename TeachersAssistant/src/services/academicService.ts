// ============================================================================
// Teacher Assistant — Service : Cadre annuel
// ============================================================================

import { db } from './db';
import type {
  AcademicYear, AcademicYearInsert,
  CalendarPeriod, CalendarPeriodInsert,
  Subject, SubjectInsert,
  Level, ClassInsert, ClassWithLevel,
  SubjectHourAllocation,
  Notification,
  ID,
} from '../types';

// ── Année scolaire ──

export const academicYearService = {
  async getAll(): Promise<AcademicYear[]> {
    return db.select('SELECT * FROM academic_years ORDER BY start_date DESC');
  },

  async getActive(): Promise<AcademicYear | null> {
    return db.selectOne('SELECT * FROM academic_years WHERE is_active = 1');
  },

  async getById(id: ID): Promise<AcademicYear | null> {
    return db.selectOne('SELECT * FROM academic_years WHERE id = ?', [id]);
  },

  async create(data: AcademicYearInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO academic_years (label, start_date, end_date, timezone, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [data.label, data.start_date, data.end_date, data.timezone, data.is_active ? 1 : 0]
    );
  },

  async setActive(id: ID): Promise<void> {
    await db.transaction(async () => {
      await db.execute('UPDATE academic_years SET is_active = 0', []);
      await db.execute('UPDATE academic_years SET is_active = 1 WHERE id = ?', [id]);
    });
  },

  async update(id: ID, data: Partial<AcademicYearInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(key === 'is_active' ? (val ? 1 : 0) : val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE academic_years SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM academic_years WHERE id = ?', [id]);
  },
};

// ── Périodes calendrier ──

export const calendarPeriodService = {
  async getByYear(yearId: ID): Promise<CalendarPeriod[]> {
    return db.select(
      'SELECT * FROM calendar_periods WHERE academic_year_id = ? ORDER BY start_date',
      [yearId]
    );
  },

  async create(data: CalendarPeriodInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO calendar_periods (academic_year_id, label, period_type, start_date, end_date, impacts_teaching, color, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.label, data.period_type, data.start_date, data.end_date, data.impacts_teaching ? 1 : 0, data.color, data.notes]
    );
  },

  async update(id: ID, data: Partial<CalendarPeriodInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(key === 'impacts_teaching' ? (val ? 1 : 0) : val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE calendar_periods SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM calendar_periods WHERE id = ?', [id]);
  },
};

// ── Matières ──

export const subjectService = {
  async getAll(): Promise<Subject[]> {
    return db.select('SELECT * FROM subjects ORDER BY sort_order');
  },

  async getById(id: ID): Promise<Subject | null> {
    return db.selectOne('SELECT * FROM subjects WHERE id = ?', [id]);
  },

  async create(data: SubjectInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO subjects (code, label, short_label, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.code, data.label, data.short_label, data.color, data.icon, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<SubjectInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    values.push(id);
    await db.execute(`UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM subjects WHERE id = ?', [id]);
  },
};

// ── Niveaux ──

export const levelService = {
  async getAll(): Promise<Level[]> {
    return db.select('SELECT * FROM levels ORDER BY sort_order');
  },

  async create(data: Omit<Level, 'id' | 'created_at'>): Promise<ID> {
    return db.insert(
      'INSERT INTO levels (code, label, short_label, sort_order) VALUES (?, ?, ?, ?)',
      [data.code, data.label, data.short_label, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<Omit<Level, 'id' | 'created_at'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.execute(`UPDATE levels SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM levels WHERE id = ?', [id]);
  },
};

// ── Classes ──

export const classService = {
  async getAll(): Promise<ClassWithLevel[]> {
    return db.select(
      `SELECT c.*, l.label as level_label, l.short_label as level_short
       FROM classes c
       JOIN levels l ON c.level_id = l.id
       ORDER BY c.academic_year_id DESC, l.sort_order, c.sort_order`
    );
  },

  async getByYear(yearId: ID): Promise<ClassWithLevel[]> {
    return db.select(
      `SELECT c.*, l.label as level_label, l.short_label as level_short
       FROM classes c
       JOIN levels l ON c.level_id = l.id
       WHERE c.academic_year_id = ?
       ORDER BY l.sort_order, c.sort_order`,
      [yearId]
    );
  },

  async getById(id: ID): Promise<ClassWithLevel | null> {
    return db.selectOne(
      `SELECT c.*, l.label as level_label, l.short_label as level_short
       FROM classes c JOIN levels l ON c.level_id = l.id
       WHERE c.id = ?`,
      [id]
    );
  },

  async create(data: ClassInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO classes (academic_year_id, level_id, name, short_name, student_count, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.level_id, data.name, data.short_name, data.student_count, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<ClassInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE classes SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM classes WHERE id = ?', [id]);
  },
};

// ── Volumes horaires ──

export const hourAllocationService = {
  async getByYear(yearId: ID): Promise<SubjectHourAllocation[]> {
    return db.select(
      'SELECT * FROM subject_hour_allocations WHERE academic_year_id = ?',
      [yearId]
    );
  },

  async upsert(yearId: ID, subjectId: ID, levelId: ID, hoursPerWeek: number, totalAnnual: number | null): Promise<void> {
    await db.execute(
      `INSERT INTO subject_hour_allocations (academic_year_id, subject_id, level_id, hours_per_week, total_annual_hours)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(academic_year_id, subject_id, level_id)
       DO UPDATE SET hours_per_week = excluded.hours_per_week, total_annual_hours = excluded.total_annual_hours`,
      [yearId, subjectId, levelId, hoursPerWeek, totalAnnual]
    );
  },
};

// ── Notifications ──

export const notificationService = {
  async getUnread(): Promise<Notification[]> {
    return db.select('SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC');
  },

  async getAll(limit = 50): Promise<Notification[]> {
    return db.select('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?', [limit]);
  },

  async create(data: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'read_at'>): Promise<ID> {
    return db.insert(
      `INSERT INTO notifications (notification_type, priority, title, message, link)
       VALUES (?, ?, ?, ?, ?)`,
      [data.notification_type, data.priority, data.title, data.message, data.link]
    );
  },

  async markRead(id: ID): Promise<void> {
    await db.execute(
      "UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE id = ?",
      [id]
    );
  },

  async markAllRead(): Promise<void> {
    await db.execute(
      "UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE is_read = 0",
      []
    );
  },

  async getUnreadCount(): Promise<number> {
    const row = await db.selectOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0'
    );
    return row?.count ?? 0;
  },
};

// ============================================================================
// New Year from Existing — Copie sélective
// ============================================================================

export const newYearService = {
  /**
   * Crée une nouvelle année scolaire en copiant les données structurelles
   * de l'année source. Ne copie PAS : élèves, notes, bulletins, cahier, EDT.
   */
  async createFromExisting(
    sourceYearId: number,
    newLabel: string,
    newStartDate: string,
    newEndDate: string,
  ): Promise<{ newYearId: number; copied: Record<string, number> }> {
    const copied: Record<string, number> = {};

    // 1. Create new academic year
    const newYearId = await db.insert(
      `INSERT INTO academic_years (label, start_date, end_date, timezone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'Europe/Paris', 0, datetime('now'), datetime('now'))`,
      [newLabel, newStartDate, newEndDate]
    );

    // 2. Copy school_day_settings
    const daySettings = await db.select<any>(
      `SELECT * FROM school_day_settings WHERE academic_year_id = ?`, [sourceYearId]
    );
    for (const row of daySettings) {
      await db.insert(
        `INSERT INTO school_day_settings (academic_year_id, day_of_week, is_active, start_time, slot_duration_minutes, slots_per_day)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newYearId, row.day_of_week, row.is_active, row.start_time, row.slot_duration_minutes, row.slots_per_day]
      );
    }
    copied['school_day_settings'] = daySettings.length;

    // 3. Copy subject_hour_allocations
    const allocations = await db.select<any>(
      `SELECT * FROM subject_hour_allocations WHERE academic_year_id = ?`, [sourceYearId]
    );
    for (const row of allocations) {
      await db.insert(
        `INSERT INTO subject_hour_allocations (academic_year_id, subject_id, level_id, hours_per_week, total_annual_hours, evaluation_weeks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newYearId, row.subject_id, row.level_id, row.hours_per_week, row.total_annual_hours, row.evaluation_weeks]
      );
    }
    copied['subject_hour_allocations'] = allocations.length;

    // 4. Copy teaching_scopes
    const scopes = await db.select<any>(
      `SELECT * FROM teaching_scopes WHERE academic_year_id = ?`, [sourceYearId]
    );
    for (const row of scopes) {
      await db.insert(
        `INSERT INTO teaching_scopes (academic_year_id, subject_id, class_id)
         VALUES (?, ?, ?)`,
        [newYearId, row.subject_id, row.class_id]
      );
    }
    copied['teaching_scopes'] = scopes.length;

    // 5. Copy program_topics (hierarchical — copy with new IDs, remap parent_id)
    const topics = await db.select<any>(
      `SELECT * FROM program_topics WHERE academic_year_id = ? ORDER BY id`, [sourceYearId]
    );
    const topicIdMap = new Map<number, number>();
    for (const row of topics) {
      const newParentId = row.parent_id ? (topicIdMap.get(row.parent_id) ?? null) : null;
      const newId = await db.insert(
        `INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title,
         description, hours_min, hours_max, sort_order, is_optional, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [newYearId, row.subject_id, row.level_id, newParentId, row.topic_type, row.code,
         row.title, row.description, row.hours_min, row.hours_max, row.sort_order, row.is_optional]
      );
      topicIdMap.set(row.id, newId);
    }
    copied['program_topics'] = topics.length;

    // 6. Copy skills
    const skills = await db.select<any>(
      `SELECT * FROM skills WHERE academic_year_id = ?`, [sourceYearId]
    );
    for (const row of skills) {
      await db.insert(
        `INSERT INTO skills (academic_year_id, label, description, category, subject_id, level_id, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newYearId, row.label, row.description, row.category, row.subject_id, row.level_id, row.sort_order]
      );
    }
    copied['skills'] = skills.length;

    // 7. Copy report_periods (T1, T2, T3 structure)
    const periods = await db.select<any>(
      `SELECT * FROM report_periods WHERE academic_year_id = ?`, [sourceYearId]
    );
    for (const row of periods) {
      await db.insert(
        `INSERT INTO report_periods (academic_year_id, label, code, start_date, end_date, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newYearId, row.label, row.code, row.start_date, row.end_date, row.sort_order]
      );
    }
    copied['report_periods'] = periods.length;

    // 8. Convert existing sequences → templates (if not already templates)
    const sequences = await db.select<any>(
      `SELECT * FROM sequences WHERE academic_year_id = ? AND template_id IS NULL`, [sourceYearId]
    );
    let templatesCreated = 0;
    for (const seq of sequences) {
      // Check if a template with same title exists
      const existing = await db.selectOne<any>(
        `SELECT id FROM sequence_templates WHERE title = ?`, [seq.title]
      );
      if (!existing) {
        await db.insert(
          `INSERT INTO sequence_templates (title, subject_id, level_id, description, default_hours, source)
           VALUES (?, ?, ?, ?, ?, 'auto')`,
          [seq.title, seq.subject_id, seq.level_id, seq.description, seq.planned_hours]
        );
        templatesCreated++;
      }
    }
    copied['sequence_templates'] = templatesCreated;

    return { newYearId, copied };
  },

  /** Activate a year (deactivate all others first) */
  async activate(yearId: number): Promise<void> {
    await db.execute(`UPDATE academic_years SET is_active = 0`);
    await db.execute(`UPDATE academic_years SET is_active = 1 WHERE id = ?`, [yearId]);
  },
};
