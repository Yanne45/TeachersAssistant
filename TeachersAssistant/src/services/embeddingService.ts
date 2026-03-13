// ============================================================================
// embeddingService — Génération, cache et recherche vectorielle par cosinus
// Stocke les embeddings dans SQLite (JSON), calcule la similarité côté JS.
// ============================================================================

import { db } from './db';
import { callEmbeddingAPI } from './aiService';
import type { SearchResult } from './searchService';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 d'une chaîne (via SubtleCrypto, disponible dans Tauri/WebView) */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Similarité cosinus entre deux vecteurs */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Tronque un texte pour l'envoi à l'API embedding (~8k tokens max ≈ 30k chars) */
function truncateForEmbedding(text: string, maxChars = 8000): string {
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

// ── Types ────────────────────────────────────────────────────────────────────

type EmbeddableEntityType = 'sequence' | 'session' | 'document' | 'assignment' | 'lesson_log' | 'program_topic';

interface CachedEmbedding {
  entity_type: string;
  entity_id: number;
  embedding: string; // JSON array
}

// ── Requêtes d'extraction de texte par entité ────────────────────────────────

const ENTITY_QUERIES: Record<EmbeddableEntityType, string> = {
  sequence: `
    SELECT s.id, s.title, COALESCE(s.description, '') as description,
           sub.label as subject_label, sub.color as subject_color, sub.short_label,
           l.label as level_label
    FROM sequences s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN levels l ON s.level_id = l.id`,
  session: `
    SELECT se.id, se.title, COALESCE(se.objectives, '') || ' ' || COALESCE(se.outline, '') as description,
           sq.title as seq_title,
           sub.label as subject_label, sub.color as subject_color, sub.short_label
    FROM sessions se
    LEFT JOIN sequences sq ON se.sequence_id = sq.id
    LEFT JOIN subjects sub ON sq.subject_id = sub.id`,
  document: `
    SELECT d.id, d.title, COALESCE(d.extracted_text, '') as description,
           d.file_type,
           sub.label as subject_label, sub.color as subject_color, sub.short_label
    FROM documents d
    LEFT JOIN subjects sub ON d.subject_id = sub.id`,
  assignment: `
    SELECT a.id, a.title, COALESCE(a.instructions, '') as description,
           a.assignment_date,
           sub.label as subject_label, sub.color as subject_color, sub.short_label
    FROM assignments a
    LEFT JOIN sequences seq ON a.sequence_id = seq.id
    LEFT JOIN subjects sub ON seq.subject_id = sub.id`,
  lesson_log: `
    SELECT ll.id, COALESCE(ll.title, ll.log_date) as title,
           COALESCE(ll.content, '') || ' ' || COALESCE(ll.activities, '') || ' ' || COALESCE(ll.homework, '') as description,
           c.label as class_label,
           sub.label as subject_label, sub.color as subject_color, sub.short_label
    FROM lesson_log ll
    LEFT JOIN classes c ON ll.class_id = c.id
    LEFT JOIN subjects sub ON ll.subject_id = sub.id`,
  program_topic: `
    SELECT pt.id, pt.title, COALESCE(pt.description, '') as description,
           pt.topic_type,
           sub.label as subject_label, sub.color as subject_color, sub.short_label
    FROM program_topics pt
    LEFT JOIN subjects sub ON pt.subject_id = sub.id`,
};

const TYPE_META: Record<EmbeddableEntityType, { label: string; icon: string; tab: SearchResult['navigateTo'] extends infer T ? T extends { tab: infer U } ? U : never : never; page: string }> = {
  sequence:      { label: 'Séquence',          icon: '🧩', tab: 'preparation',  page: 'sequences' },
  session:       { label: 'Séance',            icon: '📄', tab: 'preparation',  page: 'sequences' },
  document:      { label: 'Document',          icon: '📁', tab: 'preparation',  page: 'bibliotheque' },
  assignment:    { label: 'Devoir',            icon: '📝', tab: 'evaluation',   page: 'devoirs' },
  lesson_log:    { label: 'Cahier de textes',  icon: '📋', tab: 'cahier',       page: 'default' },
  program_topic: { label: 'Programme',         icon: '📚', tab: 'programme',    page: 'default' },
};

// ── Service principal ────────────────────────────────────────────────────────

export const embeddingService = {

  /**
   * Génère et stocke l'embedding d'une entité (avec cache SHA-256).
   * Ne re-génère que si le texte a changé.
   */
  async indexEntity(type: EmbeddableEntityType, id: number, text: string): Promise<void> {
    if (!text.trim()) return;
    const hash = await sha256(text);

    // Vérifier le cache
    const existing = await db.selectOne<{ text_hash: string }>(
      'SELECT text_hash FROM embeddings WHERE entity_type = ? AND entity_id = ?', [type, id]
    );
    if (existing?.text_hash === hash) return; // texte inchangé

    const result = await callEmbeddingAPI(truncateForEmbedding(text));

    await db.execute(
      `INSERT INTO embeddings (entity_type, entity_id, text_hash, embedding, model, dimensions)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_type, entity_id) DO UPDATE SET
         text_hash = excluded.text_hash,
         embedding = excluded.embedding,
         model = excluded.model,
         dimensions = excluded.dimensions,
         created_at = datetime('now')`,
      [type, id, hash, JSON.stringify(result.embedding), result.model, result.embedding.length]
    );
  },

  /**
   * Indexe toutes les entités d'un type donné.
   * Retourne le nombre d'entités indexées/mises à jour.
   */
  async indexAllOfType(
    type: EmbeddableEntityType,
    onProgress?: (current: number, total: number) => void,
  ): Promise<number> {
    const query = ENTITY_QUERIES[type];
    const rows = await db.select<any[]>(query);
    let indexed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const text = `${row.title ?? ''} ${row.description ?? ''}`.trim();
      if (!text) continue;
      try {
        await this.indexEntity(type, row.id, text);
        indexed++;
      } catch (err) {
        console.warn(`[Embedding] Erreur indexation ${type}#${row.id}:`, err);
      }
      onProgress?.(i + 1, rows.length);
    }
    return indexed;
  },

  /**
   * Indexe tous les types d'entités.
   */
  async indexAll(
    onProgress?: (type: string, current: number, total: number) => void,
  ): Promise<Record<string, number>> {
    const types: EmbeddableEntityType[] = ['sequence', 'session', 'document', 'assignment', 'lesson_log', 'program_topic'];
    const stats: Record<string, number> = {};
    for (const type of types) {
      stats[type] = await this.indexAllOfType(type, (c, t) => onProgress?.(type, c, t));
    }
    return stats;
  },

  /**
   * Recherche vectorielle : génère l'embedding de la requête,
   * puis calcule la similarité cosinus avec tous les embeddings en base.
   */
  async search(query: string, limit = 30, typeFilter?: EmbeddableEntityType): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    // 1. Embedding de la requête
    const queryResult = await callEmbeddingAPI(query);
    const queryVec = queryResult.embedding;
    if (!queryVec.length) return [];

    // 2. Charger tous les embeddings (ou filtrés par type)
    const whereClause = typeFilter ? 'WHERE entity_type = ?' : '';
    const params = typeFilter ? [typeFilter] : [];
    const cached = await db.select<CachedEmbedding[]>(
      `SELECT entity_type, entity_id, embedding FROM embeddings ${whereClause}`,
      params
    );

    // 3. Calculer la similarité cosinus
    const scored: { type: EmbeddableEntityType; id: number; similarity: number }[] = [];
    for (const row of cached) {
      let vec: number[];
      try { vec = JSON.parse(row.embedding); } catch { continue; }
      const sim = cosineSimilarity(queryVec, vec);
      if (sim > 0.3) { // seuil minimum de pertinence
        scored.push({ type: row.entity_type as EmbeddableEntityType, id: row.entity_id, similarity: sim });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    const topResults = scored.slice(0, limit);

    // 4. Enrichir avec les métadonnées des entités
    const results: SearchResult[] = [];
    for (const hit of topResults) {
      const meta = TYPE_META[hit.type];
      const query_sql = ENTITY_QUERIES[hit.type] + ' WHERE ' + (
        hit.type === 'sequence' ? 's.id' :
        hit.type === 'session' ? 'se.id' :
        hit.type === 'document' ? 'd.id' :
        hit.type === 'assignment' ? 'a.id' :
        hit.type === 'lesson_log' ? 'll.id' :
        'pt.id'
      ) + ' = ?';

      const row = await db.selectOne<any>(query_sql, [hit.id]);
      if (!row) continue;

      const description = (row.description ?? '').slice(0, 200);

      results.push({
        id: hit.id,
        type: hit.type,
        typeLabel: meta.label,
        typeIcon: meta.icon,
        title: row.title ?? `#${hit.id}`,
        subtitle: [row.seq_title, row.class_label, row.level_label, row.subject_label, row.topic_type, row.file_type?.toUpperCase(), row.assignment_date]
          .filter(Boolean).join(' · '),
        subject: row.short_label ?? row.subject_label,
        subjectColor: row.subject_color,
        matchExcerpt: description ? description + '…' : '',
        score: Math.round(hit.similarity * 100),
        navigateTo: {
          tab: meta.tab as any,
          page: meta.page,
          entity: hit.type === 'lesson_log' ? undefined : hit.id,
        },
      });
    }

    return results;
  },

  /** Compte d'embeddings indexés par type */
  async stats(): Promise<Record<string, number>> {
    const rows = await db.select<{ entity_type: string; cnt: number }[]>(
      'SELECT entity_type, COUNT(*) as cnt FROM embeddings GROUP BY entity_type'
    );
    const result: Record<string, number> = {};
    for (const r of rows) result[r.entity_type] = r.cnt;
    return result;
  },

  /** Supprime tous les embeddings (pour réindexation complète) */
  async clearAll(): Promise<void> {
    await db.execute('DELETE FROM embeddings');
  },
};
