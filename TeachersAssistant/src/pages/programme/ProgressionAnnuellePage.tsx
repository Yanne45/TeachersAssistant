// ============================================================================
// ProgressionAnnuellePage - Timeline horizontale (spec 5.4) - DnD + persistence
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import { PDFPreviewModal, SequenceForm } from '../../components/forms';
import type { SequenceFormResult } from '../../components/forms/SequenceForm';
import { TimelineDragDrop } from '../../components/dnd';
import type { TimelineSequence } from '../../components/dnd';
import { pdfExportService, sequenceService } from '../../services';
import { useApp, useData, useRouter } from '../../stores';
import './ProgressionAnnuellePage.css';

const MONTHS = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
const TOTAL_MONTHS = 10;

const VACATION_BANDS = [
  { label: 'Toussaint', startMonth: 1.6, durationMonths: 0.5 },
  { label: 'Noël', startMonth: 3.6, durationMonths: 0.5 },
  { label: 'Hiver', startMonth: 5.3, durationMonths: 0.5 },
  { label: 'Printemps', startMonth: 7.3, durationMonths: 0.5 },
];

interface SequenceBar {
  id: number;
  title: string;
  levelLabel: string;
  subjectColor: string;
  startMonth: number;
  durationMonths: number;
  totalHours: number;
}

const monthToPct = (m: number) => (m / TOTAL_MONTHS) * 100;
const pctToMonth = (pct: number) => (pct / 100) * TOTAL_MONTHS;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function monthFromIsoDate(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return null;
  const month = date.getMonth();
  // Academic year view: Sept (0) ... Juin (9)
  return month >= 8 ? month - 8 : month + 4;
}

function toSequenceBar(row: any, index: number): SequenceBar {
  const startFromDate = monthFromIsoDate(row.start_date);
  const endFromDate = monthFromIsoDate(row.end_date);

  const startFromSort = typeof row.sort_order === 'number' ? row.sort_order / 100 : null;
  const startMonth = clamp(startFromDate ?? startFromSort ?? index * 0.8, 0, 9.5);

  let durationMonths = 1.2;
  if (startFromDate !== null && endFromDate !== null && endFromDate >= startFromDate) {
    durationMonths = Math.max(0.8, endFromDate - startFromDate + 0.5);
  } else if (typeof row.total_hours === 'number' && row.total_hours > 0) {
    durationMonths = clamp(row.total_hours / 8, 0.8, 4);
  }

  return {
    id: row.id,
    title: row.title ?? `Séquence ${row.id}`,
    levelLabel: row.level_label ?? '-',
    subjectColor: row.subject_color ?? '#2C3E7B',
    startMonth,
    durationMonths,
    totalHours: row.total_hours ?? 0,
  };
}

export const ProgressionAnnuellePage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route } = useRouter();
  const { loadSequences } = useData();

  const [sequences, setSequences] = useState<SequenceBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [seqFormOpen, setSeqFormOpen] = useState(false);

  const mode = route.filter === 'liste' ? 'liste' : route.filter === 'classe' ? 'classe' : 'timeline';
  const totalPlanned = sequences.reduce((sum, seq) => sum + seq.totalHours, 0);
  const totalTarget = 90;

  useEffect(() => {
    let cancelled = false;

    if (!activeYear?.id) {
      setSequences([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    loadSequences()
      .then((rows) => {
        if (cancelled) return;
        setSequences(rows.map((row, index) => toSequenceBar(row, index)));
      })
      .catch((error) => {
        console.error('[ProgressionAnnuellePage] Erreur chargement sequences:', error);
        if (!cancelled) {
          setSequences([]);
          addToast('error', 'Impossible de charger les séquences');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeYear, loadSequences, addToast]);

  const timelineSequences: TimelineSequence[] = useMemo(
    () => sequences.map((seq) => ({
      id: seq.id,
      title: seq.title,
      subjectColor: seq.subjectColor,
      totalHours: seq.totalHours,
      startPct: monthToPct(seq.startMonth),
      widthPct: monthToPct(seq.durationMonths),
    })),
    [sequences],
  );

  const vacationBands = VACATION_BANDS.map((v) => ({
    startPct: monthToPct(v.startMonth),
    widthPct: monthToPct(v.durationMonths),
    label: v.label,
  }));

  const sequencesByLevel = useMemo(() => {
    const grouped = new Map<string, SequenceBar[]>();
    for (const seq of sequences) {
      const key = seq.levelLabel || '-';
      const bucket = grouped.get(key) ?? [];
      bucket.push(seq);
      grouped.set(key, bucket);
    }
    return Array.from(grouped.entries());
  }, [sequences]);

  const handleExportPDF = async () => {
    if (!activeYear?.id) {
      addToast('warn', 'Aucune année active');
      return;
    }
    setExportingPdf(true);
    try {
      const html = await pdfExportService.buildProgressionHTML(activeYear.id);
      if (!html.trim()) {
        addToast('error', 'Aperçu PDF vide');
        return;
      }
      setPdfHtml(html);
    } catch (error) {
      console.error('[ProgressionAnnuellePage] Erreur export PDF:', error);
      addToast('error', 'Erreur export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDrop = useCallback(
    async (sequenceId: number | string, newStartPct: number) => {
      const newStartMonth = Math.round(pctToMonth(newStartPct) * 10) / 10;

      setSequences((prev) => prev.map((seq) => (
        seq.id === sequenceId ? { ...seq, startMonth: newStartMonth } : seq
      )));

      try {
        const numericId = typeof sequenceId === 'string' ? Number.parseInt(sequenceId, 10) : sequenceId;
        await sequenceService.update(numericId, { sort_order: Math.round(newStartMonth * 100) });
      } catch (error) {
        console.error('[ProgressionAnnuellePage] Erreur persistence position:', error);
        addToast('error', 'Erreur de sauvegarde de la position');
      }
    },
    [addToast],
  );

  const handleCreateSequence = useCallback(async (data: SequenceFormResult) => {
    if (!activeYear?.id) {
      addToast('warn', 'Aucune année active');
      return;
    }

    try {
      const seqId = await sequenceService.create({
        academic_year_id: activeYear.id,
        subject_id: data.subject_id,
        level_id: data.level_id,
        title: data.title,
        description: data.description,
        total_hours: data.total_hours,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status as any,
        sort_order: sequences.length,
        template_id: null,
      });
      await sequenceService.setClasses(seqId, data.class_ids);
      if (data.topic_id) {
        await sequenceService.setTopics(seqId, [data.topic_id], data.topic_id);
      }
      await sequenceService.setDocuments(seqId, data.document_ids);

      const rows = await loadSequences();
      setSequences(rows.map((row, index) => toSequenceBar(row, index)));
      addToast('success', 'Séquence créée');
    } catch (error) {
      console.error('[ProgressionAnnuellePage] Erreur création séquence:', error);
      addToast('error', 'Échec création séquence');
    }
  }, [activeYear, sequences.length, loadSequences, addToast]);

  if (!activeYear?.id) {
    return (
      <div className="progression-page">
        <EmptyState icon="📚" title="Aucune année active" description="Activez une année scolaire dans Paramètres." />
      </div>
    );
  }

  return (
    <div className="progression-page">
      <div className="progression-page__layout">
        <div className="progression-page__panel">
          <h3 className="progression-page__panel-title">Séquences de l'année</h3>
          <Badge variant="filter" active>
            Heures programmées : {totalPlanned} / {totalTarget}
          </Badge>
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Badge variant="info">
              {mode === 'timeline' ? 'Vue timeline' : mode === 'liste' ? 'Vue liste' : 'Vue compacte'}
            </Badge>
          </div>

          <div className="progression-page__seq-list">
            {sequences.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Aucune séquence trouvée.</p>
            ) : (
              sequences.map((seq) => (
                <Card key={seq.id} borderLeftColor={seq.subjectColor} compact className="progression-page__seq-card">
                  <span className="progression-page__seq-title">{seq.title}</span>
                  <span className="progression-page__seq-hours">{seq.totalHours}h prévues</span>
                </Card>
              ))
            )}
          </div>

          <Button variant="secondary" size="S" fullWidth onClick={() => setSeqFormOpen(true)}>
            + Nouvelle séquence
          </Button>
          <Button variant="secondary" size="S" fullWidth onClick={handleExportPDF} loading={exportingPdf} style={{ marginTop: 8 }}>
            Export PDF
          </Button>
        </div>

        {loading ? (
          <Card noHover style={{ flex: 1 }}>
            <p className="loading-text" style={{ margin: 0 }}>Chargement…</p>
          </Card>
        ) : mode === 'timeline' ? (
          sequences.length > 0 ? (
            <TimelineDragDrop
              sequences={timelineSequences}
              months={MONTHS}
              vacationBands={vacationBands}
              onDrop={handleDrop}
            />
          ) : (
            <Card noHover style={{ flex: 1 }}>
              <EmptyState icon="🗓️" title="Aucune séquence à afficher" description="Créez d'abord des séquences pour construire la progression." />
            </Card>
          )
        ) : mode === 'liste' ? (
          <Card noHover style={{ flex: 1 }}>
            <h3 className="progression-page__panel-title" style={{ marginBottom: 10 }}>Liste des séquences</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {sequences.map((seq) => (
                <div key={seq.id} style={{ border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ fontSize: 12 }}>{seq.title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{seq.totalHours}h</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    Début: {MONTHS[Math.floor(seq.startMonth)] ?? `M${Math.floor(seq.startMonth) + 1}`} · {seq.durationMonths.toFixed(1)} mois
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card noHover style={{ flex: 1 }}>
            <h3 className="progression-page__panel-title" style={{ marginBottom: 10 }}>Vue compacte par niveau</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {sequencesByLevel.map(([levelLabel, levelSequences]) => {
                const hours = levelSequences.reduce((sum, seq) => sum + seq.totalHours, 0);
                return (
                  <div key={levelLabel} style={{ border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '8px 10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong style={{ fontSize: 12 }}>{levelLabel}</strong>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{hours}h</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {levelSequences.map((seq) => (
                        <Badge key={seq.id} variant="default" style={{ borderColor: seq.subjectColor }}>
                          {seq.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sequencesByLevel.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>Aucune séquence trouvée.</p>
              )}
            </div>
          </Card>
        )}
      </div>

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Progression annuelle"
        filename="progression-annuelle.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
      <SequenceForm
        open={seqFormOpen}
        onClose={() => setSeqFormOpen(false)}
        onSave={(data) => { void handleCreateSequence(data); }}
      />
    </div>
  );
};
