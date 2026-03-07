// ============================================================================
// Teacher Assistant — Service : Évaluations & corrections
// ============================================================================

import { db } from './db';
import type {
  Assignment, AssignmentInsert, AssignmentWithDetails, AssignmentStats,
  Submission, SubmissionWithStudent, SubmissionStatus,
  Correction,
  SubmissionSkillEvaluation,
  SubmissionFeedback,
  ID,
} from '../types';

// ── Devoirs ──

export const assignmentService = {
  async getByYear(yearId: ID): Promise<AssignmentWithDetails[]> {
    return db.select(
      `SELECT a.*,
         c.name as class_name,
         sub.label as subject_label, sub.color as subject_color,
         at2.label as assignment_type_label,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'final') as corrected_count
       FROM assignments a
       JOIN classes c ON a.class_id = c.id
       JOIN subjects sub ON a.subject_id = sub.id
       LEFT JOIN assignment_types at2 ON a.assignment_type_id = at2.id
       WHERE a.academic_year_id = ?
       ORDER BY a.due_date DESC`,
      [yearId]
    );
  },

  async getById(id: ID): Promise<AssignmentWithDetails | null> {
    return db.selectOne(
      `SELECT a.*,
         c.name as class_name,
         sub.label as subject_label, sub.color as subject_color,
         at2.label as assignment_type_label,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) as submission_count,
         (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'final') as corrected_count
       FROM assignments a
       JOIN classes c ON a.class_id = c.id
       JOIN subjects sub ON a.subject_id = sub.id
       LEFT JOIN assignment_types at2 ON a.assignment_type_id = at2.id
       WHERE a.id = ?`,
      [id]
    );
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

  async updateScore(id: ID, score: number): Promise<void> {
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

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM submission_feedback WHERE id = ?', [id]);
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
    const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];

    // Histogramme par tranches de 2.5
    const ranges = ['0-2.5', '2.5-5', '5-7.5', '7.5-10', '10-12.5', '12.5-15', '15-17.5', '17.5-20'];
    const histogram = ranges.map(range => {
      const [min, max] = range.split('-').map(Number);
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
      min: values[0],
      max: values[n - 1],
      histogram,
      skill_averages: skillAverages,
      top_strengths: strengths.map(s => s.content),
      top_weaknesses: weaknesses.map(w => w.content),
    };
  },
};
