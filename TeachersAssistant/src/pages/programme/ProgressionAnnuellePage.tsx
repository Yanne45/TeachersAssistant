// ============================================================================
// ProgressionAnnuellePage — Timeline horizontale (spec §5.4) — DnD + persistence
// ============================================================================

import React, { useState, useCallback } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { PDFPreviewModal } from '../../components/forms';
import { TimelineDragDrop } from '../../components/dnd';
import type { TimelineSequence } from '../../components/dnd';
import { sequenceService } from '../../services';
import { useApp } from '../../stores';
import './ProgressionAnnuellePage.css';

// ── Constants ──

const MONTHS = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
const TOTAL_MONTHS = 10;

const monthToPct = (m: number) => (m / TOTAL_MONTHS) * 100;
const pctToMonth = (pct: number) => (pct / 100) * TOTAL_MONTHS;

// ── Mock data ──

interface SequenceBar {
  id: number;
  title: string;
  subjectColor: string;
  startMonth: number;
  durationMonths: number;
  totalHours: number;
}

const INITIAL_SEQUENCES: SequenceBar[] = [
  { id: 1, title: 'De nouveaux espaces de conquête', subjectColor: '#7B3FA0', startMonth: 0, durationMonths: 2.5, totalHours: 15 },
  { id: 2, title: 'La Guerre froide', subjectColor: '#2C3E7B', startMonth: 0.5, durationMonths: 2, totalHours: 12 },
  { id: 3, title: 'Faire la guerre, faire la paix', subjectColor: '#7B3FA0', startMonth: 3, durationMonths: 3, totalHours: 18 },
  { id: 4, title: 'La France et ses régions', subjectColor: '#27774E', startMonth: 2.5, durationMonths: 2, totalHours: 12 },
  { id: 5, title: 'Histoire et mémoires', subjectColor: '#7B3FA0', startMonth: 6.5, durationMonths: 2.5, totalHours: 15 },
];

const VACATION_BANDS = [
  { label: 'Toussaint', startMonth: 1.6, durationMonths: 0.5 },
  { label: 'Noël', startMonth: 3.6, durationMonths: 0.5 },
  { label: 'Hiver', startMonth: 5.3, durationMonths: 0.5 },
  { label: 'Printemps', startMonth: 7.3, durationMonths: 0.5 },
];

const AVAILABLE_SEQUENCES = [
  { id: 10, title: 'Méditerranée médiévale', subjectColor: '#2C3E7B', hours: 8 },
  { id: 11, title: "L'État à l'époque moderne", subjectColor: '#2C3E7B', hours: 10 },
];

// ── Component ──

export const ProgressionAnnuellePage: React.FC = () => {
  const { addToast } = useApp();
  const [sequences, setSequences] = useState<SequenceBar[]>(INITIAL_SEQUENCES);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  const totalPlanned = sequences.reduce((s, seq) => s + seq.totalHours, 0);
  const totalTarget = 90;

  const handleExportPDF = async () => {
    try {
      const { pdfExportService } = await import('../../services');
      const html = await pdfExportService.buildProgressionHTML(1);
      setPdfHtml(html);
    } catch { addToast('error', 'Erreur export'); }
  };

  // Convert to TimelineDragDrop format
  const timelineSequences: TimelineSequence[] = sequences.map(seq => ({
    id: seq.id,
    title: seq.title,
    subjectColor: seq.subjectColor,
    totalHours: seq.totalHours,
    startPct: monthToPct(seq.startMonth),
    widthPct: monthToPct(seq.durationMonths),
  }));

  const vacationBands = VACATION_BANDS.map(v => ({
    startPct: monthToPct(v.startMonth),
    widthPct: monthToPct(v.durationMonths),
    label: v.label,
  }));

  // Handle drop: update state + persist
  const handleDrop = useCallback(async (sequenceId: number | string, newStartPct: number) => {
    const newStartMonth = Math.round(pctToMonth(newStartPct) * 10) / 10;

    setSequences(prev => prev.map(seq =>
      seq.id === sequenceId ? { ...seq, startMonth: newStartMonth } : seq
    ));

    // Persist to DB via sort_order as position proxy
    try {
      const numId = typeof sequenceId === 'string' ? parseInt(sequenceId) : sequenceId;
      await sequenceService.update(numId, {
        sort_order: Math.round(newStartMonth * 100),
      });
    } catch (err) {
      console.error('[Progression] Erreur persistence position:', err);
      addToast('error', 'Erreur de sauvegarde de la position');
    }
  }, [addToast]);

  return (
    <div className="progression-page">
      <div className="progression-page__layout">
        {/* ── Panneau séquences (gauche) ── */}
        <div className="progression-page__panel">
          <h3 className="progression-page__panel-title">Séquences disponibles</h3>
          <Badge variant="filter" active>
            Heures programmées : {totalPlanned} / {totalTarget}
          </Badge>

          <div className="progression-page__seq-list">
            {AVAILABLE_SEQUENCES.map(seq => (
              <Card
                key={seq.id}
                borderLeftColor={seq.subjectColor}
                compact
                className="progression-page__seq-card"
              >
                <span className="progression-page__seq-title">{seq.title}</span>
                <span className="progression-page__seq-hours">{seq.hours}h prévues</span>
              </Card>
            ))}
          </div>

          <Button variant="secondary" size="S" fullWidth>
            + Nouvelle séquence
          </Button>
          <Button variant="secondary" size="S" fullWidth onClick={handleExportPDF} style={{ marginTop: 8 }}>
            📤 Export PDF
          </Button>
        </div>

        {/* ── Timeline (avec DnD) ── */}
        <TimelineDragDrop
          sequences={timelineSequences}
          months={MONTHS}
          vacationBands={vacationBands}
          onDrop={handleDrop}
        />
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Progression annuelle"
        filename="progression-annuelle.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};
