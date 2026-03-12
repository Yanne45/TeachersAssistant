-- ============================================================================
-- Migration 016 — Correction workflow enhancements
-- Adds subject file attachment to assignments, text_content + AI suggested
-- score to submissions.
-- ============================================================================

-- Assignment: subject file & correction model
ALTER TABLE assignments ADD COLUMN subject_file_path TEXT;
ALTER TABLE assignments ADD COLUMN subject_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN subject_extracted_text TEXT;
ALTER TABLE assignments ADD COLUMN correction_model_text TEXT;

-- Submissions: extracted text content (referenced by aiService but column was missing)
ALTER TABLE submissions ADD COLUMN text_content TEXT;

-- Submissions: AI suggested score (teacher keeps final say via score column)
ALTER TABLE submissions ADD COLUMN ai_suggested_score REAL;
