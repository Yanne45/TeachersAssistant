import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import { useApp, useData, useRouter } from '../../stores';
import { CahierEntreeForm, PDFPreviewModal } from '../../components/forms';
import { classService, lessonLogService, sessionService } from '../../services';
import './CahierDeTextesPage.css';

interface LessonEntry {
  id: number;
  date: string;
  logDate: string;
  dayLabel: string;
  subjectLabel: string;
  subjectColor: string;
  subjectId: number | null;
  classLabel: string;
  classId: number | null;
  sessionId: number | null;
  title: string;
  content?: string;
  activities?: string;
  homework?: string;
  homeworkDueDate?: string;
  isLinked: boolean;
}

function mapRowsToEntries(data: any[]): LessonEntry[] {
  return data.map((d: any) => ({
    id: d.id,
    date: d.log_date ?? '-',
    logDate: d.log_date ?? '',
    dayLabel: '',
    subjectLabel: d.subject_short_label ?? d.subject_label ?? 'Matière',
    subjectColor: d.subject_color ?? '#888',
    subjectId: d.subject_id ?? null,
    classLabel: d.class_short_name ?? d.class_name ?? 'Classe',
    classId: d.class_id ?? null,
    sessionId: d.session_id ?? null,
    title: d.title ?? d.content ?? '-',
    content: d.content ?? '',
    activities: d.activities ?? undefined,
    homework: d.homework ?? undefined,
    homeworkDueDate: d.homework_due_date ?? '',
    isLinked: !!d.session_id,
  }));
}

export const CahierDeTextesPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { loadLessonLog } = useData();
  const { route, navigate: routerNav, setPage } = useRouter();
  const [entries, setEntries] = useState<LessonEntry[]>([]);
  const [classes, setClasses] = useState<Array<{ id: number | null; label: string }>>([{ id: null, label: 'Toutes' }]);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LessonEntry | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!activeYear?.id) {
      setClasses([{ id: null, label: 'Toutes' }]);
      return () => {
        cancelled = true;
      };
    }

    classService.getByYear(activeYear.id)
      .then((rows) => {
        if (cancelled) return;
        setClasses([
          { id: null, label: 'Toutes' },
          ...rows.map((row) => ({ id: row.id, label: row.short_name || row.name })),
        ]);
      })
      .catch((error) => {
        console.error('[CahierDeTextesPage] Erreur chargement classes:', error);
        if (!cancelled) {
          setClasses([{ id: null, label: 'Toutes' }]);
          addToast('error', 'Impossible de charger les classes');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeYear, addToast]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadLessonLog(activeClassId ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setEntries(mapRowsToEntries(data));
      })
      .catch((error) => {
        console.error('[CahierDeTextesPage] Erreur chargement cahier:', error);
        if (!cancelled) {
          setEntries([]);
          addToast('error', 'Impossible de charger le cahier de textes');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadLessonLog, activeClassId, addToast]);

  useEffect(() => {
    if (route.page === 'all') {
      setActiveClassId(null);
      return;
    }
    if (route.page === 'classe') {
      const parsed = Number(route.filter ?? '');
      setActiveClassId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    }
  }, [route.page, route.filter]);

  const filtered = activeClassId ? entries.filter((e) => e.classId === activeClassId) : entries;

  return (
    <div className="cahier">
      <div className="cahier__header">
        <h1 className="cahier__title">Cahier de textes</h1>
        <div className="cahier__header-actions">
          <Button
            variant="secondary"
            size="S"
            onClick={() => {
              if (entries.length === 0) {
                addToast('warn', 'Aucune entrée à exporter');
                return;
              }
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cahier de textes</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:2cm;color:#333}h1{color:#2C3E7B;border-bottom:2px solid #3DB4C6;padding-bottom:8px}
.entry{border-left:3px solid #3DB4C6;padding:8px 12px;margin:12px 0}
.date{font-weight:700;font-size:14pt}.title{font-weight:600;margin:4px 0}
.activities{color:#666;font-size:10pt}.homework{color:#F28C28;font-size:10pt;margin-top:4px}
@media print{body{margin:1.5cm}}
</style></head><body><h1>Cahier de textes</h1>
${entries
  .map(
    (e) => `<div class="entry"><div class="date">${e.date}</div><div class="title">${e.title}</div>${
      e.activities ? `<div class="activities">Activités : ${e.activities}</div>` : ''
    }${e.homework ? `<div class="homework">Devoirs : ${e.homework}</div>` : ''}</div>`,
  )
  .join('')}
</body></html>`;
              if (!html.trim()) {
                addToast('error', 'Aperçu PDF vide');
                return;
              }
              setPdfHtml(html);
            }}
          >
            Export PDF
          </Button>
          <Button
            variant="primary"
            size="S"
            onClick={() => {
              setEditingEntry(null);
              setFormOpen(true);
            }}
          >
            + Nouvelle entrée
          </Button>
        </div>
      </div>

      <div className="cahier__filters">
        {classes.map((c) => (
          <button
            key={c.label}
            className={`cahier__class-filter ${activeClassId === c.id ? 'cahier__class-filter--active' : ''}`}
            onClick={() => {
              setActiveClassId(c.id);
              if (c.id === null) setPage('all');
              else setPage('classe', String(c.id));
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading-text">Chargement…</p>
      ) : (
        <div className="cahier__list">
          {filtered.map((entry) => (
            <Card key={entry.id} borderLeftColor={entry.subjectColor} className="cahier__entry">
              <div className="cahier__entry-header">
                <div className="cahier__entry-left">
                  <span className="cahier__entry-date">{entry.date}</span>
                  {entry.dayLabel && <span className="cahier__entry-day">{entry.dayLabel}</span>}
                  <Badge variant="default" style={{ color: entry.subjectColor, backgroundColor: `${entry.subjectColor}18` }}>
                    {entry.subjectLabel}
                  </Badge>
                  <Badge variant="default">{entry.classLabel}</Badge>
                </div>
                <Badge variant={entry.isLinked ? 'success' : 'warn'}>{entry.isLinked ? 'Séance liée' : 'Non liée'}</Badge>
              </div>
              <div className="cahier__entry-body">
                <span className="cahier__entry-title">{entry.title}</span>
                {entry.activities && <span className="cahier__entry-activities">Activités : {entry.activities}</span>}
                {entry.homework && <span className="cahier__entry-homework">Devoirs : {entry.homework}</span>}
              </div>
              <div className="cahier__entry-actions">
                <Button
                  variant="ghost"
                  size="S"
                  onClick={() => {
                    setEditingEntry(entry);
                    setFormOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="S"
                  onClick={async () => {
                    if (!entry.sessionId) {
                      addToast('info', 'Aucune séance liée à cette entrée');
                      return;
                    }
                    try {
                      const session = await sessionService.getById(entry.sessionId);
                      if (!session) {
                        addToast('warn', 'Séance introuvable');
                        return;
                      }
                      routerNav({
                        tab: 'preparation',
                        page: 'sequences',
                        entityId: session.sequence_id,
                        subView: String(entry.sessionId),
                      });
                    } catch (error) {
                      console.error('[CahierDeTextesPage] Erreur ouverture seance:', error);
          addToast('error', "Impossible d'ouvrir la séance");
                    }
                  }}
                >
                  Ouvrir la séance
                </Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <EmptyState
              icon="📝"
              title="Aucune entrée dans le cahier de textes"
              description="Créez une entrée manuellement ou liez-la à une séance existante."
              actionLabel="+ Nouvelle entrée"
              onAction={() => {
                setEditingEntry(null);
                setFormOpen(true);
              }}
            />
          )}
        </div>
      )}

      <CahierEntreeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEntry(null);
        }}
        onSave={async (data) => {
          const classId = Number.parseInt(data.class_id, 10);
          const subjectId = Number.parseInt(data.subject_id, 10);
          const sessionIdRaw = Number.parseInt(data.session_id, 10);
          if (!Number.isFinite(classId) || !Number.isFinite(subjectId)) {
            addToast('error', "Impossible de sauvegarder l'entrée: données invalides");
            return;
          }

          try {
            const payload = {
              session_id: Number.isFinite(sessionIdRaw) ? sessionIdRaw : null,
              class_id: classId,
              subject_id: subjectId,
              log_date: data.log_date,
              title: data.title.trim(),
              content: data.content.trim() || null,
              activities: data.activities.trim() || null,
              homework: data.homework.trim() || null,
              homework_due_date: data.homework_due_date || null,
              source: 'manual' as const,
            };

            if (editingEntry) {
              await lessonLogService.update(editingEntry.id, payload);
              addToast('success', 'Entrée mise à jour');
            } else {
              await lessonLogService.create(payload);
              addToast('success', 'Entrée enregistrée');
            }

            const refreshed = await loadLessonLog(activeClassId ?? undefined);
            setEntries(mapRowsToEntries(refreshed));
          } catch (error) {
            console.error('[CahierDeTextesPage] Erreur sauvegarde entrée:', error);
            addToast('error', "Échec de sauvegarde de l'entrée");
          }
        }}
        initialData={
          editingEntry
            ? {
                class_id: editingEntry.classId ? String(editingEntry.classId) : '',
                subject_id: editingEntry.subjectId ? String(editingEntry.subjectId) : '',
                session_id: editingEntry.sessionId ? String(editingEntry.sessionId) : '',
                log_date: editingEntry.logDate,
                title: editingEntry.title,
                content: editingEntry.content ?? '',
                activities: editingEntry.activities ?? '',
                homework: editingEntry.homework ?? '',
                homework_due_date: editingEntry.homeworkDueDate ?? '',
              }
            : undefined
        }
      />

      <PDFPreviewModal
        html={pdfHtml ?? ''}
        title="Cahier de textes"
        filename="cahier-de-textes.html"
        open={!!pdfHtml}
        onClose={() => setPdfHtml(null)}
      />
    </div>
  );
};
