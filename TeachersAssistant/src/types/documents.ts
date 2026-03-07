// ============================================================================
// Teacher Assistant — Types : Bibliothèque documentaire
// Tables : documents, document_types, document_sources, document_tags,
//          document_tag_map, ingestion_jobs, ingestion_suggestions
// ============================================================================

import type { ID, ISODateTime, TrackedEntity, BaseEntity } from './common';

// ── Types de documents ──

export interface DocumentType extends BaseEntity {
  code: string;                // "cours", "diaporama"
  label: string;
  icon: string | null;
  sort_order: number;
}

// ── Documents ──

export type DocumentSource = 'import' | 'ai' | 'scan' | 'manual';
export type FileType = 'pdf' | 'docx' | 'pptx' | 'png' | 'jpg' | 'jpeg' | 'gif' | string;

export interface Document extends TrackedEntity {
  title: string;
  file_path: string;
  file_name: string;
  file_type: FileType;
  file_size: number | null;
  file_hash: string | null;
  mime_type: string | null;
  document_type_id: ID | null;
  subject_id: ID | null;
  level_id: ID | null;
  thumbnail_path: string | null;
  extracted_text: string | null;
  source: DocumentSource;
  generated_from_ai_generation_id: ID | null;
  notes: string | null;
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>;

/** Document enrichi pour affichage dans la grille */
export interface DocumentWithDetails extends Document {
  document_type_label: string | null;
  subject_label: string | null;
  subject_color: string | null;
  level_label: string | null;
  tags: string[];
  is_ai_generated: boolean;
}

// ── Dossiers surveillés ──

export interface DocumentSourceFolder extends BaseEntity {
  folder_path: string;
  label: string | null;
  is_active: boolean;
  last_scanned_at: ISODateTime | null;
}

// ── Tags ──

export interface DocumentTag extends BaseEntity {
  label: string;
  color: string | null;
}

export interface DocumentTagMap extends BaseEntity {
  document_id: ID;
  tag_id: ID;
}

// ── Ingestion ──

export type IngestionStatus = 'pending' | 'processing' | 'done' | 'error';

export interface IngestionJob extends BaseEntity {
  document_id: ID | null;
  source_path: string;
  status: IngestionStatus;
  error_message: string | null;
  started_at: ISODateTime | null;
  completed_at: ISODateTime | null;
}

export interface IngestionSuggestion extends BaseEntity {
  ingestion_job_id: ID;
  field: string;               // "subject", "level", "document_type", "tags"
  suggested_value: string;
  confidence: number | null;   // 0.0 – 1.0
  is_accepted: boolean | null; // null=pending
}
