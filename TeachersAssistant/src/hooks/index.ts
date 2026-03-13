// ============================================================================
// Teacher Assistant — Hooks barrel export
// ============================================================================

export { useAsync, useAsyncOne } from './useAsync';
export type { AsyncState } from './useAsync';

export {
  useAcademicYear, useCalendarPeriods, useSubjects, useLevels, useClasses,
  useNotifications,
  useProgramTree, useSkills,
  useSequences, useSequence, useSessions,
  useLessonLog,
  useTimetable,
  useDocuments,
  useAssignments, useSubmissions, useBilanStats,
  useStudentsByClass, useStudent, useSkillEvolution, useBulletins, useReportPeriods,
  useDashboard, useCoverage,
  usePreferences,
} from './useData';

export {
  useToast, useTheme, useUIDensity,
  useKeyboardShortcuts, useCorrectionShortcuts, useDebounce, useOnlineStatus,
  useUnsavedGuard,
} from './useUI';
export type { ToastData, CorrectionShortcutHandlers } from './useUI';

export { usePageLoadTelemetry, trackCacheHit, trackCacheMiss } from './useDevTelemetry';

export { useBibliothequeSidebar } from './useBibliothequeSidebar';
