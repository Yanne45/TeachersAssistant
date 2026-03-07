// ============================================================================
// BulletinsPage — Gestion bulletins (vue classe × période)
// ============================================================================

import React, { useState } from 'react';
import { EmptyState } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import { aiBulletinService } from '../../services';
import { useApp } from '../../stores';
import './BulletinsPage.css';

type Period = 'T1' | 'T2' | 'T3';
type BulletinStatus = 'draft' | 'review' | 'final' | 'empty';

interface StudentBulletin {
  id: number;
  name: string;
  avg: number | null;
  statuses: Record<Period, BulletinStatus>;
  excerpts: Record<Period, string>;
}

const MOCK_DATA: StudentBulletin[] = [
  { id: 1, name: 'ADRIEN Camille', avg: 14.0,
    statuses: { T1: 'final', T2: 'draft', T3: 'empty' },
    excerpts: { T1: 'Bon trimestre, travail régulier.', T2: 'En cours de rédaction…', T3: '' }},
  { id: 3, name: 'BERNARD Emma', avg: 15.5,
    statuses: { T1: 'final', T2: 'review', T3: 'empty' },
    excerpts: { T1: 'Excellente élève, résultats remarquables.', T2: 'Très bon travail, rigueur confirmée.', T3: '' }},
  { id: 4, name: 'BROSSARD Nathan', avg: 8.0,
    statuses: { T1: 'final', T2: 'draft', T3: 'empty' },
    excerpts: { T1: 'Difficultés méthodologiques importantes.', T2: '', T3: '' }},
  { id: 9, name: 'DUPONT Léa', avg: 14.0,
    statuses: { T1: 'final', T2: 'draft', T3: 'empty' },
    excerpts: { T1: 'Travail sérieux, analyses en progrès.', T2: '', T3: '' }},
  { id: 16, name: 'MARTIN Arthur', avg: 17.5,
    statuses: { T1: 'final', T2: 'review', T3: 'empty' },
    excerpts: { T1: 'Brillant, dissertations remarquables.', T2: 'Continue sur cette lancée exemplaire.', T3: '' }},
  { id: 25, name: 'VIDAL Paul', avg: 5.0,
    statuses: { T1: 'final', T2: 'empty', T3: 'empty' },
    excerpts: { T1: 'En grande difficulté, travail insuffisant.', T2: '', T3: '' }},
];

const STATUS_DISPLAY: Record<BulletinStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Brouillon', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' },
  review: { label: 'Relecture', color: 'var(--color-warn)', bg: 'rgba(245, 166, 35, 0.1)' },
  final: { label: 'Final', color: 'var(--color-success)', bg: 'rgba(126, 217, 87, 0.1)' },
  empty: { label: '—', color: 'var(--color-text-muted)', bg: 'transparent' },
};

export const BulletinsPage: React.FC = () => {
  const { addToast } = useApp();
  const [activeClass, setActiveClass] = useState('tle2');
  const [activePeriod, setActivePeriod] = useState<Period>('T1');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [appreciation, setAppreciation] = useState('');
  const [generatingOne, setGeneratingOne] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const handleGenerateOne = async () => {
    if (!selectedStudent) return;
    setGeneratingOne(true);
    try {
      const text = await aiBulletinService.generateAppreciation(selectedStudent, 1, 3);
      setAppreciation(text);
      addToast('success', 'Appréciation générée');
    } catch {
      setAppreciation('[Erreur de génération]');
      addToast('error', 'Erreur lors de la génération');
    } finally {
      setGeneratingOne(false);
    }
  };

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    setBatchProgress({ current: 0, total: MOCK_DATA.length });
    try {
      await aiBulletinService.generateBatch(1, 1, 3, (current, total) => {
        setBatchProgress({ current, total });
      });
      addToast('success', 'Appréciations batch générées');
    } catch { addToast('error', 'Erreur lors de la génération batch'); }
    finally {
      setGeneratingBatch(false);
      setBatchProgress(null);
    }
  };

  const periods: Period[] = ['T1', 'T2', 'T3'];

  const countByStatus = (status: BulletinStatus) =>
    MOCK_DATA.filter(s => s.statuses[activePeriod] === status).length;

  return (
    <div className="bulletins-page">
      {/* Header */}
      <div className="bulletins-page__header">
        <h1 className="bulletins-page__title">Bulletins</h1>
        <div className="bulletins-page__header-actions">
          <button className="bulletins-page__btn" onClick={handleGenerateBatch} disabled={generatingBatch}>
            {generatingBatch ? `⏳ Génération ${batchProgress?.current ?? 0}/${batchProgress?.total ?? '?'}…` : '🤖 Générer batch (IA)'}
          </button>
          <button className="bulletins-page__btn bulletins-page__btn--primary" onClick={async () => {
            if (!selectedStudent) return;
            try {
              const { pdfExportService } = await import('../../services');
              const html = await pdfExportService.buildBulletinHTML(selectedStudent, 1);
              setPdfHtml(html);
            } catch { addToast('error', 'Erreur de génération PDF'); }
          }} disabled={!selectedStudent}>📤 Exporter PDF</button>
        </div>
      </div>

      {/* Sélection classe + période */}
      <div className="bulletins-page__controls">
        <div className="bulletins-page__class-pills">
          {['tle2', 'tle4', '1ere3'].map(c => (
            <button
              key={c}
              className={`bulletins-page__pill ${activeClass === c ? 'bulletins-page__pill--active' : ''}`}
              onClick={() => setActiveClass(c)}
            >
              {{ tle2: 'Tle 2', tle4: 'Tle 4', '1ere3': '1ère 3' }[c]}
            </button>
          ))}
        </div>

        <div className="bulletins-page__period-pills">
          {periods.map(p => (
            <button
              key={p}
              className={`bulletins-page__pill ${activePeriod === p ? 'bulletins-page__pill--active' : ''}`}
              onClick={() => setActivePeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="bulletins-page__summary">
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-success)' }}>
            ✅ {countByStatus('final')} finaux
          </span>
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-warn)' }}>
            📝 {countByStatus('review')} relecture
          </span>
          <span className="bulletins-page__summary-item" style={{ color: 'var(--color-text-muted)' }}>
            ⬜ {countByStatus('draft') + countByStatus('empty')} restants
          </span>
        </div>
      </div>

      {/* Tableau + éditeur */}
      <div className="bulletins-page__body">
        {/* Liste élèves */}
        <div className="bulletins-page__list">
          <table className="bulletins-page__table">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Moy.</th>
                {periods.map(p => <th key={p}>{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {MOCK_DATA.map(s => (
                <tr
                  key={s.id}
                  className={`bulletins-page__row ${selectedStudent === s.id ? 'bulletins-page__row--active' : ''}`}
                  onClick={() => setSelectedStudent(s.id)}
                >
                  <td className="bulletins-page__cell-name">{s.name}</td>
                  <td className="bulletins-page__cell-avg">
                    {s.avg !== null ? s.avg.toFixed(1) : '—'}
                  </td>
                  {periods.map(p => {
                    const st = STATUS_DISPLAY[s.statuses[p]];
                    return (
                      <td key={p}>
                        <span
                          className="bulletins-page__status"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {st.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Éditeur appréciation */}
        <div className="bulletins-page__editor">
          {selectedStudent ? (
            <>
              <div className="bulletins-page__editor-header">
                <h3 className="bulletins-page__editor-title">
                  {MOCK_DATA.find(s => s.id === selectedStudent)?.name} — {activePeriod}
                </h3>
                <span className="bulletins-page__editor-subject">HGGSP</span>
              </div>
              <textarea
                className="bulletins-page__editor-textarea"
                rows={6}
                defaultValue={MOCK_DATA.find(s => s.id === selectedStudent)?.excerpts[activePeriod] ?? ''}
                placeholder="Rédiger l'appréciation…"
              />
              {/* Consignes IA complémentaires (dépliable) */}
              <details className="bulletins-page__ia-instructions">
                <summary className="bulletins-page__ia-toggle">
                  Consignes IA complémentaires
                </summary>
                <textarea
                  className="bulletins-page__ia-textarea"
                  placeholder="Instructions supplémentaires (ex: Insistez sur les progrès, évitez le terme « doit »)..."
                  rows={2}
                />
              </details>
              <div className="bulletins-page__editor-actions">
                <button className="bulletins-page__editor-btn" onClick={handleGenerateOne} disabled={generatingOne}>
                  {generatingOne ? '⏳…' : '🤖 Générer IA'}
                </button>
                <button className="bulletins-page__editor-btn">📋 Copier T1</button>
                <div className="bulletins-page__editor-spacer" />
                <button className="bulletins-page__editor-btn bulletins-page__editor-btn--secondary">Relecture</button>
                <button className="bulletins-page__editor-btn bulletins-page__editor-btn--primary">✓ Finaliser</button>
              </div>
            </>
          ) : (
            <EmptyState
              icon="📊"
              title="Aucun élève sélectionné"
              description="Sélectionnez un élève dans le tableau pour rédiger son appréciation."
            />
          )}
        </div>
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Bulletin scolaire"
        filename="bulletin.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};
