// ============================================================================
// Teacher Assistant — Service : Séquences, séances, cahier de textes
// ============================================================================

import { db } from './db';
import type {
  Sequence, SequenceInsert, SequenceWithDetails,
  Session, SessionInsert, SessionWithDetails,
  LessonLog, LessonLogInsert, LessonLogWithDetails,
  ID,
} from '../types';

// ── Séquences ──

export const sequenceService = {
  async getByYear(yearId: ID): Promise<SequenceWithDetails[]> {
    return db.select(
      `SELECT s.*,
         sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         (SELECT COUNT(*) FROM sessions se WHERE se.sequence_id = s.id) as session_count
       FROM sequences s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN levels l ON s.level_id = l.id
       WHERE s.academic_year_id = ?
       ORDER BY s.sort_order`,
      [yearId]
    );
  },

  async getById(id: ID): Promise<SequenceWithDetails | null> {
    return db.selectOne(
      `SELECT s.*,
         sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         (SELECT COUNT(*) FROM sessions se WHERE se.sequence_id = s.id) as session_count
       FROM sequences s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN levels l ON s.level_id = l.id
       WHERE s.id = ?`,
      [id]
    );
  },

  async getByStatus(yearId: ID, status: string): Promise<SequenceWithDetails[]> {
    return db.select(
      `SELECT s.*, sub.label as subject_label, sub.color as subject_color,
         l.label as level_label,
         (SELECT COUNT(*) FROM sessions se WHERE se.sequence_id = s.id) as session_count
       FROM sequences s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN levels l ON s.level_id = l.id
       WHERE s.academic_year_id = ? AND s.status = ?
       ORDER BY s.sort_order`,
      [yearId, status]
    );
  },

  async create(data: SequenceInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO sequences
       (academic_year_id, subject_id, level_id, title, description, total_hours,
        start_date, end_date, status, sort_order, template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.subject_id, data.level_id, data.title,
       data.description, data.total_hours, data.start_date, data.end_date,
       data.status, data.sort_order, data.template_id]
    );
  },

  async update(id: ID, data: Partial<SequenceInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE sequences SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM sequences WHERE id = ?', [id]);
  },

  /** Associer une séquence à des classes */
  async setClasses(sequenceId: ID, classIds: ID[]): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM sequence_classes WHERE sequence_id = ?', [sequenceId]);
      for (const classId of classIds) {
        await db.execute(
          'INSERT INTO sequence_classes (sequence_id, class_id) VALUES (?, ?)',
          [sequenceId, classId]
        );
      }
    });
  },

  /** Récupérer les classes d'une séquence */
  async getClasses(sequenceId: ID): Promise<{ class_id: ID; class_name: string }[]> {
    return db.select(
      `SELECT sc.class_id, c.name as class_name
       FROM sequence_classes sc JOIN classes c ON sc.class_id = c.id
       WHERE sc.sequence_id = ?`,
      [sequenceId]
    );
  },

  /** Associer aux topics du programme */
  async setTopics(sequenceId: ID, topicIds: ID[], primaryId?: ID): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM sequence_program_topics WHERE sequence_id = ?', [sequenceId]);
      for (const topicId of topicIds) {
        await db.execute(
          'INSERT INTO sequence_program_topics (sequence_id, program_topic_id, is_primary) VALUES (?, ?, ?)',
          [sequenceId, topicId, topicId === primaryId ? 1 : 0]
        );
      }
    });
  },

  /** Sauvegarder comme template */
  async saveAsTemplate(id: ID): Promise<ID> {
    const seq = await this.getById(id);
    if (!seq) throw new Error('Séquence introuvable');
    const sessions = await sessionService.getBySequence(id);

    const templateData = JSON.stringify({
      description: seq.description,
      sessions: sessions.map(s => ({
        title: s.title,
        duration_minutes: s.duration_minutes,
        objectives: s.objectives,
        activities: s.activities,
        lesson_plan: s.lesson_plan,
      })),
    });

    return db.insert(
      `INSERT INTO sequence_templates (title, subject_id, level_id, description, total_hours, template_data, source_sequence_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [seq.title, seq.subject_id, seq.level_id, seq.description, seq.total_hours, templateData, id]
    );
  },
};

// ── Séances ──

export const sessionService = {
  async getBySequence(sequenceId: ID): Promise<SessionWithDetails[]> {
    return db.select(
      `SELECT s.*,
         (SELECT COUNT(*) FROM session_documents sd WHERE sd.session_id = s.id) as document_count
       FROM sessions s
       WHERE s.sequence_id = ?
       ORDER BY s.sort_order`,
      [sequenceId]
    );
  },

  async getById(id: ID): Promise<Session | null> {
    return db.selectOne('SELECT * FROM sessions WHERE id = ?', [id]);
  },

  async create(data: SessionInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO sessions
       (sequence_id, title, description, objectives, activities, lesson_plan,
        duration_minutes, session_number, status, session_date, source, timetable_slot_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.sequence_id, data.title, data.description, data.objectives,
       data.activities, data.lesson_plan, data.duration_minutes, data.session_number,
       data.status, data.session_date, data.source, data.timetable_slot_id, data.sort_order]
    );
  },

  async update(id: ID, data: Partial<SessionInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM sessions WHERE id = ?', [id]);
  },

  /** Réordonner les séances */
  async reorder(sequenceId: ID, orderedIds: ID[]): Promise<void> {
    await db.transaction(async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute(
          'UPDATE sessions SET sort_order = ?, session_number = ? WHERE id = ? AND sequence_id = ?',
          [i, i + 1, orderedIds[i], sequenceId]
        );
      }
    });
  },

  /** Lier des documents */
  async setDocuments(sessionId: ID, documentIds: ID[]): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM session_documents WHERE session_id = ?', [sessionId]);
      for (let i = 0; i < documentIds.length; i++) {
        await db.execute(
          'INSERT INTO session_documents (session_id, document_id, sort_order) VALUES (?, ?, ?)',
          [sessionId, documentIds[i], i]
        );
      }
    });
  },

  /** Dupliquer une séance */
  async duplicate(id: ID): Promise<ID> {
    const session = await this.getById(id);
    if (!session) throw new Error('Séance introuvable');
    return this.create({
      ...session,
      title: `${session.title} (copie)`,
      status: 'planned',
      source: 'duplicate',
      sort_order: session.sort_order + 1,
    });
  },
};

// ── Cahier de textes ──

export const lessonLogService = {
  async getByClass(classId: ID): Promise<LessonLogWithDetails[]> {
    return db.select(
      `SELECT ll.*,
         sub.label as subject_label, sub.color as subject_color,
         c.name as class_name,
         CASE WHEN ll.session_id IS NOT NULL THEN 1 ELSE 0 END as is_linked
       FROM lesson_log ll
       JOIN subjects sub ON ll.subject_id = sub.id
       JOIN classes c ON ll.class_id = c.id
       WHERE ll.class_id = ?
       ORDER BY ll.log_date DESC`,
      [classId]
    );
  },

  async getRecent(limit = 20): Promise<LessonLogWithDetails[]> {
    return db.select(
      `SELECT ll.*,
         sub.label as subject_label, sub.color as subject_color,
         c.name as class_name,
         CASE WHEN ll.session_id IS NOT NULL THEN 1 ELSE 0 END as is_linked
       FROM lesson_log ll
       JOIN subjects sub ON ll.subject_id = sub.id
       JOIN classes c ON ll.class_id = c.id
       ORDER BY ll.log_date DESC
       LIMIT ?`,
      [limit]
    );
  },

  async create(data: LessonLogInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO lesson_log
       (session_id, class_id, subject_id, log_date, title, content, activities, homework, homework_due_date, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.session_id, data.class_id, data.subject_id, data.log_date,
       data.title, data.content, data.activities, data.homework, data.homework_due_date, data.source]
    );
  },

  async update(id: ID, data: Partial<LessonLogInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE lesson_log SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM lesson_log WHERE id = ?', [id]);
  },

  /** Créer depuis une séance */
  async createFromSession(sessionId: ID, classId: ID): Promise<ID> {
    const session = await sessionService.getById(sessionId);
    if (!session) throw new Error('Séance introuvable');

    const seq = await sequenceService.getById(session.sequence_id);

    return this.create({
      session_id: sessionId,
      class_id: classId,
      subject_id: seq!.subject_id,
      log_date: session.session_date || new Date().toISOString().split('T')[0],
      title: session.title,
      content: session.lesson_plan,
      activities: session.activities,
      homework: null,
      homework_due_date: null,
      source: 'session',
    });
  },

  /** Compter les entrées manquantes (pour alertes dashboard) */
  async countMissing(yearId: ID): Promise<number> {
    const row = await db.selectOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM sessions s
       JOIN sequences seq ON s.sequence_id = seq.id
       WHERE seq.academic_year_id = ?
         AND s.status = 'done'
         AND s.id NOT IN (SELECT session_id FROM lesson_log WHERE session_id IS NOT NULL)`,
      [yearId]
    );
    return row?.count ?? 0;
  },
};
