// ============================================================================
// Teacher Assistant — Mock data centralisé (fallback mode navigateur)
// ============================================================================

import type { DashboardIndicators, WeekSlot, CoverageItem, AlertItem } from './DataProvider';

export const MOCK_DASHBOARD: DashboardIndicators = {
  activeSequences: 3,
  weekSessions: 8,
  hoursCompleted: 42,
  hoursTarget: 90,
  cahierMissing: 2,
  pendingCorrections: 15,
};

export const MOCK_WEEK_SLOTS: WeekSlot[] = [
  { id: '1', dayOfWeek: 1, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', startTime: '08:00', endTime: '10:00', sessionReady: true },
  { id: '2', dayOfWeek: 1, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 4', startTime: '10:00', endTime: '11:00', sessionReady: true },
  { id: '3', dayOfWeek: 1, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 4', startTime: '14:00', endTime: '16:00', sessionReady: true },
  { id: '4', dayOfWeek: 2, subjectLabel: 'Géo', subjectColor: '#27774E', classLabel: '1ère 3', startTime: '08:00', endTime: '10:00', sessionReady: false },
  { id: '5', dayOfWeek: 2, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 2', startTime: '10:00', endTime: '12:00', sessionReady: true },
  { id: '6', dayOfWeek: 4, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', startTime: '08:00', endTime: '10:00', sessionReady: true },
  { id: '7', dayOfWeek: 4, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 4', startTime: '10:00', endTime: '12:00', sessionReady: true },
  { id: '8', dayOfWeek: 4, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 2', startTime: '14:00', endTime: '16:00', sessionReady: false },
  { id: '9', dayOfWeek: 5, subjectLabel: 'Géo', subjectColor: '#27774E', classLabel: '1ère 3', startTime: '08:00', endTime: '10:00', sessionReady: true },
  { id: '10', dayOfWeek: 5, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 4', startTime: '10:00', endTime: '11:00', sessionReady: true },
];

export const MOCK_COVERAGE: CoverageItem[] = [
  { label: 'HGGSP Tle — T1 Espaces de conquête', percentage: 85, color: '#7B3FA0' },
  { label: 'HGGSP Tle — T2 Guerre et paix', percentage: 30, color: '#7B3FA0' },
  { label: 'Histoire Tle — T1 Puissances', percentage: 100, color: '#2C3E7B' },
  { label: 'Géo 1ère — T1 Métropolisation', percentage: 60, color: '#27774E' },
];

export const MOCK_ALERTS: AlertItem[] = [
  { id: 'a1', level: 'danger', message: "Séquence « Guerre froide » en retard (–2 sem.)", navigateTo: '/preparation/sequences/2' },
  { id: 'a2', level: 'warn', message: 'Cahier de textes du 25/02 non rempli', navigateTo: '/cahier-de-textes' },
  { id: 'a3', level: 'warn', message: '3 copies Tle 2 restent à confirmer', navigateTo: '/evaluation/devoirs/1' },
];

// ── Séquences mock ──

export const MOCK_SEQUENCES = [
  { id: 1, title: 'De nouveaux espaces de conquête', subject_short_label: 'HGGSP', subject_color: '#7B3FA0', level_short_label: 'Tle', total_hours: 24, status: 'done', start_date: '2025-09-01', end_date: '2025-10-17', session_count: 8, class_names: 'Tle 2, Tle 4' },
  { id: 2, title: 'Faire la guerre, faire la paix', subject_short_label: 'HGGSP', subject_color: '#7B3FA0', level_short_label: 'Tle', total_hours: 16, status: 'in_progress', start_date: '2025-11-04', end_date: '2025-12-19', session_count: 4, class_names: 'Tle 2, Tle 4' },
  { id: 3, title: 'Histoire et mémoires', subject_short_label: 'HGGSP', subject_color: '#7B3FA0', level_short_label: 'Tle', total_hours: 20, status: 'planned', start_date: '2026-01-06', end_date: null, session_count: 0, class_names: 'Tle 2, Tle 4' },
  { id: 4, title: 'La Guerre froide (1947-1991)', subject_short_label: 'Histoire', subject_color: '#2C3E7B', level_short_label: 'Tle', total_hours: 10, status: 'done', start_date: '2025-09-15', end_date: '2025-11-07', session_count: 3, class_names: 'Tle 2, Tle 4' },
  { id: 5, title: 'La métropolisation à l\'échelle mondiale', subject_short_label: 'Géo', subject_color: '#27774E', level_short_label: '1ère', total_hours: 12, status: 'in_progress', start_date: '2025-09-01', end_date: '2025-10-31', session_count: 3, class_names: '1ère 3' },
];

export const MOCK_SESSIONS = [
  { id: 1, title: 'Introduction — Le monde bipolaire', session_number: 1, duration_minutes: 120, status: 'done', session_date: '2025-11-04', objectives: 'Comprendre la mise en place du système bipolaire.', document_count: 3 },
  { id: 2, title: 'Berlin, symbole de la Guerre froide', session_number: 2, duration_minutes: 120, status: 'done', session_date: '2025-11-10', objectives: 'Analyser Berlin comme lieu symbolique.', document_count: 4 },
  { id: 3, title: 'Crises et détente (1962-1985)', session_number: 3, duration_minutes: 120, status: 'ready', session_date: '2025-11-17', objectives: 'Identifier moments de tension et détente.', document_count: 2 },
  { id: 4, title: 'Effondrement du bloc soviétique', session_number: 4, duration_minutes: 120, status: 'planned', session_date: '2025-11-24', objectives: 'Comprendre les facteurs d\'effondrement.', document_count: 0 },
];

// ── Devoirs mock ──

export const MOCK_ASSIGNMENTS = [
  { id: 1, title: 'Dissertation — La Guerre froide', type_label: 'Dissertation', subject_short_label: 'HGGSP', subject_color: '#7B3FA0', class_short_name: 'Tle 2', assignment_date: '2025-11-14', due_date: '2025-11-28', max_score: 20, corrected_count: 25, total_count: 28, status: 'correcting', skill_labels: ['Problématiser', 'Plan', 'Connaissances'] },
  { id: 2, title: 'Commentaire — Discours Churchill', type_label: 'Commentaire', subject_short_label: 'HGGSP', subject_color: '#7B3FA0', class_short_name: 'Tle 4', assignment_date: '2025-11-21', due_date: '2025-11-21', max_score: 20, corrected_count: 30, total_count: 30, status: 'corrected', skill_labels: ['Analyser doc', 'Rédaction'] },
  { id: 3, title: 'Croquis — Métropolisation', type_label: 'Croquis', subject_short_label: 'Géo', subject_color: '#27774E', class_short_name: '1ère 3', assignment_date: '2025-10-10', due_date: '2025-10-10', max_score: 20, corrected_count: 32, total_count: 32, status: 'corrected', skill_labels: ['Croquis'] },
];

// ── Élèves mock ──

export const MOCK_STUDENTS = [
  { id: 1, last_name: 'ADRIEN', first_name: 'Camille', gender: 'F', avg: 14.0, trend: 'up', behavior: 4, alerts: [] },
  { id: 3, last_name: 'BERNARD', first_name: 'Emma', gender: 'F', avg: 15.5, trend: 'up', behavior: 5, alerts: [] },
  { id: 4, last_name: 'BROSSARD', first_name: 'Nathan', gender: 'M', avg: 8.0, trend: 'down', behavior: 3, alerts: ['Résultats en baisse'] },
  { id: 9, last_name: 'DUPONT', first_name: 'Léa', gender: 'F', avg: 14.0, trend: 'up', behavior: 4, alerts: [] },
  { id: 16, last_name: 'MARTIN', first_name: 'Arthur', gender: 'M', avg: 17.5, trend: 'up', behavior: 5, alerts: [] },
  { id: 25, last_name: 'VIDAL', first_name: 'Paul', gender: 'M', avg: 5.0, trend: 'down', behavior: 2, alerts: ['En grande difficulté'] },
];
