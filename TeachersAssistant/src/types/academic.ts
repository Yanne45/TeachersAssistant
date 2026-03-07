// ============================================================================
// Teacher Assistant — Types : Cadre annuel & paramètres
// Tables : academic_years, calendar_periods, weekly_calendar_overrides,
//          school_day_settings, day_breaks, subjects, levels, classes,
//          subject_hour_allocations, subject_program_structures,
//          teaching_scopes, notifications
// ============================================================================

import type { ID, ISODate, ISODateTime, TimeString, DayOfWeek, TrackedEntity, BaseEntity } from './common';

// ── Année scolaire ──

export interface AcademicYear extends TrackedEntity {
  label: string;             // "2025-2026"
  start_date: ISODate;
  end_date: ISODate;
  timezone: string;          // "Europe/Paris"
  is_active: boolean;
}

export type AcademicYearInsert = Omit<AcademicYear, 'id' | 'created_at' | 'updated_at'>;

// ── Périodes de calendrier ──

export type CalendarPeriodType = 'vacation' | 'holiday' | 'exam' | 'closure' | 'other';

export interface CalendarPeriod extends TrackedEntity {
  academic_year_id: ID;
  label: string;
  period_type: CalendarPeriodType;
  start_date: ISODate;
  end_date: ISODate;
  impacts_teaching: boolean;
  color: string | null;
  notes: string | null;
}

export type CalendarPeriodInsert = Omit<CalendarPeriod, 'id' | 'created_at' | 'updated_at'>;

// ── Semaines exceptionnelles ──

export type WeekOverrideType = 'cancelled' | 'modified' | 'special';

export interface WeeklyCalendarOverride extends BaseEntity {
  academic_year_id: ID;
  week_start_date: ISODate;
  override_type: WeekOverrideType;
  label: string | null;
  notes: string | null;
}

// ── Structure journée scolaire ──

export interface SchoolDaySetting extends BaseEntity {
  academic_year_id: ID;
  day_of_week: DayOfWeek;
  is_school_day: boolean;
  start_time: TimeString;
  end_time: TimeString;
  slot_duration: number;       // minutes
}

// ── Pauses ──

export type BreakType = 'lunch' | 'recess' | 'other';

export interface DayBreak {
  id: ID;
  school_day_setting_id: ID;
  label: string;
  start_time: TimeString;
  end_time: TimeString;
  break_type: BreakType;
}

// ── Matières ──

export interface Subject extends BaseEntity {
  code: string;              // "HGGSP"
  label: string;             // "Histoire-Géographie-Géopolitique-Sciences politiques"
  short_label: string;       // "HGGSP"
  color: string;             // "#7B3FA0"
  icon: string | null;
  sort_order: number;
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at'>;

// ── Niveaux ──

export interface Level extends BaseEntity {
  code: string;              // "TLE"
  label: string;             // "Terminale"
  short_label: string;       // "Tle"
  sort_order: number;
}

// ── Classes ──

export interface Class extends TrackedEntity {
  academic_year_id: ID;
  level_id: ID;
  name: string;              // "Terminale 2"
  short_name: string;        // "Tle 2"
  student_count: number | null;
  sort_order: number;
}

export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at'>;

/** Classe enrichie avec le label du niveau */
export interface ClassWithLevel extends Class {
  level_label: string;
  level_short: string;
}

// ── Volumes horaires ──

export interface SubjectHourAllocation extends BaseEntity {
  academic_year_id: ID;
  subject_id: ID;
  level_id: ID;
  hours_per_week: number;
  total_annual_hours: number | null;
  notes: string | null;
}

// ── Structure programme ──

export interface SubjectProgramStructure extends BaseEntity {
  subject_id: ID;
  level_id: ID;
  expected_themes: number | null;
  expected_hours: number | null;
  notes: string | null;
}

// ── Périmètre enseigné ──

export interface TeachingScope extends BaseEntity {
  academic_year_id: ID;
  subject_id: ID;
  level_id: ID;
  class_id: ID;
  is_active: boolean;
}

// ── Notifications ──

export type NotificationType = 'alert' | 'reminder' | 'system' | 'info';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification extends BaseEntity {
  notification_type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: ISODateTime | null;
}
