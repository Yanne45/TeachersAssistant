// ============================================================================
// Teacher Assistant — Service : Emploi du temps
// ============================================================================

import { db } from './db';
import type {
  TimetableSlotInsert, TimetableSlotWithDetails,
  CalendarEvent,
  SlotRecurrence,
  ID, DayOfWeek,
} from '../types';

// ── Créneaux EDT ──

export const timetableService = {
  async getByYear(yearId: ID, recurrence?: SlotRecurrence): Promise<TimetableSlotWithDetails[]> {
    let query = `
      SELECT ts.*,
        COALESCE(sub.label, '') as subject_label,
        COALESCE(sub.color, '#888') as subject_color,
        COALESCE(c.name, '') as class_name,
        (CAST(substr(ts.end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(ts.end_time, 4, 2) AS INTEGER))
        - (CAST(substr(ts.start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(ts.start_time, 4, 2) AS INTEGER))
        as duration_minutes,
        CAST(substr(ts.start_time, 1, 2) AS REAL) + CAST(substr(ts.start_time, 4, 2) AS REAL) / 60.0
        as start_decimal
      FROM timetable_slots ts
      LEFT JOIN subjects sub ON ts.subject_id = sub.id
      LEFT JOIN classes c ON ts.class_id = c.id
      WHERE ts.academic_year_id = ?`;

    const params: unknown[] = [yearId];

    if (recurrence && recurrence !== 'all') {
      query += ` AND (ts.recurrence = 'all' OR ts.recurrence = ?)`;
      params.push(recurrence);
    }

    query += ' ORDER BY ts.day_of_week, ts.start_time';
    return db.select(query, params);
  },

  async getByDay(yearId: ID, day: DayOfWeek, recurrence?: SlotRecurrence): Promise<TimetableSlotWithDetails[]> {
    const all = await this.getByYear(yearId, recurrence);
    return all.filter(s => s.day_of_week === day);
  },

  async create(data: TimetableSlotInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO timetable_slots
       (academic_year_id, day_of_week, start_time, end_time, subject_id, class_id, room, recurrence, color, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.day_of_week, data.start_time, data.end_time,
       data.subject_id, data.class_id, data.room, data.recurrence, data.color, data.notes]
    );
  },

  async update(id: ID, data: Partial<TimetableSlotInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE timetable_slots SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM timetable_slots WHERE id = ?', [id]);
  },

  /** Compter le nombre de séances de la semaine */
  async countWeekSlots(yearId: ID): Promise<number> {
    const row = await db.selectOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM timetable_slots WHERE academic_year_id = ?',
      [yearId]
    );
    return row?.count ?? 0;
  },

  /** Total heures hebdomadaires */
  async totalWeeklyHours(yearId: ID): Promise<number> {
    const row = await db.selectOne<{ total: number }>(
      `SELECT SUM(
        (CAST(substr(end_time,1,2) AS INTEGER)*60 + CAST(substr(end_time,4,2) AS INTEGER))
        - (CAST(substr(start_time,1,2) AS INTEGER)*60 + CAST(substr(start_time,4,2) AS INTEGER))
       ) / 60.0 as total
       FROM timetable_slots WHERE academic_year_id = ?`,
      [yearId]
    );
    return row?.total ?? 0;
  },
};

// ── Événements calendrier ──

export const calendarEventService = {
  async getByYear(yearId: ID): Promise<CalendarEvent[]> {
    return db.select(
      'SELECT * FROM calendar_events WHERE academic_year_id = ? ORDER BY start_datetime',
      [yearId]
    );
  },

  async upsertFromExternal(yearId: ID, externalId: string, data: Partial<CalendarEvent>): Promise<ID> {
    const existing = await db.selectOne<CalendarEvent>(
      'SELECT * FROM calendar_events WHERE academic_year_id = ? AND external_id = ?',
      [yearId, externalId]
    );

    if (existing) {
      await db.execute(
        `UPDATE calendar_events SET title = ?, description = ?, start_datetime = ?, end_datetime = ?,
         location = ?, last_synced_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [data.title, data.description, data.start_datetime, data.end_datetime, data.location, existing.id]
      );
      return existing.id;
    }

    return db.insert(
      `INSERT INTO calendar_events
       (academic_year_id, external_id, source, title, description, start_datetime, end_datetime,
        location, is_recurring, recurrence_rule, raw_data, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [yearId, externalId, data.source ?? 'google', data.title, data.description,
       data.start_datetime, data.end_datetime, data.location,
       data.is_recurring ? 1 : 0, data.recurrence_rule, data.raw_data]
    );
  },

  async create(data: {
    academic_year_id: ID;
    title: string;
    description?: string | null;
    start_datetime: string;
    end_datetime: string;
    location?: string | null;
    source?: string;
    event_type?: string;
  }): Promise<ID> {
    return db.insert(
      `INSERT INTO calendar_events (academic_year_id, source, title, description, start_datetime, end_datetime, location, event_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.source ?? 'manual', data.title, data.description ?? null,
       data.start_datetime, data.end_datetime, data.location ?? null, data.event_type ?? 'other']
    );
  },

  async update(id: ID, data: Partial<{
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string;
    location: string | null;
    event_type: string;
  }>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async getByDateRange(yearId: ID, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    return db.select(
      `SELECT * FROM calendar_events
       WHERE academic_year_id = ?
         AND start_datetime >= ?
         AND start_datetime < ?
       ORDER BY start_datetime`,
      [yearId, startDate, endDate]
    );
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM calendar_events WHERE id = ?', [id]);
  },
};
