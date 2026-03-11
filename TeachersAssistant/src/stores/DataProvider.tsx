// ============================================================================
// Teacher Assistant — DataProvider
// Fournit les données aux pages via hooks. En mode DB = vrais services.
// En mode dev/navigateur = fallback sur mock data.
// ============================================================================

import React, { createContext, useContext, useCallback } from 'react';
import { isOpen as isDbOpen } from '../services/db';
import { useApp } from './AppContext';
import {
  dashboardService,
  timetableService,
  notificationService,
  sequenceService,
  sessionService,
  lessonLogService,
  documentService,
  assignmentService,
  submissionService,
  bilanService,
  studentService,
  skillObservationService,
  bulletinService,
  calendarPeriodService,
  programTopicService,
  skillService,
} from '../services';
import { MOCK_DASHBOARD, MOCK_WEEK_SLOTS, MOCK_COVERAGE, MOCK_ALERTS } from './mockData';
import type { ID } from '../types';

// ── Types résultats dashboard ──

export interface DashboardIndicators {
  activeSequences: number;
  weekSessions: number;
  hoursCompleted: number;
  hoursTarget: number;
  cahierMissing: number;
  pendingCorrections: number;
}

export interface WeekSlot {
  id: string;
  dayOfWeek: number;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  startTime: string;
  endTime: string;
  sessionReady: boolean;
}

export interface CoverageItem {
  label: string;
  percentage: number;
  color: string;
}

export interface AlertItem {
  id: string;
  level: 'danger' | 'warn';
  message: string;
  navigateTo: string;
}

// ── Context ──

interface DataContextType {
  isDbMode: boolean;

  // Dashboard
  loadDashboard: () => Promise<DashboardIndicators>;
  loadWeekSlots: () => Promise<WeekSlot[]>;
  loadCoverage: () => Promise<CoverageItem[]>;
  loadAlerts: () => Promise<AlertItem[]>;

  // Sequences
  loadSequences: () => Promise<any[]>;
  loadSessions: (seqId: ID) => Promise<any[]>;
  saveSequence: (data: any) => Promise<number>;
  saveSession: (data: any) => Promise<number>;

  // Students
  loadStudents: (classId: ID) => Promise<any[]>;
  loadStudent: (id: ID) => Promise<any | null>;

  // Assignments
  loadAssignments: () => Promise<any[]>;
  loadSubmissions: (assignmentId: ID) => Promise<any[]>;
  loadBilanStats: (assignmentId: ID) => Promise<any | null>;

  // Calendar
  loadCalendarPeriods: () => Promise<any[]>;

  // Documents
  loadDocuments: (filter?: string) => Promise<any[]>;

  // Cahier
  loadLessonLog: (classId?: ID) => Promise<any[]>;

  // Programme
  loadProgramTree: (subjectId: ID, levelId: ID) => Promise<any[]>;
  loadSkills: () => Promise<any[]>;

  // Bulletins
  loadBulletins: (studentId: ID, periodId: ID) => Promise<any[]>;
  loadSkillEvolution: (studentId: ID) => Promise<any[]>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeYear } = useApp();
  const yearId = activeYear?.id ?? null;
  const dbMode = isDbOpen();

  // ── Dashboard ──

  const loadDashboard = useCallback(async (): Promise<DashboardIndicators> => {
    if (dbMode && yearId) {
      try {
        return await dashboardService.getIndicators(yearId);
      } catch { /* fallback */ }
    }
    return MOCK_DASHBOARD;
  }, [dbMode, yearId]);

  const loadWeekSlots = useCallback(async (): Promise<WeekSlot[]> => {
    if (dbMode && yearId) {
      try {
        const slots = await timetableService.getByYear(yearId);
        return slots.map((s: any) => ({
          id: String(s.id),
          dayOfWeek: s.day_of_week,
          subjectLabel: s.subject_short_label || s.subject_label || 'Matière',
          subjectColor: s.subject_color || '#888',
          classLabel: s.class_short_name || s.class_name || 'Classe',
          startTime: s.start_time,
          endTime: s.end_time,
          sessionReady: false, // TODO: check session existence
        }));
      } catch { /* fallback */ }
    }
    return MOCK_WEEK_SLOTS;
  }, [dbMode, yearId]);

  const loadCoverage = useCallback(async (): Promise<CoverageItem[]> => {
    if (dbMode && yearId) {
      try {
        return await dashboardService.getCoverage(yearId);
      } catch { /* fallback */ }
    }
    return MOCK_COVERAGE;
  }, [dbMode, yearId]);

  const loadAlerts = useCallback(async (): Promise<AlertItem[]> => {
    if (dbMode) {
      try {
        const notifs = await notificationService.getUnread();
        return notifs.map((n: any) => ({
          id: String(n.id),
          level: n.priority === 'high' ? 'danger' as const : 'warn' as const,
          message: n.message || n.title,
          navigateTo: n.link || '/dashboard',
        }));
      } catch { /* fallback */ }
    }
    return MOCK_ALERTS;
  }, [dbMode]);

  // ── Sequences ──

  const loadSequences = useCallback(async () => {
    if (dbMode && yearId) {
      try { return await sequenceService.getByYear(yearId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  const loadSessions = useCallback(async (seqId: ID) => {
    if (dbMode) {
      try { return await sessionService.getBySequence(seqId); } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  const saveSequence = useCallback(async (data: any): Promise<number> => {
    if (dbMode && yearId) {
      return await sequenceService.create({ ...data, academic_year_id: yearId });
    }
    return Date.now(); // fake ID in dev
  }, [dbMode, yearId]);

  const saveSession = useCallback(async (data: any): Promise<number> => {
    if (dbMode) {
      return await sessionService.create(data);
    }
    return Date.now();
  }, [dbMode]);

  // ── Students ──

  const loadStudents = useCallback(async (classId: ID) => {
    if (dbMode) {
      try { return await studentService.getByClass(classId); } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  const loadStudent = useCallback(async (id: ID) => {
    if (dbMode) {
      try { return await studentService.getById(id); } catch { /* */ }
    }
    return null;
  }, [dbMode]);

  // ── Assignments ──

  const loadAssignments = useCallback(async () => {
    if (dbMode && yearId) {
      try { return await assignmentService.getByYear(yearId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  const loadSubmissions = useCallback(async (assignmentId: ID) => {
    if (dbMode) {
      try { return await submissionService.getByAssignment(assignmentId); } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  const loadBilanStats = useCallback(async (assignmentId: ID) => {
    if (dbMode) {
      try { return await bilanService.computeStats(assignmentId); } catch { /* */ }
    }
    return null;
  }, [dbMode]);

  // ── Calendar ──

  const loadCalendarPeriods = useCallback(async () => {
    if (dbMode && yearId) {
      try { return await calendarPeriodService.getByYear(yearId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  // ── Documents ──

  const loadDocuments = useCallback(async (filter?: string) => {
    if (dbMode) {
      try {
        if (filter) return await documentService.search(filter);
        return await documentService.getRecent();
      } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  // ── Cahier ──

  const loadLessonLog = useCallback(async (classId?: ID) => {
    if (dbMode) {
      try {
        if (classId) return await lessonLogService.getByClass(classId);
        return await lessonLogService.getRecent();
      } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  // ── Programme ──

  const loadProgramTree = useCallback(async (subjectId: ID, levelId: ID) => {
    if (dbMode && yearId) {
      try { return await programTopicService.getTree(yearId, subjectId, levelId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  const loadSkills = useCallback(async () => {
    if (dbMode && yearId) {
      try { return await skillService.getAll(yearId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  // ── Bulletins ──

  const loadBulletins = useCallback(async (studentId: ID, periodId: ID) => {
    if (dbMode) {
      try { return await bulletinService.getByStudentPeriod(studentId, periodId); } catch { /* */ }
    }
    return [];
  }, [dbMode]);

  const loadSkillEvolution = useCallback(async (studentId: ID) => {
    if (dbMode && yearId) {
      try { return await skillObservationService.getEvolution(studentId, yearId); } catch { /* */ }
    }
    return [];
  }, [dbMode, yearId]);

  const value: DataContextType = {
    isDbMode: dbMode,
    loadDashboard, loadWeekSlots, loadCoverage, loadAlerts,
    loadSequences, loadSessions, saveSequence, saveSession,
    loadStudents, loadStudent,
    loadAssignments, loadSubmissions, loadBilanStats,
    loadCalendarPeriods, loadDocuments, loadLessonLog,
    loadProgramTree, loadSkills,
    loadBulletins, loadSkillEvolution,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
