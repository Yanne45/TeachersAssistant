// ============================================================================
// SequenceDetailPage — Séquences & séances (spec §5.5)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { SortableList } from '../../components/dnd';
import { useData, useApp } from '../../stores';
import { sequenceService, sessionService } from '../../services';
import { SequenceForm, SeanceForm } from '../../components/forms';
import type { SequenceFormResult } from '../../components/forms/SequenceForm';
import './SequenceDetailPage.css';

// ── Barre de rapprochement heures ──

interface HoursBarProps {
  planned: number;       // heures prévues (programme)
  scheduled: number;     // heures programmées (somme séances créées)
  done: number;          // heures réalisées (séances done)
}

const HoursBar: React.FC<HoursBarProps> = ({ planned, scheduled, done }) => {
  const max = Math.max(planned, scheduled, 1);
  const scheduledPct = Math.min((scheduled / max) * 100, 100);
  const donePct      = Math.min((done      / max) * 100, 100);

  const ecart = scheduled - planned;
  const ecartLabel = ecart === 0 ? 'équilibré'
    : ecart > 0  ? `+${ecart.toFixed(1)}h programmées de plus`
    : `${Math.abs(ecart).toFixed(1)}h encore à programmer`;

  return (
    <div className="seq-hours-bar">
      {/* Barre */}
      <div className="seq-hours-bar__track">
        {/* Repère "prévues" */}
        <div
          className="seq-hours-bar__marker"
          style={{ left: `${Math.min((planned / max) * 100, 100)}%` }}
          title={`${planned}h prévues`}
        />
        {/* Programmées */}
        <div
          className="seq-hours-bar__fill seq-hours-bar__fill--scheduled"
          style={{ width: `${scheduledPct}%` }}
        />
        {/* Réalisées */}
        <div
          className="seq-hours-bar__fill seq-hours-bar__fill--done"
          style={{ width: `${donePct}%` }}
        />
      </div>

      {/* Légende */}
      <div className="seq-hours-bar__legend">
        <span className="seq-hours-bar__item seq-hours-bar__item--planned">
          📐 {planned}h prévues
        </span>
        <span className="seq-hours-bar__item seq-hours-bar__item--scheduled">
          🗓 {scheduled.toFixed(1)}h programmées
        </span>
        <span className="seq-hours-bar__item seq-hours-bar__item--done">
          ✓ {done.toFixed(1)}h réalisées
        </span>
        {planned > 0 && scheduled > 0 && (
          <span className={`seq-hours-bar__item seq-hours-bar__item--ecart ${ecart > 0 ? 'seq-hours-bar__item--over' : ecart < 0 ? 'seq-hours-bar__item--under' : ''}`}>
            {ecartLabel}
          </span>
        )}
      </div>
    </div>
  );
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft:       { label: 'Brouillon', color: 'var(--color-text-muted)' },
  planned:     { label: 'Planifiée', color: 'var(--color-info)' },
  in_progress: { label: 'En cours',  color: 'var(--color-primary)' },
  done:        { label: 'Terminée',  color: 'var(--color-success)' },
};

const SESSION_STATUS: Record<string, { label: string; border: string }> = {
  planned:   { label: 'Prévue',    border: 'var(--color-info)' },
  ready:     { label: 'Prête',     border: 'var(--color-primary)' },
  done:      { label: '✓ Réalisée', border: 'var(--color-success)' },
  cancelled: { label: 'Annulée',   border: 'var(--color-text-muted)' },
};

// ── Menu contextuel ──

interface ContextMenu {
  x: number;
  y: number;
  seqId: number;
}

export const SequenceDetailPage: React.FC = () => {
  const { loadSequences, loadSessions } = useData();
  const { activeYear, addToast } = useApp();
  const yearId = activeYear?.id ?? null;

  const [sequences, setSequences] = useState<any[]>([]);
  const [sessions, setSessions]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeSeqId, setActiveSeqId] = useState<number | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Forms
  const [seqFormOpen, setSeqFormOpen]     = useState(false);
  const [editingSeq, setEditingSeq]       = useState<any | null>(null);
  const [seanceFormOpen, setSeanceFormOpen] = useState(false);

  // Menu contextuel clic droit
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  // ── Chargement séquences ──
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSequences();
      setSequences(data);
      if (data.length > 0 && !activeSeqId) {
        const inProgress = data.find((s: any) => s.status === 'in_progress');
        setActiveSeqId(inProgress?.id ?? data[0].id);
      }
    } catch (err) {
      console.error('[Sequences]', err);
    } finally {
      setLoading(false);
    }
  }, [loadSequences, activeSeqId]);

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chargement séances quand séquence change ──
  useEffect(() => {
    if (!activeSeqId) { setSessions([]); return; }
    let cancelled = false;
    loadSessions(activeSeqId).then(data => {
      if (!cancelled) setSessions(data);
    });
    return () => { cancelled = true; };
  }, [activeSeqId, loadSessions]);

  const activeSeq = sequences.find(s => s.id === activeSeqId);

  // ── Réordonnancement séances ──
  const handleReorderSessions = useCallback(async (reordered: any[]) => {
    setSessions(reordered);
    if (activeSeqId) {
      try {
        await sessionService.reorder(activeSeqId, reordered.map(s => s.id));
      } catch (err) {
        console.error('[Sequence] Erreur reorder:', err);
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

  // ── Menu contextuel ──
  const openContextMenu = (e: React.MouseEvent, seqId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, seqId });
  };

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener('click', handler);
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('contextmenu', handler);
    };
  }, [contextMenu, closeContextMenu]);

  const handleContextEdit = () => {
    if (!contextMenu) return;
    const seq = sequences.find(s => s.id === contextMenu.seqId);
    if (!seq) return;
    // Charger les données complètes pour l'édition
    sequenceService.getClasses(seq.id).then(classes => {
      sequenceService.getDocuments(seq.id).then(docs => {
        setEditingSeq({
          id: seq.id,
          title: seq.title,
          subject_id: seq.subject_id,
          level_id: seq.level_id,
          description: seq.description ?? '',
          total_hours: seq.total_hours,
          start_date: seq.start_date ?? '',
          end_date: seq.end_date ?? '',
          status: seq.status,
          class_ids: classes.map((c: any) => c.class_id),
          topic_id: null, // On ne stocke pas encore le topic_id sur la séquence enrichie
          document_ids: docs.map((d: any) => d.id),
        });
        setSeqFormOpen(true);
      });
    }).catch(() => {
      setEditingSeq({ ...seq, class_ids: [], document_ids: [] });
      setSeqFormOpen(true);
    });
    closeContextMenu();
  };

  const handleContextDelete = async () => {
    if (!contextMenu) return;
    const seqId = contextMenu.seqId;
    const seq = sequences.find(s => s.id === seqId);
    closeContextMenu();
    if (!seq) return;
    if (!confirm(`Supprimer la séquence « ${seq.title} » et toutes ses séances ?`)) return;
    try {
      await sequenceService.delete(seqId);
      if (activeSeqId === seqId) setActiveSeqId(null);
      await reload();
      addToast('success', `Séquence « ${seq.title} » supprimée`);
    } catch (err) {
      addToast('error', String(err));
    }
  };

  const handleContextDuplicate = async () => {
    if (!contextMenu) return;
    const seq = sequences.find(s => s.id === contextMenu.seqId);
    closeContextMenu();
    if (!seq || !yearId) return;
    try {
      const newId = await sequenceService.create({
        academic_year_id: yearId,
        subject_id: seq.subject_id,
        level_id: seq.level_id,
        title: `${seq.title} (copie)`,
        description: seq.description,
        total_hours: seq.total_hours,
        start_date: seq.start_date,
        end_date: seq.end_date,
        status: 'draft',
        sort_order: (seq.sort_order ?? 0) + 1,
        template_id: null,
      });
      // Dupliquer les classes
      const classes = await sequenceService.getClasses(seq.id);
      if (classes.length > 0) {
        await sequenceService.setClasses(newId, classes.map((c: any) => c.class_id));
      }
      await reload();
      setActiveSeqId(newId);
      addToast('success', `Séquence dupliquée`);
    } catch (err) {
      addToast('error', String(err));
    }
  };

  // ── Sauvegarde séquence (création ou édition) ──
  const handleSaveSeq = useCallback(async (data: SequenceFormResult) => {
    if (!yearId) return;
    try {
      let seqId: number;
      if (editingSeq?.id) {
        await sequenceService.update(editingSeq.id, {
          title: data.title,
          subject_id: data.subject_id,
          level_id: data.level_id,
          description: data.description,
          total_hours: data.total_hours,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          status: data.status,
        });
        seqId = editingSeq.id;
      } else {
        seqId = await sequenceService.create({
          academic_year_id: yearId,
          subject_id: data.subject_id,
          level_id: data.level_id,
          title: data.title,
          description: data.description,
          total_hours: data.total_hours,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          status: data.status,
          sort_order: sequences.length,
          template_id: null,
        });
      }
      await sequenceService.setClasses(seqId, data.class_ids);
      if (data.topic_id) {
        await sequenceService.setTopics(seqId, [data.topic_id], data.topic_id);
      }
      await sequenceService.setDocuments(seqId, data.document_ids);
      await reload();
      setActiveSeqId(seqId);
      addToast('success', editingSeq?.id ? 'Séquence modifiée' : 'Séquence créée');
    } catch (err) {
      addToast('error', String(err));
    } finally {
      setEditingSeq(null);
    }
  }, [yearId, editingSeq, sequences.length, reload, addToast]);

  // ── Sauvegarde séance ──
  const handleSaveSeance = useCallback(async (data: any) => {
    if (!activeSeqId) return;
    try {
      await sessionService.create({
        ...data,
        sequence_id: activeSeqId,
        sort_order: sessions.length,
        session_number: sessions.length + 1,
        source: 'manual',
      });
      const updated = await loadSessions(activeSeqId);
      setSessions(updated);
      addToast('success', 'Séance ajoutée');
    } catch (err) {
      addToast('error', String(err));
    }
  }, [activeSeqId, sessions.length, loadSessions, addToast]);

  if (loading) {
    return <div className="seq-detail"><p style={{ padding: 40, color: 'var(--color-text-muted)' }}>Chargement…</p></div>;
  }

  return (
    <div className="seq-detail" onClick={closeContextMenu}>

      {/* ── Liste séquences (gauche) ── */}
      <div className="seq-detail__list">
        <div className="seq-detail__list-header">
          <span className="seq-detail__list-title">Séquences</span>
          <Button variant="primary" size="S" onClick={() => { setEditingSeq(null); setSeqFormOpen(true); }}>
            + Nouvelle
          </Button>
        </div>

        {sequences.length === 0 && (
          <div style={{ padding: '16px 8px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Aucune séquence.<br />Créez-en une avec le bouton +.
          </div>
        )}

        {sequences.map(seq => {
          const st = STATUS_STYLE[seq.status] ?? STATUS_STYLE.draft;
          return (
            <div
              key={seq.id}
              className={`seq-detail__seq-card ${activeSeqId === seq.id ? 'seq-detail__seq-card--active' : ''}`}
              style={{ borderLeftColor: seq.subject_color ?? '#888' }}
              onClick={() => setActiveSeqId(seq.id)}
              onContextMenu={e => openContextMenu(e, seq.id)}
            >
              <span className="seq-detail__seq-title">{seq.title}</span>
              <div className="seq-detail__seq-meta">
                <Badge variant="default" style={{ color: seq.subject_color, backgroundColor: `${seq.subject_color}18` }}>
                  {seq.subject_short_label ?? seq.subject_label ?? 'Matière'}
                </Badge>
                <span style={{ color: st.color, fontSize: 10, fontWeight: 600 }}>{st.label}</span>
                {seq.total_hours > 0 && (
                  <span className="seq-detail__seq-hours">{seq.total_hours}h</span>
                )}
              </div>
              {/* Mini barre de progression : réalisé / prévu (pour la séquence active, données précises) */}
              {seq.total_hours > 0 && seq.id === activeSeqId && (() => {
                const done = sessions.filter(s => s.status === 'done').reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60;
                const scheduled = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) / 60;
                const donePct = Math.min((done / seq.total_hours) * 100, 100);
                const scheduledPct = Math.min((scheduled / seq.total_hours) * 100, 100);
                return (
                  <div className="seq-detail__mini-bar" title={`${done.toFixed(1)}h / ${seq.total_hours}h`}>
                    <div className="seq-detail__mini-bar__scheduled" style={{ width: `${scheduledPct}%` }} />
                    <div className="seq-detail__mini-bar__done" style={{ width: `${donePct}%` }} />
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ── Détail séquence active ── */}
      <div className="seq-detail__main">
        {activeSeq ? (
          <>
            <div className="seq-detail__header">
              <div>
                <span className="seq-detail__context">
                  {activeSeq.class_names ?? ''}{activeSeq.level_label ? ` · ${activeSeq.level_label}` : ''}
                </span>
                <h2 className="seq-detail__title">{activeSeq.title}</h2>
              </div>
              <div className="seq-detail__badges">
                <Badge variant="default" style={{ color: activeSeq.subject_color, backgroundColor: `${activeSeq.subject_color}18` }}>
                  {activeSeq.subject_short_label ?? activeSeq.subject_label}
                </Badge>
                {activeSeq.total_hours > 0 && <Badge variant="info">{activeSeq.total_hours}h prévues</Badge>}
                <Badge variant={activeSeq.status === 'done' ? 'success' : 'default'}>
                  {STATUS_STYLE[activeSeq.status]?.label}
                </Badge>
              </div>
            </div>

            {/* Rapprochement heures */}
            {(activeSeq.total_hours > 0 || sessions.length > 0) && (() => {
              const scheduled = sessions.reduce((s, sess) => s + (sess.duration_minutes ?? 0), 0) / 60;
              const done      = sessions.filter(s => s.status === 'done').reduce((s, sess) => s + (sess.duration_minutes ?? 0), 0) / 60;
              return (
                <HoursBar
                  planned={activeSeq.total_hours ?? 0}
                  scheduled={scheduled}
                  done={done}
                />
              );
            })()}

            <div className="seq-detail__actions">
              <Button variant="secondary" size="S" onClick={async () => {
                if (!activeSeqId) return;
                try {
                  const { templateExportService, downloadBlob } = await import('../../services');
                  const json = await templateExportService.exportSequenceTemplate(activeSeqId);
                  const blob = new Blob([json], { type: 'application/json' });
                  downloadBlob(blob, `template-${activeSeq?.title ?? 'sequence'}.json`);
                } catch (e) { console.error(e); }
              }}>📋 Template</Button>
              <Button variant="secondary" size="S">🤖 Plan IA</Button>
              <Button variant="primary" size="S" onClick={() => setSeanceFormOpen(true)}>+ Séance</Button>
            </div>

            {/* Séances */}
            <SortableList
              items={sessions}
              onReorder={handleReorderSessions}
              renderItem={(sess) => {
                const expanded = expandedSessions.has(sess.id);
                const sst = SESSION_STATUS[sess.status] ?? SESSION_STATUS.planned;
                return (
                  <Card key={sess.id} className="seq-detail__session" borderLeftColor={sst.border} noHover>
                    <div className="seq-detail__session-header" onClick={() => toggleSession(sess.id)}>
                      <div className="seq-detail__session-left">
                        <span className="seq-detail__chevron">{expanded ? '▼' : '▶'}</span>
                        <span className="seq-detail__session-title">
                          Séance {sess.session_number} — {sess.title}
                        </span>
                      </div>
                      <div className="seq-detail__session-right">
                        <Badge variant="info">⏱ {Math.round((sess.duration_minutes ?? 120) / 60)}h</Badge>
                        {sess.document_count > 0 && <Badge variant="info">📄 {sess.document_count}</Badge>}
                        <Badge variant={sess.status === 'done' ? 'success' : sess.status === 'ready' ? 'info' : 'default'}>
                          {sst.label}
                        </Badge>
                      </div>
                    </div>
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
                        </div>
                      </div>
                    )}
                  </Card>
                );
              }}
            />

            {sessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-muted)', fontSize: 13 }}>
                Aucune séance. Cliquez sur « + Séance » pour commencer.
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>🧩</span>
            Sélectionnez une séquence ou créez-en une nouvelle.
          </div>
        )}
      </div>

      {/* ── Menu contextuel clic droit ── */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="seq-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button className="seq-context-menu__item" onClick={handleContextEdit}>
            ✏️ Modifier
          </button>
          <button className="seq-context-menu__item" onClick={handleContextDuplicate}>
            📋 Dupliquer
          </button>
          <div className="seq-context-menu__separator" />
          <button className="seq-context-menu__item seq-context-menu__item--danger" onClick={handleContextDelete}>
            🗑 Supprimer
          </button>
        </div>
      )}

      {/* ── Forms ── */}
      <SequenceForm
        open={seqFormOpen}
        onClose={() => { setSeqFormOpen(false); setEditingSeq(null); }}
        onSave={handleSaveSeq}
        initialData={editingSeq ?? undefined}
      />
      <SeanceForm
        open={seanceFormOpen}
        onClose={() => setSeanceFormOpen(false)}
        onSave={handleSaveSeance}
        sequenceTitle={activeSeq?.title}
      />
    </div>
  );
};
