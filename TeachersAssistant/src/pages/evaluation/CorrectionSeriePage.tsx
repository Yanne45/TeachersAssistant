import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Button, SkillLevelSelector, EmptyState } from '../../components/ui';
import {
  assignmentService,
  correctionService,
  feedbackService,
  skillEvaluationService,
  smartCorrect,
  submissionService,
} from '../../services';
import { useCorrectionShortcuts } from '../../hooks';
import { useApp, useData, useRouter } from '../../stores';
import type { CorrectionAIResult } from '../../services';
import './CorrectionSeriePage.css';

interface SkillDef {
  id: number | null;
  label: string;
}

interface StudentSubmission {
  id: number;
  name: string;
  score: number | null;
  status: 'final' | 'to_confirm' | 'ai_processing' | 'pending';
  filePath: string | null;
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

const MOCK_STUDENTS: StudentSubmission[] = [
  {
    id: 1,
    name: 'DUPONT Lea',
    score: 14,
    status: 'final',
    filePath: null,
    skillLevels: { Problematise: 3, 'Construire un plan': 3, 'Mobiliser connaissances': 4, Redaction: 3, 'Analyser doc.': 2 },
    strengths: ['Bonne maitrise des connaissances', 'Introduction bien construite'],
    weaknesses: ['Analyse de documents trop superficielle'],
    correctionText: 'Bon travail dans l\'ensemble.',
  },
  {
    id: 2,
    name: 'MARTIN Lucas',
    score: 11,
    status: 'to_confirm',
    filePath: null,
    skillLevels: { Problematise: 2, 'Construire un plan': 2, 'Mobiliser connaissances': 3, Redaction: 2, 'Analyser doc.': 2 },
    strengths: ['Connaissances presentes'],
    weaknesses: ['Plan desequilibre', 'Transitions absentes'],
    correctionText: 'Le plan manque de coherence.',
  },
];

const STATUS_ICONS: Record<StudentSubmission['status'], string> = {
  final: 'OK',
  to_confirm: '!',
  ai_processing: '...',
  pending: '-',
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
  const { route } = useRouter();
  const { loadSubmissions } = useData();

  const [skills, setSkills] = useState<SkillDef[]>(DEFAULT_SKILLS);
  const [students, setStudents] = useState<StudentSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
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
    if (cached) return cached;

    const inflight = submissionDetailsInflightRef.current.get(submissionId);
    if (inflight) return inflight;

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

  const updateSelectedStudent = (updater: (student: StudentSubmission) => StudentSubmission) => {
    if (selectedId === null) return;
    setStudents((prev) => prev.map((s) => (s.id === selectedId ? updater(s) : s)));
  };

  useEffect(() => {
    clearAllCaches();
  }, [assignmentId, clearAllCaches]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      if (!assignmentId) {
        if (!cancelled) {
          setSkills(DEFAULT_SKILLS);
          setStudents(MOCK_STUDENTS);
          setSelectedId(MOCK_STUDENTS[0]?.id ?? null);
          setLoading(false);
        }
        return;
      }

      try {
        const loadedSkills = await getAssignmentSkillsCached(assignmentId);
        const submissions = await getAssignmentSubmissionsCached(assignmentId);

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
            status,
            filePath: submission.file_path ?? null,
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
          addToast('error', 'Impossible de charger les copies');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, addToast, getAssignmentSkillsCached, getAssignmentSubmissionsCached, getSubmissionDetailsCached]);

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

    if (trimmedCorrection) {
      await correctionService.create(selected.id, trimmedCorrection, 'manual');
    }

    for (const skill of skills) {
      if (!skill.id) continue;
      const level = selected.skillLevels[skill.label];
      if (level === null || level === undefined) continue;
      await skillEvaluationService.upsert(selected.id, skill.id, level, 'manual');
    }

    await feedbackService.deleteBySubmission(selected.id);

    for (const content of selected.strengths.map((x) => x.trim()).filter(Boolean)) {
      await feedbackService.create(selected.id, 'strength', content, 'manual');
    }
    for (const content of selected.weaknesses.map((x) => x.trim()).filter(Boolean)) {
      await feedbackService.create(selected.id, 'weakness', content, 'manual');
    }

    if (finalize) {
      await submissionService.updateStatus(selected.id, 'final');
      updateSelectedStudent((s) => ({ ...s, status: 'final' }));
    } else if (selected.status === 'pending') {
      await submissionService.updateStatus(selected.id, 'to_confirm');
      updateSelectedStudent((s) => ({ ...s, status: 'to_confirm' }));
    }

    invalidateSubmissionCache(selected.id);
  };

  const handleFinalize = async () => {
    if (!selected) return;
    try {
      await persistCurrentSubmission(true);
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
      addToast('success', 'Sauvegarde effectuée');
    } catch (error) {
      console.error('[CorrectionSeriePage] Erreur sauvegarde:', error);
      addToast('error', 'Échec de sauvegarde');
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
        status: 'to_confirm',
      }));
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
    return <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement...</p>;
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

  return (
    <div className="correction-page">
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

      <Card noHover className="correction-page__main">
        <div className="correction-page__main-header">
          <div>
            <span className="correction-page__student-name">{selected.name}</span>
            <span className="correction-page__student-score">Note: {selected.score !== null ? `${selected.score}/20` : '-'}</span>
          </div>
          <div className="correction-page__nav">
            <Button variant="ghost" size="S" onClick={goPrev}>Préc.</Button>
            <Button variant="ghost" size="S" onClick={goNext}>Suiv.</Button>
          </div>
        </div>

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
                <iframe
                  className="correction-page__preview-frame"
                  title={`Copie ${selected.name}`}
                  src={toPreviewSrc(selected.filePath)}
                />
                <span className="correction-page__preview-path" title={selected.filePath}>
                  {selected.filePath}
                </span>
              </div>
            ) : (
              <span className="correction-page__preview-label">Aucun fichier de copie pour cet élève</span>
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
              placeholder="Saisir la correction..."
            />
          </div>
        </div>

        <div className="correction-page__main-actions">
          <Button variant="secondary" size="S" onClick={handleAnalyzeIA} disabled={analyzing}>
            {analyzing ? 'Analyse...' : 'Analyser (IA)'}
          </Button>
          <Button variant="secondary" size="S" onClick={handleImportCorrection}>Importer correction</Button>
          <Button variant="secondary" size="S" onClick={handleSave}>Sauvegarder</Button>
          <Button variant="primary" size="S" onClick={handleFinalize}>Finaliser</Button>
        </div>
      </Card>

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
              <span key={i} className="correction-page__fb-item">- {s}</span>
            ))}
            {selected.strengths.length === 0 && <span className="correction-page__fb-empty">-</span>}
          </div>
          <div className="correction-page__fb-section">
            <span className="correction-page__fb-title correction-page__fb-title--danger">Lacunes</span>
            {selected.weaknesses.map((w, i) => (
              <span key={i} className="correction-page__fb-item">- {w}</span>
            ))}
            {selected.weaknesses.length === 0 && <span className="correction-page__fb-empty">-</span>}
          </div>
        </div>

        <Button variant="secondary" size="S" fullWidth onClick={handleGenerateFeedbackIA} disabled={analyzing}>
          Générer feedback IA
        </Button>
      </Card>

      <div className="correction-page__shortcuts">
        <span>J/K élève - 1-4 niveau - Tab compétence - F finaliser - A analyser IA</span>
      </div>
    </div>
  );
};






