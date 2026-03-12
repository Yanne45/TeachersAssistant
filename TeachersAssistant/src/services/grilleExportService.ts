// ============================================================================
// Teacher Assistant — Service : Export grille compétences
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

export interface GrilleRow {
  studentName: string;
  score: number | null;
  skillLevels: Record<string, number | null>;
  strengths: string[];
  weaknesses: string[];
}

export const grilleExportService = {
  /** Fetch all data for the competency grid of an assignment */
  async fetchGrilleData(assignmentId: ID): Promise<{ rows: GrilleRow[]; skills: string[] }> {
    // Get skills for this assignment
    const skillRows = await db.select<{ skill_id: ID; label: string }[]>(
      `SELECT s.id as skill_id, s.label
       FROM skills s JOIN assignment_skill_map asm ON asm.skill_id = s.id
       WHERE asm.assignment_id = ?
       ORDER BY asm.weight DESC, s.label`,
      [assignmentId]
    );
    const skills = skillRows.map((s) => s.label);
    const skillIdToLabel = new Map(skillRows.map((s) => [s.skill_id, s.label]));

    // Get submissions with student names
    const submissions = await db.select<any[]>(
      `SELECT sub.id, sub.score, st.last_name, st.first_name
       FROM submissions sub
       JOIN students st ON sub.student_id = st.id
       WHERE sub.assignment_id = ?
       ORDER BY st.last_name, st.first_name`,
      [assignmentId]
    );

    const rows: GrilleRow[] = [];

    for (const sub of submissions) {
      const name = `${sub.last_name ?? ''} ${sub.first_name ?? ''}`.trim();

      // Skill evaluations
      const evals = await db.select<{ skill_id: ID; level: number }[]>(
        'SELECT skill_id, level FROM submission_skill_evaluations WHERE submission_id = ?',
        [sub.id]
      );
      const levels: Record<string, number | null> = {};
      for (const s of skills) levels[s] = null;
      for (const e of evals) {
        const label = skillIdToLabel.get(e.skill_id);
        if (label) levels[label] = e.level;
      }

      // Feedback
      const feedbacks = await db.select<{ feedback_type: string; content: string }[]>(
        'SELECT feedback_type, content FROM submission_feedback WHERE submission_id = ? ORDER BY sort_order',
        [sub.id]
      );
      const strengths = feedbacks.filter((f) => f.feedback_type === 'strength').map((f) => f.content);
      const weaknesses = feedbacks.filter((f) => f.feedback_type === 'weakness').map((f) => f.content);

      rows.push({ studentName: name, score: sub.score, skillLevels: levels, strengths, weaknesses });
    }

    return { rows, skills };
  },

  /** Build CSV string (semicolon-separated for French Excel) */
  buildCSV(rows: GrilleRow[], skills: string[]): string {
    const escape = (v: string) => v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const header = ['Élève', 'Note', ...skills, 'Forces', 'Lacunes'];
    const lines = [header.map(escape).join(';')];

    for (const row of rows) {
      const line = [
        escape(row.studentName),
        row.score != null ? String(row.score) : '',
        ...skills.map((s) => row.skillLevels[s] != null ? String(row.skillLevels[s]) : ''),
        escape(row.strengths.join(' / ')),
        escape(row.weaknesses.join(' / ')),
      ];
      lines.push(line.join(';'));
    }

    return '\uFEFF' + lines.join('\n'); // BOM for Excel UTF-8 detection
  },

  /** Build printable HTML table */
  buildHTML(rows: GrilleRow[], skills: string[], title: string): string {
    const skillHeaders = skills.map((s) => `<th>${s}</th>`).join('');
    const bodyRows = rows.map((row) => {
      const skillCells = skills.map((s) => `<td style="text-align:center">${row.skillLevels[s] ?? ''}</td>`).join('');
      return `<tr>
        <td>${row.studentName}</td>
        <td style="text-align:center">${row.score ?? ''}</td>
        ${skillCells}
        <td>${row.strengths.join(' / ')}</td>
        <td>${row.weaknesses.join(' / ')}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
  h1 { font-size: 16px; margin-bottom: 10px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; }
  th { background: #f5f5f5; font-weight: bold; text-align: left; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Grille de compétences — ${title}</h1>
<table>
  <thead><tr><th>Élève</th><th>Note</th>${skillHeaders}<th>Forces</th><th>Lacunes</th></tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
</body></html>`;
  },
};
