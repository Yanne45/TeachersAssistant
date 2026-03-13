// ============================================================================
// Teacher Assistant — Services barrel export
// ============================================================================

export { db, openDatabase, createDatabase, closeDatabase, getCurrentPath, isOpen } from './db';
export { runMigrations } from './migrationRunner';
export { workspaceService, toRelativePath, resolveDocPath, toPreviewSrc } from './workspaceService';

// Cadre annuel
export {
  academicYearService,
  calendarPeriodService,
  subjectService,
  levelService,
  classService,
  hourAllocationService,
  notificationService,
  newYearService,
} from './academicService';

// Programme & contenus
export {
  programTopicService,
  programKeywordService,
  skillService,
  sequenceTemplateService,
} from './programmeService';

// Séquences, séances, cahier
export {
  sequenceService,
  sessionService,
  lessonLogService,
} from './sequenceService';

// Emploi du temps
export {
  timetableService,
  calendarEventService,
} from './timetableService';

// Bibliothèque
export {
  documentService,
  documentTypeService,
  documentTagService,
  ingestionService,
} from './documentService';

// Évaluations
export {
  assignmentService,
  submissionService,
  correctionService,
  skillEvaluationService,
  feedbackService,
  bilanService,
  assignmentTypeService,
  generalCompetencyService,
  skillDescriptorService,
  DEFAULT_LEVEL_LABELS,
} from './evaluationService';
export type { AssignmentType, GeneralCompetency, SkillLevelDescriptor } from './evaluationService';

// Suivi élèves
export {
  studentService,
  reportPeriodService,
  periodProfileService,
  skillObservationService,
  bulletinService,
  orientationService,
} from './studentService';

// Système
export {
  preferenceService,
  exportSettingsService,
  backupService,
} from './systemService';

// Dashboard
export { dashboardService } from './dashboardService';

// IA
export {
  aiSettingsService,
  aiTaskService,
  aiGenerationService,
  aiCorrectionService,
  aiBulletinService,
  aiQueueService,
  assemblePrompt,
  getApiKey,
  setApiKey,
  smartGenerate,
  smartCorrect,
  isOnline,
  aiUsageService,
  estimateCost,
  MODEL_PRICING,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  PROVIDER_ENDPOINTS,
  ollamaService,
} from './aiService';
export type { AITask, AITaskVariable, AITaskParam, AIUserTemplate, AIGenerationRequest, CorrectionAIResult,
  UsageByModel, UsageByCategory, UsageByMonth, RecentGenUsage, AIProvider } from './aiService';

// Import / Export
export {
  icsImportService,
  csvImportService,
  programJsonService,
  templateExportService,
  pdfExportService,
  aiExportService,
  markdownToHTML,
  backupService2,
  syncService,
  downloadBlob,
} from './importExportService';
export type { CSVStudent } from './importExportService';

// Banque de rubriques
export { rubricTemplateService } from './rubricTemplateService';
export type { RubricTemplate, RubricCriterion, RubricDescriptor } from './rubricTemplateService';

// Export grille compétences
export { grilleExportService } from './grilleExportService';
export type { GrilleRow } from './grilleExportService';

// Timeline projection
export { timelineProjectionService } from './timelineProjectionService';
export type { TopicCoverage, PaceAnalysis, TimelineSlot, WhatIfResult } from './timelineProjectionService';

// Notification engine
export { generateNotifications } from './notificationEngine';

// Global search
export { searchService } from './searchService';
export type { SearchResult } from './searchService';

// Embedding / recherche vectorielle
export { embeddingService } from './embeddingService';

// Google Calendar
export { googleCalendarService } from './googleCalendarService';
export type { GoogleCalendarConfig, GCalCalendar, GCalEvent, ICSCompatEvent } from './googleCalendarService';
