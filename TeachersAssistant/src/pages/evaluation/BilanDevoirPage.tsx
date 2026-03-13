import React, { useEffect, useState } from 'react';
import { Card, Button, ProgressBar, EmptyState } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import { aiCorrectionService, assignmentService, bilanService, downloadBlob, grilleExportService, pdfExportService } from '../../services';
import { useApp, useData, useRouter } from '../../stores';
import type { AssignmentStats } from '../../types';
import './BilanDevoirPage.css';

function scoreColor(score: number) {
  if (score >= 3.0) return 'var(--color-success)';
  if (score >= 2.5) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

export const BilanDevoirPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route } = useRouter();
  const { loadAssignments } = useData();

  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [bilanComment, setBilanComment] = useState<string | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [generatingBilan, setGeneratingBilan] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const routeAssignmentIdRaw = Number.parseInt(String(route.entityId ?? ''), 10);
  const routeAssignmentId = Number.isFinite(routeAssignmentIdRaw) ? routeAssignmentIdRaw : null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let targetId = routeAssignmentId;

        if (!targetId) {
          const assignments = await loadAssignments();
          targetId = assignments[0]?.id ?? null;
        }

        if (!targetId) {
          if (!cancelled) {
            setAssignmentId(null);
            setAssignment(null);
            setStats(null);
            setLoading(false);
          }
          return;
        }

        const [assignmentData, statsData] = await Promise.all([
          assignmentService.getById(targetId),
          bilanService.computeStats(targetId),
        ]);

        if (!cancelled) {
          setAssignmentId(targetId);
          setAssignment(assignmentData);
          setStats(statsData);
        }
      } catch (error) {
        console.error('[BilanDevoirPage] Erreur chargement bilan:', error);
        if (!cancelled) {
          setAssignmentId(null);
          setAssignment(null);
          setStats(null);
          addToast('error', 'Impossible de charger le bilan');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!activeYear) {
      setLoading(false);
      return;
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeYear, routeAssignmentId, loadAssignments, addToast]);

  const histogram = stats?.histogram ?? [];
  const maxCount = histogram.length === 0 ? 1 : Math.max(...histogram.map((h) => h.count), 1);

  const skillsAvg = stats?.skill_averages ?? [];
  const topSuccesses = stats?.top_strengths ?? [];
  const topWeaknesses = stats?.top_weaknesses ?? [];

  const handleGenerateBilan = async () => {
    if (!assignmentId || !stats) {
      addToast('warn', 'Aucun devoir sélectionné');
      return;
    }

    setGeneratingBilan(true);
    try {
      const comment = await aiCorrectionService.generateBilanComment(assignmentId, {
        average: stats.mean,
        median: stats.median,
        min: stats.min,
        max: stats.max,
        totalStudents: assignment?.submission_count ?? 0,
        skillAverages: skillsAvg.map((s) => ({ label: s.skill_label, avg: s.average })),
        topStrengths: topSuccesses,
        topWeaknesses: topWeaknesses,
      });
      setBilanComment(comment);
      addToast('success', 'Commentaire de classe généré');
    } catch (error) {
      console.error('[BilanDevoirPage] Erreur generation IA:', error);
      setBilanComment('Erreur lors de la génération du commentaire.');
      addToast('error', 'Erreur de génération IA');
    } finally {
      setGeneratingBilan(false);
    }
  };

  if (loading) {
    return <p className="loading-text">Chargement…</p>;
  }

  if (!assignmentId || !assignment || !stats) {
    return (
      <div className="bilan-page">
        <EmptyState
          icon="📊"
          title="Aucun devoir disponible"
          description="Créez un devoir puis corrigez des copies pour afficher le bilan."
        />
      </div>
    );
  }

  return (
    <div className="bilan-page">
      <div className="bilan-page__header">
        <h1 className="bilan-page__title">Bilan - {assignment.title}</h1>
        <span className="bilan-page__subtitle">
          {(assignment.submission_count ?? 0)} copies - {assignment.assignment_date ?? assignment.due_date ?? 'date non renseignée'}
        </span>
      </div>

      <div className="bilan-page__grid">
        <Card noHover>
          <h3 className="bilan-page__card-title">Distribution des notes</h3>
          <div className="histogram">
            {histogram.map((bar, i) => (
              <div key={i} className="histogram__col">
                <div
                  className="histogram__bar"
                  style={{ height: `${bar.count > 0 ? (bar.count / maxCount) * 120 : 2}px` }}
                >
                  {bar.count > 0 && <span className="histogram__count">{bar.count}</span>}
                </div>
                <span className="histogram__label">{bar.range.split('-')[0]}</span>
              </div>
            ))}
          </div>
          <div className="bilan-page__stats">
            <span>Moy: <strong>{stats.mean.toFixed(1)}</strong></span>
            <span>Med: <strong>{stats.median.toFixed(1)}</strong></span>
            <span>Min: <strong>{stats.min.toFixed(1)}</strong></span>
            <span>Max: <strong>{stats.max.toFixed(1)}</strong></span>
          </div>
        </Card>

        <Card noHover>
          <h3 className="bilan-page__card-title">Compétences (moyenne classe)</h3>
          <div className="bilan-skills">
            {skillsAvg.length === 0 ? (
              <p className="bilan-page__item">Aucune compétence évaluée.</p>
            ) : (
              skillsAvg.map((s) => (
                <div key={s.skill_id} className="bilan-skill">
                  <div className="bilan-skill__header">
                    <span className="bilan-skill__name">{s.skill_label}</span>
                    <span className="bilan-skill__score" style={{ color: scoreColor(s.average) }}>
                      {s.average.toFixed(1)}/4
                    </span>
                  </div>
                  <ProgressBar value={(s.average / 4) * 100} color={scoreColor(s.average)} height={6} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card borderTopColor="var(--color-success)" noHover>
          <h3 className="bilan-page__card-title bilan-page__card-title--success">Top 3 réussites</h3>
          {topSuccesses.length === 0 ? (
            <p className="bilan-page__item">-</p>
          ) : (
            topSuccesses.map((s, i) => (
              <p key={i} className="bilan-page__item">- {s}</p>
            ))
          )}
        </Card>

        <Card borderTopColor="var(--color-danger)" noHover>
          <h3 className="bilan-page__card-title bilan-page__card-title--danger">Top 3 lacunes</h3>
          {topWeaknesses.length === 0 ? (
            <p className="bilan-page__item">-</p>
          ) : (
            topWeaknesses.map((w, i) => (
              <p key={i} className="bilan-page__item">- {w}</p>
            ))
          )}
        </Card>
      </div>

      <div className="bilan-page__actions">
        <Button variant="primary" size="M" onClick={handleGenerateBilan} disabled={generatingBilan}>
          {generatingBilan ? 'Génération…' : 'Générer commentaire classe (IA)'}
        </Button>
        <Button
          variant="secondary"
          size="M"
          loading={exportingPdf}
          onClick={async () => {
            setExportingPdf(true);
            try {
              const html = await pdfExportService.buildBilanHTML(assignmentId);
              if (!html.trim()) {
                addToast('error', 'Aperçu PDF vide');
                return;
              }
              setPdfHtml(html);
            } catch (error) {
              console.error('[BilanDevoirPage] Erreur export PDF:', error);
              addToast('error', 'Erreur génération PDF');
            } finally {
              setExportingPdf(false);
            }
          }}
        >
          Export PDF bilan
        </Button>
        <Button
          variant="secondary"
          size="M"
          loading={exportingCsv}
          onClick={async () => {
            setExportingCsv(true);
            try {
              const { rows, skills } = await grilleExportService.fetchGrilleData(assignmentId!);
              const csv = grilleExportService.buildCSV(rows, skills);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
              downloadBlob(blob, `grille-competences-${assignment?.title ?? 'devoir'}.csv`);
              addToast('success', 'Grille CSV exportée');
            } catch (error) {
              console.error('[BilanDevoirPage] Erreur export CSV:', error);
              addToast('error', 'Erreur export CSV');
            } finally {
              setExportingCsv(false);
            }
          }}
          disabled={!assignmentId}
        >
          Export grille CSV
        </Button>
        <Button
          variant="secondary"
          size="M"
          onClick={async () => {
            try {
              const { rows, skills } = await grilleExportService.fetchGrilleData(assignmentId!);
              const html = grilleExportService.buildHTML(rows, skills, assignment?.title ?? 'Devoir');
              pdfExportService.printHTML(html);
            } catch (error) {
              console.error('[BilanDevoirPage] Erreur impression grille:', error);
              addToast('error', 'Erreur impression grille');
            }
          }}
          disabled={!assignmentId}
        >
          Imprimer grille
        </Button>
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Bilan devoir"
        filename="bilan-devoir.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />

      {bilanComment && (
        <Card noHover className="bilan-page__card" style={{ marginTop: 'var(--space-3)' }}>
          <h3 className="bilan-page__card-title">Commentaire synthétique (IA)</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{bilanComment}</p>
        </Card>
      )}
    </div>
  );
};

