import React, { useState } from 'react';
import { Card, Badge, Button, SegmentedBar, Tabs } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import './FicheElevePage.css';

// ── Types ──

interface SkillEvolution {
  name: string;
  t1: number | null;
  t2: number | null;
  t3: number | null;
}

// ── Mock ──

const STUDENT = {
  lastName: 'DUPONT',
  firstName: 'Léa',
  classLabel: 'Terminale 2',
  birthYear: 2008,
};

const SKILL_LEVELS: { name: string; level: number }[] = [
  { name: 'Problématiser', level: 3 },
  { name: 'Construire un plan', level: 3 },
  { name: 'Mobiliser connaissances', level: 4 },
  { name: 'Rédaction', level: 3 },
  { name: 'Analyser un document', level: 2 },
];

const SKILL_EVOLUTION: SkillEvolution[] = [
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

function levelColor(level: number | null) {
  if (level === null) return { bg: 'var(--color-bg)', text: 'var(--color-text-muted)' };
  if (level >= 3) return { bg: 'rgba(126,217,87,0.20)', text: 'var(--color-success)' };
  if (level === 2) return { bg: 'rgba(245,166,35,0.20)', text: 'var(--color-warn)' };
  return { bg: 'rgba(231,76,60,0.20)', text: 'var(--color-danger)' };
}

function trend(first: number | null, last: number | null) {
  if (first === null || last === null) return { arrow: '—', color: 'var(--color-text-muted)' };
  if (last > first) return { arrow: '↗', color: 'var(--color-success)' };
  if (last < first) return { arrow: '↘', color: 'var(--color-danger)' };
  return { arrow: '→', color: 'var(--color-text-muted)' };
}

// ── Composant ──

export const FicheElevePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('skills');
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  const handleExportPDF = async () => {
    try {
      const { pdfExportService } = await import('../../services');
      const html = await pdfExportService.buildFicheEleveHTML(1); // TODO: use real student ID
      setPdfHtml(html);
    } catch { /* silent */ }
  };

  return (
    <div className="fiche-eleve">
      {/* ── En-tête ── */}
      <div className="fiche-eleve__header">
        <div className="fiche-eleve__avatar">👤</div>
        <div className="fiche-eleve__info">
          <h1 className="fiche-eleve__name">
            {STUDENT.lastName} {STUDENT.firstName} — {STUDENT.classLabel}
          </h1>
          <span className="fiche-eleve__sub">Née en {STUDENT.birthYear}</span>
        </div>
        <div className="fiche-eleve__badges">
          <Badge variant="success">T1 ✅</Badge>
          <Badge variant="warn">Cahier ⚠</Badge>
          <Button variant="secondary" size="S" onClick={handleExportPDF}>📤 Export PDF</Button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <Tabs tabs={STUDENT_TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Contenu onglet Compétences ── */}
      {activeTab === 'skills' && (
        <div className="fiche-eleve__skills">
          {/* Colonne gauche : Niveau actuel */}
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Niveau actuel par compétence</h3>
            <div className="fiche-eleve__skill-list">
              {SKILL_LEVELS.map(s => (
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

          {/* Colonne droite : Évolution */}
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Évolution sur l'année</h3>
            <div className="fiche-eleve__period-badges">
              <Badge variant="filter" active>T1</Badge>
              <Badge variant="filter" active>T2</Badge>
              <Badge variant="info">T3</Badge>
            </div>

            <div className="fiche-eleve__evolution-list">
              {SKILL_EVOLUTION.map(s => {
                const t = trend(s.t1, s.t2);
                return (
                  <div key={s.name} className="evolution-row">
                    <span className="evolution-row__name">{s.name}</span>
                    {[s.t1, s.t2, s.t3].map((level, i) => {
                      const c = levelColor(level);
                      return (
                        <span
                          key={i}
                          className="evolution-row__dot"
                          style={{ backgroundColor: c.bg, color: c.text }}
                        >
                          {level ?? '—'}
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

      {/* Placeholder pour les autres onglets */}
      {activeTab !== 'skills' && (
        <Card noHover className="fiche-eleve__placeholder">
          <span className="fiche-eleve__placeholder-text">
            Onglet « {STUDENT_TABS.find(t => t.id === activeTab)?.label} » — à implémenter
          </span>
        </Card>
      )}

      {/* Actions */}
      <div className="fiche-eleve__actions">
        <Button variant="primary" size="M" icon={<span>🤖</span>}>Générer appréciation</Button>
        <Button variant="secondary" size="M">Voir bulletin T2</Button>
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Fiche élève"
        filename={`fiche-${STUDENT.lastName}-${STUDENT.firstName}.html`}
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};
