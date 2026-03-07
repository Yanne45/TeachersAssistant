// ============================================================================
// CahierDeTextesPage — Cahier de textes (spec §5.6) — branché DataProvider
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import { useData, useRouter } from '../../stores';
import { CahierEntreeForm, PDFPreviewModal } from '../../components/forms';
import './CahierDeTextesPage.css';

interface LessonEntry {
  id: number;
  date: string;
  dayLabel: string;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  title: string;
  activities?: string;
  homework?: string;
  isLinked: boolean;
}

const MOCK_ENTRIES: LessonEntry[] = [
  { id: 1, date: '04 novembre', dayLabel: 'Mardi', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', title: 'Introduction — Le monde bipolaire', activities: 'Discours de Churchill. Carte des blocs.', homework: 'Lire le chapitre 1 du manuel (p. 12-24)', isLinked: true },
  { id: 2, date: '10 novembre', dayLabel: 'Lundi', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', title: 'Berlin, symbole de la Guerre froide', activities: 'Étude de cas : le mur de Berlin. Photographies et témoignages.', homework: 'Rédiger introduction commentaire pour le 17 novembre', isLinked: true },
  { id: 3, date: '15 septembre', dayLabel: 'Lundi', subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 2', title: 'Le monde bipolaire après 1945', activities: 'Frise chronologique. Analyse discours Truman.', homework: undefined, isLinked: true },
  { id: 4, date: '01 octobre', dayLabel: 'Mercredi', subjectLabel: 'Géo', subjectColor: '#27774E', classLabel: '1ère 3', title: 'Définition et enjeux de la métropolisation', activities: 'Carte mentale. Étude documents statistiques.', homework: 'Préparer un paragraphe sur la métropolisation', isLinked: true },
];

const CLASSES = [
  { id: null, label: 'Toutes' },
  { id: 1, label: 'Tle 2' },
  { id: 2, label: 'Tle 4' },
  { id: 3, label: '1ère 3' },
];

export const CahierDeTextesPage: React.FC = () => {
  const { loadLessonLog, isDbMode } = useData();
  const { navigate: routerNav } = useRouter();
  const [entries, setEntries] = useState<LessonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLessonLog(activeClassId ?? undefined).then(data => {
      if (cancelled) return;
      if (data.length > 0) {
        // Mapper DB → format affichage
        setEntries(data.map((d: any) => ({
          id: d.id,
          date: d.log_date ?? '—',
          dayLabel: '',
          subjectLabel: d.subject_short_label ?? d.subject_label ?? 'Matière',
          subjectColor: d.subject_color ?? '#888',
          classLabel: d.class_short_name ?? d.class_name ?? 'Classe',
          title: d.title ?? d.content ?? '—',
          activities: d.activities ?? undefined,
          homework: d.homework ?? undefined,
          isLinked: !!d.session_id,
        })));
      } else {
        setEntries(MOCK_ENTRIES);
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadLessonLog, activeClassId]);

  const filtered = activeClassId
    ? entries.filter(e => {
        const classObj = CLASSES.find(c => c.id === activeClassId);
        return classObj ? e.classLabel === classObj.label : true;
      })
    : entries;

  return (
    <div className="cahier">
      {/* Header */}
      <div className="cahier__header">
        <h1 className="cahier__title">Cahier de textes</h1>
        <div className="cahier__header-actions">
          <Button variant="secondary" size="S" onClick={() => {
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cahier de textes</title>
<style>body{font-family:'Segoe UI',sans-serif;margin:2cm;color:#333}h1{color:#2C3E7B;border-bottom:2px solid #3DB4C6;padding-bottom:8px}
.entry{border-left:3px solid #3DB4C6;padding:8px 12px;margin:12px 0}
.date{font-weight:700;font-size:14pt}.title{font-weight:600;margin:4px 0}
.activities{color:#666;font-size:10pt}.homework{color:#F28C28;font-size:10pt;margin-top:4px}
@media print{body{margin:1.5cm}}
</style></head><body><h1>Cahier de textes</h1>
${entries.map(e => `<div class="entry"><div class="date">${e.date}</div><div class="title">${e.title}</div>${e.activities ? `<div class="activities">Activités : ${e.activities}</div>` : ''}${e.homework ? `<div class="homework">📌 Devoirs : ${e.homework}</div>` : ''}</div>`).join('')}
</body></html>`;
            setPdfHtml(html);
          }}>Export PDF</Button>
          <Button variant="primary" size="S" onClick={() => setFormOpen(true)}>+ Nouvelle entrée</Button>
        </div>
      </div>

      {/* Filtres classe */}
      <div className="cahier__filters">
        {CLASSES.map(c => (
          <button
            key={c.label}
            className={`cahier__class-filter ${activeClassId === c.id ? 'cahier__class-filter--active' : ''}`}
            onClick={() => setActiveClassId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement…</p>
      ) : (
        <div className="cahier__list">
          {filtered.map(entry => (
            <Card key={entry.id} borderLeftColor={entry.subjectColor} className="cahier__entry">
              <div className="cahier__entry-header">
                <div className="cahier__entry-left">
                  <span className="cahier__entry-date">{entry.date}</span>
                  {entry.dayLabel && <span className="cahier__entry-day">{entry.dayLabel}</span>}
                  <Badge variant="default" style={{ color: entry.subjectColor, backgroundColor: `${entry.subjectColor}18` }}>{entry.subjectLabel}</Badge>
                  <Badge variant="default">{entry.classLabel}</Badge>
                </div>
                <Badge variant={entry.isLinked ? 'success' : 'warn'}>
                  {entry.isLinked ? 'Séance liée' : '⚠ Non liée'}
                </Badge>
              </div>
              <div className="cahier__entry-body">
                <span className="cahier__entry-title">{entry.title}</span>
                {entry.activities && <span className="cahier__entry-activities">Activités : {entry.activities}</span>}
                {entry.homework && <span className="cahier__entry-homework">📌 Devoirs : {entry.homework}</span>}
              </div>
              <div className="cahier__entry-actions">
                <Button variant="ghost" size="S">Modifier</Button>
                <Button variant="ghost" size="S" onClick={() => routerNav({ tab: 'preparation', page: 'sequences' })}>Ouvrir séance</Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <EmptyState
              icon="📝"
              title="Aucune entrée dans le cahier de textes"
              description="Créez une entrée manuellement ou liez-la à une séance existante."
              actionLabel="+ Nouvelle entrée"
              onAction={() => setFormOpen(true)}
            />
          )}
        </div>
      )}

      <CahierEntreeForm open={formOpen} onClose={() => setFormOpen(false)} onSave={(data) => { console.log('Save cahier:', data); setFormOpen(false); }} />

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
