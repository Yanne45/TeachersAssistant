// ============================================================================
// Teacher Assistant — Hooks métier
// Chaque hook encapsule un service + gestion de l'état async
// ============================================================================

import { useCallback } from 'react';
import { useAsync, useAsyncOne } from './useAsync';
import {
  academicYearService,
  calendarPeriodService,
  subjectService,
  levelService,
  classService,
  notificationService,
  programTopicService,
  skillService,
  sequenceService,
  sessionService,
  lessonLogService,
  timetableService,
  documentService,
  assignmentService,
  submissionService,
  bilanService,
  studentService,
  skillObservationService,
  bulletinService,
  reportPeriodService,
  dashboardService,
  preferenceService,
} from '../services';
import type { ID, SlotRecurrence } from '../types';

// ── Cadre annuel ──

export function useAcademicYear() {
  return useAsyncOne(() => academicYearService.getActive(), []);
}

export function useCalendarPeriods(yearId: ID | null) {
  return useAsync(
    () => yearId ? calendarPeriodService.getByYear(yearId) : Promise.resolve([]),
    [yearId]
  );
}

export function useSubjects() {
  return useAsync(() => subjectService.getAll(), []);
}

export function useLevels() {
  return useAsync(() => levelService.getAll(), []);
}

export function useClasses(yearId: ID | null) {
  return useAsync(
    () => yearId ? classService.getByYear(yearId) : Promise.resolve([]),
    [yearId]
  );
}

export function useNotifications() {
  const state = useAsync(() => notificationService.getUnread(), []);

  const markRead = useCallback(async (id: ID) => {
    await notificationService.markRead(id);
    state.refresh();
  }, [state.refresh]);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    state.refresh();
  }, [state.refresh]);

  return { ...state, markRead, markAllRead };
}

// ── Programme ──

export function useProgramTree(yearId: ID | null, subjectId: ID | null, levelId: ID | null) {
  return useAsync(
    () => (yearId && subjectId && levelId)
      ? programTopicService.getTree(yearId, subjectId, levelId)
      : Promise.resolve([]),
    [yearId, subjectId, levelId]
  );
}

export function useSkills(yearId: ID | null) {
  return useAsync(
    () => yearId ? skillService.getAll(yearId) : Promise.resolve([]),
    [yearId]
  );
}

// ── Séquences & séances ──

export function useSequences(yearId: ID | null) {
  return useAsync(
    () => yearId ? sequenceService.getByYear(yearId) : Promise.resolve([]),
    [yearId]
  );
}

export function useSequence(id: ID | null) {
  return useAsyncOne(
    () => id ? sequenceService.getById(id) : Promise.resolve(null),
    [id]
  );
}

export function useSessions(sequenceId: ID | null) {
  return useAsync(
    () => sequenceId ? sessionService.getBySequence(sequenceId) : Promise.resolve([]),
    [sequenceId]
  );
}

// ── Cahier de textes ──

export function useLessonLog(classId: ID | null) {
  return useAsync(
    () => classId ? lessonLogService.getByClass(classId) : lessonLogService.getRecent(),
    [classId]
  );
}

// ── Emploi du temps ──

export function useTimetable(yearId: ID | null, recurrence?: SlotRecurrence) {
  return useAsync(
    () => yearId ? timetableService.getByYear(yearId, recurrence) : Promise.resolve([]),
    [yearId, recurrence]
  );
}

// ── Bibliothèque ──

export function useDocuments(filter: 'recent' | { subjectId: ID } | { search: string }) {
  return useAsync(() => {
    if (filter === 'recent') return documentService.getRecent();
    if ('subjectId' in filter) return documentService.getBySubject(filter.subjectId);
    return documentService.search(filter.search);
  }, [JSON.stringify(filter)]);
}

// ── Évaluations ──

export function useAssignments(yearId: ID | null) {
  return useAsync(
    () => yearId ? assignmentService.getByYear(yearId) : Promise.resolve([]),
    [yearId]
  );
}

export function useSubmissions(assignmentId: ID | null) {
  return useAsync(
    () => assignmentId ? submissionService.getByAssignment(assignmentId) : Promise.resolve([]),
    [assignmentId]
  );
}

export function useBilanStats(assignmentId: ID | null) {
  return useAsync(
    () => assignmentId ? bilanService.computeStats(assignmentId) : Promise.resolve(null),
    [assignmentId]
  );
}

// ── Élèves ──

export function useStudentsByClass(classId: ID | null) {
  return useAsync(
    () => classId ? studentService.getByClass(classId) : Promise.resolve([]),
    [classId]
  );
}

export function useStudent(id: ID | null) {
  return useAsyncOne(
    () => id ? studentService.getById(id) : Promise.resolve(null),
    [id]
  );
}

export function useSkillEvolution(studentId: ID | null, yearId: ID | null) {
  return useAsync(
    () => (studentId && yearId)
      ? skillObservationService.getEvolution(studentId, yearId)
      : Promise.resolve([]),
    [studentId, yearId]
  );
}

export function useBulletins(studentId: ID | null, periodId: ID | null) {
  return useAsync(
    () => (studentId && periodId)
      ? bulletinService.getByStudentPeriod(studentId, periodId)
      : Promise.resolve([]),
    [studentId, periodId]
  );
}

export function useReportPeriods(yearId: ID | null) {
  return useAsync(
    () => yearId ? reportPeriodService.getByYear(yearId) : Promise.resolve([]),
    [yearId]
  );
}

// ── Dashboard ──

export function useDashboard(yearId: ID | null) {
  return useAsync(
    () => yearId ? dashboardService.getIndicators(yearId) : Promise.resolve(null),
    [yearId]
  );
}

export function useCoverage(yearId: ID | null) {
  return useAsync(
    () => yearId ? dashboardService.getCoverage(yearId) : Promise.resolve([]),
    [yearId]
  );
}

// ── Préférences ──

export function usePreferences() {
  return useAsync(() => preferenceService.getAll(), []);
}
