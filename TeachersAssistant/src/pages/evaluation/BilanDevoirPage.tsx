import React, { useState } from 'react';
import { Card, Badge, Button, ProgressBar } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import { aiCorrectionService } from '../../services';
import { useApp } from '../../stores';
import './BilanDevoirPage.css';

// ── Mock ──

const HISTOGRAM = [
  { range: '0-2.5', count: 0 },
  { range: '2.5-5', count: 1 },
  { range: '5-7.5', count: 3 },
  { range: '7.5-10', count: 5 },
  { range: '10-12.5', count: 8 },
  { range: '12.5-15', count: 6 },
  { range: '15-17.5', count: 4 },
  { range: '17.5-20', count: 1 },
];

const MAX_COUNT = Math.max(...HISTOGRAM.map(h => h.count));

const SKILLS_AVG = [
  { name: 'Problématiser', score: 2.8 },
  { name: 'Construire un plan', score: 2.3 },
  { name: 'Mobiliser connaissances', score: 3.1 },
  { name: 'Rédaction', score: 2.5 },
  { name: 'Analyser un document', score: 2.1 },
];

const TOP_SUCCESSES = ['Mobilisation des connaissances sur la période', 'Qualité des introductions', 'Utilisation du vocabulaire spécifique'];
const TOP_WEAKNESSES = ['Analyse de documents trop descriptive', 'Transitions entre parties', 'Manque de problématisation'];

function scoreColor(score: number) {
  if (score >= 3.0) return 'var(--color-success)';
  if (score >= 2.5) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

// ── Composant ──

export const BilanDevoirPage: React.FC = () => {
  const { addToast } = useApp();
  const [bilanComment, setBilanComment] = useState<string | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [generatingBilan, setGeneratingBilan] = useState(false);

  const handleGenerateBilan = async () => {
    setGeneratingBilan(true);
    try {
      const comment = await aiCorrectionService.generateBilanComment(1, {
        average: 11.2, median: 11, min: 4, max: 18, totalStudents: 28,
        skillAverages: SKILLS_AVG.map(s => ({ label: s.name, avg: s.avgScore })),
        topStrengths: TOP_SUCCESSES, topWeaknesses: TOP_WEAKNESSES,
      });
      setBilanComment(comment);
      addToast('success', 'Commentaire de classe généré');
    } catch (err) {
      setBilanComment('Erreur lors de la génération du commentaire.');
      addToast('error', 'Erreur de génération IA');
    } finally {
      setGeneratingBilan(false);
    }
  };

  return (
  <div className="bilan-page">
    {/* En-tête */}
    <div className="bilan-page__header">
      <h1 className="bilan-page__title">Bilan — Dissertation HGGSP (Tle 2)</h1>
      <span className="bilan-page__subtitle">28 copies corrigées — 12 février 2026</span>
    </div>

    {/* Grille 2×2 */}
    <div className="bilan-page__grid">
      {/* Distribution notes */}
      <Card noHover>
        <h3 className="bilan-page__card-title">📊 Distribution des notes</h3>
        <div className="histogram">
          {HISTOGRAM.map((bar, i) => (
            <div key={i} className="histogram__col">
              <div
                className="histogram__bar"
                style={{ height: `${bar.count > 0 ? (bar.count / MAX_COUNT) * 120 : 2}px` }}
              >
                {bar.count > 0 && <span className="histogram__count">{bar.count}</span>}
              </div>
              <span className="histogram__label">{bar.range.split('-')[0]}</span>
            </div>
          ))}
        </div>
        <div className="bilan-page__stats">
          <span>Moy: <strong>11.2</strong></span>
          <span>Méd: <strong>11</strong></span>
          <span>Min: <strong>4</strong></span>
          <span>Max: <strong>18</strong></span>
        </div>
      </Card>

      {/* Compétences moyennes */}
      <Card noHover>
        <h3 className="bilan-page__card-title">🎯 Compétences (moyenne classe)</h3>
        <div className="bilan-skills">
          {SKILLS_AVG.map(s => (
            <div key={s.name} className="bilan-skill">
              <div className="bilan-skill__header">
                <span className="bilan-skill__name">{s.name}</span>
                <span className="bilan-skill__score" style={{ color: scoreColor(s.score) }}>
                  {s.score.toFixed(1)}/4
                </span>
              </div>
              <ProgressBar value={(s.score / 4) * 100} color={scoreColor(s.score)} height={6} />
            </div>
          ))}
        </div>
      </Card>

      {/* Top réussites */}
      <Card borderTopColor="var(--color-success)" noHover>
        <h3 className="bilan-page__card-title bilan-page__card-title--success">✅ Top 3 réussites</h3>
        {TOP_SUCCESSES.map((s, i) => (
          <p key={i} className="bilan-page__item">• {s}</p>
        ))}
      </Card>

      {/* Top lacunes */}
      <Card borderTopColor="var(--color-danger)" noHover>
        <h3 className="bilan-page__card-title bilan-page__card-title--danger">⚠️ Top 3 lacunes</h3>
        {TOP_WEAKNESSES.map((w, i) => (
          <p key={i} className="bilan-page__item">• {w}</p>
        ))}
      </Card>
    </div>

    {/* Actions */}
    <div className="bilan-page__actions">
      <Button variant="primary" size="M" icon={<span>🤖</span>} onClick={handleGenerateBilan} disabled={generatingBilan}>
            {generatingBilan ? '⏳ Génération…' : 'Générer commentaire classe (IA)'}
          </Button>
      <Button variant="secondary" size="M" onClick={async () => {
        try {
          const { pdfExportService } = await import('../../services');
          const html = await pdfExportService.buildBilanHTML(1);
          setPdfHtml(html);
        } catch { window.print(); }
      }}>Export PDF bilan</Button>
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
        <h3 className="bilan-page__card-title">💬 Commentaire synthétique (IA)</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>{bilanComment}</p>
      </Card>
    )}
  </div>
  );
};
