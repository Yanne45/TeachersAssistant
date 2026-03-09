-- ============================================================================
-- Migration 011 — Liaison directe séquence ↔ document
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_documents (
  sequence_id  INTEGER NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sequence_id, document_id)
);
