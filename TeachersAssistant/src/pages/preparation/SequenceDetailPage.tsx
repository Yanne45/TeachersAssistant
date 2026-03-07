// ============================================================================
// SequenceDetailPage — Séquences & séances (spec §5.5) — branché DataProvider
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { SortableList } from '../../components/dnd';
import { useData } from '../../stores';
import { sequenceService } from '../../services';
import { MOCK_SEQUENCES, MOCK_SESSIONS } from '../../stores/mockData';
import { SequenceForm, SeanceForm } from '../../components/forms';
import './SequenceDetailPage.css';

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'var(--color-text-muted)' },
  planned: { label: 'Planifiée', color: 'var(--color-info)' },
  in_progress: { label: 'En cours', color: 'var(--color-primary)' },
  done: { label: 'Terminée', color: 'var(--color-success)' },
};

const SESSION_STATUS: Record<string, { label: string; border: string }> = {
  planned: { label: 'Prévue', border: 'var(--color-info)' },
  ready: { label: 'Prête', border: 'var(--color-primary)' },
  done: { label: '✓ Réalisée', border: 'var(--color-success)' },
  cancelled: { label: 'Annulée', border: 'var(--color-text-muted)' },
};

export const SequenceDetailPage: React.FC = () => {
  const { loadSequences, loadSessions, isDbMode } = useData();

  const [sequences, setSequences] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeqId, setActiveSeqId] = useState<number | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Forms
  const [seqFormOpen, setSeqFormOpen] = useState(false);
  const [seanceFormOpen, setSeanceFormOpen] = useState(false);

  // Load sequences
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSequences().then(data => {
      if (cancelled) return;
      const seqs = data.length > 0 ? data : MOCK_SEQUENCES;
      setSequences(seqs);
      if (seqs.length > 0 && !activeSeqId) {
        const inProgress = seqs.find((s: any) => s.status === 'in_progress');
        setActiveSeqId(inProgress?.id ?? seqs[0].id);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadSequences]);

  // Load sessions when sequence changes
  useEffect(() => {
    if (!activeSeqId) { setSessions([]); return; }
    let cancelled = false;
    loadSessions(activeSeqId).then(data => {
      if (cancelled) return;
      setSessions(data.length > 0 ? data : MOCK_SESSIONS);
    });
    return () => { cancelled = true; };
  }, [activeSeqId, loadSessions]);

  const activeSeq = sequences.find(s => s.id === activeSeqId);

  const handleReorderSessions = useCallback(async (reordered: any[]) => {
    setSessions(reordered);
    // Persist new sort_order to DB
    if (activeSeqId) {
      try {
        const orderedIds = reordered.map(s => s.id);
        await sequenceService.reorder(activeSeqId, orderedIds);
      } catch (err) {
        console.error('[Sequence] Erreur persistence reorder:', err);
      }
    }
  }, [activeSeqId]);

  const toggleSession = (id: number) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="seq-detail"><p style={{ padding: 40, color: 'var(--color-text-muted)' }}>Chargement…</p></div>;
  }

  return (
    <div className="seq-detail">
      {/* Liste séquences (sidebar-like) */}
      <div className="seq-detail__list">
        <div className="seq-detail__list-header">
          <span className="seq-detail__list-title">Séquences</span>
          <Button variant="primary" size="S" onClick={() => setSeqFormOpen(true)}>+ Nouvelle</Button>
        </div>
        {sequences.map(seq => {
          const st = STATUS_STYLE[seq.status] ?? STATUS_STYLE.draft;
          return (
            <div
              key={seq.id}
              className={`seq-detail__seq-card ${activeSeqId === seq.id ? 'seq-detail__seq-card--active' : ''}`}
              style={{ borderLeftColor: seq.subject_color ?? '#888' }}
              onClick={() => setActiveSeqId(seq.id)}
            >
              <span className="seq-detail__seq-title">{seq.title}</span>
              <div className="seq-detail__seq-meta">
                <Badge variant="default" style={{ color: seq.subject_color, backgroundColor: `${seq.subject_color}18` }}>
                  {seq.subject_short_label ?? 'Matière'}
                </Badge>
                <span style={{ color: st.color, fontSize: 10, fontWeight: 600 }}>{st.label}</span>
                <span className="seq-detail__seq-hours">{seq.total_hours}h</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail séquence active */}
      <div className="seq-detail__main">
        {activeSeq ? (
          <>
            {/* En-tête */}
            <div className="seq-detail__header">
              <div>
                <span className="seq-detail__context">{activeSeq.class_names ?? ''} · {activeSeq.level_short_label ?? ''}</span>
                <h2 className="seq-detail__title">{activeSeq.title}</h2>
              </div>
              <div className="seq-detail__badges">
                <Badge variant="default" style={{ color: activeSeq.subject_color, backgroundColor: `${activeSeq.subject_color}18` }}>
                  {activeSeq.subject_short_label}
                </Badge>
                <Badge variant="info">{activeSeq.total_hours}h prévues</Badge>
                <Badge variant={activeSeq.status === 'done' ? 'success' : 'default'}>
                  {STATUS_STYLE[activeSeq.status]?.label}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="seq-detail__actions">
              <Button variant="secondary" size="S" onClick={async () => {
                if (!activeSeqId) return;
                try {
                  const { templateExportService, downloadBlob } = await import('../../services');
                  const json = await templateExportService.exportSequenceTemplate(activeSeqId);
                  const blob = new Blob([json], { type: 'application/json' });
                  downloadBlob(blob, `template-${activeSeq?.title ?? 'sequence'}.json`);
                } catch (e) { console.error(e); }
              }}>📋 Sauver comme template</Button>
              <Button variant="secondary" size="S">🤖 Générer plan IA</Button>
              <Button variant="primary" size="S" onClick={() => setSeanceFormOpen(true)}>+ Ajouter séance</Button>
            </div>

            {/* Accordéon séances */}
            <div className="seq-detail__sessions">
              {sessions.map(sess => {
                const expanded = expandedSessions.has(sess.id);
                const sst = SESSION_STATUS[sess.status] ?? SESSION_STATUS.planned;
                return (
                  <Card key={sess.id} className="seq-detail__session" borderLeftColor={sst.border} noHover>
                    {/* Header cliquable */}
                    <div className="seq-detail__session-header" onClick={() => toggleSession(sess.id)}>
                      <div className="seq-detail__session-left">
                        <span className="seq-detail__chevron">{expanded ? '▼' : '▶'}</span>
                        <span className="seq-detail__session-title">Séance {sess.session_number} — {sess.title}</span>
                      </div>
                      <div className="seq-detail__session-right">
                        <Badge variant="info">⏱ {Math.round((sess.duration_minutes ?? 120) / 60)}h</Badge>
                        {sess.document_count > 0 && <Badge variant="info">📄 {sess.document_count}</Badge>}
                        <Badge variant={sess.status === 'done' ? 'success' : sess.status === 'ready' ? 'info' : 'default'}>
                          {sst.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Contenu déplié */}
                    {expanded && (
                      <div className="seq-detail__session-body">
                        {sess.objectives && (
                          <div className="seq-detail__session-section">
                            <span className="seq-detail__section-label">🎯 Objectifs</span>
                            <p className="seq-detail__section-text">{sess.objectives}</p>
                          </div>
                        )}
                        {sess.lesson_plan && (
                          <div className="seq-detail__session-section">
                            <span className="seq-detail__section-label">📋 Déroulé</span>
                            <p className="seq-detail__section-text" style={{ whiteSpace: 'pre-line' }}>{sess.lesson_plan}</p>
                          </div>
                        )}
                        <div className="seq-detail__session-actions">
                          <Button variant="secondary" size="S">🤖 Générer déroulé IA</Button>
                          <Button variant="secondary" size="S">📝 Cahier de textes</Button>
                          <Button variant="ghost" size="S">Ouvrir en plein écran</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
              {sessions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Aucune séance. Cliquez sur « + Ajouter séance » pour commencer.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>🧩</span>
            Sélectionnez une séquence ou créez-en une nouvelle.
          </div>
        )}
      </div>

      {/* Forms */}
      <SequenceForm open={seqFormOpen} onClose={() => setSeqFormOpen(false)} onSave={(data) => { console.log('Save séquence:', data); setSeqFormOpen(false); }} />
      <SeanceForm open={seanceFormOpen} onClose={() => setSeanceFormOpen(false)} onSave={(data) => { console.log('Save séance:', data); setSeanceFormOpen(false); }} sequenceTitle={activeSeq?.title} />
    </div>
  );
};
