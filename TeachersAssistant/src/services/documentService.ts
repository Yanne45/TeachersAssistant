// ============================================================================
// Teacher Assistant — Service : Bibliothèque documentaire
// ============================================================================

import { db } from './db';
import type {
  Document, DocumentInsert, DocumentWithDetails,
  DocumentType, DocumentTag,
  IngestionJob, IngestionSuggestion,
  ID,
} from '../types';

// ── Documents ──

export const documentService = {
  async getRecent(limit = 20): Promise<DocumentWithDetails[]> {
    return db.select(
      `SELECT d.*,
         dt.label as document_type_label,
         sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
       FROM documents d
       LEFT JOIN document_types dt ON d.document_type_id = dt.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       LEFT JOIN levels l ON d.level_id = l.id
       ORDER BY d.updated_at DESC
       LIMIT ?`,
      [limit]
    );
  },

  async getBySubject(subjectId: ID): Promise<DocumentWithDetails[]> {
    return db.select(
      `SELECT d.*,
         dt.label as document_type_label,
         sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
       FROM documents d
       LEFT JOIN document_types dt ON d.document_type_id = dt.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       LEFT JOIN levels l ON d.level_id = l.id
       WHERE d.subject_id = ?
       ORDER BY d.updated_at DESC`,
      [subjectId]
    );
  },

  async search(query: string, limit = 30): Promise<DocumentWithDetails[]> {
    const pattern = `%${query}%`;
    return db.select(
      `SELECT d.*,
         dt.label as document_type_label,
         sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
       FROM documents d
       LEFT JOIN document_types dt ON d.document_type_id = dt.id
       LEFT JOIN subjects sub ON d.subject_id = sub.id
       LEFT JOIN levels l ON d.level_id = l.id
       WHERE d.title LIKE ? OR d.extracted_text LIKE ?
       ORDER BY d.updated_at DESC
       LIMIT ?`,
      [pattern, pattern, limit]
    );
  },

  async getById(id: ID): Promise<Document | null> {
    return db.selectOne('SELECT * FROM documents WHERE id = ?', [id]);
  },

  async create(data: DocumentInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO documents
       (title, file_path, file_name, file_type, file_size, file_hash, mime_type,
        document_type_id, subject_id, level_id, thumbnail_path, extracted_text,
        source, generated_from_ai_generation_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.file_path, data.file_name, data.file_type, data.file_size,
       data.file_hash, data.mime_type, data.document_type_id, data.subject_id,
       data.level_id, data.thumbnail_path, data.extracted_text, data.source,
       data.generated_from_ai_generation_id, data.notes]
    );
  },

  async update(id: ID, data: Partial<DocumentInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM documents WHERE id = ?', [id]);
  },

  /** Associer des tags */
  async setTags(docId: ID, tagIds: ID[]): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM document_tag_map WHERE document_id = ?', [docId]);
      for (const tagId of tagIds) {
        await db.execute(
          'INSERT INTO document_tag_map (document_id, tag_id) VALUES (?, ?)',
          [docId, tagId]
        );
      }
    });
  },

  /** Récupérer les tags d'un document */
  async getTags(docId: ID): Promise<DocumentTag[]> {
    return db.select(
      `SELECT t.* FROM document_tags t
       JOIN document_tag_map m ON t.id = m.tag_id
       WHERE m.document_id = ?`,
      [docId]
    );
  },

  async count(): Promise<number> {
    const row = await db.selectOne<{ c: number }>('SELECT COUNT(*) as c FROM documents');
    return row?.c ?? 0;
  },
};

// ── Types de documents ──

export const documentTypeService = {
  async getAll(): Promise<DocumentType[]> {
    return db.select('SELECT * FROM document_types ORDER BY sort_order');
  },
};

// ── Tags ──

export const documentTagService = {
  async getAll(): Promise<DocumentTag[]> {
    return db.select('SELECT * FROM document_tags ORDER BY label');
  },

  async create(label: string, color?: string): Promise<ID> {
    return db.insert(
      'INSERT INTO document_tags (label, color) VALUES (?, ?)',
      [label, color ?? null]
    );
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM document_tags WHERE id = ?', [id]);
  },
};

// ── Ingestion ──

export const ingestionService = {
  async createJob(sourcePath: string): Promise<ID> {
    return db.insert(
      'INSERT INTO ingestion_jobs (source_path, status) VALUES (?, ?)',
      [sourcePath, 'pending']
    );
  },

  async updateStatus(id: ID, status: string, error?: string): Promise<void> {
    const completedAt = (status === 'done' || status === 'error') ? "datetime('now')" : 'NULL';
    await db.execute(
      `UPDATE ingestion_jobs SET status = ?, error_message = ?,
       started_at = CASE WHEN status = 'processing' AND started_at IS NULL THEN datetime('now') ELSE started_at END,
       completed_at = ${completedAt}
       WHERE id = ?`,
      [status, error ?? null, id]
    );
  },

  async getPending(): Promise<IngestionJob[]> {
    return db.select(
      "SELECT * FROM ingestion_jobs WHERE status IN ('pending', 'processing') ORDER BY created_at"
    );
  },
};
