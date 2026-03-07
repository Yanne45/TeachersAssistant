// ============================================================================
// Teacher Assistant — Types : Séquences, séances, cahier de textes
// Tables : sequences, sequence_classes, sequence_program_topics,
//          sequence_skills, sessions, session_skills, session_documents,
//          lesson_log
// ============================================================================

import type { ID, ISODate, ISODateTime, TrackedEntity, BaseEntity, ContentSource } from './common';

// ── Séquences ──

export type SequenceStatus = 'draft' | 'planned' | 'in_progress' | 'done';

export interface Sequence extends TrackedEntity {
  academic_year_id: ID;
  subject_id: ID;
  level_id: ID;
  title: string;
  description: string | null;
  total_hours: number | null;
  start_date: ISODate | null;
  end_date: ISODate | null;
  status: SequenceStatus;
  sort_order: number;
  template_id: ID | null;
}

export type SequenceInsert = Omit<Sequence, 'id' | 'created_at' | 'updated_at'>;

/** Séquence enrichie pour affichage */
export interface SequenceWithDetails extends Sequence {
  subject_label: string;
  subject_color: string;
  level_label: string;
  class_names: string[];
  session_count: number;
  topic_titles: string[];
  skill_labels: string[];
}

// ── Liaison séquence ↔ classes ──

export interface SequenceClass extends BaseEntity {
  sequence_id: ID;
  class_id: ID;
}

// ── Liaison séquence ↔ programme ──

export interface SequenceProgramTopic extends BaseEntity {
  sequence_id: ID;
  program_topic_id: ID;
  is_primary: boolean;
}

// ── Liaison séquence ↔ compétences ──

export interface SequenceSkill extends BaseEntity {
  sequence_id: ID;
  skill_id: ID;
}

// ── Séances ──

export type SessionStatus = 'planned' | 'ready' | 'done' | 'cancelled';
export type SessionSource = 'manual' | 'ai' | 'template' | 'duplicate';

export interface Session extends TrackedEntity {
  sequence_id: ID;
  title: string;
  description: string | null;
  objectives: string | null;
  activities: string | null;
  lesson_plan: string | null;
  duration_minutes: number;
  session_number: number;
  status: SessionStatus;
  session_date: ISODate | null;
  source: SessionSource;
  timetable_slot_id: ID | null;
  sort_order: number;
}

export type SessionInsert = Omit<Session, 'id' | 'created_at' | 'updated_at'>;

/** Séance enrichie pour affichage dans l'accordéon */
export interface SessionWithDetails extends Session {
  document_count: number;
  skill_labels: string[];
}

// ── Liaison séance ↔ compétences ──

export interface SessionSkill extends BaseEntity {
  session_id: ID;
  skill_id: ID;
}

// ── Liaison séance ↔ documents ──

export interface SessionDocument extends BaseEntity {
  session_id: ID;
  document_id: ID;
  usage_note: string | null;
  sort_order: number;
}

// ── Cahier de textes ──

export type LessonLogSource = 'manual' | 'ai' | 'session';

export interface LessonLog extends TrackedEntity {
  session_id: ID | null;
  class_id: ID;
  subject_id: ID;
  log_date: ISODate;
  title: string;
  content: string | null;
  activities: string | null;
  homework: string | null;
  homework_due_date: ISODate | null;
  source: LessonLogSource;
}

export type LessonLogInsert = Omit<LessonLog, 'id' | 'created_at' | 'updated_at'>;

/** Entrée cahier enrichie pour affichage */
export interface LessonLogWithDetails extends LessonLog {
  subject_label: string;
  subject_color: string;
  class_name: string;
  is_linked: boolean;
}
