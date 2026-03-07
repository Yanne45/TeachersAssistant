// ============================================================================
// Teacher Assistant — Types : Suivi élèves
// Tables : students, student_class_enrollments, report_periods,
//          student_period_profiles, student_skill_observations,
//          bulletin_entries, bulletin_entry_versions,
//          orientation_reports, orientation_interviews, student_documents
// ============================================================================

import type { ID, ISODate, ISODateTime, TrackedEntity, BaseEntity, ContentSource } from './common';

// ── Élèves ──

export type Gender = 'M' | 'F' | 'X';

export interface Student extends TrackedEntity {
  last_name: string;
  first_name: string;
  birth_year: number | null;
  gender: Gender | null;
  email: string | null;
  notes: string | null;
}

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>;

/** Élève enrichi pour la liste de classe */
export interface StudentWithClass extends Student {
  class_id: ID;
  class_name: string;
  level_label: string;
}

// ── Inscription classe ──

export interface StudentClassEnrollment extends BaseEntity {
  student_id: ID;
  class_id: ID;
  enrollment_date: ISODate;
  is_active: boolean;
}

// ── Périodes de bulletin ──

export interface ReportPeriod extends BaseEntity {
  academic_year_id: ID;
  code: string;                // "T1", "T2", "T3"
  label: string;               // "Trimestre 1"
  start_date: ISODate;
  end_date: ISODate;
  sort_order: number;
}

// ── Profil période (1-5) ──

export interface StudentPeriodProfile extends TrackedEntity {
  student_id: ID;
  report_period_id: ID;
  behavior: number | null;       // 1-5
  work_ethic: number | null;
  participation: number | null;
  autonomy: number | null;
  methodology: number | null;
  notes: string | null;
}

/** Labels des dimensions du profil */
export const PROFILE_DIMENSIONS = [
  { key: 'behavior', label: 'Comportement' },
  { key: 'work_ethic', label: 'Travail' },
  { key: 'participation', label: 'Participation' },
  { key: 'autonomy', label: 'Autonomie' },
  { key: 'methodology', label: 'Méthode' },
] as const;

export type ProfileDimensionKey = typeof PROFILE_DIMENSIONS[number]['key'];

// ── Observations compétences ──

export type ObservationSource = 'computed' | 'manual' | 'ai';

export interface StudentSkillObservation extends TrackedEntity {
  student_id: ID;
  skill_id: ID;
  report_period_id: ID;
  level: number;               // 1-4
  observation: string | null;
  source: ObservationSource;
}

/** Évolution compétences pour le graphique T1/T2/T3 */
export interface SkillEvolutionRow {
  skill_id: ID;
  skill_label: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
  trend: 'up' | 'down' | 'stable' | 'unknown';
}

// ── Bulletins ──

export type BulletinEntryType = 'discipline' | 'class_teacher' | 'council';
export type BulletinStatus = 'draft' | 'review' | 'final';
export type BulletinSource = 'manual' | 'ai' | 'mixed';

export interface BulletinEntry extends TrackedEntity {
  student_id: ID;
  report_period_id: ID;
  entry_type: BulletinEntryType;
  subject_id: ID | null;
  content: string;
  status: BulletinStatus;
  source: BulletinSource;
}

export type BulletinEntryInsert = Omit<BulletinEntry, 'id' | 'created_at' | 'updated_at'>;

export interface BulletinEntryVersion extends BaseEntity {
  bulletin_entry_id: ID;
  content: string;
  version_number: number;
  source: 'manual' | 'ai';
}

// ── Orientation ──

export interface OrientationReport extends TrackedEntity {
  student_id: ID;
  report_period_id: ID | null;
  title: string;
  content: string;
  strengths: string | null;              // JSON array
  areas_for_improvement: string | null;  // JSON array
  recommendations: string | null;        // JSON array
  source: BulletinSource;
}

export interface OrientationInterview extends TrackedEntity {
  student_id: ID;
  interview_date: ISODate;
  attendees: string | null;
  summary: string;
  decisions: string | null;
  next_steps: string | null;
  parcoursup_wishes: string | null;      // JSON
}

// ── Documents élève ──

export interface StudentDocument extends BaseEntity {
  student_id: ID;
  document_id: ID;
  report_period_id: ID | null;
  label: string | null;
}
