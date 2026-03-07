// ============================================================================
// Teacher Assistant — Types : Emploi du temps & événements
// Tables : timetable_slots, calendar_events, calendar_event_mapping
// ============================================================================

import type { ID, ISODate, ISODateTime, TimeString, DayOfWeek, TrackedEntity, BaseEntity } from './common';

// ── Créneaux EDT ──

export type SlotRecurrence = 'all' | 'q1' | 'q2';

export interface TimetableSlot extends TrackedEntity {
  academic_year_id: ID;
  day_of_week: DayOfWeek;
  start_time: TimeString;
  end_time: TimeString;
  subject_id: ID | null;
  class_id: ID | null;
  room: string | null;
  recurrence: SlotRecurrence;
  color: string | null;
  notes: string | null;
}

export type TimetableSlotInsert = Omit<TimetableSlot, 'id' | 'created_at' | 'updated_at'>;

/** Créneau enrichi pour affichage dans la grille */
export interface TimetableSlotWithDetails extends TimetableSlot {
  subject_label: string;
  subject_color: string;
  class_name: string;
  /** Durée en minutes (calculé) */
  duration_minutes: number;
  /** Heure de début en nombre décimal (ex: 8.5 = 8h30) */
  start_decimal: number;
}

// ── Événements importés ──

export type CalendarEventSource = 'google' | 'ics' | 'manual';

export interface CalendarEvent extends TrackedEntity {
  academic_year_id: ID;
  external_id: string | null;
  source: CalendarEventSource;
  title: string;
  description: string | null;
  start_datetime: ISODateTime;
  end_datetime: ISODateTime;
  location: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  raw_data: string | null;      // JSON brut
  last_synced_at: ISODateTime | null;
}

// ── Mapping événement ↔ classe/matière ──

export interface CalendarEventMapping extends BaseEntity {
  calendar_event_id: ID;
  class_id: ID | null;
  subject_id: ID | null;
  room: string | null;
  is_confirmed: boolean;
}
