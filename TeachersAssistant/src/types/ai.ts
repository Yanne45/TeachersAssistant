// ============================================================================
// Teacher Assistant — Types : IA & génération
// Tables : ai_settings, ai_generations, ai_generation_documents,
//          ai_request_queue
// ============================================================================

import type { ID, ISODateTime, BaseEntity } from './common';

// ── Configuration IA ──

export type AIDetailLevel = 'concise' | 'standard' | 'detailed';

export interface AISettings {
  id: ID;
  model: string;              // "gpt-4o"
  style: string;              // "pedagogique"
  detail_level: AIDetailLevel;
  language: string;            // "fr"
  target_audience: string | null;
  citation_style: string | null;
  custom_instructions: string | null;
  updated_at: ISODateTime;
}

export type AISettingsUpdate = Partial<Omit<AISettings, 'id'>>;

// ── Générations ──

export type AIGenerationStatus = 'pending' | 'processing' | 'completed' | 'error';
export type AIOutputFormat = 'text' | 'markdown' | 'html' | 'json';

export interface AIGeneration extends BaseEntity {
  content_type_id: ID | null;
  subject_id: ID | null;
  level_id: ID | null;
  sequence_id: ID | null;
  session_id: ID | null;
  prompt_used: string;
  system_prompt: string | null;
  model_used: string;
  input_context: string | null;  // JSON
  output_content: string;
  output_format: AIOutputFormat;
  tokens_input: number | null;
  tokens_output: number | null;
  duration_ms: number | null;
  status: AIGenerationStatus;
  error_message: string | null;
  is_saved: boolean;
  rating: number | null;         // 1-5
}

/** Paramètres pour lancer une génération */
export interface AIGenerationRequest {
  content_type_code: string;
  subject_id?: ID;
  level_id?: ID;
  sequence_id?: ID;
  session_id?: ID;
  custom_prompt?: string;
  document_ids?: ID[];
  /** Contexte supplémentaire (programme, capacités, etc.) */
  context?: Record<string, unknown>;
}

// ── Documents source pour une génération ──

export type AIDocRole = 'context' | 'reference' | 'template';

export interface AIGenerationDocument extends BaseEntity {
  ai_generation_id: ID;
  document_id: ID;
  role: AIDocRole;
}

// ── File d'attente hors-ligne ──

export type AIQueueStatus = 'queued' | 'processing' | 'completed' | 'error';

export interface AIRequestQueue extends BaseEntity {
  request_type: string;        // "generate", "analyze", "correct"
  payload: string;             // JSON
  priority: number;            // 1=urgent, 10=basse
  status: AIQueueStatus;
  result: string | null;       // JSON
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  processed_at: ISODateTime | null;
}
