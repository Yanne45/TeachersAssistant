// ============================================================================
// searchService — Recherche transversale cross-table avec scoring
// Cherche dans : sequences, sessions, documents, students, assignments, lesson_log, program_topics
// ============================================================================

import { db } from './db';
import { embeddingService } from './embeddingService';

export interface SearchResult {
  id: number;
  type: 'sequence' | 'session' | 'document' | 'student' | 'assignment' | 'lesson_log' | 'program_topic';
  typeLabel: string;
  typeIcon: string;
  title: string;
  subtitle: string;
  subject?: string;
  subjectColor?: string;
  matchExcerpt: string;
  score: number;
  navigateTo?: {
    tab: 'dashboard' | 'programme' | 'preparation' | 'planning' | 'cahier' | 'classes' | 'evaluation' | 'bibliotheque' | 'parametres';
    page: string;
    entity?: number;
  };
}

function escapeForLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightMatch(text: string, terms: string[]): string {
  if (!text) return '';
  // Escape HTML first to prevent XSS, then apply <mark> highlights
  let result = escapeHtml(text);
  for (const term of terms) {
    const escaped = escapeHtml(term);
    const re = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  }
  // Truncate to ~150 chars around first match
  const markIdx = result.indexOf('<mark>');
  if (markIdx > 80) {
    result = '…' + result.slice(markIdx - 40);
  }
  if (result.length > 200) {
    result = result.slice(0, 200) + '…';
  }
  return result;
}

export const searchService = {
  async search(query: string, limit = 50): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const terms = query.trim().split(/\s+/).filter(t => t.length >= 2);
    if (terms.length === 0) return [];

    const results: SearchResult[] = [];

    // Build LIKE clauses for each term
    const likeClauses = (columns: string[]) =>
      terms.map(() => columns.map(c => `${c} LIKE ?`).join(' OR ')).join(' AND ');

    const likeParams = (columns: string[]) =>
      terms.flatMap(t => columns.map(() => `%${escapeForLike(t)}%`));

    // --- 1. Sequences ---
    try {
      const seqWhere = likeClauses(['s.title', 's.description']);
      const rows = await db.select<any>(
        `SELECT s.id, s.title, s.description,
                sub.label as subject_label, sub.color as subject_color, sub.short_label,
                l.label as level_label
         FROM sequences s
         LEFT JOIN subjects sub ON s.subject_id = sub.id
         LEFT JOIN levels l ON s.level_id = l.id
         WHERE ${seqWhere}
         LIMIT 10`,
        likeParams(['s.title', 's.description'])
      );
      for (const r of rows) {
        const titleMatch = terms.some(t => r.title?.toLowerCase().includes(t.toLowerCase()));
        results.push({
          id: r.id, type: 'sequence', typeLabel: 'Séquence', typeIcon: '🧩',
          title: r.title,
          subtitle: `${r.subject_label ?? ''} — ${r.level_label ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.description || r.title, terms),
          score: titleMatch ? 10 : 5,
          navigateTo: { tab: 'preparation', page: 'sequences', entity: r.id },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 2. Sessions ---
    try {
      const sesWhere = likeClauses(['se.title', 'se.objectives', 'se.outline']);
      const rows = await db.select<any>(
        `SELECT se.id, se.title, se.objectives, se.outline, se.sequence_id,
                s.title as seq_title,
                sub.label as subject_label, sub.color as subject_color, sub.short_label
         FROM sessions se
         LEFT JOIN sequences s ON se.sequence_id = s.id
         LEFT JOIN subjects sub ON s.subject_id = sub.id
         WHERE ${sesWhere}
         LIMIT 10`,
        likeParams(['se.title', 'se.objectives', 'se.outline'])
      );
      for (const r of rows) {
        const titleMatch = terms.some(t => r.title?.toLowerCase().includes(t.toLowerCase()));
        results.push({
          id: r.id, type: 'session', typeLabel: 'Séance', typeIcon: '📄',
          title: r.title,
          subtitle: `${r.seq_title ?? 'Séquence'} · ${r.subject_label ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.objectives || r.outline || r.title, terms),
          score: titleMatch ? 8 : 4,
          navigateTo: { tab: 'preparation', page: 'sequences', entity: r.sequence_id },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 3. Documents ---
    try {
      const docWhere = likeClauses(['d.title', 'd.extracted_text']);
      const rows = await db.select<any>(
        `SELECT d.id, d.title, d.extracted_text, d.file_type,
                sub.label as subject_label, sub.color as subject_color, sub.short_label
         FROM documents d
         LEFT JOIN subjects sub ON d.subject_id = sub.id
         WHERE ${docWhere}
         LIMIT 10`,
        likeParams(['d.title', 'd.extracted_text'])
      );
      for (const r of rows) {
        const titleMatch = terms.some(t => r.title?.toLowerCase().includes(t.toLowerCase()));
        results.push({
          id: r.id, type: 'document', typeLabel: 'Document', typeIcon: '📁',
          title: r.title,
          subtitle: `${r.file_type?.toUpperCase() ?? 'Fichier'} · ${r.subject_label ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.extracted_text || r.title, terms),
          score: titleMatch ? 7 : 3,
          navigateTo: { tab: 'preparation', page: 'bibliotheque', entity: r.id },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 4. Students ---
    try {
      const stuWhere = likeClauses(['st.last_name', 'st.first_name']);
      const rows = await db.select<any>(
        `SELECT st.id, st.last_name, st.first_name,
                c.label as class_label
         FROM students st
         LEFT JOIN student_class_enrollments sce ON st.id = sce.student_id
         LEFT JOIN classes c ON sce.class_id = c.id
         WHERE ${stuWhere}
         LIMIT 10`,
        likeParams(['st.last_name', 'st.first_name'])
      );
      for (const r of rows) {
        results.push({
          id: r.id, type: 'student', typeLabel: 'Élève', typeIcon: '👤',
          title: `${r.last_name} ${r.first_name}`,
          subtitle: r.class_label ?? '',
          matchExcerpt: `${r.last_name} ${r.first_name} — ${r.class_label ?? ''}`,
          score: 6,
          navigateTo: { tab: 'evaluation', page: 'fiche-eleve', entity: r.id },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 5. Assignments ---
    try {
      const assWhere = likeClauses(['a.title', 'a.instructions']);
      const rows = await db.select<any>(
        `SELECT a.id, a.title, a.instructions, a.assignment_date,
                sub.label as subject_label, sub.color as subject_color, sub.short_label
         FROM assignments a
         LEFT JOIN sequences seq ON a.sequence_id = seq.id
         LEFT JOIN subjects sub ON seq.subject_id = sub.id
         WHERE ${assWhere}
         LIMIT 10`,
        likeParams(['a.title', 'a.instructions'])
      );
      for (const r of rows) {
        results.push({
          id: r.id, type: 'assignment', typeLabel: 'Devoir', typeIcon: '📝',
          title: r.title,
          subtitle: `${r.subject_label ?? ''} · ${r.assignment_date ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.instructions || r.title, terms),
          score: 5,
          navigateTo: { tab: 'evaluation', page: 'devoirs', entity: r.id },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 6. Lesson log ---
    try {
      const logWhere = likeClauses(['ll.content', 'll.activities', 'll.homework']);
      const rows = await db.select<any>(
        `SELECT ll.id, ll.content, ll.activities, ll.homework, ll.session_date,
                c.label as class_label,
                sub.label as subject_label, sub.color as subject_color, sub.short_label
         FROM lesson_log ll
         LEFT JOIN classes c ON ll.class_id = c.id
         LEFT JOIN sessions se ON ll.session_id = se.id
         LEFT JOIN sequences seq ON se.sequence_id = seq.id
         LEFT JOIN subjects sub ON seq.subject_id = sub.id
         WHERE ${logWhere}
         LIMIT 10`,
        likeParams(['ll.content', 'll.activities', 'll.homework'])
      );
      for (const r of rows) {
        results.push({
          id: r.id, type: 'lesson_log', typeLabel: 'Cahier de textes', typeIcon: '📋',
          title: `${r.session_date ?? ''} — ${(r.content ?? '').slice(0, 50)}`,
          subtitle: `${r.class_label ?? ''} · ${r.subject_label ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.content || r.activities || '', terms),
          score: 3,
          navigateTo: { tab: 'cahier', page: 'default' },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // --- 7. Program topics ---
    try {
      const ptWhere = likeClauses(['pt.title', 'pt.description']);
      const rows = await db.select<any>(
        `SELECT pt.id, pt.title, pt.description, pt.topic_type,
                sub.label as subject_label, sub.color as subject_color, sub.short_label
         FROM program_topics pt
         LEFT JOIN subjects sub ON pt.subject_id = sub.id
         WHERE ${ptWhere}
         LIMIT 10`,
        likeParams(['pt.title', 'pt.description'])
      );
      for (const r of rows) {
        results.push({
          id: r.id, type: 'program_topic', typeLabel: 'Programme', typeIcon: '📚',
          title: r.title,
          subtitle: `${r.topic_type ?? ''} · ${r.subject_label ?? ''}`,
          subject: r.short_label ?? r.subject_label,
          subjectColor: r.subject_color,
          matchExcerpt: highlightMatch(r.description || r.title, terms),
          score: 4,
          navigateTo: { tab: 'programme', page: 'default' },
        });
      }
    } catch (err) { console.warn('[Search] Requête échouée:', err); }

    // Sort by score DESC, then by title ASC
    results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return results.slice(0, limit);
  },

  /**
   * Recherche sémantique par intention.
   * Parse la requête en langage naturel pour extraire :
   *  - filtres de type (séquence, devoir, document, élève…)
   *  - filtres de matière
   *  - filtres de modalité (oral, écrit, IA…)
   *  - mots-clés restants pour la recherche LIKE
   * Booste les scores en fonction des filtres matchés.
   */
  async semanticSearch(query: string, limit = 30): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.toLowerCase();

    // ── Parse entity type filter ──
    const TYPE_PATTERNS: Record<string, SearchResult['type'][]> = {
      'séquence': ['sequence'],
      'sequence': ['sequence'],
      'séance': ['session'],
      'seance': ['session'],
      'document': ['document'],
      'doc': ['document'],
      'élève': ['student'],
      'eleve': ['student'],
      'devoir': ['assignment'],
      'évaluation': ['assignment'],
      'evaluation': ['assignment'],
      'cahier': ['lesson_log'],
      'programme': ['program_topic'],
    };

    // ── Parse subject filter ──
    const SUBJECT_PATTERNS: Record<string, string[]> = {
      'histoire': ['histoire', 'hist'],
      'géographie': ['géographie', 'géo', 'geo', 'geographie'],
      'hggsp': ['hggsp'],
      'emc': ['emc'],
    };

    // ── Parse modality filter ──
    const MODALITY_PATTERNS: Record<string, string[]> = {
      'oral': ['oral', 'oraux'],
      'écrit': ['écrit', 'ecrit', 'rédaction', 'redaction', 'dissertation', 'commentaire'],
      'carte': ['carte', 'croquis', 'cartographie'],
      'ia': ['ia', 'intelligence artificielle', 'généré', 'genere'],
    };

    let typeFilter: SearchResult['type'][] | null = null;
    let subjectFilter: string | null = null;
    let modalityFilter: string | null = null;
    const cleanedTerms: string[] = [];

    // Split query into tokens
    const rawTokens = q.split(/\s+/);
    for (const token of rawTokens) {
      let consumed = false;

      // Check type patterns (exact match or plural)
      for (const [pattern, types] of Object.entries(TYPE_PATTERNS)) {
        if (token === pattern || token === pattern + 's') {
          typeFilter = types;
          consumed = true;
          break;
        }
      }

      if (!consumed) {
        for (const [subject, patterns] of Object.entries(SUBJECT_PATTERNS)) {
          if (patterns.includes(token)) {
            subjectFilter = subject;
            consumed = true;
            break;
          }
        }
      }

      if (!consumed) {
        for (const [modality, patterns] of Object.entries(MODALITY_PATTERNS)) {
          if (patterns.includes(token)) {
            modalityFilter = modality;
            consumed = true;
            break;
          }
        }
      }

      // Skip stopwords
      const STOPWORDS = new Set(['mes', 'mon', 'ma', 'les', 'des', 'une', 'avec', 'sur', 'pour', 'dans', 'qui', 'que', 'et', 'ou', 'de', 'du', 'la', 'le', 'un']);
      if (!consumed && !STOPWORDS.has(token) && token.length >= 2) {
        cleanedTerms.push(token);
      }
    }

    // If we extracted nothing useful, fall back to standard search
    if (cleanedTerms.length === 0 && !typeFilter && !subjectFilter && !modalityFilter) {
      return this.search(query, limit);
    }

    // Run standard search with cleaned terms (or original if no terms extracted)
    const searchQuery = cleanedTerms.length > 0 ? cleanedTerms.join(' ') : query;
    const rawResults = await this.search(searchQuery, limit * 2);

    // Apply semantic scoring
    const scored = rawResults.map(r => {
      let bonus = 0;

      // Type filter match
      if (typeFilter && typeFilter.includes(r.type)) {
        bonus += 15;
      } else if (typeFilter && !typeFilter.includes(r.type)) {
        bonus -= 10;
      }

      // Subject filter match
      if (subjectFilter && r.subject) {
        if (r.subject.toLowerCase().includes(subjectFilter)) {
          bonus += 10;
        } else {
          bonus -= 5;
        }
      }

      // Modality match (search in title + subtitle + excerpt)
      if (modalityFilter) {
        const fullText = `${r.title} ${r.subtitle} ${r.matchExcerpt}`.toLowerCase();
        const patterns = MODALITY_PATTERNS[modalityFilter] ?? [];
        if (patterns.some(p => fullText.includes(p))) {
          bonus += 8;
        }
      }

      // Term density bonus (more terms matched = higher score)
      if (cleanedTerms.length > 1) {
        const fullText = `${r.title} ${r.subtitle}`.toLowerCase();
        const matchedCount = cleanedTerms.filter(t => fullText.includes(t)).length;
        bonus += matchedCount * 2;
      }

      return { ...r, score: Math.max(1, r.score + bonus) };
    });

    // Filter out negative-score results if we have filters
    const filtered = (typeFilter || subjectFilter)
      ? scored.filter(r => r.score > 0)
      : scored;

    filtered.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return filtered.slice(0, limit);
  },

  /**
   * Recherche vectorielle par embeddings.
   * Génère l'embedding de la requête, puis compare avec les vecteurs en base.
   * Score = similarité cosinus (0-100).
   * Nécessite un index préalable (embeddingService.indexAll).
   */
  async vectorSearch(query: string, limit = 30): Promise<SearchResult[]> {
    return embeddingService.search(query, limit);
  },
};
