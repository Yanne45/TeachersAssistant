import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, SkillLevelSelector, EmptyState, ErrorBoundary, PanelError, Stepper, ActionMenu } from '../../components/ui';
import type { ActionMenuItem } from '../../components/ui';
import type { StepDef } from '../../components/ui';
import {
  assignmentService,
  correctionService,
  db,
  feedbackService,
  skillEvaluationService,
  smartCorrect,
  smartGenerate,
  submissionService,
  workspaceService,
} from '../../services';
import { useCorrectionShortcuts, usePageLoadTelemetry, trackCacheHit, trackCacheMiss, useUnsavedGuard } from '../../hooks';
import { useApp, useData, useRouter } from '../../stores';
import { SUBMISSION_STATUS_META } from '../../constants/statuses';
import type { CorrectionAIResult } from '../../services';
import { extractTextFromFile } from '../../utils/textExtractor';
import { BulkCopyImportModal } from '../../components/evaluation/BulkCopyImportModal';
import { PronoteImportModal } from '../../components/evaluation/PronoteImportModal';
import { GrilleDescriptiveModal } from './GrilleDescriptiveModal';
import { CorrectionTemplateModal } from '../../components/evaluation/CorrectionTemplateModal';
import './CorrectionSeriePage.css';

interface SkillDef {
  id: number | null;
  label: string;
}

interface StudentSubmission {
  id: number;
  name: string;
  score: number | null;
  aiSuggestedScore: number | null;
  status: 'final' | 'to_confirm' | 'ai_processing' | 'pending';
  filePath: string | null;
  textContent: string | null;
  skillLevels: Record<string, number | null>;
  strengths: string[];
  weaknesses: string[];
  correctionText: string;
}

const DEFAULT_SKILLS: SkillDef[] = [
  { id: null, label: 'Problematise' },
  { id: null, label: 'Construire un plan' },
  { id: null, label: 'Mobiliser connaissances' },
  { id: null, label: 'Redaction' },
  { id: null, label: 'Analyser doc.' },
];


// Icônes de statut depuis le dictionnaire centralisé
const STATUS_ICONS: Record<StudentSubmission['status'], string> = {
  final: SUBMISSION_STATUS_META.final.icon,
  to_confirm: SUBMISSION_STATUS_META.to_confirm.icon,
  ai_processing: SUBMISSION_STATUS_META.ai_processing.icon,
  pending: SUBMISSION_STATUS_META.pending.icon,
};
const VIRTUAL_STUDENT_ROW_HEIGHT = 36;
const VIRTUAL_STUDENT_OVERSCAN = 8;

function toPreviewSrc(filePath: string): string {
  const trimmed = filePath.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }

  if (/^[A-Za-z]:\\/.test(trimmed)) {
    return `file:///${trimmed.replace(/\\/g, '/')}`;
  }

  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  return trimmed;
}

export const CorrectionSeriePage: React.FC = () => {
  const { addToast } = useApp();
  const { route, navigate } = useRouter();
  const { loadSubmissions } = useData();
  const { isDirty, setDirty, markClean } = useUnsavedGuard();

  const [skills, setSkills] = useState<SkillDef[]>(DEFAULT_SKILLS);
  const [students, setStudents] = useState<StudentSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [correctionModel, setCorrectionModel] = useState<string | null>(null);
  const [generatingModel, setGeneratingModel] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [pronoteImportOpen, setPronoteImportOpen] = useState(false);
  const [grilleModalOpen, setGrilleModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeSkillIdx, setActiveSkillIdx] = useState(0);
  const studentsListRef = useRef<HTMLDivElement | null>(null);
  const [studentsScrollTop, setStudentsScrollTop] = useState(0);
  const [studentsViewportHeight, setStudentsViewportHeight] = useState(420);
  const assignmentSkillsCacheRef = useRef(new Map<number, SkillDef[]>());
  const assignmentSkillsInflightRef = useRef(new Map<number, Promise<SkillDef[]>>());
  const assignmentSubmissionsCacheRef = useRef(new Map<number, any[]>());
  const assignmentSubmissionsInflightRef = useRef(new Map<number, Promise<any[]>>());
  const submissionDetailsCacheRef = useRef(new Map<number, {
    skillEvaluations: any[];
    feedbacks: any[];
    latestCorrection: any | null;
  }>());
  const submissionDetailsInflightRef = useRef(new Map<number, Promise<{
    skillEvaluations: any[];
    feedbacks: any[];
    latestCorrection: any | null;
  }>>());

  usePageLoadTelemetry('CorrectionSeriePage', loading);

  const assignmentIdRaw = Number.parseInt(String(route.entityId ?? ''), 10);
  const assignmentId = Number.isFinite(assignmentIdRaw) ? assignmentIdRaw : null;

  const clearAllCaches = useCallback(() => {
    assignmentSkillsCacheRef.current.clear();
    assignmentSkillsInflightRef.current.clear();
    assignmentSubmissionsCacheRef.current.clear();
    assignmentSubmissionsInflightRef.current.clear();
    submissionDetailsCacheRef.current.clear();
    submissionDetailsInflightRef.current.clear();
  }, []);

  const getAssignmentSkillsCached = useCallback(async (id: number) => {
    const cached = assignmentSkillsCacheRef.current.get(id);
    if (cached) return cached;

    const inflight = assignmentSkillsInflightRef.current.get(id);
    if (inflight) return inflight;

    const request = assignmentService.getSkills(id)
      .then((skillRows) => (skillRows.length > 0
        ? skillRows.map((s) => ({ id: s.skill_id, label: s.skill_label } as SkillDef))
        : DEFAULT_SKILLS))
      .then((rows) => {
        assignmentSkillsCacheRef.current.set(id, rows);
        return rows;
      })
      .finally(() => {
        assignmentSkillsInflightRef.current.delete(id);
      });

    assignmentSkillsInflightRef.current.set(id, request);
    return request;
  }, []);

  const getAssignmentSubmissionsCached = useCallback(async (id: number) => {
    const cached = assignmentSubmissionsCacheRef.current.get(id);
    if (cached) return cached;

    const inflight = assignmentSubmissionsInflightRef.current.get(id);
    if (inflight) return inflight;

    const request = loadSubmissions(id)
      .then((rows) => {
        assignmentSubmissionsCacheRef.current.set(id, rows);
        return rows;
      })
      .finally(() => {
        assignmentSubmissionsInflightRef.current.delete(id);
      });

    assignmentSubmissionsInflightRef.current.set(id, request);
    return request;
  }, [loadSubmissions]);

  const getSubmissionDetailsCached = useCallback(async (submissionId: number) => {
    const cached = submissionDetailsCacheRef.current.get(submissionId);
    if (cached) { trackCacheHit('submissionDetails'); return cached; }

    const inflight = submissionDetailsInflightRef.current.get(submissionId);
    if (inflight) return inflight;

    trackCacheMiss('submissionDetails');
    const request = Promise.all([
      skillEvaluationService.getBySubmission(submissionId),
      feedbackService.getBySubmission(submissionId),
      correctionService.getLatestBySubmission(submissionId),
    ])
      .then(([skillEvaluations, feedbacks, latestCorrection]) => ({
        skillEvaluations,
        feedbacks,
        latestCorrection,
      }))
      .then((details) => {
        submissionDetailsCacheRef.current.set(submissionId, details);
        return details;
      })
      .finally(() => {
        submissionDetailsInflightRef.current.delete(submissionId);
      });

    submissionDetailsInflightRef.current.set(submissionId, request);
    return request;
  }, []);

  const invalidateSubmissionCache = useCallback((submissionId: number) => {
    submissionDetailsCacheRef.current.delete(submissionId);
    submissionDetailsInflightRef.current.delete(submissionId);
  }, []);

  const skillLabels = useMemo(() => skills.map((s) => s.label), [skills]);
  const selected = useMemo(() => students.find((s) => s.id === selectedId) ?? null, [students, selectedId]);

  useEffect(() => {
    setPreviewError(false);
  }, [selectedId]);

  const updateSelectedStudent = (updater: (student: StudentSubmission) => StudentSubmission) => {
    if (selectedId === null) return;
    setStudents((prev) => prev.map((s) => (s.id === selectedId ? updater(s) : s)));
    setDirty(true);
  };

  useEffect(() => {
    clearAllCaches();
  }, [assignmentId, clearAllCaches]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      if (!assignmentId) {
        if (!cancelled) {
          setSkills(DEFAULT_SKILLS);
          setStudents([]);
          setSelectedId(null);
          setLoading(false);
        }
        return;
      }

      try {
        const [loadedSkills, submissions, loadedAssignment] = await Promise.all([
          getAssignmentSkillsCached(assignmentId),
          getAssignmentSubmissionsCached(assignmentId),
          assignmentService.getById(assignmentId),
        ]);

        if (!cancelled) {
          setAssignment(loadedAssignment);
          setCorrectionModel(loadedAssignment?.correction_model_text ?? null);
        }

        const mapped = await Promise.all(submissions.map(async (submission: any) => {
          const { skillEvaluations, feedbacks, latestCorrection } = await getSubmissionDetailsCached(submission.id);

          const levels: Record<string, number | null> = {};
          for (const sk of loadedSkills) {
            levels[sk.label] = null;
          }

          for (const se of skillEvaluations) {
            const match = loadedSkills.find((sk) => sk.id === se.skill_id);
            if (match) {
              levels[match.label] = se.level;
            }
          }

          const strengths = feedbacks
            .filter((f) => f.feedback_type === 'strength')
            .map((f) => f.content)
            .filter(Boolean);

          const weaknesses = feedbacks
            .filter((f) => f.feedback_type === 'weakness')
            .map((f) => f.content)
            .filter(Boolean);

          const rawStatus = submission.status as StudentSubmission['status'];
          const status: StudentSubmission['status'] =
            rawStatus === 'final' || rawStatus === 'to_confirm' || rawStatus === 'ai_processing' || rawStatus === 'pending'
              ? rawStatus
              : 'pending';

          return {
            id: submission.id,
            name: `${submission.student_last_name ?? ''} ${submission.student_first_name ?? ''}`.trim() || `Élève #${submission.student_id}`,
            score: submission.score ?? null,
            aiSuggestedScore: submission.ai_suggested_score ?? null,
            status,
            filePath: submission.file_path ?? null,
            textContent: submission.text_content ?? null,
            skillLevels: levels,
            strengths,
            weaknesses,
            correctionText: latestCorrection?.content ?? '',
          } satisfies StudentSubmission;
        }));

        if (!cancelled) {
          setSkills(loadedSkills);
          setStudents(mapped);
          setSelectedId((prev) => (prev && mapped.some((s) => s.id === prev) ? prev : (mapped[0]?.id ?? null)));
        }
      } catch (error) {
        console.error('[CorrectionSeriePage] Erreur chargement:', error);
        if (!cancelled) {
          setSkills(DEFAULT_SKILLS);
          setStudents([]);
          setSelectedId(null);
          setLoadError('Impossible de charger les copies du devoir.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, addToast, getAssignmentSkillsCached, getAssignmentSubmissionsCached, getSubmissionDetailsCached, loadKey]);

  useEffect(() => {
    const node = studentsListRef.current;
    if (!node) return;

    const updateHeight = () => setStudentsViewportHeight(node.clientHeight || 420);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleSkillChange = (skill: string, level: number) => {
    updateSelectedStudent((s) => ({ ...s, skillLevels: { ...s.skillLevels, [skill]: level } }));
  };

  const goPrev = () => {
    if (selectedId === null) return;
    const idx = students.findIndex((s) => s.id === selectedId);
    if (idx > 0) {
      const prev = students[idx - 1];
      if (prev) setSelectedId(prev.id);
    }
  };

  const goNext = () => {
    if (selectedId === null) return;
    const idx = students.findIndex((s) => s.id === selectedId);
    if (idx < students.length - 1) {
      const next = students[idx + 1];
      if (next) setSelectedId(next.id);
    }
  };

  const persistCurrentSubmission = async (finalize: boolean) => {
    if (!selected || !assignmentId) return;

    const trimmedCorrection = selected.correctionText.trim();

    const skillItems = skills
      .filter((skill) => skill.id != null)
      .map((skill) => ({ submissionId: selected.id, skillId: skill.id!, level: selected.skillLevels[skill.label]!, source: 'manual' as const }))
      .filter((item) => item.level != null);

    const feedbackItems = [
      ...selected.strengths.map((x) => x.trim()).filter(Boolean).map((content) => ({ submissionId: selected.id, type: 'strength' as const, content, source: 'manual' as const })),
      ...selected.weaknesses.map((x) => x.trim()).filter(Boolean).map((content) => ({ submissionId: selected.id, type: 'weakness' as const, content, source: 'manual' as const })),
    ];

    await db.transaction(async () => {
      // Save score
      await submissionService.updateScore(selected.id, selected.score);

      if (trimmedCorrection) {
        await correctionService.create(selected.id, trimmedCorrection, 'manual');
      }

      if (skillItems.length > 0) {
        await skillEvaluationService.upsertBatch(skillItems);
      }

      await feedbackService.deleteBySubmission(selected.id);
      if (feedbackItems.length > 0) {
        await feedbackService.createBatch(feedbackItems);
      }

      if (finalize) {
        await submissionService.updateStatus(selected.id, 'final');
      } else if (selected.status === 'pending') {
        await submissionService.updateStatus(selected.id, 'to_confirm');
      }
    });

    if (finalize) {
      updateSelectedStudent((s) => ({ ...s, status: 'final' }));
    } else if (selected.status === 'pending') {
      updateSelectedStudent((s) => ({ ...s, status: 'to_confirm' }));
    }

    invalidateSubmissionCache(selected.id);
  };

  const handleFinalize = async () => {
    if (!selected) return;
    try {
      await persistCurrentSubmission(true);
      markClean();
      addToast('success', `${selected.name} - copie finalisée`);
      goNext();
    } catch (error) {
      console.error('[CorrectionSeriePage] Erreur finalisation:', error);
      addToast('error', 'Échec de finalisation');
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await persistCurrentSubmission(false);
      markClean();
      addToast('success', 'Sauvegarde effectuée');
    } catch (error) {
      console.error('[CorrectionSeriePage] Erreur sauvegarde:', error);
      addToast('error', 'Échec de sauvegarde');
    }
  };

  const handleGenerateCorrectionModel = async () => {
    if (!assignmentId || !assignment) return;
    const sujet = assignment.subject_extracted_text || assignment.instructions || '';
    if (!sujet.trim()) {
      addToast('warn', 'Aucun sujet disponible pour générer le corrigé type');
      return;
    }

    setGeneratingModel(true);
    try {
      const result = await smartGenerate({
        taskCode: 'generate_exam_answer',
        variables: { sujet },
      });
      if ('queued' in result) {
        addToast('info', 'Génération du corrigé ajoutée à la file d\'attente');
        return;
      }
      const text = (result as any).output_content || (result as any).processed_result || String(result);
      setCorrectionModel(text);
      await assignmentService.updateCorrectionModel(assignmentId, text);
      addToast('success', 'Corrigé type généré');
    } catch (error) {
      console.error('[CorrectionSeriePage] Erreur génération corrigé type:', error);
      addToast('error', 'Échec de génération du corrigé type');
    } finally {
      setGeneratingModel(false);
    }
  };

  const handleAnalyzeIA = async () => {
    if (!selected || !assignmentId) {
      addToast('warn', 'Aucune copie sélectionnée');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await smartCorrect(selected.id, assignmentId);
      if ('queued' in result) {
        updateSelectedStudent((s) => ({ ...s, status: 'ai_processing' }));
        addToast('info', 'Analyse IA ajoutée à la file d\'attente');
        return;
      }

      const r = result as CorrectionAIResult;
      const newLevels: Record<string, number | null> = { ...selected.skillLevels };
      for (const sk of r.skills) {
        const match = skillLabels.find((label) => label.toLowerCase().includes(sk.skill_name.toLowerCase().slice(0, 6)));
        if (match) newLevels[match] = sk.level;
      }

      updateSelectedStudent((s) => ({
        ...s,
        skillLevels: newLevels,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        correctionText: r.general_comment,
        aiSuggestedScore: r.suggested_score ?? null,
        status: 'to_confirm',
      }));

      // Persist AI suggested score
      if (r.suggested_score != null) {
        await submissionService.updateAiSuggestedScore(selected.id, r.suggested_score);
      }

      addToast('success', 'Analyse IA terminée');
    } catch (error) {
      console.error('[CorrectionSeriePage] AI analysis failed:', error);
      addToast('error', 'Échec analyse IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImportCorrection = () => {
    if (!selected) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.rtf';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        updateSelectedStudent((s) => ({
          ...s,
          correctionText: text.trim(),
          status: s.status === 'pending' ? 'to_confirm' : s.status,
        }));
        addToast('success', 'Correction importée');
      } catch (error) {
        console.error('[CorrectionSeriePage] Erreur import correction:', error);
        addToast('error', 'Import de correction impossible');
      }
    };
    input.click();
  };

  const handleImportCopy = () => {
    if (!selected) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.docx';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const copiesDir = await workspaceService.getAppSubDir(
          'copies', assignment?.class_name, assignment?.title
        );
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 60);
        const destPath = `${copiesDir}/${safeName}_${Date.now()}.${ext}`;
        const buffer = await file.arrayBuffer();
        await writeFile(destPath, new Uint8Array(buffer));

        await submissionService.updateFilePath(selected.id, destPath);

        // Extract text for text-based formats
        const textContent = await extractTextFromFile(file, ext);
        if (textContent) {
          await submissionService.updateTextContent(selected.id, textContent);
        }

        updateSelectedStudent((s) => ({
          ...s,
          filePath: destPath,
          textContent,
          status: s.status === 'pending' ? 'to_confirm' : s.status,
        }));

        invalidateSubmissionCache(selected.id);
        addToast('success', 'Copie importée');
      } catch (error) {
        console.error('[CorrectionSeriePage] Erreur import copie:', error);
        addToast('error', 'Import de copie impossible');
      }
    };
    input.click();
  };

  const handleGenerateFeedbackIA = async () => {
    if (!selected || !assignmentId) {
      addToast('warn', 'Aucune copie sélectionnée');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await smartCorrect(selected.id, assignmentId);
      if ('queued' in result) {
        updateSelectedStudent((s) => ({ ...s, status: 'ai_processing' }));
        addToast('info', 'Feedback IA ajouté à la file d\'attente');
        return;
      }

      updateSelectedStudent((s) => ({
        ...s,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        status: 'to_confirm',
      }));
      addToast('success', 'Feedback IA généré');
    } catch (error) {
      console.error('[CorrectionSeriePage] Erreur feedback IA:', error);
      addToast('error', 'Échec génération feedback IA');
    } finally {
      setAnalyzing(false);
    }
  };

  useCorrectionShortcuts({
    onPrevStudent: () => goPrev(),
    onNextStudent: () => goNext(),
    onSetLevel: (level) => {
      const skill = skillLabels[activeSkillIdx];
      if (skill) handleSkillChange(skill, level);
    },
    onNextSkill: () => {
      if (skillLabels.length === 0) return;
      setActiveSkillIdx((idx) => (idx + 1) % skillLabels.length);
    },
    onFinalize: () => void handleFinalize(),
    onAnalyzeAI: () => {
      if (!analyzing) void handleAnalyzeIA();
    },
    onSave: () => {
      void handleSave();
    },
  });

  if (loading) {
    return <p className="loading-text">Chargement…</p>;
  }

  if (loadError) {
    return (
      <div className="correction-page" style={{ padding: 20 }}>
        <PanelError
          message={loadError}
          onRetry={() => { setLoadError(null); setLoadKey((k) => k + 1); }}
        />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="correction-page">
        <EmptyState
          icon="📝"
          title="Aucune copie à corriger"
          description={assignmentId ? 'Aucune soumission pour ce devoir.' : 'Sélectionnez un devoir depuis la liste.'}
        />
      </div>
    );
  }

  const studentRenderStart = Math.max(0, Math.floor(studentsScrollTop / VIRTUAL_STUDENT_ROW_HEIGHT) - VIRTUAL_STUDENT_OVERSCAN);
  const studentRenderCount = Math.ceil(studentsViewportHeight / VIRTUAL_STUDENT_ROW_HEIGHT) + VIRTUAL_STUDENT_OVERSCAN * 2;
  const studentRenderEnd = Math.min(students.length, studentRenderStart + studentRenderCount);
  const studentTopSpace = studentRenderStart * VIRTUAL_STUDENT_ROW_HEIGHT;
  const studentBottomSpace = (students.length - studentRenderEnd) * VIRTUAL_STUDENT_ROW_HEIGHT;
  const renderedStudents = students.slice(studentRenderStart, studentRenderEnd);

  const allFinal = students.length > 0 && students.every((s) => s.status === 'final');
  const hasCopies = students.some((s) => s.filePath !== null);
  const stepperSteps: StepDef[] = [
    { label: 'Sujet', status: assignment?.subject_extracted_text ? 'done' : 'pending' },
    { label: 'Corrigé type', status: correctionModel ? 'done' : 'pending' },
    { label: 'Copies', status: hasCopies ? 'done' : 'pending' },
    { label: 'Correction', status: allFinal ? 'done' : 'active' },
    {
      label: 'Bilan',
      status: allFinal ? 'done' : 'pending',
      onClick: assignmentId ? () => navigate({ tab: 'evaluation', page: 'bilan', entityId: assignmentId }) : undefined,
    },
  ];

  return (
    <div className="correction-page">
      <Stepper steps={stepperSteps} />
      <div className="correction-page__body">
      <ErrorBoundary>
      <Card noHover className="correction-page__students">
        <h3 className="correction-page__panel-title">Élèves ({students.length})</h3>
        <div
          className="correction-page__students-list"
          ref={studentsListRef}
          onScroll={(e) => setStudentsScrollTop(e.currentTarget.scrollTop)}
        >
          {studentTopSpace > 0 && <div style={{ height: studentTopSpace }} aria-hidden="true" />}
          {renderedStudents.map((s) => (
            <button
              key={s.id}
              className={`student-row ${selectedId === s.id ? 'student-row--active' : ''}`}
              onClick={() => setSelectedId(s.id)}
              type="button"
            >
              <span className="student-row__icon">{STATUS_ICONS[s.status]}</span>
              <span className="student-row__name">{s.name}</span>
              {s.score !== null && <span className="student-row__score">{s.score}/20</span>}
            </button>
          ))}
          {studentBottomSpace > 0 && <div style={{ height: studentBottomSpace }} aria-hidden="true" />}
        </div>
      </Card>
      </ErrorBoundary>

      <ErrorBoundary>
      <Card noHover className="correction-page__main">
        <div className="correction-page__main-header">
          <div className="correction-page__header-left">
            <span className="correction-page__student-name">{selected.name}</span>
            {isDirty && <span className="correction-page__unsaved-badge">Non enregistré</span>}
            <span className="correction-page__student-score">
              Note:
              <input
                type="number"
                className="correction-page__score-input"
                value={selected.score ?? ''}
                min={0}
                max={20}
                step={0.5}
                placeholder="-"
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                  updateSelectedStudent((s) => ({ ...s, score: val }));
                }}
              />
              /20
            </span>
            {selected.aiSuggestedScore != null && (
              <span className="correction-page__ai-score">
                IA : {selected.aiSuggestedScore}/20
                <button
                  type="button"
                  className="correction-page__ai-score-apply"
                  onClick={() => updateSelectedStudent((s) => ({ ...s, score: s.aiSuggestedScore }))}
                >
                  Appliquer
                </button>
              </span>
            )}
          </div>
          <div className="correction-page__nav">
            <Button variant="ghost" size="S" onClick={goPrev}>Préc.</Button>
            <Button variant="ghost" size="S" onClick={goNext}>Suiv.</Button>
          </div>
        </div>

        <details className="correction-page__corrige-type">
          <summary className="correction-page__corrige-toggle">
            Corrigé type {correctionModel ? '(disponible)' : ''}
          </summary>
          <div className="correction-page__corrige-content">
            {correctionModel ? (
              <pre className="correction-page__corrige-text">{correctionModel}</pre>
            ) : (
              <p className="correction-page__corrige-empty">Aucun corrigé type généré.</p>
            )}
            <Button
              variant="secondary"
              size="S"
              onClick={handleGenerateCorrectionModel}
              disabled={generatingModel}
            >
              {generatingModel ? 'Génération…' : correctionModel ? 'Régénérer corrigé type (IA)' : 'Générer corrigé type (IA)'}
            </Button>
          </div>
        </details>

        <div className="correction-page__split">
          <div className="correction-page__preview">
            {selected.filePath ? (
              <div className="correction-page__preview-content">
                <div className="correction-page__preview-actions">
                  <Button
                    variant="ghost"
                    size="S"
                    onClick={() => window.open(toPreviewSrc(selected.filePath ?? ''), '_blank', 'noopener,noreferrer')}
                  >
                    Ouvrir
                  </Button>
                </div>
                {previewError ? (
                  <PanelError
                    message="Impossible de charger l'aperçu — vérifiez que le fichier existe et est au format PDF/image."
                    onRetry={() => { setPreviewError(false); setPreviewKey((k) => k + 1); }}
                  />
                ) : (
                  <iframe
                    key={previewKey}
                    className="correction-page__preview-frame"
                    title={`Copie ${selected.name}`}
                    src={toPreviewSrc(selected.filePath)}
                    onError={() => {
                      console.error('[CorrectionSeriePage] Preview iframe error:', selected.filePath);
                      setPreviewError(true);
                    }}
                    onLoad={(e) => {
                      try {
                        const iframe = e.currentTarget;
                        const doc = iframe.contentDocument;
                        if (doc?.title === 'Error' || doc?.body?.textContent?.includes('ERR_FILE_NOT_FOUND')) {
                          console.error('[CorrectionSeriePage] Preview iframe: fichier introuvable', selected.filePath);
                          setPreviewError(true);
                        }
                      } catch {
                        // Cross-origin iframe — cannot inspect, assume OK
                      }
                    }}
                  />
                )}
                <span className="correction-page__preview-path" title={selected.filePath}>
                  {selected.filePath}
                </span>
              </div>
            ) : (
              <div className="correction-page__preview-empty">
                <span className="correction-page__preview-label">Aucun fichier de copie pour cet élève</span>
                <Button variant="secondary" size="S" onClick={handleImportCopy}>Importer copie</Button>
              </div>
            )}
          </div>

          <div className="correction-page__editor">
            <span className="correction-page__editor-title">Correction</span>
            <textarea
              className="correction-page__textarea"
              value={selected.correctionText}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateSelectedStudent((s) => ({
                  ...s,
                  correctionText: nextValue,
                  status: s.status === 'pending' ? 'to_confirm' : s.status,
                }));
              }}
              placeholder="Saisir la correction…"
            />
          </div>
        </div>

        <div className="correction-page__main-actions">
          <Button variant="secondary" size="S" onClick={handleAnalyzeIA} disabled={analyzing}>
            {analyzing ? 'Analyse…' : 'Analyser (IA)'}
          </Button>
          <ActionMenu label="Import & outils ▾" items={[
            { id: 'import-copy', label: 'Importer copie', icon: '📄', onClick: handleImportCopy },
            { id: 'import-bulk', label: 'Importer lot', icon: '📦', onClick: () => setBulkImportOpen(true) },
            { id: 'import-pronote', label: 'Import Pronote', icon: '🔗', onClick: () => setPronoteImportOpen(true) },
            { id: 'import-correction', label: 'Importer correction', icon: '📝', onClick: handleImportCorrection },
            { id: 'grille', label: 'Grille descriptive', icon: '📊', onClick: () => setGrilleModalOpen(true), disabled: !assignmentId, separator: true },
            { id: 'template', label: 'Template correction', icon: '📋', onClick: () => setTemplateModalOpen(true), disabled: !selected },
          ] as ActionMenuItem[]} />
          <Button variant="secondary" size="S" onClick={handleSave}>Sauvegarder</Button>
          <Button variant="primary" size="S" onClick={handleFinalize}>Finaliser</Button>
        </div>
      </Card>
      </ErrorBoundary>

      <ErrorBoundary>
      <Card noHover className="correction-page__skills">
        <h3 className="correction-page__panel-title">Grille compétences</h3>

        {skillLabels.map((skill, idx) => (
          <SkillLevelSelector
            key={skill}
            label={skill}
            value={selected.skillLevels[skill] ?? null}
            onChange={(level) => handleSkillChange(skill, level)}
            className={idx === activeSkillIdx ? 'skill-level--active' : ''}
          />
        ))}

        <div className="correction-page__feedback">
          <div className="correction-page__fb-section">
            <span className="correction-page__fb-title correction-page__fb-title--success">Forces</span>
            {selected.strengths.map((s, i) => (
              <div key={i} className="correction-page__fb-row">
                <input
                  className="correction-page__fb-input"
                  value={s}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateSelectedStudent((st) => ({
                      ...st,
                      strengths: st.strengths.map((x, j) => j === i ? val : x),
                    }));
                  }}
                />
                <button
                  type="button"
                  className="correction-page__fb-remove"
                  onClick={() => updateSelectedStudent((st) => ({
                    ...st,
                    strengths: st.strengths.filter((_, j) => j !== i),
                  }))}
                  title="Supprimer"
                >×</button>
              </div>
            ))}
            <button
              type="button"
              className="correction-page__fb-add"
              onClick={() => updateSelectedStudent((st) => ({ ...st, strengths: [...st.strengths, ''] }))}
            >+ Ajouter</button>
          </div>
          <div className="correction-page__fb-section">
            <span className="correction-page__fb-title correction-page__fb-title--danger">Lacunes</span>
            {selected.weaknesses.map((w, i) => (
              <div key={i} className="correction-page__fb-row">
                <input
                  className="correction-page__fb-input"
                  value={w}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateSelectedStudent((st) => ({
                      ...st,
                      weaknesses: st.weaknesses.map((x, j) => j === i ? val : x),
                    }));
                  }}
                />
                <button
                  type="button"
                  className="correction-page__fb-remove"
                  onClick={() => updateSelectedStudent((st) => ({
                    ...st,
                    weaknesses: st.weaknesses.filter((_, j) => j !== i),
                  }))}
                  title="Supprimer"
                >×</button>
              </div>
            ))}
            <button
              type="button"
              className="correction-page__fb-add"
              onClick={() => updateSelectedStudent((st) => ({ ...st, weaknesses: [...st.weaknesses, ''] }))}
            >+ Ajouter</button>
          </div>
        </div>

        <Button variant="secondary" size="S" fullWidth onClick={handleGenerateFeedbackIA} disabled={analyzing}>
          Générer feedback IA
        </Button>
      </Card>
      </ErrorBoundary>

      </div>
      <div className="correction-page__shortcuts">
        <span>J/K élève - 1-4 niveau - Tab compétence - F finaliser - A analyser IA</span>
      </div>

      {assignment && (
        <BulkCopyImportModal
          open={bulkImportOpen}
          onClose={() => setBulkImportOpen(false)}
          students={students}
          className={assignment?.class_name}
          assignmentTitle={assignment?.title}
          onImported={() => { setBulkImportOpen(false); clearAllCaches(); setLoadKey((k) => k + 1); }}
        />
      )}
      {assignment && (
        <PronoteImportModal
          open={pronoteImportOpen}
          onClose={() => setPronoteImportOpen(false)}
          students={students}
          onImported={() => { setPronoteImportOpen(false); clearAllCaches(); setLoadKey((k) => k + 1); }}
        />
      )}
      {assignmentId && (
        <GrilleDescriptiveModal
          open={grilleModalOpen}
          onClose={() => setGrilleModalOpen(false)}
          assignmentId={assignmentId}
          assignmentTitle={assignment?.title}
        />
      )}
      {selected && assignmentId && (
        <CorrectionTemplateModal
          open={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          submissionId={selected.id}
          assignmentId={assignmentId}
        />
      )}
    </div>
  );
};






