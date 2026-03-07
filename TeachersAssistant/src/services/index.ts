// ============================================================================
// Teacher Assistant — Services barrel export
// ============================================================================

export { db, initDatabase, openDatabase, createDatabase, closeDatabase, applySchema, getCurrentPath, isOpen } from './db';
export { workspaceService } from './workspaceService';

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
} from './evaluationService';

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
  setApiKey,
  smartGenerate,
  smartCorrect,
  isOnline,
} from './aiService';
export type { AITask, AITaskVariable, AITaskParam, AIUserTemplate, AIGenerationRequest, CorrectionAIResult } from './aiService';

// Import / Export
export {
  icsImportService,
  csvImportService,
  programJsonService,
  templateExportService,
  pdfExportService,
  backupService2,
  downloadBlob,
} from './importExportService';
export type { CSVStudent } from './importExportService';

// Notification engine
export { generateNotifications } from './notificationEngine';

// Global search
export { searchService } from './searchService';
export type { SearchResult } from './searchService';
