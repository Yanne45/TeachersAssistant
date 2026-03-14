import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button, Tabs, EmptyState, ErrorBoundary, PanelError, AITaskButtons } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import {
  bulletinService,
  orientationService,
  pdfExportService,
  periodProfileService,
  reportPeriodService,
  studentService,
  submissionService,
} from '../../services';
import { useApp, useData, useRouter } from '../../stores';
import { usePageLoadTelemetry, trackCacheHit, trackCacheMiss, useScreenAITasks, AI_SCREEN } from '../../hooks';
import type { ScreenAIContext } from '../../hooks';
import {
  OverviewTabPanel,
  SkillsTabPanel,
  GradesTabPanel,
  CorrectionsTabPanel,
  BulletinsTabPanel,
  ProfileTabPanel,
  OrientationTabPanel,
  DocumentsTabPanel,
} from './fiche-eleve';
import type {
  SkillEvolution,
  GradeRow,
  CorrectionRow,
  ProfileData,
  OrientationReportRow,
  OrientationInterviewRow,
  StudentDocumentRow,
} from './fiche-eleve/types';
import './FicheElevePage.css';

const FALLBACK_STUDENT = {
  lastName: 'DUPONT',
  firstName: 'Lea',
  classLabel: 'Classe',
  birthYear: 2008,
};

const FALLBACK_SKILL_LEVELS: { name: string; level: number }[] = [
  { name: 'Problématiser', level: 3 },
  { name: 'Construire un plan', level: 3 },
  { name: 'Mobiliser connaissances', level: 4 },
  { name: 'Rédaction', level: 3 },
  { name: 'Analyser un document', level: 2 },
];

const FALLBACK_SKILL_EVOLUTION: SkillEvolution[] = [
  { name: 'Problématiser', t1: 2, t2: 3, t3: null },
  { name: 'Construire un plan', t1: 2, t2: 3, t3: null },
  { name: 'Mobiliser connaiss.', t1: 3, t2: 4, t3: null },
  { name: 'Rédaction', t1: 2, t2: 3, t3: null },
  { name: 'Analyser doc.', t1: 2, t2: 2, t3: null },
];

const STUDENT_TABS = [
  { id: 'overview', label: 'Aperçu' },
  { id: 'grades', label: 'Notes' },
  { id: 'corrections', label: 'Corrections' },
  { id: 'skills', label: 'Compétences' },
  { id: 'profile', label: 'Profil' },
  { id: 'bulletins', label: 'Bulletins' },
  { id: 'orientation', label: 'Orientation' },
  { id: 'docs', label: 'Docs' },
];

export const FicheElevePage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { loadStudent, loadSkillEvolution, loadBulletins } = useData();

  const [activeTab, setActiveTab] = useState('skills');
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [student, setStudent] = useState<any | null>(null);
  const [skillEvolution, setSkillEvolution] = useState<SkillEvolution[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [periods, setPeriods] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orientationReports, setOrientationReports] = useState<OrientationReportRow[]>([]);
  const [orientationInterviews, setOrientationInterviews] = useState<OrientationInterviewRow[]>([]);
  const [studentDocuments, setStudentDocuments] = useState<StudentDocumentRow[]>([]);
  const gradesCacheRef = useRef(new Map<string, GradeRow[]>());
  const gradesInflightRef = useRef(new Map<string, Promise<GradeRow[]>>());
  const correctionsCacheRef = useRef(new Map<string, CorrectionRow[]>());
  const correctionsInflightRef = useRef(new Map<string, Promise<CorrectionRow[]>>());
  const bulletinsCacheRef = useRef(new Map<string, any[]>());
  const bulletinsInflightRef = useRef(new Map<string, Promise<any[]>>());
  const profileCacheRef = useRef(new Map<string, ProfileData | null>());
  const profileInflightRef = useRef(new Map<string, Promise<ProfileData | null>>());
  const orientationReportsCacheRef = useRef(new Map<number, OrientationReportRow[]>());
  const orientationReportsInflightRef = useRef(new Map<number, Promise<OrientationReportRow[]>>());
  const orientationInterviewsCacheRef = useRef(new Map<number, OrientationInterviewRow[]>());
  const orientationInterviewsInflightRef = useRef(new Map<number, Promise<OrientationInterviewRow[]>>());
  const documentsCacheRef = useRef(new Map<string, StudentDocumentRow[]>());
  const documentsInflightRef = useRef(new Map<string, Promise<StudentDocumentRow[]>>());

  usePageLoadTelemetry('FicheElevePage', loading);

  const studentIdRaw = Number.parseInt(String(route.entityId ?? ''), 10);
  const studentId = Number.isFinite(studentIdRaw) ? studentIdRaw : null;

  // ── Declarative AI tasks for fiche eleve ──
  // Context is built lazily (via callback) so it reads latest state at execution time
  const getFicheAIContext = useCallback((): ScreenAIContext => ({
    variables: {},  // filled per-task via extraVars in result handler
    contextEntityType: 'student',
    contextEntityId: studentId ?? undefined,
  }), [studentId]);

  const { actions: ficheAIActions, generatingCode: ficheAIGenerating } = useScreenAITasks(AI_SCREEN.FICHE_ELEVE, getFicheAIContext);

  const gradeCacheKey = (id: number, limit: number) => `${id}:${limit}`;
  const profileCacheKey = (id: number, periodId: number) => `${id}:${periodId}`;
  const bulletinCacheKey = (id: number, periodId: number) => `${id}:${periodId}`;
  const documentsCacheKey = (id: number, periodId: number | null) => `${id}:${periodId ?? 'all'}`;

  const clearAllCaches = useCallback(() => {
    gradesCacheRef.current.clear();
    gradesInflightRef.current.clear();
    correctionsCacheRef.current.clear();
    correctionsInflightRef.current.clear();
    bulletinsCacheRef.current.clear();
    bulletinsInflightRef.current.clear();
    profileCacheRef.current.clear();
    profileInflightRef.current.clear();
    orientationReportsCacheRef.current.clear();
    orientationReportsInflightRef.current.clear();
    orientationInterviewsCacheRef.current.clear();
    orientationInterviewsInflightRef.current.clear();
    documentsCacheRef.current.clear();
    documentsInflightRef.current.clear();
  }, []);

  const getRecentGradesCached = useCallback((id: number, limit: number) => {
    const key = gradeCacheKey(id, limit);
    const cached = gradesCacheRef.current.get(key);
    if (cached) { trackCacheHit('ficheGrades'); return Promise.resolve(cached); }

    const inflight = gradesInflightRef.current.get(key);
    if (inflight) return inflight;

    trackCacheMiss('ficheGrades');
    const request = studentService.getRecentGrades(id, limit)
      .then((rows) => {
        const typedRows = rows as GradeRow[];
        gradesCacheRef.current.set(key, typedRows);
        return typedRows;
      })
      .finally(() => {
        gradesInflightRef.current.delete(key);
      });

    gradesInflightRef.current.set(key, request);
    return request;
  }, []);

  const getCorrectionsCached = useCallback((id: number, limit: number) => {
    const key = gradeCacheKey(id, limit);
    const cached = correctionsCacheRef.current.get(key);
    if (cached) return Promise.resolve(cached);

    const inflight = correctionsInflightRef.current.get(key);
    if (inflight) return inflight;

    const request = submissionService.getByStudent(id, limit)
      .then((rows) => rows.map((row: any) => ({
        id: row.id,
        assignment_id: row.assignment_id,
        assignment_title: row.assignment_title,
        assignment_date: row.assignment_date,
        score: row.score,
        max_score: row.max_score,
        status: row.status,
      })) as CorrectionRow[])
      .then((rows) => {
        correctionsCacheRef.current.set(key, rows);
        return rows;
      })
      .finally(() => {
        correctionsInflightRef.current.delete(key);
      });

    correctionsInflightRef.current.set(key, request);
    return request;
  }, []);

  const getBulletinsCached = useCallback((id: number, periodId: number) => {
    const key = bulletinCacheKey(id, periodId);
    const cached = bulletinsCacheRef.current.get(key);
    if (cached) return Promise.resolve(cached);

    const inflight = bulletinsInflightRef.current.get(key);
    if (inflight) return inflight;

    const request = loadBulletins(id, periodId)
      .then((rows) => {
        bulletinsCacheRef.current.set(key, rows);
        return rows;
      })
      .finally(() => {
        bulletinsInflightRef.current.delete(key);
      });

    bulletinsInflightRef.current.set(key, request);
    return request;
  }, [loadBulletins]);

  const getProfileCached = useCallback((id: number, periodId: number) => {
    const key = profileCacheKey(id, periodId);
    const cached = profileCacheRef.current.get(key);
    if (cached !== undefined) return Promise.resolve(cached);

    const inflight = profileInflightRef.current.get(key);
    if (inflight) return inflight;

    const request = periodProfileService.get(id, periodId)
      .then((data) => (data
        ? {
            behavior: data.behavior,
            work_ethic: data.work_ethic,
            participation: data.participation,
            autonomy: data.autonomy,
            methodology: data.methodology,
            notes: data.notes,
          }
        : null))
      .then((mapped) => {
        profileCacheRef.current.set(key, mapped);
        return mapped;
      })
      .finally(() => {
        profileInflightRef.current.delete(key);
      });

    profileInflightRef.current.set(key, request);
    return request;
  }, []);

  const getOrientationReportsCached = useCallback((id: number) => {
    const cached = orientationReportsCacheRef.current.get(id);
    if (cached) return Promise.resolve(cached);

    const inflight = orientationReportsInflightRef.current.get(id);
    if (inflight) return inflight;

    const request = orientationService.getReports(id)
      .then((rows) => rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        created_at: r.created_at,
      })) as OrientationReportRow[])
      .then((rows) => {
        orientationReportsCacheRef.current.set(id, rows);
        return rows;
      })
      .finally(() => {
        orientationReportsInflightRef.current.delete(id);
      });

    orientationReportsInflightRef.current.set(id, request);
    return request;
  }, []);

  const getOrientationInterviewsCached = useCallback((id: number) => {
    const cached = orientationInterviewsCacheRef.current.get(id);
    if (cached) return Promise.resolve(cached);

    const inflight = orientationInterviewsInflightRef.current.get(id);
    if (inflight) return inflight;

    const request = orientationService.getInterviews(id)
      .then((rows) => rows.map((i: any) => ({
        id: i.id,
        interview_date: i.interview_date,
        summary: i.summary,
        decisions: i.decisions,
        next_steps: i.next_steps,
      })) as OrientationInterviewRow[])
      .then((rows) => {
        orientationInterviewsCacheRef.current.set(id, rows);
        return rows;
      })
      .finally(() => {
        orientationInterviewsInflightRef.current.delete(id);
      });

    orientationInterviewsInflightRef.current.set(id, request);
    return request;
  }, []);

  const getDocumentsCached = useCallback((id: number, periodId: number | null) => {
    const key = documentsCacheKey(id, periodId);
    const cached = documentsCacheRef.current.get(key);
    if (cached) return Promise.resolve(cached);

    const inflight = documentsInflightRef.current.get(key);
    if (inflight) return inflight;

    const request = studentService.getDocuments(id, periodId)
      .then((rows) => rows as StudentDocumentRow[])
      .then((rows) => {
        documentsCacheRef.current.set(key, rows);
        return rows;
      })
      .finally(() => {
        documentsInflightRef.current.delete(key);
      });

    documentsInflightRef.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    clearAllCaches();
  }, [activeYear?.id, clearAllCaches]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const [studentData, evolutionData, gradeRows, periodRows, correctionRows] = await Promise.all([
          loadStudent(studentId),
          loadSkillEvolution(studentId),
          getRecentGradesCached(studentId, 20),
          activeYear ? reportPeriodService.getByYear(activeYear.id) : Promise.resolve([]),
          getCorrectionsCached(studentId, 20),
        ]);

        if (cancelled) return;
        setStudent(studentData);
        setGrades(gradeRows);
        setSkillEvolution(
          (evolutionData ?? []).map((row: any) => ({
            name: row.skill_label,
            t1: row.t1 ?? null,
            t2: row.t2 ?? null,
            t3: row.t3 ?? null,
          })),
        );

        const mappedPeriods = (periodRows ?? []).map((p: any) => ({
          id: p.id,
          label: p.label ?? p.code ?? `Période ${p.id}`,
        }));
        setPeriods(mappedPeriods);
        setSelectedPeriodId((prev) => prev ?? mappedPeriods[0]?.id ?? null);

        setCorrections(correctionRows);
      } catch (error) {
        console.error('[FicheElevePage] Erreur chargement:', error);
        if (!cancelled) setLoadError('Impossible de charger les données de l\'élève.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [studentId, activeYear, loadSkillEvolution, loadStudent, getRecentGradesCached, getCorrectionsCached, loadKey]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!studentId || !selectedPeriodId) {
        setBulletins([]);
        return;
      }

      try {
        const rows = await getBulletinsCached(studentId, selectedPeriodId);
        if (!cancelled) setBulletins(rows);
      } catch (error) {
        console.error('[FicheElevePage] Erreur chargement bulletins:', error);
        if (!cancelled) setBulletins([]);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [studentId, selectedPeriodId, getBulletinsCached]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!studentId || !selectedPeriodId) {
        setProfile(null);
        return;
      }

      try {
        const data = await getProfileCached(studentId, selectedPeriodId);
        if (cancelled) return;
        setProfile(data);
      } catch (error) {
        console.error('[FicheElevePage] Erreur chargement profil:', error);
        if (!cancelled) setProfile(null);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [studentId, selectedPeriodId, getProfileCached]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!studentId) {
        setOrientationReports([]);
        setOrientationInterviews([]);
        return;
      }

      try {
        const [reports, interviews] = await Promise.all([
          getOrientationReportsCached(studentId),
          getOrientationInterviewsCached(studentId),
        ]);
        if (cancelled) return;
        setOrientationReports(reports);
        setOrientationInterviews(interviews);
      } catch (error) {
        console.error('[FicheElevePage] Erreur chargement orientation:', error);
        if (!cancelled) {
          setOrientationReports([]);
          setOrientationInterviews([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [studentId, getOrientationReportsCached, getOrientationInterviewsCached]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!studentId) {
        setStudentDocuments([]);
        return;
      }

      try {
        const rows = await getDocumentsCached(studentId, selectedPeriodId);
        if (!cancelled) {
          setStudentDocuments(rows);
        }
      } catch (error) {
        console.error('[FicheElevePage] Erreur chargement documents:', error);
        if (!cancelled) setStudentDocuments([]);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [studentId, selectedPeriodId, getDocumentsCached]);

  const displayedStudent = useMemo(() => {
    if (!student) return FALLBACK_STUDENT;
    return {
      lastName: student.last_name ?? FALLBACK_STUDENT.lastName,
      firstName: student.first_name ?? FALLBACK_STUDENT.firstName,
      classLabel: student.class_name ?? FALLBACK_STUDENT.classLabel,
      birthYear: student.birth_year ?? FALLBACK_STUDENT.birthYear,
    };
  }, [student]);

  const displayedEvolution = skillEvolution.length > 0 ? skillEvolution : FALLBACK_SKILL_EVOLUTION;

  const displayedSkillLevels = useMemo(() => {
    if (displayedEvolution.length === 0) return FALLBACK_SKILL_LEVELS;
    return displayedEvolution.map((s) => ({
      name: s.name,
      level: s.t3 ?? s.t2 ?? s.t1 ?? 1,
    }));
  }, [displayedEvolution]);

  const gradesAverage = useMemo(() => {
    if (grades.length === 0) return null;
    const values = grades.map((g) => g.score ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }, [grades]);

  const latestGrade = grades[0] ?? null;
  const latestCorrection = corrections[0] ?? null;
  const latestBulletin = bulletins[0] ?? null;
  const latestOrientationReport = orientationReports[0] ?? null;
  const latestDocument = studentDocuments[0] ?? null;
  const finalizedCorrections = corrections.filter((row) => row.status === 'final').length;
  const currentPeriodLabel = periods.find((p) => p.id === selectedPeriodId)?.label ?? 'Période active';

  const handleExportPDF = async () => {
    if (!studentId) {
      addToast('warn', 'Aucun élève sélectionné');
      return;
    }
    setExportingPdf(true);
    try {
      const html = await pdfExportService.buildFicheEleveHTML(studentId);
      if (!html.trim()) {
        addToast('error', 'Aperçu PDF vide');
        return;
      }
      setPdfHtml(html);
    } catch (error) {
      console.error('[FicheElevePage] Erreur export PDF:', error);
      addToast('error', 'Erreur génération PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  /** Build shared student variables for AI tasks */
  const getStudentAIVars = useCallback((): Record<string, string> => {
    const notesBlock = grades
      .slice(0, 8)
      .map((g) => `${g.assignment_title}: ${g.score?.toFixed(1) ?? '-'} / ${g.max_score}`)
      .join(', ');
    const skillsBlock = displayedSkillLevels
      .map((s) => `${s.name}: ${s.level}/4`)
      .join(', ');
    return {
      prenom_eleve: displayedStudent.firstName,
      nom_eleve: displayedStudent.lastName,
      matiere: student?.class_name ?? 'Classe',
      classe: student?.class_name ?? '',
      comportement: profile?.behavior ? `${profile.behavior}/5` : 'non renseigné',
      travail: profile?.work_ethic ? `${profile.work_ethic}/5` : 'non renseigné',
      participation: profile?.participation ? `${profile.participation}/5` : 'non renseigné',
      competences_recentes: skillsBlock || 'pas de données',
      notes_recentes: notesBlock || 'pas de données',
    };
  }, [grades, displayedSkillLevels, displayedStudent, student, profile]);

  /** Handle AI result — page-specific post-processing */
  const handleFicheAIResult = useCallback(async (taskCode: string, result: any) => {
    if ('queued' in result) { addToast('info', 'Ajouté à la file d\'attente'); return; }
    const content = String(result?.output_content ?? result?.processed_result ?? '').trim();

    if (taskCode === 'generate_appreciation' || taskCode === 'generate_pp_appreciation') {
      if (!content || !studentId || !selectedPeriodId) {
        addToast('warn', 'Génération vide');
        return;
      }
      const entryType = taskCode === 'generate_pp_appreciation' ? 'class_teacher' : 'class_teacher';
      const existing = bulletins.find((b) => b.entry_type === entryType);
      if (existing?.id) {
        await bulletinService.update(existing.id, content, 'ai');
      } else {
        await bulletinService.create({
          student_id: studentId,
          report_period_id: selectedPeriodId,
          entry_type: entryType,
          subject_id: null,
          content,
          status: 'draft',
          source: 'ai',
        });
      }
      const bulletinKey = bulletinCacheKey(studentId, selectedPeriodId);
      bulletinsCacheRef.current.delete(bulletinKey);
      bulletinsInflightRef.current.delete(bulletinKey);
      const refreshed = await getBulletinsCached(studentId, selectedPeriodId);
      setBulletins(refreshed);
      setActiveTab('bulletins');
      addToast('success', 'Appréciation générée et enregistrée');
    } else {
      if (content) {
        addToast('success', `${taskCode} — voir Historique IA`);
      } else {
        addToast('warn', 'Génération vide');
      }
    }
  }, [studentId, selectedPeriodId, bulletins, addToast, getBulletinsCached]);

  const handleShowBulletinT2 = useCallback(() => {
    const t2 = periods.find(
      (p) => /(^|[^0-9])2([^0-9]|$)/i.test(p.label) || /\bT2\b/i.test(p.label) || /trimestre 2/i.test(p.label),
    );

    if (t2) {
      setSelectedPeriodId(t2.id);
      setActiveTab('bulletins');
      return;
    }

    setActiveTab('bulletins');
    addToast('info', "Période T2 non trouvée, affichage de la période active");
  }, [periods, addToast]);

  if (loading) {
    return <p className="fiche-eleve__loading">Chargement…</p>;
  }

  if (loadError) {
    return (
      <div className="fiche-eleve fiche-eleve--padded">
        <PanelError
          message={loadError}
          onRetry={() => { setLoadError(null); setLoadKey((k) => k + 1); }}
        />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="fiche-eleve">
        <EmptyState
          icon="👤"
          title="Aucun élève sélectionné"
          description="Choisissez un élève depuis la liste pour ouvrir sa fiche."
        />
      </div>
    );
  }

  return (
    <div className="fiche-eleve">
      <div className="fiche-eleve__header">
        <div className="fiche-eleve__avatar">👤</div>
        <div className="fiche-eleve__info">
          <h1 className="fiche-eleve__name">
            {displayedStudent.lastName} {displayedStudent.firstName} - {displayedStudent.classLabel}
          </h1>
          <span className="fiche-eleve__sub">Né(e) en {displayedStudent.birthYear}</span>
        </div>
        <div className="fiche-eleve__badges">
          <Badge variant="success">T1 OK</Badge>
          <Badge variant="warn">Cahier</Badge>
          <Button variant="secondary" size="S" onClick={handleExportPDF} loading={exportingPdf}>Export PDF</Button>
        </div>
      </div>

      <Tabs tabs={STUDENT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <ErrorBoundary>
        <OverviewTabPanel
          gradesAverage={gradesAverage}
          finalizedCorrections={finalizedCorrections}
          correctionsCount={corrections.length}
          skillLevelsCount={displayedSkillLevels.length}
          studentDocumentsCount={studentDocuments.length}
          latestGrade={latestGrade}
          latestCorrection={latestCorrection}
          latestBulletin={latestBulletin}
          currentPeriodLabel={currentPeriodLabel}
          latestOrientationReport={latestOrientationReport}
          latestDocument={latestDocument}
          onNavigateGrades={() => setActiveTab('grades')}
          onNavigateCorrections={() => setActiveTab('corrections')}
          onNavigateProfile={() => setActiveTab('profile')}
          onNavigateDocs={() => setActiveTab('docs')}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'skills' && (
        <ErrorBoundary>
        <SkillsTabPanel
          skillLevels={displayedSkillLevels}
          skillEvolution={displayedEvolution}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'grades' && (
        <ErrorBoundary>
        <GradesTabPanel
          gradesAverage={gradesAverage}
          grades={grades}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'corrections' && (
        <ErrorBoundary>
        <CorrectionsTabPanel
          corrections={corrections}
          onOpenAssignment={(assignmentId) => navigate({ tab: 'evaluation', page: 'correction-serie', entityId: assignmentId })}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'bulletins' && (
        <ErrorBoundary>
        <BulletinsTabPanel
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          bulletins={bulletins}
          onPeriodChange={setSelectedPeriodId}
          onEdit={async (b, content) => {
            await bulletinService.update(b.id, content, 'manual');
            if (studentId && selectedPeriodId) {
              const key = bulletinCacheKey(studentId, selectedPeriodId);
              bulletinsCacheRef.current.delete(key);
              bulletinsInflightRef.current.delete(key);
              const refreshed = await getBulletinsCached(studentId, selectedPeriodId);
              setBulletins(refreshed);
            }
            addToast('success', 'Appréciation modifiée');
          }}
          onDelete={async (id) => {
            await bulletinService.delete(id);
            if (studentId && selectedPeriodId) {
              const key = bulletinCacheKey(studentId, selectedPeriodId);
              bulletinsCacheRef.current.delete(key);
              bulletinsInflightRef.current.delete(key);
              const refreshed = await getBulletinsCached(studentId, selectedPeriodId);
              setBulletins(refreshed);
            }
            addToast('success', 'Appréciation supprimée');
          }}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'profile' && (
        <ErrorBoundary>
        <ProfileTabPanel
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          profile={profile}
          onPeriodChange={setSelectedPeriodId}
          onSave={async (data) => {
            if (!studentId || !selectedPeriodId) return;
            await periodProfileService.upsert(studentId, selectedPeriodId, data);
            const key = profileCacheKey(studentId, selectedPeriodId);
            profileCacheRef.current.delete(key);
            profileInflightRef.current.delete(key);
            const refreshed = await getProfileCached(studentId, selectedPeriodId);
            setProfile(refreshed);
            addToast('success', 'Profil enregistré');
          }}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'orientation' && (
        <ErrorBoundary>
        <OrientationTabPanel
          orientationReports={orientationReports}
          orientationInterviews={orientationInterviews}
          onDeleteReport={async (id) => {
            await orientationService.deleteReport(id);
            if (studentId) {
              orientationReportsCacheRef.current.delete(studentId);
              orientationReportsInflightRef.current.delete(studentId);
              const refreshed = await getOrientationReportsCached(studentId);
              setOrientationReports(refreshed);
            }
            addToast('success', 'Rapport supprimé');
          }}
          onDeleteInterview={async (id) => {
            await orientationService.deleteInterview(id);
            if (studentId) {
              orientationInterviewsCacheRef.current.delete(studentId);
              orientationInterviewsInflightRef.current.delete(studentId);
              const refreshed = await getOrientationInterviewsCached(studentId);
              setOrientationInterviews(refreshed);
            }
            addToast('success', 'Entretien supprimé');
          }}
        />
        </ErrorBoundary>
      )}

      {activeTab === 'docs' && (
        <ErrorBoundary>
        <DocumentsTabPanel
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          studentDocuments={studentDocuments}
          onPeriodChange={setSelectedPeriodId}
          onUnlink={async (studentDocumentId) => {
            await studentService.unlinkDocument(studentDocumentId);
            if (studentId) {
              const key = documentsCacheKey(studentId, selectedPeriodId);
              documentsCacheRef.current.delete(key);
              documentsInflightRef.current.delete(key);
              const refreshed = await getDocumentsCached(studentId, selectedPeriodId);
              setStudentDocuments(refreshed);
            }
            addToast('success', 'Document délié');
          }}
        />
        </ErrorBoundary>
      )}

      {activeTab !== 'overview' && activeTab !== 'skills' && activeTab !== 'grades' && activeTab !== 'corrections' && activeTab !== 'bulletins' && activeTab !== 'profile' && activeTab !== 'orientation' && activeTab !== 'docs' && (
        <Card noHover className="fiche-eleve__placeholder">
          <span className="fiche-eleve__placeholder-text">
            Onglet "{STUDENT_TABS.find((t) => t.id === activeTab)?.label}" - à implémenter
          </span>
        </Card>
      )}

      <div className="fiche-eleve__actions">
        <AITaskButtons
          actions={ficheAIActions}
          size="M"
          extraVars={getStudentAIVars()}
          disabled={ficheAIGenerating !== null || !studentId || !selectedPeriodId}
          onResult={(code, result) => void handleFicheAIResult(code, result)}
          onError={(code) => addToast('error', `Échec ${code}`)}
        />
        <Button variant="secondary" size="M" onClick={handleShowBulletinT2}>Voir bulletin T2</Button>
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Fiche élève"
        filename={`fiche-${displayedStudent.lastName}-${displayedStudent.firstName}.html`}
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};






