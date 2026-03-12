// ============================================================================
// Teacher Assistant — Service : Évaluations & corrections
// ============================================================================

import { db } from './db';
import type {
  AssignmentInsert, AssignmentWithDetails, AssignmentStats,
  Submission, SubmissionWithStudent, SubmissionStatus,
  Correction,
  SubmissionSkillEvaluation,
  SubmissionFeedback,
  ID,
} from '../types';

// ── Devoirs ──

export const assignmentService = {
  async getByYear(yearId: ID): Promise<AssignmentWithDetails[]> {
    const rows = await db.select<any[]>(
      `SELECT a.*,
         c.name as class_name,
         sub.label as subject_label, sub.color as subject_color,
         at2.label as assignment_type_label,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'final') as corrected_count,
         COALESCE((
           SELECT GROUP_CONCAT(sk.label, '||')
           FROM assignment_skill_map asm
           JOIN skills sk ON sk.id = asm.skill_id
           WHERE asm.assignment_id = a.id
         ), '') as skill_labels
       FROM assignments a
       JOIN classes c ON a.class_id = c.id
       JOIN subjects sub ON a.subject_id = sub.id
       LEFT JOIN assignment_types at2 ON a.assignment_type_id = at2.id
       WHERE a.academic_year_id = ?
       ORDER BY a.due_date DESC
       LIMIT 200`,
      [yearId]
    );
    return rows.map((row: any) => ({
      ...row,
      skill_labels: typeof row.skill_labels === 'string' && row.skill_labels.length > 0
        ? row.skill_labels.split('||')
        : [],
    })) as AssignmentWithDetails[];
  },

  async getById(id: ID): Promise<AssignmentWithDetails | null> {
    const row = await db.selectOne<any>(
      `SELECT a.*,
         c.name as class_name,
         sub.label as subject_label, sub.color as subject_color,
         at2.label as assignment_type_label,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'final') as corrected_count,
         COALESCE((
           SELECT GROUP_CONCAT(sk.label, '||')
           FROM assignment_skill_map asm
           JOIN skills sk ON sk.id = asm.skill_id
           WHERE asm.assignment_id = a.id
         ), '') as skill_labels
       FROM assignments a
       JOIN classes c ON a.class_id = c.id
       JOIN subjects sub ON a.subject_id = sub.id
       LEFT JOIN assignment_types at2 ON a.assignment_type_id = at2.id
       WHERE a.id = ?`,
      [id]
    );
    if (!row) return null;
    return {
      ...row,
      skill_labels: typeof row.skill_labels === 'string' && row.skill_labels.length > 0
        ? row.skill_labels.split('||')
        : [],
    } as AssignmentWithDetails;
  },

  async create(data: AssignmentInsert): Promise<ID> {
    return db.insert(
      `INSERT INTO assignments
       (academic_year_id, class_id, subject_id, sequence_id, assignment_type_id,
        title, description, instructions, max_score, coefficient,
        assignment_date, due_date, status, is_graded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.class_id, data.subject_id, data.sequence_id,
       data.assignment_type_id, data.title, data.description, data.instructions,
       data.max_score, data.coefficient, data.assignment_date, data.due_date,
       data.status, data.is_graded ? 1 : 0]
    );
  },

  async getSkills(assignmentId: ID): Promise<Array<{ skill_id: ID; skill_label: string }>> {
    return db.select(
      `SELECT asm.skill_id, sk.label as skill_label
       FROM assignment_skill_map asm
       JOIN skills sk ON sk.id = asm.skill_id
       WHERE asm.assignment_id = ?
       ORDER BY sk.sort_order, sk.label`,
      [assignmentId]
    );
  },

  async setSkills(assignmentId: ID, skillIds: ID[]): Promise<void> {
    await db.transaction(async () => {
      await db.execute('DELETE FROM assignment_skill_map WHERE assignment_id = ?', [assignmentId]);
      for (const skillId of skillIds) {
        await db.execute(
          'INSERT INTO assignment_skill_map (assignment_id, skill_id, weight) VALUES (?, ?, 1.0)',
          [assignmentId, skillId]
        );
      }
    });
  },

  async update(id: ID, data: Partial<AssignmentInsert>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(key === 'is_graded' ? (val ? 1 : 0) : val);
    }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM assignments WHERE id = ?', [id]);
  },

  async updateCorrectionModel(id: ID, text: string): Promise<void> {
    await db.execute(
      "UPDATE assignments SET correction_model_text = ?, updated_at = datetime('now') WHERE id = ?",
      [text, id]
    );
  },

  /** Compter les corrections en attente */
  async countPendingCorrections(yearId: ID): Promise<number> {
    const row = await db.selectOne<{ c: number }>(
      `SELECT COUNT(*) as c FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE a.academic_year_id = ? AND s.status != 'final'`,
      [yearId]
    );
    return row?.c ?? 0;
  },
};

// ── Copies (submissions) ──

export const submissionService = {
  async getByAssignment(assignmentId: ID): Promise<SubmissionWithStudent[]> {
    return db.select(
      `SELECT s.*,
         st.last_name as student_last_name,
         st.first_name as student_first_name
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       WHERE s.assignment_id = ?
       ORDER BY st.last_name, st.first_name`,
      [assignmentId]
    );
  },

  async getById(id: ID): Promise<Submission | null> {
    return db.selectOne('SELECT * FROM submissions WHERE id = ?', [id]);
  },

  async create(assignmentId: ID, studentId: ID, filePath?: string): Promise<ID> {
    return db.insert(
      'INSERT INTO submissions (assignment_id, student_id, file_path, status) VALUES (?, ?, ?, ?)',
      [assignmentId, studentId, filePath ?? null, 'pending']
    );
  },

  async updateScore(id: ID, score: number | null): Promise<void> {
    await db.execute(
      "UPDATE submissions SET score = ?, updated_at = datetime('now') WHERE id = ?",
      [score, id]
    );
  },

  async updateStatus(id: ID, status: SubmissionStatus): Promise<void> {
    const gradedAt = status === 'final' ? "datetime('now')" : 'NULL';
    await db.execute(
      `UPDATE submissions SET status = ?, graded_at = ${gradedAt}, updated_at = datetime('now') WHERE id = ?`,
      [status, id]
    );
  },

  /** Créer les submissions pour tous les élèves d'une classe */
  async createBatch(assignmentId: ID, classId: ID): Promise<void> {
    await db.execute(
      `INSERT INTO submissions (assignment_id, student_id, status)
       SELECT ?, sce.student_id, 'pending'
       FROM student_class_enrollments sce
       WHERE sce.class_id = ? AND sce.is_active = 1
         AND sce.student_id NOT IN (
           SELECT student_id FROM submissions WHERE assignment_id = ?
         )`,
      [assignmentId, classId, assignmentId]
    );
  },

  async updateFilePath(id: ID, filePath: string): Promise<void> {
    await db.execute(
      "UPDATE submissions SET file_path = ?, updated_at = datetime('now') WHERE id = ?",
      [filePath, id]
    );
  },

  async updateTextContent(id: ID, textContent: string): Promise<void> {
    await db.execute(
      "UPDATE submissions SET text_content = ?, updated_at = datetime('now') WHERE id = ?",
      [textContent, id]
    );
  },

  async updateAiSuggestedScore(id: ID, score: number): Promise<void> {
    await db.execute(
      "UPDATE submissions SET ai_suggested_score = ?, updated_at = datetime('now') WHERE id = ?",
      [score, id]
    );
  },

  async getByStudent(studentId: ID, limit = 50): Promise<Array<SubmissionWithStudent & {
    assignment_title: string;
    assignment_date: string | null;
    max_score: number;
  }>> {
    return db.select(
      `SELECT s.*,
         st.last_name as student_last_name,
         st.first_name as student_first_name,
         a.title as assignment_title,
         a.assignment_date,
         a.max_score
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = ?
       ORDER BY COALESCE(a.assignment_date, a.due_date, a.created_at) DESC
       LIMIT ?`,
      [studentId, limit]
    );
  },
};

// ── Corrections ──

export const correctionService = {
  async getBySubmission(submissionId: ID): Promise<Correction[]> {
    return db.select(
      'SELECT * FROM corrections WHERE submission_id = ? ORDER BY version DESC',
      [submissionId]
    );
  },

  async create(submissionId: ID, content: string, source: 'manual' | 'ai' | 'mixed'): Promise<ID> {
    const lastVersion = await db.selectOne<{ v: number }>(
      'SELECT MAX(version) as v FROM corrections WHERE submission_id = ?',
      [submissionId]
    );
    const version = (lastVersion?.v ?? 0) + 1;

    return db.insert(
      'INSERT INTO corrections (submission_id, content, source, version) VALUES (?, ?, ?, ?)',
      [submissionId, content, source, version]
    );
  },

  async getLatestBySubmission(submissionId: ID): Promise<Correction | null> {
    return db.selectOne(
      'SELECT * FROM corrections WHERE submission_id = ? ORDER BY version DESC, id DESC LIMIT 1',
      [submissionId]
    );
  },
};

// ── Évaluation compétences par copie ──

export const skillEvaluationService = {
  async getBySubmission(submissionId: ID): Promise<SubmissionSkillEvaluation[]> {
    return db.select(
      'SELECT * FROM submission_skill_evaluations WHERE submission_id = ?',
      [submissionId]
    );
  },

  async upsert(submissionId: ID, skillId: ID, level: number, source: string, comment?: string): Promise<void> {
    await db.execute(
      `INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source, comment)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(submission_id, skill_id)
       DO UPDATE SET level = excluded.level, source = excluded.source, comment = excluded.comment, updated_at = datetime('now')`,
      [submissionId, skillId, level, source, comment ?? null]
    );
  },

  async upsertBatch(items: Array<{ submissionId: ID; skillId: ID; level: number; source: string; comment?: string }>): Promise<void> {
    if (items.length === 0) return;
    await db.transaction(async () => {
      for (const item of items) {
        await db.execute(
          `INSERT INTO submission_skill_evaluations (submission_id, skill_id, level, source, comment)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(submission_id, skill_id)
           DO UPDATE SET level = excluded.level, source = excluded.source, comment = excluded.comment, updated_at = datetime('now')`,
          [item.submissionId, item.skillId, item.level, item.source, item.comment ?? null]
        );
      }
    });
  },
};

// ── Feedback qualitatif ──

export const feedbackService = {
  async getBySubmission(submissionId: ID): Promise<SubmissionFeedback[]> {
    return db.select(
      'SELECT * FROM submission_feedback WHERE submission_id = ? ORDER BY sort_order',
      [submissionId]
    );
  },

  async create(submissionId: ID, type: 'strength' | 'weakness' | 'suggestion', content: string, source: 'manual' | 'ai'): Promise<ID> {
    const maxOrder = await db.selectOne<{ m: number }>(
      'SELECT MAX(sort_order) as m FROM submission_feedback WHERE submission_id = ?',
      [submissionId]
    );
    return db.insert(
      'INSERT INTO submission_feedback (submission_id, feedback_type, content, source, sort_order) VALUES (?, ?, ?, ?, ?)',
      [submissionId, type, content, source, (maxOrder?.m ?? -1) + 1]
    );
  },

  async createBatch(items: Array<{ submissionId: ID; type: 'strength' | 'weakness' | 'suggestion'; content: string; source: 'manual' | 'ai' }>): Promise<void> {
    if (items.length === 0) return;
    await db.transaction(async () => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        await db.execute(
          'INSERT INTO submission_feedback (submission_id, feedback_type, content, source, sort_order) VALUES (?, ?, ?, ?, ?)',
          [item.submissionId, item.type, item.content, item.source, i]
        );
      }
    });
  },

  async deleteBySubmission(submissionId: ID): Promise<void> {
    await db.execute('DELETE FROM submission_feedback WHERE submission_id = ?', [submissionId]);
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM submission_feedback WHERE id = ?', [id]);
  },
};

// === TYPES D'ÉVALUATION ===

export interface AssignmentType {
  id: ID;
  code: string;
  label: string;
  default_max_score: number;
  sort_order: number;
  is_active: number;
}

export const assignmentTypeService = {
  async getAll(): Promise<AssignmentType[]> {
    return db.select<AssignmentType[]>(
      "SELECT * FROM assignment_types WHERE is_active = 1 ORDER BY sort_order, label"
    );
  },
  async create(data: { code: string; label: string; default_max_score: number }): Promise<ID> {
    const maxOrder = await db.selectOne<{ m: number }>("SELECT COALESCE(MAX(sort_order),0) as m FROM assignment_types");
    return db.insert(
      "INSERT INTO assignment_types (code, label, default_max_score, sort_order) VALUES (?, ?, ?, ?)",
      [data.code.trim().toLowerCase().replace(/\s+/g, '_'), data.label.trim(), data.default_max_score, (maxOrder?.m ?? 0) + 1]
    );
  },
  async update(id: ID, data: { label: string; default_max_score: number }): Promise<void> {
    await db.execute(
      "UPDATE assignment_types SET label = ?, default_max_score = ? WHERE id = ?",
      [data.label.trim(), data.default_max_score, id]
    );
  },
  async delete(id: ID): Promise<void> {
    await db.execute("UPDATE assignment_types SET is_active = 0 WHERE id = ?", [id]);
  },
};

// ── Bilan devoir (statistiques) ──

export const bilanService = {
  async computeStats(assignmentId: ID): Promise<AssignmentStats> {
    // Récupérer toutes les notes
    const scores = await db.select<{ score: number }[]>(
      'SELECT score FROM submissions WHERE assignment_id = ? AND score IS NOT NULL ORDER BY score',
      [assignmentId]
    );

    const values = scores.map(s => s.score);
    const n = values.length;

    if (n === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, histogram: [], skill_averages: [], top_strengths: [], top_weaknesses: [] };
    }

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const middle = Math.floor(n / 2);
    const left = values[middle - 1] ?? 0;
    const right = values[middle] ?? 0;
    const median = n % 2 === 0 ? (left + right) / 2 : right;

    // Histogramme par tranches de 2.5
    const ranges = ['0-2.5', '2.5-5', '5-7.5', '7.5-10', '10-12.5', '12.5-15', '15-17.5', '17.5-20'];
    const histogram = ranges.map(range => {
      const [minRaw = 0, maxRaw = 20] = range.split('-').map(Number);
      const min = Number.isFinite(minRaw) ? minRaw : 0;
      const max = Number.isFinite(maxRaw) ? maxRaw : 20;
      const count = values.filter(v => v >= min && v < max).length;
      return { range, count };
    });

    // Moyennes compétences
    const skillAverages = await db.select<{ skill_id: ID; skill_label: string; average: number }[]>(
      `SELECT sse.skill_id, sk.label as skill_label, AVG(sse.level) as average
       FROM submission_skill_evaluations sse
       JOIN skills sk ON sse.skill_id = sk.id
       JOIN submissions s ON sse.submission_id = s.id
       WHERE s.assignment_id = ?
       GROUP BY sse.skill_id`,
      [assignmentId]
    );

    // Top forces / lacunes
    const strengths = await db.select<{ content: string; cnt: number }[]>(
      `SELECT content, COUNT(*) as cnt FROM submission_feedback sf
       JOIN submissions s ON sf.submission_id = s.id
       WHERE s.assignment_id = ? AND sf.feedback_type = 'strength'
       GROUP BY content ORDER BY cnt DESC LIMIT 3`,
      [assignmentId]
    );

    const weaknesses = await db.select<{ content: string; cnt: number }[]>(
      `SELECT content, COUNT(*) as cnt FROM submission_feedback sf
       JOIN submissions s ON sf.submission_id = s.id
       WHERE s.assignment_id = ? AND sf.feedback_type = 'weakness'
       GROUP BY content ORDER BY cnt DESC LIMIT 3`,
      [assignmentId]
    );

    return {
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      min: values[0] ?? 0,
      max: values[n - 1] ?? 0,
      histogram,
      skill_averages: skillAverages,
      top_strengths: strengths.map(s => s.content),
      top_weaknesses: weaknesses.map(w => w.content),
    };
  },
};
