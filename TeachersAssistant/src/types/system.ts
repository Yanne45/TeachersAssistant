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
export type PreferenceKey = 'theme' | 'ui_density' | 'sidebar_width' | 'default_tab';

export type ThemeValue = 'light' | 'dark';
export type UIDensity = 'compact' | 'standard' | 'comfortable';

/** Préférences typées (après lecture de la DB) */
export interface AppPreferences {
  theme: ThemeValue;
  ui_density: UIDensity;
  sidebar_width: number;
  default_tab: string;
}
