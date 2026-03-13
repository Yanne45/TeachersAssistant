// ============================================================================
// Teacher Assistant — Rubric Template Service
// CRUD pour les grilles d'évaluation réutilisables (banque de rubriques)
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

// ── Types ──

export interface RubricTemplate {
  id: ID;
  academic_year_id: ID;
  assignment_type_id: ID | null;
  title: string;
  description: string | null;
  subject_id: ID | null;
  level_id: ID | null;
  max_score: number;
  is_shared: number;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  assignment_type_label?: string;
  subject_label?: string;
  level_label?: string;
  criteria_count?: number;
}

export interface RubricCriterion {
  id: ID;
  rubric_template_id: ID;
  skill_id: ID | null;
  label: string;
  weight: number;
  sort_order: number;
  descriptors: RubricDescriptor[];
}

export interface RubricDescriptor {
  id?: ID;
  rubric_template_criteria_id?: ID;
  level: number;
  label: string;
  description: string;
}

// ── Service ──

export const rubricTemplateService = {

  /** List all templates for a year (with metadata) */
  async getByYear(yearId: ID): Promise<RubricTemplate[]> {
    const rows: any[] = await db.select<any>(`
      SELECT rt.*,
             at2.label AS assignment_type_label,
             s.short_label AS subject_label,
             l.label AS level_label,
             (SELECT COUNT(*) FROM rubric_template_criteria WHERE rubric_template_id = rt.id) AS criteria_count
      FROM rubric_templates rt
      LEFT JOIN assignment_types at2 ON at2.id = rt.assignment_type_id
      LEFT JOIN subjects s ON s.id = rt.subject_id
      LEFT JOIN levels l ON l.id = rt.level_id
      WHERE rt.academic_year_id = ?
      ORDER BY rt.updated_at DESC
    `, [yearId]);
    return rows;
  },

  /** Get a single template with all criteria and descriptors */
  async getById(id: ID): Promise<{ template: RubricTemplate; criteria: RubricCriterion[] } | null> {
    const templates: any[] = await db.select<any>(
      'SELECT * FROM rubric_templates WHERE id = ?', [id]
    );
    if (templates.length === 0) return null;
    const template = templates[0] as RubricTemplate;

    const criteriaRows: any[] = await db.select<any>(`
      SELECT * FROM rubric_template_criteria
      WHERE rubric_template_id = ?
      ORDER BY sort_order, id
    `, [id]);

    const criteria: RubricCriterion[] = [];
    for (const row of criteriaRows) {
      const descriptors: any[] = await db.select<any>(`
        SELECT * FROM rubric_template_descriptors
        WHERE rubric_template_criteria_id = ?
        ORDER BY level
      `, [row.id]);
      criteria.push({ ...row, descriptors });
    }

    return { template, criteria };
  },

  /** Create a new rubric template */
  async create(data: {
    academic_year_id: ID;
    title: string;
    description?: string;
    assignment_type_id?: ID | null;
    subject_id?: ID | null;
    level_id?: ID | null;
    max_score?: number;
  }): Promise<ID> {
    const result: any = await db.execute(
      `INSERT INTO rubric_templates (academic_year_id, title, description, assignment_type_id, subject_id, level_id, max_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.academic_year_id, data.title, data.description ?? null,
       data.assignment_type_id ?? null, data.subject_id ?? null,
       data.level_id ?? null, data.max_score ?? 20]
    );
    return result.lastInsertId;
  },

  /** Update rubric template metadata */
  async update(id: ID, data: Partial<{
    title: string;
    description: string | null;
    assignment_type_id: ID | null;
    subject_id: ID | null;
    level_id: ID | null;
    max_score: number;
  }>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.execute(`UPDATE rubric_templates SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /** Delete template and cascade */
  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM rubric_templates WHERE id = ?', [id]);
  },

  /** Add a criterion to a template */
  async addCriterion(templateId: ID, data: {
    label: string;
    skill_id?: ID | null;
    weight?: number;
    sort_order?: number;
  }): Promise<ID> {
    const result: any = await db.execute(
      `INSERT INTO rubric_template_criteria (rubric_template_id, label, skill_id, weight, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [templateId, data.label, data.skill_id ?? null, data.weight ?? 1.0, data.sort_order ?? 0]
    );
    const criteriaId = result.lastInsertId;

    // Auto-create 4 empty descriptors
    for (let level = 1; level <= 4; level++) {
      await db.execute(
        `INSERT INTO rubric_template_descriptors (rubric_template_criteria_id, level, label, description)
         VALUES (?, ?, ?, '')`,
        [criteriaId, level, DEFAULT_LEVEL_LABELS[level] ?? '']
      );
    }

    await db.execute("UPDATE rubric_templates SET updated_at = datetime('now') WHERE id = ?", [templateId]);
    return criteriaId;
  },

  /** Update a criterion */
  async updateCriterion(criteriaId: ID, data: Partial<{
    label: string;
    skill_id: ID | null;
    weight: number;
    sort_order: number;
  }>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return;
    values.push(criteriaId);
    await db.execute(`UPDATE rubric_template_criteria SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  /** Delete a criterion */
  async deleteCriterion(criteriaId: ID): Promise<void> {
    await db.execute('DELETE FROM rubric_template_criteria WHERE id = ?', [criteriaId]);
  },

  /** Save descriptors for a criterion (upsert all 4 levels) */
  async saveDescriptors(criteriaId: ID, descriptors: { level: number; label: string; description: string }[]): Promise<void> {
    for (const d of descriptors) {
      await db.execute(
        `INSERT INTO rubric_template_descriptors (rubric_template_criteria_id, level, label, description)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(rubric_template_criteria_id, level) DO UPDATE SET label = excluded.label, description = excluded.description`,
        [criteriaId, d.level, d.label, d.description]
      );
    }
  },

  /** Clone a template (deep copy with all criteria and descriptors) */
  async clone(sourceId: ID, newTitle: string, targetYearId?: ID): Promise<ID> {
    const source = await this.getById(sourceId);
    if (!source) throw new Error('Template not found');

    const newId = await this.create({
      academic_year_id: targetYearId ?? source.template.academic_year_id,
      title: newTitle,
      description: source.template.description ?? undefined,
      assignment_type_id: source.template.assignment_type_id,
      subject_id: source.template.subject_id,
      level_id: source.template.level_id,
      max_score: source.template.max_score,
    });

    for (const criterion of source.criteria) {
      const newCriteriaId = await this.addCriterion(newId, {
        label: criterion.label,
        skill_id: criterion.skill_id,
        weight: criterion.weight,
        sort_order: criterion.sort_order,
      });
      if (criterion.descriptors.length > 0) {
        await this.saveDescriptors(newCriteriaId, criterion.descriptors);
      }
    }

    return newId;
  },

  /** Apply a rubric template to an assignment (create skill links + descriptors) */
  async applyToAssignment(templateId: ID, assignmentId: ID): Promise<void> {
    const source = await this.getById(templateId);
    if (!source) throw new Error('Template not found');

    // Link skills from criteria to the assignment
    const skillIds = source.criteria
      .map(c => c.skill_id)
      .filter((id): id is ID => id !== null);

    if (skillIds.length > 0) {
      // Clear existing skill map
      await db.execute('DELETE FROM assignment_skill_map WHERE assignment_id = ?', [assignmentId]);
      for (const criterion of source.criteria) {
        if (criterion.skill_id) {
          await db.execute(
            `INSERT OR IGNORE INTO assignment_skill_map (assignment_id, skill_id, weight)
             VALUES (?, ?, ?)`,
            [assignmentId, criterion.skill_id, criterion.weight]
          );
          // Copy descriptors to skill_level_descriptors
          for (const d of criterion.descriptors) {
            await db.execute(
              `INSERT INTO skill_level_descriptors (skill_id, level, label, description)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(skill_id, level) DO UPDATE SET label = excluded.label, description = excluded.description`,
              [criterion.skill_id, d.level, d.label, d.description]
            );
          }
        }
      }
    }
  },

  /** Create a template from an existing assignment's skills */
  async createFromAssignment(assignmentId: ID, yearId: ID, title: string): Promise<ID> {
    // Fetch assignment info
    const assignments: any[] = await db.select<any>(
      'SELECT * FROM assignments WHERE id = ?', [assignmentId]
    );
    if (assignments.length === 0) throw new Error('Assignment not found');
    const assignment = assignments[0];

    const templateId = await this.create({
      academic_year_id: yearId,
      title,
      assignment_type_id: assignment.assignment_type_id,
      subject_id: assignment.subject_id,
      max_score: assignment.max_score,
    });

    // Fetch skills linked to assignment
    const skills: any[] = await db.select<any>(`
      SELECT asm.skill_id, asm.weight, s.label
      FROM assignment_skill_map asm
      JOIN skills s ON s.id = asm.skill_id
      WHERE asm.assignment_id = ?
      ORDER BY asm.weight DESC, s.label
    `, [assignmentId]);

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      const criteriaId = await this.addCriterion(templateId, {
        label: skill.label,
        skill_id: skill.skill_id,
        weight: skill.weight,
        sort_order: i,
      });

      // Copy existing descriptors if any
      const descriptors: any[] = await db.select<any>(
        'SELECT level, label, description FROM skill_level_descriptors WHERE skill_id = ? ORDER BY level',
        [skill.skill_id]
      );
      if (descriptors.length > 0) {
        await this.saveDescriptors(criteriaId, descriptors);
      }
    }

    return templateId;
  },
};

const DEFAULT_LEVEL_LABELS: Record<number, string> = {
  1: 'Non atteint',
  2: 'Partiellement atteint',
  3: 'Atteint',
  4: 'Dépassé',
};
