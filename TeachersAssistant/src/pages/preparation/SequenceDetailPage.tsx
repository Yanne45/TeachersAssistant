import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, Badge, Button, StatusBadge, ConfirmDialog, EmptyState } from '../../components/ui';
import { SortableList } from '../../components/dnd';
import { useApp, useData, useRouter } from '../../stores';
import {
  aiGenerationService,
  downloadBlob,
  lessonLogService,
  sequenceService,
  sessionService,
  templateExportService,
} from '../../services';
import { SEQUENCE_STATUS_META, SESSION_STATUS_META } from '../../constants/statuses';
import { SequenceForm, SeanceForm } from '../../components/forms';
import type { SequenceFormResult } from '../../components/forms/SequenceForm';
import './SequenceDetailPage.css';

interface ContextMenu {
  x: number;
  y: number;
  seqId: number;
}

function toIsoDate(value?: string | null): string {
  return value || new Date().toISOString().split('T')[0] || new Date().toISOString();
}

export const SequenceDetailPage: React.FC = () => {
  const { loadSequences, loadSessions } = useData();
  const { activeYear, addToast } = useApp();
  const { route, navigate } = useRouter();

  const [sequences, setSequences] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSeqId, setActiveSeqId] = useState<number | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const [seqFormOpen, setSeqFormOpen] = useState(false);
  const [editingSeq, setEditingSeq] = useState<any | null>(null);
  const [seanceFormOpen, setSeanceFormOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const [deleteSeqTarget, setDeleteSeqTarget] = useState<any | null>(null);
  const [deletingSeq, setDeletingSeq] = useState(false);

  const yearId = activeYear?.id ?? null;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadSequences();
      setSequences(data);
      if (data.length > 0 && !activeSeqId) {
        const inProgress = data.find((s: any) => s.status === 'in_progress');
        setActiveSeqId(inProgress?.id ?? data[0].id ?? null);
      }
    } catch (error) {
      console.error('[SequenceDetailPage] Erreur chargement sequences:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSeqId, loadSequences]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!activeSeqId) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    loadSessions(activeSeqId).then((data) => {
      if (!cancelled) setSessions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSeqId, loadSessions]);

  const showTemplatesOnly = route.page === 'templates';
  const showInProgressOnly = route.filter === 'in_progress';

  const visibleSequences = sequences.filter((seq) => {
    if (showTemplatesOnly && !seq.template_id) return false;
    if (showInProgressOnly && seq.status !== 'in_progress') return false;
    return true;
  });

  useEffect(() => {
    if (visibleSequences.length === 0) {
      setActiveSeqId(null);
      return;
    }
    if (!visibleSequences.some((s) => s.id === activeSeqId)) {
      setActiveSeqId(visibleSequences[0]?.id ?? null);
    }
  }, [visibleSequences, activeSeqId]);

  useEffect(() => {
    const routeSeqId = Number.parseInt(String(route.entityId ?? ''), 10);
    if (!Number.isFinite(routeSeqId) || routeSeqId <= 0) return;
    if (!visibleSequences.some((seq) => seq.id === routeSeqId)) return;
    setActiveSeqId(routeSeqId);
  }, [route.entityId, visibleSequences]);

  useEffect(() => {
    const routeSessionId = Number.parseInt(String(route.subView ?? ''), 10);
    if (!Number.isFinite(routeSessionId) || routeSessionId <= 0) return;
    if (!sessions.some((sess) => sess.id === routeSessionId)) return;
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.add(routeSessionId);
      return next;
    });
  }, [route.subView, sessions]);

  const activeSeq = visibleSequences.find((s) => s.id === activeSeqId) ?? null;

  const toggleSession = (id: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReorderSessions = useCallback(async (reordered: any[]) => {
    setSessions(reordered);
    if (!activeSeqId) return;
    try {
      await sessionService.reorder(activeSeqId, reordered.map((s) => s.id));
    } catch (error) {
      console.error('[SequenceDetailPage] Erreur reorder sessions:', error);
      addToast('error', 'Erreur de reordonnancement');
    }
  }, [activeSeqId, addToast]);

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
          status: data.status as any,
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
          status: data.status as any,
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
    } catch (error) {
      addToast('error', String(error));
    } finally {
      setEditingSeq(null);
    }
  }, [yearId, editingSeq, sequences.length, reload, addToast]);

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
    } catch (error) {
      addToast('error', String(error));
    }
  }, [activeSeqId, sessions.length, loadSessions, addToast]);

  const handleGenerateSequencePlan = useCallback(async () => {
    if (!activeSeqId || !activeSeq) return;
    try {
      const gen = await aiGenerationService.generate({
        taskCode: 'generate_session_outline',
        variables: {
          sequence_titre: activeSeq.title ?? 'Sequence',
          niveau: activeSeq.level_label ?? '',
          objectifs_sequence: activeSeq.description ?? '',
          duree_totale: `${activeSeq.total_hours ?? 0}h`,
          seances_prevues: String(sessions.length),
        },
        contextEntityType: 'sequence',
        contextEntityId: activeSeqId,
        subjectId: activeSeq.subject_id,
        levelId: activeSeq.level_id,
      });
      const content = String(gen?.output_content ?? gen?.processed_result ?? '').trim();
      if (!content) {
        addToast('warn', 'Plan IA vide');
        return;
      }
      await sequenceService.update(activeSeqId, { description: content });
      await reload();
      addToast('success', 'Plan IA généré et enregistré');
    } catch (error) {
      console.error('[SequenceDetailPage] Erreur plan IA:', error);
      addToast('error', 'Échec génération plan IA');
    }
  }, [activeSeqId, activeSeq, sessions.length, reload, addToast]);

  const handleGenerateSessionPlan = useCallback(async (session: any) => {
    if (!activeSeqId || !activeSeq) return;
    try {
      const gen = await aiGenerationService.generate({
        taskCode: 'generate_session_outline',
        variables: {
          sequence_titre: activeSeq.title ?? 'Séquence',
          seance_titre: session.title ?? 'Séance',
          objectifs_sequence: activeSeq.description ?? '',
          duree_seance: `${Math.round((session.duration_minutes ?? 120) / 60)}h`,
          objectifs_seance: session.objectives ?? '',
        },
        contextEntityType: 'session',
        contextEntityId: session.id,
        subjectId: activeSeq.subject_id,
        levelId: activeSeq.level_id,
        sequenceId: activeSeqId,
        sessionId: session.id,
      });
      const content = String(gen?.output_content ?? gen?.processed_result ?? '').trim();
      if (!content) {
        addToast('warn', 'Déroulé IA vide');
        return;
      }
      await sessionService.update(session.id, { lesson_plan: content });
      const updated = await loadSessions(activeSeqId);
      setSessions(updated);
      addToast('success', `Déroulé IA généré pour la séance ${session.session_number}`);
    } catch (error) {
      console.error('[SequenceDetailPage] Erreur déroulé IA:', error);
      addToast('error', 'Échec génération déroulé IA');
    }
  }, [activeSeqId, activeSeq, loadSessions, addToast]);

  const handlePushSessionToLessonLog = useCallback(async (session: any) => {
    if (!activeSeqId || !activeSeq) return;
    try {
      const classes = await sequenceService.getClasses(activeSeqId);
      const targetClass = classes[0];
      if (!targetClass) {
        addToast('warn', 'Aucune classe liée à cette séquence');
        return;
      }

      await lessonLogService.create({
        session_id: session.id,
        class_id: targetClass.class_id,
        subject_id: activeSeq.subject_id,
        log_date: toIsoDate(session.session_date),
        title: session.title,
        content: session.lesson_plan ?? '',
        activities: session.activities ?? '',
        homework: null,
        homework_due_date: null,
        source: 'session',
      });

      addToast('success', 'Entrée cahier créée');
      navigate({ tab: 'cahier', page: 'classe', filter: String(targetClass.class_id) });
    } catch (error) {
      console.error('[SequenceDetailPage] Erreur creation cahier:', error);
      addToast('error', 'Échec création entrée cahier');
    }
  }, [activeSeqId, activeSeq, addToast, navigate]);

  if (loading) {
    return <div className="seq-detail"><p className="loading-text">Chargement…</p></div>;
  }

  return (
    <div className="seq-detail" onClick={closeContextMenu}>
      <div className="seq-detail__list">
        <div className="seq-detail__list-header">
          <span className="seq-detail__list-title">Séquences</span>
          <Button variant="primary" size="S" onClick={() => { setEditingSeq(null); setSeqFormOpen(true); }}>+ Nouvelle</Button>
        </div>

        {visibleSequences.length === 0 && (
          <EmptyState
            icon="📚"
            title="Aucune séquence"
            description="Créez votre première séquence pour commencer la préparation."
            actionLabel="+ Nouvelle séquence"
            onAction={() => { setEditingSeq(null); setSeqFormOpen(true); }}
          />
        )}

        {visibleSequences.map((seq) => (
            <div
              key={seq.id}
              className={`seq-detail__seq-card ${activeSeqId === seq.id ? 'seq-detail__seq-card--active' : ''}`}
              style={{ borderLeftColor: seq.subject_color ?? '#888' }}
              onClick={() => setActiveSeqId(seq.id)}
              onContextMenu={(e) => openContextMenu(e, seq.id)}
            >
              <span className="seq-detail__seq-title">{seq.title}</span>
              <div className="seq-detail__seq-meta">
                <Badge variant="default" style={{ color: seq.subject_color, backgroundColor: `${seq.subject_color}18` }}>
                  {seq.subject_short_label ?? seq.subject_label ?? 'Matière'}
                </Badge>
                <StatusBadge meta={SEQUENCE_STATUS_META} value={seq.status} />
                {seq.total_hours > 0 && <span className="seq-detail__seq-hours">{seq.total_hours}h</span>}
              </div>
            </div>
        ))}
      </div>

      <div className="seq-detail__main">
        {activeSeq ? (
          <>
            <div className="seq-detail__header">
              <div>
                <span className="seq-detail__context">{activeSeq.class_names ?? ''}</span>
                <h2 className="seq-detail__title">{activeSeq.title}</h2>
              </div>
              <div className="seq-detail__badges">
                <Badge variant="default" style={{ color: activeSeq.subject_color, backgroundColor: `${activeSeq.subject_color}18` }}>
                  {activeSeq.subject_short_label ?? activeSeq.subject_label}
                </Badge>
                <StatusBadge meta={SEQUENCE_STATUS_META} value={activeSeq.status} />
              </div>
            </div>

            <div className="seq-detail__actions">
              <Button variant="secondary" size="S" onClick={async () => {
                if (!activeSeqId) return;
                const json = await templateExportService.exportSequenceTemplate(activeSeqId);
                const blob = new Blob([json], { type: 'application/json' });
                downloadBlob(blob, `template-${activeSeq?.title ?? 'sequence'}.json`);
              }}>Template</Button>
              <Button variant="secondary" size="S" onClick={() => void handleGenerateSequencePlan()}>Plan IA</Button>
              <Button variant="primary" size="S" onClick={() => setSeanceFormOpen(true)}>+ Séance</Button>
            </div>

            <SortableList
              items={sessions}
              onReorder={handleReorderSessions}
              renderItem={(sess) => {
                const expanded = expandedSessions.has(sess.id);
                const sessMeta = SESSION_STATUS_META[sess.status as keyof typeof SESSION_STATUS_META];
                const borderColor = sessMeta?.color ?? 'var(--color-info)';
                return (
                  <Card key={sess.id} className="seq-detail__session" borderLeftColor={borderColor} noHover>
                    <div className="seq-detail__session-header" onClick={() => toggleSession(sess.id)}>
                      <div className="seq-detail__session-left">
                        <span className="seq-detail__chevron">{expanded ? '▼' : '▶'}</span>
                        <span className="seq-detail__session-title">Séance {sess.session_number} - {sess.title}</span>
                      </div>
                      <div className="seq-detail__session-right">
                        <Badge variant="info">{Math.round((sess.duration_minutes ?? 120) / 60)}h</Badge>
                        <StatusBadge meta={SESSION_STATUS_META} value={sess.status} />
                      </div>
                    </div>
                    {expanded && (
                      <div className="seq-detail__session-body">
                        {sess.lesson_plan && (
                          <div className="seq-detail__session-section">
                            <span className="seq-detail__section-label">Déroulé</span>
                            <p className="seq-detail__section-text" style={{ whiteSpace: 'pre-line' }}>{sess.lesson_plan}</p>
                          </div>
                        )}
                        <div className="seq-detail__session-actions">
                          <Button variant="secondary" size="S" onClick={() => void handleGenerateSessionPlan(sess)}>Générer déroulé IA</Button>
                          <Button variant="secondary" size="S" onClick={() => void handlePushSessionToLessonLog(sess)}>Cahier de textes</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Sélectionnez une séquence.</div>
        )}
      </div>

      {contextMenu && (
        <div ref={contextRef} className="seq-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <button className="seq-context-menu__item" onClick={() => {
            const seq = sequences.find((s) => s.id === contextMenu.seqId);
            if (!seq) return;
            setEditingSeq({ ...seq, class_ids: [], document_ids: [] });
            setSeqFormOpen(true);
            closeContextMenu();
          }}>Modifier</button>
          <button className="seq-context-menu__item seq-context-menu__item--danger" onClick={() => {
            const seq = sequences.find((s) => s.id === contextMenu.seqId);
            closeContextMenu();
            if (!seq) return;
            setDeleteSeqTarget(seq);
          }}>Supprimer</button>
        </div>
      )}

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

      <ConfirmDialog
        open={deleteSeqTarget !== null}
        onClose={() => setDeleteSeqTarget(null)}
        onConfirm={async () => {
          if (!deleteSeqTarget) return;
          setDeletingSeq(true);
          try {
            await sequenceService.delete(deleteSeqTarget.id);
            await reload();
            addToast('success', 'Séquence supprimée');
          } catch (error) {
            console.error('[SequenceDetailPage] Erreur suppression:', error);
            addToast('error', 'Échec de la suppression');
          } finally {
            setDeletingSeq(false);
            setDeleteSeqTarget(null);
          }
        }}
        title="Supprimer la séquence"
        message={`Supprimer la séquence « ${deleteSeqTarget?.title ?? ''} » et toutes ses séances ? Cette action est irréversible.`}
        loading={deletingSeq}
      />
    </div>
  );
};
