// ============================================================================
// Teacher Assistant — Service : Système (préférences, export, backup)
// ============================================================================

import { db } from './db';
import type {
  AppPreferences, UserPreference, PreferenceKey, ThemeValue, UIDensity, RecurrenceMode,
  ExportSettings, ExportSettingsUpdate,
  BackupLog,
  ID,
} from '../types';

// ── Préférences ──

export const preferenceService = {
  async getAll(): Promise<AppPreferences> {
    const rows = await db.select<UserPreference[]>('SELECT * FROM user_preferences');
    const map = new Map(rows.map(r => [r.preference_key, r.preference_value]));

    const workingDaysRaw = map.get('timetable_working_days');
    let workingDays: number[];
    try { workingDays = workingDaysRaw ? JSON.parse(workingDaysRaw) : [1, 2, 3, 4, 5]; }
    catch { workingDays = [1, 2, 3, 4, 5]; }

    return {
      theme: (map.get('theme') as ThemeValue) || 'light',
      ui_density: (map.get('ui_density') as UIDensity) || 'standard',
      sidebar_width: parseInt(map.get('sidebar_width') || '260', 10),
      default_tab: map.get('default_tab') || 'dashboard',
      timetable_working_days: workingDays,
      timetable_week_start: parseInt(map.get('timetable_week_start') || '1', 10),
      timetable_day_start: map.get('timetable_day_start') || '08:00',
      timetable_day_end: map.get('timetable_day_end') || '17:00',
      timetable_break_start: map.get('timetable_break_start') || '12:00',
      timetable_break_end: map.get('timetable_break_end') || '13:00',
      timetable_recess1_start: map.get('timetable_recess1_start') || '',
      timetable_recess1_end: map.get('timetable_recess1_end') || '',
      timetable_recess2_start: map.get('timetable_recess2_start') || '',
      timetable_recess2_end: map.get('timetable_recess2_end') || '',
      timetable_recurrence_mode: (map.get('timetable_recurrence_mode') as RecurrenceMode) || 'quarters',
    };
  },

  async get(key: PreferenceKey): Promise<string | null> {
    const row = await db.selectOne<UserPreference>(
      'SELECT * FROM user_preferences WHERE preference_key = ?',
      [key]
    );
    return row?.preference_value ?? null;
  },

  async set(key: PreferenceKey, value: string): Promise<void> {
    await db.execute(
      `INSERT INTO user_preferences (preference_key, preference_value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(preference_key)
       DO UPDATE SET preference_value = excluded.preference_value, updated_at = datetime('now')`,
      [key, value]
    );
  },
};

// ── Export PDF ──

export const exportSettingsService = {
  async get(): Promise<ExportSettings | null> {
    return db.selectOne('SELECT * FROM export_settings LIMIT 1');
  },

  async upsert(data: ExportSettingsUpdate): Promise<void> {
    const existing = await this.get();
    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];
      for (const [key, val] of Object.entries(data)) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
      fields.push("updated_at = datetime('now')");
      values.push(existing.id);
      await db.execute(`UPDATE export_settings SET ${fields.join(', ')} WHERE id = ?`, values);
    } else {
      await db.insert(
        `INSERT INTO export_settings (teacher_name, teacher_title, school_name, school_address, school_logo_path, footer_text, header_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.teacher_name ?? null, data.teacher_title ?? null, data.school_name ?? null,
         data.school_address ?? null, data.school_logo_path ?? null, data.footer_text ?? null, data.header_color ?? null]
      );
    }
  },
};

// ── Sauvegardes ──

export const backupService = {
  async getRecent(limit = 10): Promise<BackupLog[]> {
    return db.select(
      'SELECT * FROM backup_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  },

  async log(type: 'auto' | 'manual' | 'export', filePath: string, fileSize: number | null, scope: string, status: string, error?: string): Promise<ID> {
    return db.insert(
      'INSERT INTO backup_log (backup_type, file_path, file_size, scope, status, error_message) VALUES (?, ?, ?, ?, ?, ?)',
      [type, filePath, fileSize, scope, status, error ?? null]
    );
  },

  async getLastSuccessful(): Promise<BackupLog | null> {
    return db.selectOne(
      "SELECT * FROM backup_log WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1"
    );
  },
};
