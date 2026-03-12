import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button, SegmentedBar, Tabs, EmptyState, PanelError } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import {
  aiGenerationService,
  bulletinService,
  orientationService,
  pdfExportService,
  periodProfileService,
  reportPeriodService,
  studentService,
  submissionService,
} from '../../services';
import { useApp, useData, useRouter } from '../../stores';
import './FicheElevePage.css';

interface SkillEvolution {
  name: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
}

interface GradeRow {
  submission_id: number;
  assignment_id: number;
  assignment_title: string;
  assignment_date: string | null;
  score: number | null;
  max_score: number;
}

interface CorrectionRow {
  id: number;
  assignment_id: number;
  assignment_title: string;
  assignment_date: string | null;
  score: number | null;
  max_score: number;
  status: 'final' | 'to_confirm' | 'ai_processing' | 'pending';
}

interface ProfileData {
  behavior: number | null;
  work_ethic: number | null;
  participation: number | null;
  autonomy: number | null;
  methodology: number | null;
  notes: string | null;
}

interface OrientationReportRow {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface OrientationInterviewRow {
  id: number;
  interview_date: string;
  summary: string;
  decisions: string | null;
  next_steps: string | null;
}

interface StudentDocumentRow {
  id: number;
  document_id: number;
  report_period_id: number | null;
  label: string | null;
  document_title: string;
  file_path: string;
  file_name: string;
  file_type: string;
  document_type_label: string | null;
  subject_label: string | null;
  period_label: string | null;
}

const FALLBACK_STUDENT = {
  lastName: 'DUPONT',
  firstName: 'Lea',
  classLabel: 'Classe',
  birthYear: 2008,
};

const FALLBACK_SKILL_LEVELS: { name: string; level: number }[] = [
  { name: 'Problematiser', level: 3 },
  { name: 'Construire un plan', level: 3 },
  { name: 'Mobiliser connaissances', level: 4 },
  { name: 'Redaction', level: 3 },
  { name: 'Analyser un document', level: 2 },
];

const FALLBACK_SKILL_EVOLUTION: SkillEvolution[] = [
  { name: 'Problematiser', t1: 2, t2: 3, t3: null },
  { name: 'Construire un plan', t1: 2, t2: 3, t3: null },
  { name: 'Mobiliser connaiss.', t1: 3, t2: 4, t3: null },
  { name: 'Redaction', t1: 2, t2: 3, t3: null },
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

function levelColor(level: number | null) {
  if (level === null) return { bg: 'var(--color-bg)', text: 'var(--color-text-muted)' };
  if (level >= 3) return { bg: 'rgba(126,217,87,0.20)', text: 'var(--color-success)' };
  if (level === 2) return { bg: 'rgba(245,166,35,0.20)', text: 'var(--color-warn)' };
  return { bg: 'rgba(231,76,60,0.20)', text: 'var(--color-danger)' };
}

function trend(first: number | null, last: number | null) {
  if (first === null || last === null) return { arrow: '-', color: 'var(--color-text-muted)' };
  if (last > first) return { arrow: '↑', color: 'var(--color-success)' };
  if (last < first) return { arrow: '↓', color: 'var(--color-danger)' };
  return { arrow: '→', color: 'var(--color-text-muted)' };
}

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

export const FicheElevePage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { loadStudent, loadSkillEvolution, loadBulletins } = useData();

  const [activeTab, setActiveTab] = useState('skills');
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
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

  const studentIdRaw = Number.parseInt(String(route.entityId ?? ''), 10);
  const studentId = Number.isFinite(studentIdRaw) ? studentIdRaw : null;
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
    if (cached) return Promise.resolve(cached);

    const inflight = gradesInflightRef.current.get(key);
    if (inflight) return inflight;

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
    }
  };

  const handleGenerateAppreciation = async () => {
    if (!studentId || !selectedPeriodId) {
      addToast('warn', 'Sélectionnez un élève et une période');
      return;
    }

    const notesBlock = grades
      .slice(0, 8)
      .map((g) => `${g.assignment_title}: ${g.score?.toFixed(1) ?? '-'} / ${g.max_score}`)
      .join(', ');
    const skillsBlock = displayedSkillLevels
      .map((s) => `${s.name}: ${s.level}/4`)
      .join(', ');

    try {
      const gen = await aiGenerationService.generate({
        taskCode: 'generate_appreciation',
        variables: {
          prenom_eleve: displayedStudent.firstName,
          nom_eleve: displayedStudent.lastName,
          matiere: student?.class_name ?? 'Classe',
          comportement: profile?.behavior ? `${profile.behavior}/5` : 'non renseigne',
          travail: profile?.work_ethic ? `${profile.work_ethic}/5` : 'non renseigne',
          participation: profile?.participation ? `${profile.participation}/5` : 'non renseigne',
          competences_recentes: skillsBlock || 'pas de donnees',
          notes_recentes: notesBlock || 'pas de donnees',
        },
        contextEntityType: 'student',
        contextEntityId: studentId,
      });

      const content = String(gen?.output_content ?? gen?.processed_result ?? '').trim();
      if (!content) {
        addToast('error', 'Génération vide');
        return;
      }

      const existing = bulletins.find((b) => b.entry_type === 'class_teacher');
      if (existing?.id) {
        await bulletinService.update(existing.id, content, 'ai');
      } else {
        await bulletinService.create({
          student_id: studentId,
          report_period_id: selectedPeriodId,
          entry_type: 'class_teacher',
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
    } catch (error) {
      console.error('[FicheElevePage] Erreur generation appreciation:', error);
      addToast('error', "Échec génération appréciation");
    }
  };

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
    return <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement...</p>;
  }

  if (loadError) {
    return (
      <div className="fiche-eleve" style={{ padding: 20 }}>
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
          <Button variant="secondary" size="S" onClick={handleExportPDF}>Export PDF</Button>
        </div>
      </div>

      <Tabs tabs={STUDENT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="fiche-eleve__skills">
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Synthèse</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <div style={{ padding: '10px 12px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Moyenne récente</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{gradesAverage !== null ? gradesAverage.toFixed(1) : '-'}</div>
              </div>
              <div style={{ padding: '10px 12px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Copies finalisées</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{finalizedCorrections}/{corrections.length}</div>
              </div>
              <div style={{ padding: '10px 12px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Compétences suivies</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{displayedSkillLevels.length}</div>
              </div>
              <div style={{ padding: '10px 12px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Documents liés</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{studentDocuments.length}</div>
              </div>
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Derniers éléments</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Dernière note</div>
                {latestGrade ? (
                  <div style={{ fontSize: 12 }}>
                    {latestGrade.assignment_title} - {latestGrade.score?.toFixed(1) ?? '-'} / {latestGrade.max_score}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune note.</span>
                )}
              </div>

              <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Dernière correction</div>
                {latestCorrection ? (
                  <div style={{ fontSize: 12 }}>
                    {latestCorrection.assignment_title} - statut: {latestCorrection.status}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune copie.</span>
                )}
              </div>

              <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Bulletin ({currentPeriodLabel})
                </div>
                {latestBulletin ? (
                  <div style={{ fontSize: 12 }}>
                    {latestBulletin.entry_type} - {latestBulletin.status}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucune entrée bulletin.</span>
                )}
              </div>

              <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Dernier rapport orientation</div>
                {latestOrientationReport ? (
                  <div style={{ fontSize: 12 }}>
                    {latestOrientationReport.title || `Rapport #${latestOrientationReport.id}`}
                  </div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucun rapport.</span>
                )}
              </div>

              <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Dernier document</div>
                {latestDocument ? (
                  <div style={{ fontSize: 12 }}>{latestDocument.label || latestDocument.document_title}</div>
                ) : (
                  <span className="fiche-eleve__placeholder-text">Aucun document.</span>
                )}
              </div>
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Accès rapide</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button variant="secondary" size="S" onClick={() => setActiveTab('grades')}>Voir notes</Button>
              <Button variant="secondary" size="S" onClick={() => setActiveTab('corrections')}>Voir corrections</Button>
              <Button variant="secondary" size="S" onClick={() => setActiveTab('profile')}>Voir profil</Button>
              <Button variant="secondary" size="S" onClick={() => setActiveTab('docs')}>Voir docs</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="fiche-eleve__skills">
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Niveau actuel par compétence</h3>
            <div className="fiche-eleve__skill-list">
              {displayedSkillLevels.map((s) => (
                <div key={s.name} className="skill-current">
                  <div className="skill-current__header">
                    <span className="skill-current__name">{s.name}</span>
                    <span className="skill-current__score">{s.level}/4</span>
                  </div>
                  <SegmentedBar level={s.level} maxLevel={4} height={8} />
                </div>
              ))}
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Évolution sur l'année</h3>
            <div className="fiche-eleve__period-badges">
              <Badge variant="filter" active>T1</Badge>
              <Badge variant="filter" active>T2</Badge>
              <Badge variant="info">T3</Badge>
            </div>

            <div className="fiche-eleve__evolution-list">
              {displayedEvolution.map((s) => {
                const t = trend(s.t1, s.t2);
                return (
                  <div key={s.name} className="evolution-row">
                    <span className="evolution-row__name">{s.name}</span>
                    {[s.t1, s.t2, s.t3].map((level, i) => {
                      const c = levelColor(level);
                      return (
                        <span key={i} className="evolution-row__dot" style={{ backgroundColor: c.bg, color: c.text }}>
                          {level ?? '-'}
                        </span>
                      );
                    })}
                    <span className="evolution-row__trend" style={{ color: t.color }}>
                      {t.arrow}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'grades' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Dernières notes</h3>
          <div style={{ fontSize: 12, marginBottom: 10, color: 'var(--color-text-muted)' }}>
            Moyenne récente: <strong>{gradesAverage !== null ? gradesAverage.toFixed(1) : '-'}</strong>
          </div>
          {grades.length === 0 ? (
            <span className="fiche-eleve__placeholder-text">Aucune note disponible.</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {grades.map((g) => (
                <div
                  key={g.submission_id}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}
                >
                  <span style={{ fontSize: 12 }}>{g.assignment_title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {g.score?.toFixed(1) ?? '-'} / {g.max_score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'corrections' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Corrections</h3>
          {corrections.length === 0 ? (
            <span className="fiche-eleve__placeholder-text">Aucune copie pour cet élève.</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {corrections.map((c) => (
                <div
                  key={c.id}
                  style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', display: 'grid', gap: 6 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ fontSize: 12 }}>{c.assignment_title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.assignment_date ?? '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12 }}>
                      Note: {c.score?.toFixed(1) ?? '-'} / {c.max_score}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Statut: {c.status}
                    </span>
                    <Button
                      variant="secondary"
                      size="S"
                      onClick={() => navigate({ tab: 'evaluation', page: 'correction-serie', entityId: c.assignment_id })}
                    >
                      Ouvrir devoir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'bulletins' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Bulletins</h3>
          {periods.length > 0 && (
            <div className="fiche-eleve__period-badges" style={{ marginBottom: 12 }}>
              {periods.map((period) => (
                <Badge
                  key={period.id}
                  variant="filter"
                  active={selectedPeriodId === period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                >
                  {period.label}
                </Badge>
              ))}
            </div>
          )}
          {bulletins.length === 0 ? (
            <span className="fiche-eleve__placeholder-text">Aucune entrée de bulletin pour cette période.</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {bulletins.map((b) => (
                <div key={b.id} style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <strong style={{ fontSize: 12 }}>{b.entry_type}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{b.status}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>{b.content}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'profile' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Profil période</h3>
          {periods.length > 0 && (
            <div className="fiche-eleve__period-badges" style={{ marginBottom: 12 }}>
              {periods.map((period) => (
                <Badge
                  key={period.id}
                  variant="filter"
                  active={selectedPeriodId === period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                >
                  {period.label}
                </Badge>
              ))}
            </div>
          )}

          {!profile ? (
            <span className="fiche-eleve__placeholder-text">Aucun profil saisi pour cette période.</span>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { key: 'behavior', label: 'Comportement' },
                { key: 'work_ethic', label: 'Travail' },
                { key: 'participation', label: 'Participation' },
                { key: 'autonomy', label: 'Autonomie' },
                { key: 'methodology', label: 'Methode' },
              ].map((item) => {
                const value = profile[item.key as keyof ProfileData] as number | null;
                return (
                  <div
                    key={item.key}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <span style={{ fontSize: 12 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{value ?? '-'}/5</span>
                  </div>
                );
              })}

              {profile.notes && (
                <div style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', fontSize: 12 }}>
                  <strong>Notes:</strong> {profile.notes}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'orientation' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Orientation</h3>

          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <strong style={{ fontSize: 12 }}>Rapports</strong>
              {orientationReports.length === 0 ? (
                <div className="fiche-eleve__placeholder-text">Aucun rapport d'orientation.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {orientationReports.map((r) => (
                    <div key={r.id} style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                        <strong style={{ fontSize: 12 }}>{r.title || `Rapport #${r.id}`}</strong>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.created_at}</span>
                      </div>
                      <div style={{ fontSize: 12 }}>{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <strong style={{ fontSize: 12 }}>Entretiens</strong>
              {orientationInterviews.length === 0 ? (
                <div className="fiche-eleve__placeholder-text">Aucun entretien d'orientation.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {orientationInterviews.map((i) => (
                    <div key={i.id} style={{ padding: '8px 10px', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                        <strong style={{ fontSize: 12 }}>Entretien</strong>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{i.interview_date}</span>
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>{i.summary}</div>
                      {i.decisions && <div style={{ fontSize: 12 }}><strong>Décisions:</strong> {i.decisions}</div>}
                      {i.next_steps && <div style={{ fontSize: 12 }}><strong>Étapes suivantes:</strong> {i.next_steps}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'docs' && (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Documents élève</h3>
          {periods.length > 0 && (
            <div className="fiche-eleve__period-badges" style={{ marginBottom: 12 }}>
              {periods.map((period) => (
                <Badge
                  key={period.id}
                  variant="filter"
                  active={selectedPeriodId === period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                >
                  {period.label}
                </Badge>
              ))}
            </div>
          )}
          {studentDocuments.length === 0 ? (
            <span className="fiche-eleve__placeholder-text">Aucun document lié à cet élève.</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {studentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '8px 10px',
                    border: 'var(--border-default)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ fontSize: 12 }}>{doc.label || doc.document_title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {doc.period_label ?? 'Toutes périodes'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {(doc.document_type_label ?? 'Type non défini')}
                    {' • '}
                    {(doc.subject_label ?? 'Matière non définie')}
                    {' • '}
                    {doc.file_type.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12 }} title={doc.file_path}>{doc.file_name}</span>
                    <Button
                      variant="secondary"
                      size="S"
                      onClick={() => window.open(toPreviewSrc(doc.file_path), '_blank', 'noopener,noreferrer')}
                    >
                      Ouvrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab !== 'overview' && activeTab !== 'skills' && activeTab !== 'grades' && activeTab !== 'corrections' && activeTab !== 'bulletins' && activeTab !== 'profile' && activeTab !== 'orientation' && activeTab !== 'docs' && (
        <Card noHover className="fiche-eleve__placeholder">
          <span className="fiche-eleve__placeholder-text">
            Onglet "{STUDENT_TABS.find((t) => t.id === activeTab)?.label}" - à implémenter
          </span>
        </Card>
      )}

      <div className="fiche-eleve__actions">
        <Button variant="primary" size="M" onClick={handleGenerateAppreciation}>Générer appréciation</Button>
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






