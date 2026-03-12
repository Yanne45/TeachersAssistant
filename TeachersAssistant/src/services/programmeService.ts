// ============================================================================
// Teacher Assistant — Service : Programme & contenus
// ============================================================================

import { db } from './db';
import type {
  ProgramTopic, ProgramTopicInsert, ProgramTopicTree,
  ProgramTopicKeyword,
  Skill, SkillInsert,
  ContentType,
  SequenceTemplate,
  ID,
} from '../types';

// ── Programme (arbre hiérarchique) ──

export const programTopicService = {
  async getBySubjectLevel(yearId: ID, subjectId: ID, levelId: ID): Promise<ProgramTopic[]> {
    return db.select(
      `SELECT * FROM program_topics
       WHERE academic_year_id = ? AND subject_id = ? AND level_id = ?
       ORDER BY sort_order`,
      [yearId, subjectId, levelId]
    );
  },

  /** Construit l'arbre hiérarchique complet */
  async getTree(yearId: ID, subjectId: ID, levelId: ID): Promise<ProgramTopicTree[]> {
    const flat = await this.getBySubjectLevel(yearId, subjectId, levelId);
    return buildTree(flat);
  },

  async getById(id: ID): Promise<ProgramTopic | null> {
    return db.selectOne('SELECT * FROM program_topics WHERE id = ?', [id]);
  },

  async create(data: ProgramTopicInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO program_topics
       (academic_year_id, subject_id, level_id, parent_id, topic_type, code, title, description, expected_hours, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.subject_id, data.level_id, data.parent_id,
       data.topic_type, data.code, data.title, data.description, data.expected_hours, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<ProgramTopicInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE program_topics SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM program_topics WHERE id = ?', [id]);
  },

  /** Import batch depuis JSON/CSV */
  async importBatch(topics: ProgramTopicInsert[]): Promise<ID[]> {
    const ids: ID[] = [];
    await db.transaction(async () => {
      for (const t of topics) {
        const id = await this.create(t);
        ids.push(id);
      }
    });
    return ids;
  },

  /** Calcule le % de couverture d'un thème (nb chapitres avec séquences / total) */
  async getCoverage(topicId: ID): Promise<number> {
    const row = await db.selectOne<{ total: number; covered: number }>(
      `SELECT
         COUNT(*) as total,
         COUNT(spt.id) as covered
       FROM program_topics pt
       LEFT JOIN sequence_program_topics spt ON spt.program_topic_id = pt.id
       WHERE pt.parent_id = ?`,
      [topicId]
    );
    if (!row || row.total === 0) return 0;
    return Math.round((row.covered / row.total) * 100);
  },
};

/** Convertit une liste plate en arbre */
function buildTree(flat: ProgramTopic[]): ProgramTopicTree[] {
  const map = new Map<ID, ProgramTopicTree>();
  const roots: ProgramTopicTree[] = [];

  for (const item of flat) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flat) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Mots-clés de programme ──

export const programKeywordService = {
  async getByTopic(topicId: ID): Promise<ProgramTopicKeyword[]> {
    return db.select(
      'SELECT * FROM program_topic_keywords WHERE program_topic_id = ? ORDER BY sort_order',
      [topicId]
    );
  },

  async setKeywords(topicId: ID, keywords: string[]): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM program_topic_keywords WHERE program_topic_id = ?', [topicId]);
      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i]?.trim();
        if (kw) {
          await db.execute(
            'INSERT INTO program_topic_keywords (program_topic_id, keyword, sort_order) VALUES (?, ?, ?)',
            [topicId, kw, i]
          );
        }
      }
    });
  },
};

// ── Compétences ──

export const skillService = {
  async getAll(yearId: ID): Promise<Skill[]> {
    return db.select(
      'SELECT * FROM skills WHERE academic_year_id = ? ORDER BY skill_type, sort_order',
      [yearId]
    );
  },

  async getByType(yearId: ID, type: 'exercise_specific' | 'general'): Promise<Skill[]> {
    return db.select(
      'SELECT * FROM skills WHERE academic_year_id = ? AND skill_type = ? ORDER BY sort_order',
      [yearId, type]
    );
  },

  async getBySubject(yearId: ID, subjectId: ID): Promise<Skill[]> {
    return db.select(
      'SELECT * FROM skills WHERE academic_year_id = ? AND (subject_id = ? OR subject_id IS NULL) ORDER BY sort_order',
      [yearId, subjectId]
    );
  },

  async create(data: SkillInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO skills (academic_year_id, skill_type, category, label, description, subject_id, level_id, max_level, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.skill_type, data.category, data.label, data.description,
       data.subject_id, data.level_id, data.max_level, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<SkillInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE skills SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM skills WHERE id = ?', [id]);
  },
};

// ── Types de contenu IA ──

export const contentTypeService = {
  async getAll(): Promise<ContentType[]> {
    return db.select('SELECT * FROM content_types ORDER BY sort_order');
  },

  async getByCode(code: string): Promise<ContentType | null> {
    return db.selectOne('SELECT * FROM content_types WHERE code = ?', [code]);
  },

  async updatePrompt(id: ID, customPrompt: string): Promise<void> {
    await db.execute(
      "UPDATE content_types SET custom_prompt = ?, updated_at = datetime('now') WHERE id = ?",
      [customPrompt, id]
    );
  },
};

// ── Templates de séquences ──

export const sequenceTemplateService = {
  async getAll(): Promise<SequenceTemplate[]> {
    return db.select('SELECT * FROM sequence_templates ORDER BY updated_at DESC');
  },

  async getById(id: ID): Promise<SequenceTemplate | null> {
    return db.selectOne('SELECT * FROM sequence_templates WHERE id = ?', [id]);
  },

  async create(data: Omit<SequenceTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ID> {
    return db.insert(
      `INSERT INTO sequence_templates (title, subject_id, level_id, description, total_hours, template_data, source_sequence_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.subject_id, data.level_id, data.description, data.total_hours, data.template_data, data.source_sequence_id]
    );
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM sequence_templates WHERE id = ?', [id]);
  },
};
