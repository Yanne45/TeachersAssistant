// ============================================================================
// Teacher Assistant — Notification Engine
// Génère automatiquement les notifications contextuelles (spec §4.5)
// Types : alerte pédagogique, rappel, système, info
// ============================================================================

import { db } from './db';
import { notificationService } from './academicService';
import type { ID } from '../types';

/**
 * Vérifie l'état de l'application et crée les notifications pertinentes.
 * Appelé au lancement, puis périodiquement (toutes les 5 min par ex.)
 */
export async function generateNotifications(yearId: ID): Promise<number> {
  let created = 0;

  created += await checkLateSequences(yearId);
  created += await checkMissingCahier(yearId);
  created += await checkPendingCorrections(yearId);
  created += await checkProgramCoverage(yearId);
  created += await checkAIQueue();

  return created;
}

// ── Séquences en retard ──

async function checkLateSequences(yearId: ID): Promise<number> {
  const late = await db.select<{ id: ID; title: string; end_date: string }>(
    `SELECT id, title, end_date FROM sequences
     WHERE academic_year_id = ? AND status = 'in_progress'
       AND end_date < date('now') AND end_date IS NOT NULL`,
    [yearId]
  );

  let created = 0;
  for (const seq of late) {
    const exists = await hasRecentNotification('alert', `seq-late-${seq.id}`);
    if (exists) continue;

    await notificationService.create({
      notification_type: 'alert',
      priority: 'high',
      title: `Séquence en retard`,
      message: `"${seq.title}" devait se terminer le ${formatDate(seq.end_date)}`,
      link: `/preparation/sequences/${seq.id}`,
    });
    created++;
  }
  return created;
}

// ── Cahier de textes non rempli ──

async function checkMissingCahier(yearId: ID): Promise<number> {
  // Trouver les créneaux d'aujourd'hui et hier sans entrée cahier
  const missing = await db.select<{ day_label: string; subject_label: string; class_label: string }>(
    `SELECT
       CASE ts.day_of_week
         WHEN 1 THEN 'Lundi' WHEN 2 THEN 'Mardi' WHEN 3 THEN 'Mercredi'
         WHEN 4 THEN 'Jeudi' WHEN 5 THEN 'Vendredi' ELSE '' END as day_label,
       s.short_label as subject_label,
       c.name as class_label
     FROM timetable_slots ts
     JOIN subjects s ON ts.subject_id = s.id
     JOIN classes c ON ts.class_id = c.id
     WHERE ts.academic_year_id = ?
       AND ts.day_of_week = CAST(strftime('%w', 'now', '-1 day') AS INTEGER)
       AND NOT EXISTS (
         SELECT 1 FROM lesson_log ll
         WHERE ll.class_id = ts.class_id
           AND ll.subject_id = ts.subject_id
           AND ll.log_date = date('now', '-1 day')
       )
     LIMIT 5`,
    [yearId]
  );

  let created = 0;
  for (const m of missing) {
    const key = `cahier-${m.class_label}-${new Date().toISOString().slice(0, 10)}`;
    const exists = await hasRecentNotification('reminder', key);
    if (exists) continue;

    await notificationService.create({
      notification_type: 'reminder',
      priority: 'medium',
      title: `Cahier de textes non rempli`,
      message: `${m.subject_label} — ${m.class_label} (${m.day_label})`,
      link: `/cahier-de-textes`,
    });
    created++;
  }
  return created;
}

// ── Corrections en attente ──

async function checkPendingCorrections(_yearId: ID): Promise<number> {
  const pending = await db.select<{ id: ID; title: string; pending_count: number }>(
    `SELECT a.id, a.title,
       (SELECT COUNT(*) FROM submissions sub
        WHERE sub.assignment_id = a.id AND sub.status != 'corrected') as pending_count
     FROM assignments a
     WHERE a.status IN ('draft', 'correcting')
       AND (SELECT COUNT(*) FROM submissions sub
            WHERE sub.assignment_id = a.id AND sub.status != 'corrected') > 0
     ORDER BY a.assignment_date DESC LIMIT 5`
  );

  let created = 0;
  for (const a of pending) {
    const key = `corrections-${a.id}`;
    const exists = await hasRecentNotification('reminder', key);
    if (exists) continue;

    await notificationService.create({
      notification_type: 'reminder',
      priority: 'medium',
      title: `Corrections en attente`,
      message: `${a.title} — ${a.pending_count} copies à corriger`,
      link: `/evaluation/devoirs/${a.id}/correction-serie`,
    });
    created++;
  }
  return created;
}

// ── Couverture programme insuffisante ──

async function checkProgramCoverage(yearId: ID): Promise<number> {
  // Alerter si un thème est à < 30% de couverture alors qu'on est à > 60% de l'année
  const now = new Date();
  const yearStart = await db.selectOne<{ start_date: string }>(
    'SELECT start_date FROM academic_years WHERE id = ?', [yearId]
  );
  if (!yearStart) return 0;

  const start = new Date(yearStart.start_date);
  const yearEnd = new Date(start.getFullYear() + 1, 5, 30); // ~30 juin
  const elapsed = (now.getTime() - start.getTime()) / (yearEnd.getTime() - start.getTime());
  if (elapsed < 0.6) return 0; // Pas encore 60% de l'année

  const themes = await db.select<{ id: ID; title: string; coverage: number }>(
    `SELECT pt.id, pt.title,
       COALESCE(
         (SELECT COUNT(DISTINCT spt.program_topic_id)
          FROM sequence_program_topics spt
          JOIN sequences seq ON spt.sequence_id = seq.id
          WHERE seq.academic_year_id = ? AND seq.status IN ('in_progress', 'completed')
            AND spt.program_topic_id IN (
              SELECT id FROM program_topics WHERE parent_id = pt.id
            )
         ) * 100.0 / NULLIF(
           (SELECT COUNT(*) FROM program_topics WHERE parent_id = pt.id), 0
         ), 0
       ) as coverage
     FROM program_topics pt
     WHERE pt.academic_year_id = ? AND pt.parent_id IS NULL AND pt.topic_type = 'theme'`,
    [yearId, yearId]
  );

  let created = 0;
  for (const t of themes) {
    if (t.coverage >= 30) continue;

    const key = `coverage-${t.id}`;
    const exists = await hasRecentNotification('alert', key);
    if (exists) continue;

    await notificationService.create({
      notification_type: 'alert',
      priority: 'high',
      title: `Programme non couvert`,
      message: `"${t.title}" à ${Math.round(t.coverage)}% — année à ${Math.round(elapsed * 100)}%`,
      link: `/programme/progression`,
    });
    created++;
  }
  return created;
}

// ── File IA en attente ──

async function checkAIQueue(): Promise<number> {
  const row = await db.selectOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM ai_request_queue WHERE status IN ('queued', 'error') AND retry_count < max_retries"
  );
  const count = row?.cnt ?? 0;
  if (count === 0) return 0;

  const exists = await hasRecentNotification('system', 'ai-queue');
  if (exists) return 0;

  await notificationService.create({
    notification_type: 'system',
    priority: 'low',
    title: `Requêtes IA en attente`,
    message: `${count} requête(s) dans la file d'attente`,
    link: `/preparation/ia/historique`,
  });
  return 1;
}

// ── Helpers ──

async function hasRecentNotification(type: string, titleKey: string): Promise<boolean> {
  // Éviter les doublons : pas de notif du même type dans les 24h
  const row = await db.selectOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM notifications
     WHERE notification_type = ? AND title LIKE ? AND created_at > datetime('now', '-24 hours')`,
    [type, `%${titleKey.slice(0, 20)}%`]
  );
  return (row?.cnt ?? 0) > 0;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}
