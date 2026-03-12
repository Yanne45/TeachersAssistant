// ============================================================================
// Teacher Assistant — Types : Corrections & évaluations
// Tables : assignment_types, exercise_type_skill_map, assignments,
//          assignment_skill_map, submissions, corrections,
//          submission_skill_evaluations, feedback_items, submission_feedback
// ============================================================================

import type { ID, ISODate, ISODateTime, TrackedEntity, BaseEntity } from './common';

// ── Types d'exercice ──

export interface AssignmentType extends BaseEntity {
  code: string;                // "dissertation", "commentaire"
  label: string;
  description: string | null;
  default_max_score: number;
  sort_order: number;
}

// ── Skills par défaut par type d'exercice ──

export interface ExerciseTypeSkillMap extends BaseEntity {
  assignment_type_id: ID;
  skill_id: ID;
  weight: number;
}

// ── Devoirs ──

export type AssignmentStatus = 'draft' | 'assigned' | 'collecting' | 'correcting' | 'corrected' | 'returned';

export interface Assignment extends TrackedEntity {
  academic_year_id: ID;
  class_id: ID;
  subject_id: ID;
  sequence_id: ID | null;
  assignment_type_id: ID | null;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  coefficient: number;
  assignment_date: ISODate | null;
  due_date: ISODate | null;
  status: AssignmentStatus;
  is_graded: boolean;
  subject_file_path: string | null;
  subject_document_id: ID | null;
  subject_extracted_text: string | null;
  correction_model_text: string | null;
}

export type AssignmentInsert = Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'subject_file_path' | 'subject_document_id' | 'subject_extracted_text' | 'correction_model_text'> & {
  subject_file_path?: string | null;
  subject_document_id?: ID | null;
  subject_extracted_text?: string | null;
  correction_model_text?: string | null;
};

/** Devoir enrichi pour la liste */
export interface AssignmentWithDetails extends Assignment {
  class_name: string;
  subject_label: string;
  subject_color: string;
  assignment_type_label: string | null;
  submission_count: number;
  corrected_count: number;
  skill_labels: string[];
}

// ── Compétences évaluées par devoir ──

export interface AssignmentSkillMap extends BaseEntity {
  assignment_id: ID;
  skill_id: ID;
  weight: number;
}

// ── Copies (submissions) ──

export type SubmissionStatus = 'pending' | 'ai_processing' | 'to_confirm' | 'final';

export interface Submission extends TrackedEntity {
  assignment_id: ID;
  student_id: ID;
  file_path: string | null;
  score: number | null;
  status: SubmissionStatus;
  submitted_at: ISODateTime | null;
  graded_at: ISODateTime | null;
  text_content: string | null;
  ai_suggested_score: number | null;
}

/** Copie enrichie pour la correction en série */
export interface SubmissionWithStudent extends Submission {
  student_last_name: string;
  student_first_name: string;
  /** Niveaux compétences { skill_id: level } */
  skill_levels: Record<ID, number | null>;
  strengths: string[];
  weaknesses: string[];
  correction_text: string | null;
}

// ── Corrections ──

export type CorrectionSource = 'manual' | 'ai' | 'mixed';

export interface Correction extends TrackedEntity {
  submission_id: ID;
  content: string | null;
  source: CorrectionSource;
  ai_generation_id: ID | null;
  version: number;
}

// ── Évaluation compétences par copie ──

export interface SubmissionSkillEvaluation extends TrackedEntity {
  submission_id: ID;
  skill_id: ID;
  level: number;               // 1-4
  source: CorrectionSource;
  comment: string | null;
}

// ── Feedback qualitatif ──

export type FeedbackCategory = 'strength' | 'weakness' | 'suggestion';

export interface FeedbackItem extends BaseEntity {
  label: string;
  category: FeedbackCategory;
  is_default: boolean;
  sort_order: number;
}

export type FeedbackSource = 'manual' | 'ai';

export interface SubmissionFeedback extends BaseEntity {
  submission_id: ID;
  feedback_item_id: ID | null;
  feedback_type: FeedbackCategory;
  content: string;
  source: FeedbackSource;
  sort_order: number;
}

// ── Types pour le bilan devoir ──

export interface AssignmentStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  histogram: { range: string; count: number }[];
  skill_averages: { skill_id: ID; skill_label: string; average: number }[];
  top_strengths: string[];
  top_weaknesses: string[];
}
