// ============================================================================
// ProgrammeOfficielPage — Programme officiel (branchement DB)
// Affiche les thèmes et chapitres depuis program_topics,
// avec le nombre de séquences liées et le statut d'évaluation.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import { useApp, useRouter } from '../../stores';
import { db } from '../../services/db';
import './ProgrammeOfficielPage.css';

// ── Types ──

interface Chapter {
  id: number;
  code: string;
  title: string;
  expected_hours: number | null;
  sequenceCount: number;
  isEvaluated: boolean;
}

interface Theme {
  id: number;
  code: string;
  title: string;
  expected_hours: number | null;
  chapters: Chapter[];
  coveragePercent: number;
}

interface SubjectInfo {
  id: number;
  code: string;
  label: string;
  short_label: string;
  color: string;
}

interface LevelInfo {
  id: number;
  code: string;
  label: string;
}

// ── Composant ──

export const ProgrammeOfficielPage: React.FC = () => {
  const { addToast } = useApp();
  const { route } = useRouter();
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [openThemes, setOpenThemes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Charger matières et niveaux (une seule fois)
  useEffect(() => {
    (async () => {
      try {
        const subs = await db.select<SubjectInfo[]>('SELECT id, code, label, short_label, color FROM subjects ORDER BY sort_order');
        const lvls = await db.select<LevelInfo[]>('SELECT id, code, label FROM levels ORDER BY sort_order');
        setSubjects(subs);
        setLevels(lvls);

        // Sélection initiale par défaut
        if (subs.length > 0) {
          const first = subs[0];
          if (first) setSelectedSubject(first.id);
        }
        if (lvls.length > 0) {
          const last = lvls[lvls.length - 1];
          if (last) setSelectedLevel(last.id); // Terminale par défaut
        }
      } catch (err) {
        console.error('[Programme] Erreur chargement matières/niveaux:', err);
      }
    })();
  }, []);

  // Réagir au filtre sidebar (changement de matière via sidebar)
  useEffect(() => {
    if (!route.filter || subjects.length === 0) return;

    const filterMap: Record<string, string> = {
      hggsp: 'HGGSP',
      histoire: 'HIST',
      geo: 'GEO',
    };
    const code = filterMap[route.filter];
    if (code) {
      const s = subjects.find(x => x.code === code);
      if (s) setSelectedSubject(s.id);
    }
  }, [route.filter, subjects]);

  // Charger les thèmes quand matière/niveau change
  useEffect(() => {
    if (!selectedSubject || !selectedLevel) {
      setThemes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Charger les thèmes (parent_id IS NULL)
        const dbThemes = await db.select<{
          id: number; code: string; title: string; expected_hours: number | null;
        }[]>(
          `SELECT id, code, title, expected_hours
           FROM program_topics
           WHERE subject_id = ? AND level_id = ? AND parent_id IS NULL AND topic_type = 'theme'
           ORDER BY sort_order`,
          [selectedSubject, selectedLevel]
        );

        if (cancelled) return;

        // Pour chaque thème, charger chapitres + stats
        const themesWithChapters: Theme[] = [];

        for (const t of dbThemes) {
          const chapters = await db.select<{
            id: number; code: string; title: string; expected_hours: number | null;
          }[]>(
            `SELECT id, code, title, expected_hours
             FROM program_topics
             WHERE parent_id = ? AND topic_type = 'chapter'
             ORDER BY sort_order`,
            [t.id]
          );

          const chaptersWithStats: Chapter[] = [];
          let coveredChapters = 0;

          for (const ch of chapters) {
            // Nombre de séquences liées
            const seqResult = await db.selectOne<{ cnt: number }>(
              `SELECT COUNT(*) as cnt FROM sequence_program_topics WHERE program_topic_id = ?`,
              [ch.id]
            );
            const sequenceCount = seqResult?.cnt ?? 0;

            // Evaluations liées (via séquences → assignments)
            const evalResult = await db.selectOne<{ cnt: number }>(
              `SELECT COUNT(*) as cnt FROM assignments a
               JOIN sequences s ON s.id = a.sequence_id
               JOIN sequence_program_topics spt ON spt.sequence_id = s.id
               WHERE spt.program_topic_id = ? AND a.is_graded = 1`,
              [ch.id]
            );
            const isEvaluated = (evalResult?.cnt ?? 0) > 0;

            if (sequenceCount > 0) coveredChapters++;
            chaptersWithStats.push({ ...ch, sequenceCount, isEvaluated });
          }

          const coveragePercent = chapters.length > 0
            ? Math.round((coveredChapters / chapters.length) * 100)
            : 0;

          themesWithChapters.push({
            ...t,
            chapters: chaptersWithStats,
            coveragePercent,
          });
        }

        if (!cancelled) {
          setThemes(themesWithChapters);
          const firstTheme = themesWithChapters[0];
          if (firstTheme) {
            setOpenThemes(new Set([firstTheme.id]));
          }
        }
      } catch (err) {
        console.error('[Programme] Erreur chargement programme:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedSubject, selectedLevel]);

  const toggleTheme = (id: number) => {
    setOpenThemes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const currentLevel = levels.find(l => l.id === selectedLevel);
  const subjectColor = currentSubject?.color ?? '#7B3FA0';

  return (
    <div className="programme-page">
      {/* Barre supérieure */}
      <div className="programme-page__toolbar">
        <div>
          <span className="programme-page__context">
            {currentSubject?.short_label ?? 'Matière'} — {currentLevel?.label ?? 'Niveau'}
          </span>
          <h1 className="programme-page__title">Programme officiel</h1>
        </div>
        <div className="programme-page__actions">
          {/* Sélecteurs matière / niveau */}
          <select
            value={selectedSubject ?? ''}
            onChange={e => setSelectedSubject(Number(e.target.value))}
            style={{ height: 32, border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '0 8px', fontSize: 12 }}
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.short_label}</option>)}
          </select>
          <select
            value={selectedLevel ?? ''}
            onChange={e => setSelectedLevel(Number(e.target.value))}
            style={{ height: 32, border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '0 8px', fontSize: 12 }}
          >
            {levels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <Button variant="secondary" size="S" onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.json,.csv,.txt';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const text = await file.text();
              const { programJsonService } = await import('../../services');
              try {
                let count: number;
                if (file.name.endsWith('.json')) {
                  count = await programJsonService.importProgram(text, 1, selectedSubject!, selectedLevel!);
                } else {
                  count = await programJsonService.importCSV(text, 1, selectedSubject!, selectedLevel!);
                }
                addToast('success', `${count} éléments importés`);
              } catch (err) { addToast('error', 'Erreur lors de l\'import'); console.error(err); }
            };
            input.click();
          }}>Importer (JSON/CSV)</Button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement du programme…</p>
      ) : themes.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Aucun programme pour cette matière/niveau"
          description="Les données de référence seront chargées à la prochaine ouverture de la base, ou importez un programme au format JSON/CSV."
        />
      ) : (
        <div className="programme-page__themes">
          {themes.map(theme => {
            const isOpen = openThemes.has(theme.id);
            return (
              <Card
                key={theme.id}
                borderLeftColor={subjectColor}
                noHover
                className="theme-card"
              >
                <button
                  className="theme-card__header"
                  onClick={() => toggleTheme(theme.id)}
                  type="button"
                >
                  <span className="theme-card__chevron">{isOpen ? '▼' : '▶'}</span>
                  <span className="theme-card__title">{theme.code} — {theme.title}</span>
                  {theme.expected_hours && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginRight: 8 }}>
                      {theme.expected_hours}h
                    </span>
                  )}
                  <Badge
                    variant={theme.coveragePercent === 100 ? 'success' : theme.coveragePercent > 0 ? 'filter' : 'info'}
                    active={theme.coveragePercent > 0}
                  >
                    {theme.coveragePercent > 0 ? `${theme.coveragePercent}% couvert` : 'Non commencé'}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="theme-card__chapters">
                    {theme.chapters.map(ch => (
                      <div key={ch.id} className="chapter-row">
                        <span className="chapter-row__title">
                          {ch.code} — {ch.title}
                        </span>
                        <div className="chapter-row__badges">
                          {ch.expected_hours && (
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                              {ch.expected_hours}h
                            </span>
                          )}
                          {ch.sequenceCount > 0 && (
                            <Badge color={subjectColor} variant="subject">
                              {ch.sequenceCount} séquence{ch.sequenceCount > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {ch.isEvaluated && (
                            <Badge variant="success">✓ évalué</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {theme.chapters.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 0' }}>
                        Aucun chapitre défini
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
