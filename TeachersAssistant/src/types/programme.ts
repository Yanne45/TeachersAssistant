// ============================================================================
// Teacher Assistant — Types : Programme & contenus
// Tables : program_topics, skills, content_types, sequence_templates
// ============================================================================

import type { ID, TrackedEntity } from './common';

// ── Programme (arbre hiérarchique) ──

export type TopicType = 'theme' | 'chapter' | 'point' | 'sub_point';

export interface ProgramTopic extends TrackedEntity {
  academic_year_id: ID;
  subject_id: ID;
  level_id: ID;
  parent_id: ID | null;
  topic_type: TopicType;
  code: string | null;         // "T1", "T1-C1"
  title: string;
  description: string | null;
  expected_hours: number | null;
  sort_order: number;
}

export type ProgramTopicInsert = Omit<ProgramTopic, 'id' | 'created_at' | 'updated_at'>;

/** Topic enrichi avec ses enfants (pour l'arbre) */
export interface ProgramTopicTree extends ProgramTopic {
  children: ProgramTopicTree[];
  /** Calculé : % de couverture par les séquences liées */
  coverage_percent?: number;
}

// ── Capacités / compétences ──

export type SkillType = 'exercise_specific' | 'general';

export interface Skill extends TrackedEntity {
  academic_year_id: ID;
  skill_type: SkillType;
  category: string | null;     // "Analyse", "Rédaction"
  label: string;               // "Problématiser"
  description: string | null;
  subject_id: ID | null;
  level_id: ID | null;
  max_level: number;           // 4
  sort_order: number;
}

export type SkillInsert = Omit<Skill, 'id' | 'created_at' | 'updated_at'>;

// ── Types de contenu IA ──

export interface ContentType extends TrackedEntity {
  code: string;                // "cours", "fiche_revision"
  label: string;
  description: string | null;
  default_prompt: string | null;
  custom_prompt: string | null;
  icon: string | null;
  sort_order: number;
}

// ── Templates de séquences ──

export interface SequenceTemplate extends TrackedEntity {
  title: string;
  subject_id: ID | null;
  level_id: ID | null;
  description: string | null;
  total_hours: number | null;
  /** JSON sérialisé : structure séances, objectifs, etc. */
  template_data: string;
  source_sequence_id: ID | null;
}

/** Données structurées du template (après JSON.parse) */
export interface SequenceTemplateData {
  sessions: {
    title: string;
    duration_minutes: number;
    objectives: string;
    activities: string;
    lesson_plan: string;
    skills: string[];
  }[];
  description?: string;
  skills?: string[];
}
