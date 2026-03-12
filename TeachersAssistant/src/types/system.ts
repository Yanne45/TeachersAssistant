// ============================================================================
// Teacher Assistant — Types : Export, sauvegardes, préférences
// Tables : export_settings, backup_log, user_preferences
// ============================================================================

import type { ID, ISODateTime, BaseEntity } from './common';

// ── Export PDF ──

export interface ExportSettings {
  id: ID;
  teacher_name: string | null;
  teacher_title: string | null;
  school_name: string | null;
  school_address: string | null;
  school_logo_path: string | null;
  footer_text: string | null;
  header_color: string | null;
  updated_at: ISODateTime;
}

export type ExportSettingsUpdate = Partial<Omit<ExportSettings, 'id'>>;

// ── Sauvegardes ──

export type BackupType = 'auto' | 'manual' | 'export';
export type BackupScope = 'full' | 'year' | 'sequences' | 'library';
export type BackupStatus = 'completed' | 'error';

export interface BackupLog extends BaseEntity {
  backup_type: BackupType;
  file_path: string;
  file_size: number | null;
  scope: BackupScope;
  status: BackupStatus;
  error_message: string | null;
}

// ── Préférences interface ──

export interface UserPreference {
  id: ID;
  preference_key: string;
  preference_value: string;
  updated_at: ISODateTime;
}

/** Clés de préférences connues */
export type PreferenceKey =
  | 'theme' | 'ui_density' | 'sidebar_width' | 'default_tab'
  | 'timetable_working_days' | 'timetable_week_start'
  | 'timetable_day_start' | 'timetable_day_end'
  | 'timetable_break_start' | 'timetable_break_end'
  | 'timetable_recess1_start' | 'timetable_recess1_end'
  | 'timetable_recess2_start' | 'timetable_recess2_end'
  | 'timetable_recurrence_mode';

export type ThemeValue = 'light' | 'dark';
export type UIDensity = 'compact' | 'standard' | 'comfortable';
export type RecurrenceMode = 'quarters' | 'trimesters' | 'semesters';

/** Préférences typées (après lecture de la DB) */
export interface AppPreferences {
  theme: ThemeValue;
  ui_density: UIDensity;
  sidebar_width: number;
  default_tab: string;
  /** Jours travaillés : tableau de DayOfWeek (1=Lun … 7=Dim) — JSON string */
  timetable_working_days: number[];
  /** Premier jour de la semaine : 1=Lundi, 7=Dimanche */
  timetable_week_start: number;
  /** Heure début de journée (HH:MM) */
  timetable_day_start: string;
  /** Heure fin de journée (HH:MM) */
  timetable_day_end: string;
  /** Pause début (HH:MM) */
  timetable_break_start: string;
  /** Pause fin (HH:MM) */
  timetable_break_end: string;
  /** Récréation matin (HH:MM, vide = aucune) */
  timetable_recess1_start: string;
  timetable_recess1_end: string;
  /** Récréation après-midi (HH:MM, vide = aucune) */
  timetable_recess2_start: string;
  timetable_recess2_end: string;
  /** Mode de récurrence */
  timetable_recurrence_mode: RecurrenceMode;
}
