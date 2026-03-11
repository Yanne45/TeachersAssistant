// ============================================================================
// Teacher Assistant — Service Import / Export
// ICS (emploi du temps), CSV (élèves, programme), JSON (programme, templates),
// PDF (bulletins, progression, bilan), ZIP (sauvegarde complète)
// ============================================================================

import { db } from './db';
import type { ID } from '../types';

// ============================================================================
// 1. IMPORT ICS (Emploi du temps)
// ============================================================================

interface ICSEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  rrule?: string;
}

export const icsImportService = {
  /** Parse un fichier ICS et retourne les événements */
  parse(icsText: string): ICSEvent[] {
    const events: ICSEvent[] = [];
    const blocks = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < blocks.length; i++) {
      const block = (blocks[i] ?? '').split('END:VEVENT')[0] ?? '';
      const get = (key: string): string | undefined => {
        const match = block.match(new RegExp(`${key}[^:]*:(.+)`, 'm'));
        return match?.[1]?.trim();
      };

      const uid = get('UID') ?? `event-${i}`;
      const summary = get('SUMMARY') ?? '';
      const dtstart = parseICSDate(get('DTSTART') ?? '');
      const dtend = parseICSDate(get('DTEND') ?? '');
      const location = get('LOCATION');
      const rrule = get('RRULE');

      if (summary && dtstart && dtend) {
        events.push({ uid, summary, dtstart, dtend, location, rrule });
      }
    }

    return events;
  },

  /** Importe les événements ICS dans l'emploi du temps */
  async importToTimetable(
    events: ICSEvent[],
    yearId: ID,
    mappings: Map<string, { subjectId: ID; classId: ID }>,
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    await db.transaction(async () => {
      for (const evt of events) {
        // Chercher mapping par résumé
        const map = mappings.get(evt.summary) ?? findMapping(evt.summary, mappings);
        if (!map) { skipped++; continue; }

        const dow = evt.dtstart.getDay() === 0 ? 7 : evt.dtstart.getDay();
        const startTime = `${String(evt.dtstart.getHours()).padStart(2, '0')}:${String(evt.dtstart.getMinutes()).padStart(2, '0')}`;
        const endTime = `${String(evt.dtend.getHours()).padStart(2, '0')}:${String(evt.dtend.getMinutes()).padStart(2, '0')}`;

        // Vérifier doublon
        const existing = await db.selectOne(
          `SELECT id FROM timetable_slots WHERE academic_year_id = ? AND day_of_week = ?
           AND start_time = ? AND class_id = ?`,
          [yearId, dow, startTime, map.classId]
        );

        if (existing) { skipped++; continue; }

        await db.insert(
          `INSERT INTO timetable_slots (academic_year_id, day_of_week, start_time, end_time,
           subject_id, class_id, room, recurrence)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'all')`,
          [yearId, dow, startTime, endTime, map.subjectId, map.classId, evt.location ?? null]
        );
        imported++;
      }
    });

    return { imported, skipped };
  },
};

function parseICSDate(str: string): Date | null {
  if (!str) return null;
  // Format: 20250901T080000 ou 20250901T080000Z
  const clean = str.replace(/[TZ]/g, m => m === 'T' ? 'T' : '');
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return null;
  const year = Number(m[1] ?? 0);
  const month = Number(m[2] ?? 1) - 1;
  const day = Number(m[3] ?? 1);
  const hour = Number(m[4] ?? 0);
  const minute = Number(m[5] ?? 0);
  const second = Number(m[6] ?? 0);
  return new Date(year, month, day, hour, minute, second);
}

function findMapping(
  summary: string,
  mappings: Map<string, { subjectId: ID; classId: ID }>,
): { subjectId: ID; classId: ID } | null {
  const lower = summary.toLowerCase();
  for (const [key, val] of mappings) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return null;
}

// ============================================================================
// 2. IMPORT CSV ÉLÈVES
// ============================================================================

export interface CSVStudent {
  last_name: string;
  first_name: string;
  birth_year?: number;
  gender?: string;
}

export const csvImportService = {
  /** Parse CSV/texte d'élèves (détection automatique du séparateur) */
  parseStudents(text: string): CSVStudent[] {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) return [];

    // Detect separator
    const firstLine = lines[0] ?? '';
    const sep = detectSeparator(firstLine);

    // Detect header
    const hasHeader = firstLine.toLowerCase().includes('nom')
      || firstLine.toLowerCase().includes('name')
      || firstLine.toLowerCase().includes('prénom');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
      return {
        last_name: cols[0]?.toUpperCase() ?? '',
        first_name: capitalize(cols[1] ?? ''),
        birth_year: cols[2] ? parseInt(cols[2]) || undefined : undefined,
        gender: cols[3]?.toUpperCase() === 'M' ? 'M' : cols[3]?.toUpperCase() === 'F' ? 'F' : undefined,
      };
    }).filter(s => s.last_name && s.first_name);
  },

  /** Importe les élèves dans une classe */
  async importStudents(students: CSVStudent[], classId: ID): Promise<{ imported: number; duplicates: number }> {
    let imported = 0;
    let duplicates = 0;

    await db.transaction(async () => {
      for (const s of students) {
        // Vérifier doublon
        const existing = await db.selectOne<{ id: ID }>(
          'SELECT id FROM students WHERE last_name = ? AND first_name = ?',
          [s.last_name, s.first_name]
        );

        let studentId: ID;
        if (existing) {
          studentId = existing.id;
          duplicates++;
        } else {
          studentId = await db.insert(
            'INSERT INTO students (last_name, first_name, birth_year, gender) VALUES (?, ?, ?, ?)',
            [s.last_name, s.first_name, s.birth_year ?? null, s.gender ?? null]
          );
          imported++;
        }

        // Inscrire dans la classe (ignore si déjà inscrit)
        await db.execute(
          'INSERT OR IGNORE INTO student_class_enrollments (student_id, class_id) VALUES (?, ?)',
          [studentId, classId]
        );
      }
    });

    return { imported, duplicates };
  },
};

// ============================================================================
// 3. IMPORT / EXPORT JSON PROGRAMME
// ============================================================================

export const programJsonService = {
  /** Exporte l'arbre programme en JSON */
  async exportProgram(yearId: ID, subjectId: ID, levelId: ID): Promise<string> {
    const topics = await db.select<any>(
      `SELECT id, parent_id, topic_type, code, title, description, sort_order
       FROM program_topics
       WHERE academic_year_id = ? AND subject_id = ? AND level_id = ?
       ORDER BY sort_order`,
      [yearId, subjectId, levelId]
    );

    // Construire arbre hiérarchique
    const tree = buildTree(topics);
    return JSON.stringify({ version: '1.0', subject_id: subjectId, level_id: levelId, topics: tree }, null, 2);
  },

  /** Importe un programme depuis JSON */
  async importProgram(jsonText: string, yearId: ID, subjectId: ID, levelId: ID): Promise<number> {
    const data = JSON.parse(jsonText);
    const topics: any[] = data.topics ?? [];
    let count = 0;

    await db.transaction(async () => {
      // Supprimer l'existant pour cette matière/niveau
      await db.execute(
        'DELETE FROM program_topics WHERE academic_year_id = ? AND subject_id = ? AND level_id = ?',
        [yearId, subjectId, levelId]
      );

      count = await insertTopicsRecursive(topics, yearId, subjectId, levelId, null);
    });

    return count;
  },

  /** Importe un programme depuis CSV simple (thème ; chapitre ; point ; code) */
  async importCSV(text: string, yearId: ID, subjectId: ID, levelId: ID): Promise<number> {
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    const firstLine = lines[0] ?? '';
    const sep = detectSeparator(firstLine);
    const lowerFirstLine = firstLine.toLowerCase();
    const hasHeader = lowerFirstLine.includes('thème') || lowerFirstLine.includes('theme');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let count = 0;
    const themeIds = new Map<string, ID>();
    const chapIds = new Map<string, ID>();

    await db.transaction(async () => {
      let order = 0;
      for (const line of dataLines) {
        const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const [theme, chapter, point, code] = cols;
        if (!theme) continue;

        // Thème
        if (!themeIds.has(theme)) {
          const id = await db.insert(
            `INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id,
             topic_type, title, code, sort_order) VALUES (?, ?, ?, NULL, 'theme', ?, ?, ?)`,
            [yearId, subjectId, levelId, theme, code ?? null, order++]
          );
          themeIds.set(theme, id);
          count++;
        }

        // Chapitre
        if (chapter) {
          const chapKey = `${theme}|${chapter}`;
          if (!chapIds.has(chapKey)) {
            const id = await db.insert(
              `INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id,
               topic_type, title, sort_order) VALUES (?, ?, ?, ?, 'chapter', ?, ?)`,
              [yearId, subjectId, levelId, themeIds.get(theme), chapter, order++]
            );
            chapIds.set(chapKey, id);
            count++;
          }

          // Point
          if (point) {
            await db.insert(
              `INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id,
               topic_type, title, sort_order) VALUES (?, ?, ?, ?, 'point', ?, ?)`,
              [yearId, subjectId, levelId, chapIds.get(chapKey), point, order++]
            );
            count++;
          }
        }
      }
    });

    return count;
  },
};

// ============================================================================
// 4. EXPORT JSON TEMPLATES SÉQUENCES
// ============================================================================

export const templateExportService = {
  /** Exporte une séquence comme template JSON */
  async exportSequenceTemplate(sequenceId: ID): Promise<string> {
    const seq = await db.selectOne<any>('SELECT * FROM sequences WHERE id = ?', [sequenceId]);
    if (!seq) throw new Error('Séquence introuvable');

    const sessions = await db.select<any>(
      'SELECT title, session_number, duration_minutes, objectives, activities, lesson_plan, sort_order FROM sessions WHERE sequence_id = ? ORDER BY sort_order',
      [sequenceId]
    );

    const skills = await db.select<any>(
      'SELECT s.label, s.category FROM skills s JOIN sequence_skills ss ON ss.skill_id = s.id WHERE ss.sequence_id = ?',
      [sequenceId]
    );

    const template = {
      version: '1.0',
      title: seq.title,
      description: seq.description,
      total_hours: seq.total_hours,
      sessions,
      skills: skills.map((s: any) => s.label),
    };

    return JSON.stringify(template, null, 2);
  },

  /** Importe un template JSON et crée une séquence */
  async importSequenceTemplate(
    jsonText: string, yearId: ID, subjectId: ID, levelId: ID, classIds: ID[],
  ): Promise<ID> {
    const data = JSON.parse(jsonText);

    const seqId = await db.insert(
      `INSERT INTO sequences (academic_year_id, subject_id, level_id, title, description,
       total_hours, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      [yearId, subjectId, levelId, data.title, data.description ?? null, data.total_hours ?? 0]
    );

    // Classes
    for (const classId of classIds) {
      await db.execute(
        'INSERT INTO sequence_classes (sequence_id, class_id) VALUES (?, ?)',
        [seqId, classId]
      );
    }

    // Sessions
    if (data.sessions?.length) {
      for (let i = 0; i < data.sessions.length; i++) {
        const s = data.sessions[i];
        await db.insert(
          `INSERT INTO sessions (sequence_id, title, session_number, duration_minutes,
           objectives, activities, lesson_plan, sort_order, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned')`,
          [seqId, s.title, s.session_number ?? i + 1, s.duration_minutes ?? 120,
           s.objectives ?? null, s.activities ?? null, s.lesson_plan ?? null, i]
        );
      }
    }

    return seqId;
  },
};

// ============================================================================
// 5. EXPORT PDF (via HTML → impression navigateur)
// ============================================================================

export const pdfExportService = {
  /** Génère le HTML pour un bulletin élève */
  async buildBulletinHTML(studentId: ID, periodId: ID): Promise<string> {
    const student = await db.selectOne<any>('SELECT * FROM students WHERE id = ?', [studentId]);
    const entries = await db.select<any>(
      `SELECT be.*, s.short_label as subject_label
       FROM bulletin_entries be
       LEFT JOIN subjects s ON be.subject_id = s.id
       WHERE be.student_id = ? AND be.report_period_id = ?`,
      [studentId, periodId]
    );
    const settings = await db.selectOne<any>('SELECT * FROM export_settings LIMIT 1');

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Bulletin</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; font-size: 12pt; margin: 2cm; color: #333; }
  h1 { font-size: 16pt; color: #2C3E7B; border-bottom: 2px solid #3DB4C6; padding-bottom: 8px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .header-left { font-size: 10pt; color: #666; }
  .student-info { font-size: 14pt; font-weight: 600; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #F5F7F8; padding: 8px 12px; text-align: left; font-size: 10pt;
       border-bottom: 2px solid #3DB4C6; }
  td { padding: 8px 12px; border-bottom: 1px solid #E0E0E0; font-size: 11pt; }
  .footer { margin-top: 32px; font-size: 9pt; color: #888; text-align: center;
            border-top: 1px solid #E0E0E0; padding-top: 8px; }
  @media print { body { margin: 1.5cm; } }
</style></head>
<body>
<div class="header">
  <div class="header-left">${settings?.school_name ?? 'Établissement'}<br>${settings?.teacher_name ?? ''}</div>
  <div class="header-left">Année ${settings?.year_label ?? ''}</div>
</div>
<h1>Bulletin scolaire</h1>
<div class="student-info">${student?.last_name ?? ''} ${student?.first_name ?? ''}</div>
<table>
  <thead><tr><th>Discipline</th><th>Appréciation</th></tr></thead>
  <tbody>
${entries.map((e: any) => `    <tr><td>${e.subject_label ?? e.entry_type ?? ''}</td><td>${e.content ?? ''}</td></tr>`).join('\n')}
  </tbody>
</table>
<div class="footer">${settings?.footer_text ?? 'Document généré par Teacher Assistant'}</div>
</body></html>`;
  },

  /** Génère le HTML pour un bilan devoir */
  async buildBilanHTML(assignmentId: ID): Promise<string> {
    const assignment = await db.selectOne<any>('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
    const stats = await db.select<any>(
      `SELECT sub.score FROM submissions sub WHERE sub.assignment_id = ? AND sub.score IS NOT NULL`,
      [assignmentId]
    );

    const scores = stats.map((s: any) => s.score);
    const avg = scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '—';
    const min = scores.length ? Math.min(...scores) : '—';
    const max = scores.length ? Math.max(...scores) : '—';

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Bilan</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; font-size: 12pt; margin: 2cm; }
  h1 { color: #2C3E7B; font-size: 16pt; }
  .stats { display: flex; gap: 24px; margin: 16px 0; font-size: 14pt; }
  .stat { text-align: center; }
  .stat-value { font-size: 20pt; font-weight: 700; color: #3DB4C6; }
  .stat-label { font-size: 9pt; color: #888; }
  @media print { body { margin: 1.5cm; } }
</style></head><body>
<h1>Bilan — ${assignment?.title ?? ''}</h1>
<p>${scores.length} copies corrigées</p>
<div class="stats">
  <div class="stat"><div class="stat-value">${avg}</div><div class="stat-label">Moyenne</div></div>
  <div class="stat"><div class="stat-value">${min}</div><div class="stat-label">Min</div></div>
  <div class="stat"><div class="stat-value">${max}</div><div class="stat-label">Max</div></div>
</div>
</body></html>`;
  },

  /** Ouvre la fenêtre d'impression du navigateur */
  printHTML(html: string) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.print();
    };
  },

  /** Déclenche le téléchargement d'un fichier HTML comme PDF (print-to-pdf) */
  downloadHTML(html: string, filename: string) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, filename.replace('.pdf', '.html'));
  },

  /** Génère le HTML pour la progression annuelle */
  async buildProgressionHTML(yearId: ID): Promise<string> {
    const year = await db.selectOne<any>('SELECT * FROM academic_years WHERE id = ?', [yearId]);
    const sequences = await db.select<any>(
      `SELECT s.*, sub.label as subject_label, sub.color as subject_color,
              l.label as level_label
       FROM sequences s
       LEFT JOIN subjects sub ON s.subject_id = sub.id
       LEFT JOIN levels l ON s.level_id = l.id
       WHERE s.academic_year_id = ?
       ORDER BY s.sort_order, s.start_date`,
      [yearId]
    );
    const settings = await db.selectOne<any>('SELECT * FROM export_settings LIMIT 1');
    const totalHours = sequences.reduce((s: number, sq: any) => s + (sq.planned_hours ?? 0), 0);

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Progression annuelle</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; font-size: 11pt; margin: 2cm; color: #333; }
  h1 { font-size: 16pt; color: #2C3E7B; border-bottom: 2px solid #3DB4C6; padding-bottom: 8px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .header-left { font-size: 10pt; color: #666; }
  .summary { font-size: 12pt; margin-bottom: 20px; padding: 12px; background: #F5F7F8; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #F5F7F8; padding: 8px 10px; text-align: left; font-size: 9pt;
       border-bottom: 2px solid #3DB4C6; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #E0E0E0; font-size: 10pt; }
  .subject-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .status { padding: 2px 8px; border-radius: 10px; font-size: 9pt; font-weight: 600; }
  .status--done { background: #E8F8E0; color: #2E7D32; }
  .status--progress { background: #E0F4F8; color: #1976A3; }
  .status--draft { background: #F5F5F5; color: #888; }
  .footer { margin-top: 32px; font-size: 9pt; color: #888; text-align: center;
            border-top: 1px solid #E0E0E0; padding-top: 8px; }
  @media print { body { margin: 1.5cm; } }
</style></head><body>
<div class="header">
  <div class="header-left">${settings?.school_name ?? ''}<br>${settings?.teacher_name ?? ''}</div>
  <div class="header-left">${year?.label ?? ''}</div>
</div>
<h1>Progression annuelle</h1>
<div class="summary">
  <strong>${sequences.length}</strong> séquences · <strong>${totalHours}h</strong> programmées
</div>
<table>
  <thead><tr><th>#</th><th>Séquence</th><th>Matière</th><th>Niveau</th><th>Heures</th><th>Période</th><th>Statut</th></tr></thead>
  <tbody>
${sequences.map((s: any, i: number) => {
  const statusClass = s.status === 'completed' ? 'done' : s.status === 'in_progress' ? 'progress' : 'draft';
  const statusLabel = s.status === 'completed' ? 'Terminée' : s.status === 'in_progress' ? 'En cours' : 'Prévue';
  const dates = s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : '—';
  return `    <tr>
      <td>${i + 1}</td>
      <td>${s.title}</td>
      <td><span class="subject-dot" style="background:${s.subject_color}"></span>${s.subject_label ?? ''}</td>
      <td>${s.level_label ?? ''}</td>
      <td>${s.planned_hours ?? '—'}h</td>
      <td>${dates}</td>
      <td><span class="status status--${statusClass}">${statusLabel}</span></td>
    </tr>`;
}).join('\n')}
  </tbody>
</table>
<div class="footer">${settings?.footer_text ?? 'Document généré par Teacher Assistant'}</div>
</body></html>`;
  },

  /** Génère le HTML pour la fiche élève avec compétences */
  async buildFicheEleveHTML(studentId: ID, periodId?: ID): Promise<string> {
    const student = await db.selectOne<any>('SELECT * FROM students WHERE id = ?', [studentId]);
    const enrollment = await db.selectOne<any>(
      `SELECT c.label as class_label FROM student_class_enrollments sce
       JOIN classes c ON sce.class_id = c.id
       WHERE sce.student_id = ? ORDER BY sce.id DESC LIMIT 1`,
      [studentId]
    );
    const settings = await db.selectOne<any>('SELECT * FROM export_settings LIMIT 1');

    // Skill observations
    const skillObs = await db.select<any>(
      `SELECT so.*, sk.label as skill_label
       FROM student_skill_observations so
       JOIN skills sk ON so.skill_id = sk.id
       WHERE so.student_id = ?
       ORDER BY sk.sort_order`,
      [studentId]
    );

    // Period profile
    const profile = periodId ? await db.selectOne<any>(
      `SELECT * FROM student_period_profiles WHERE student_id = ? AND report_period_id = ?`,
      [studentId, periodId]
    ) : null;

    // Recent grades
    const grades = await db.select<any>(
      `SELECT sub.score, a.title as assignment_title, a.assignment_date
       FROM submissions sub
       JOIN assignments a ON sub.assignment_id = a.id
       WHERE sub.student_id = ? AND sub.score IS NOT NULL
       ORDER BY a.assignment_date DESC LIMIT 10`,
      [studentId]
    );

    const avg = grades.length
      ? (grades.reduce((s: number, g: any) => s + g.score, 0) / grades.length).toFixed(1)
      : '—';

    // Group skills by label, take latest level
    const skillMap = new Map<string, number>();
    for (const obs of skillObs) {
      skillMap.set(obs.skill_label, obs.level);
    }

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Fiche élève</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; font-size: 11pt; margin: 2cm; color: #333; }
  h1 { font-size: 16pt; color: #2C3E7B; border-bottom: 2px solid #3DB4C6; padding-bottom: 8px; }
  h2 { font-size: 13pt; color: #2C3E7B; margin-top: 24px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .header-left { font-size: 10pt; color: #666; }
  .student-card { background: #F5F7F8; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
  .student-name { font-size: 18pt; font-weight: 700; }
  .student-meta { font-size: 10pt; color: #666; margin-top: 4px; }
  .avg-badge { display: inline-block; padding: 4px 12px; border-radius: 12px;
               font-weight: 700; font-size: 14pt; margin-top: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #F5F7F8; padding: 6px 10px; text-align: left; font-size: 9pt;
       border-bottom: 2px solid #3DB4C6; color: #666; }
  td { padding: 6px 10px; border-bottom: 1px solid #E0E0E0; font-size: 10pt; }
  .level-bar { display: flex; gap: 3px; }
  .level-seg { width: 24px; height: 8px; border-radius: 4px; }
  .level-seg--on { background: #3DB4C6; }
  .level-seg--off { background: #E0E0E0; }
  .profile-item { display: flex; justify-content: space-between; padding: 4px 0;
                   border-bottom: 1px solid #F0F0F0; font-size: 10pt; }
  .profile-dots { display: flex; gap: 4px; }
  .profile-dot { width: 8px; height: 8px; border-radius: 50%; }
  .profile-dot--on { background: #3DB4C6; }
  .profile-dot--off { background: #E0E0E0; }
  .footer { margin-top: 32px; font-size: 9pt; color: #888; text-align: center;
            border-top: 1px solid #E0E0E0; padding-top: 8px; }
  @media print { body { margin: 1.5cm; } .grid { grid-template-columns: 1fr 1fr; } }
</style></head><body>
<div class="header">
  <div class="header-left">${settings?.school_name ?? ''}<br>${settings?.teacher_name ?? ''}</div>
  <div class="header-left">${enrollment?.class_label ?? ''}</div>
</div>
<h1>Fiche élève</h1>
<div class="student-card">
  <div class="student-name">${student?.last_name ?? ''} ${student?.first_name ?? ''}</div>
  <div class="student-meta">${enrollment?.class_label ?? ''} ${student?.birth_year ? '· Né(e) en ' + student.birth_year : ''}</div>
  <div class="avg-badge" style="background: ${Number(avg) >= 14 ? '#E8F8E0; color: #2E7D32' : Number(avg) >= 10 ? '#E0F4F8; color: #1976A3' : Number(avg) < 10 ? '#FDEAEA; color: #C62828' : '#F5F5F5; color: #888'}">
    Moyenne : ${avg}
  </div>
</div>

<div class="grid">
  <div>
    <h2>Compétences</h2>
    <table>
      <thead><tr><th>Compétence</th><th>Niveau</th></tr></thead>
      <tbody>
${Array.from(skillMap.entries()).map(([label, level]) => `        <tr>
          <td>${label}</td>
          <td>
            <div class="level-bar">
${[1, 2, 3, 4].map(n => `              <div class="level-seg ${n <= level ? 'level-seg--on' : 'level-seg--off'}"></div>`).join('\n')}
            </div>
            ${level}/4
          </td>
        </tr>`).join('\n')}
      </tbody>
    </table>
  </div>

  <div>
    <h2>Dernières notes</h2>
    <table>
      <thead><tr><th>Devoir</th><th>Note</th></tr></thead>
      <tbody>
${grades.map((g: any) => `        <tr><td>${g.assignment_title ?? '—'}</td><td>${g.score}/20</td></tr>`).join('\n')}
      </tbody>
    </table>

${profile ? `
    <h2>Profil période</h2>
${['Comportement', 'Travail', 'Participation', 'Autonomie', 'Méthode'].map((label, i) => {
  const val = [profile.behavior, profile.work_ethic, profile.participation, profile.autonomy, profile.method][i] ?? 0;
  return `    <div class="profile-item">
      <span>${label}</span>
      <div class="profile-dots">
${[1, 2, 3, 4, 5].map(n => `        <div class="profile-dot ${n <= val ? 'profile-dot--on' : 'profile-dot--off'}"></div>`).join('\n')}
      </div>
    </div>`;
}).join('\n')}` : ''}
  </div>
</div>

<div class="footer">${settings?.footer_text ?? 'Document généré par Teacher Assistant'}</div>
</body></html>`;
  },
};

// ============================================================================
// 6. SAUVEGARDE / RESTAURATION ZIP
// ============================================================================

export const backupService2 = {
  /** Exporte la base SQLite + fichiers en ZIP */
  async exportZip(): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Exporter toutes les tables en JSON
    const tables = [
      'academic_years', 'calendar_periods', 'subjects', 'levels', 'classes',
      'program_topics', 'skills', 'sequences', 'sessions', 'lesson_log',
      'timetable_slots', 'documents', 'assignments', 'submissions', 'corrections',
      'students', 'student_class_enrollments', 'bulletin_entries',
      'ai_settings', 'ai_generations', 'user_preferences', 'export_settings',
    ];

    for (const table of tables) {
      try {
        const rows = await db.select(`SELECT * FROM ${table}`);
        zip.file(`data/${table}.json`, JSON.stringify(rows, null, 2));
      } catch { /* table might not exist */ }
    }

    // Métadonnées
    zip.file('meta.json', JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      table_count: tables.length,
    }));

    return zip.generateAsync({ type: 'blob' });
  },

  /** Restaure depuis un ZIP */
  async importZip(file: File): Promise<{ tables: number; rows: number }> {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    let tables = 0;
    let rows = 0;

    const dataFiles = Object.keys(zip.files).filter(f => f.startsWith('data/') && f.endsWith('.json'));

    await db.transaction(async () => {
      for (const path of dataFiles) {
        const zipFile = zip.files[path];
        if (!zipFile) continue;
        const content = await zipFile.async('string');
        const data = JSON.parse(content);
        const tableName = path.replace('data/', '').replace('.json', '');

        if (!Array.isArray(data) || data.length === 0) continue;

        // Clear existing
        await db.execute(`DELETE FROM ${tableName}`);

        // Insert rows
        const firstRow = data[0];
        if (!firstRow || typeof firstRow !== 'object') continue;
        const cols = Object.keys(firstRow);
        const placeholders = cols.map(() => '?').join(',');
        const sql = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`;

        for (const row of data) {
          await db.execute(sql, cols.map(c => row[c] ?? null));
          rows++;
        }
        tables++;
      }
    });

    return { tables, rows };
  },

  /** Export sélectif (séquences/templates uniquement) */
  async exportTemplates(): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const sequences = await db.select('SELECT * FROM sequences');
    const sessions = await db.select('SELECT * FROM sessions');
    const skills = await db.select('SELECT * FROM skills');

    zip.file('sequences.json', JSON.stringify(sequences, null, 2));
    zip.file('sessions.json', JSON.stringify(sessions, null, 2));
    zip.file('skills.json', JSON.stringify(skills, null, 2));
    zip.file('meta.json', JSON.stringify({ version: '1.0', type: 'templates', exported_at: new Date().toISOString() }));

    return zip.generateAsync({ type: 'blob' });
  },
};

// ============================================================================
// 7. HELPERS
// ============================================================================

function detectSeparator(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  const tabs = (line.match(/\t/g) ?? []).length;
  if (tabs >= semicolons && tabs >= commas) return '\t';
  if (semicolons >= commas) return ';';
  return ',';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function buildTree(flatItems: any[], parentId: number | null = null): any[] {
  return flatItems
    .filter(i => i.parent_id === parentId)
    .map(i => ({
      ...i,
      children: buildTree(flatItems, i.id),
    }));
}

async function insertTopicsRecursive(
  topics: any[], yearId: ID, subjectId: ID, levelId: ID, parentId: ID | null,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const id = await db.insert(
      `INSERT INTO program_topics (academic_year_id, subject_id, level_id, parent_id,
       topic_type, code, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [yearId, subjectId, levelId, parentId,
       t.topic_type ?? 'theme', t.code ?? null, t.title, t.description ?? null, i]
    );
    count++;
    if (t.children?.length) {
      count += await insertTopicsRecursive(t.children, yearId, subjectId, levelId, id);
    }
  }
  return count;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Déclenche le téléchargement d'un Blob (utilisé par backup et export) */
export function downloadBlob(blob: Blob, filename: string) {
  triggerDownload(blob, filename);
}
