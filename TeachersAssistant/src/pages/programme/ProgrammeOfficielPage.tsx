// ============================================================================
// ProgrammeOfficielPage — Programme officiel (branchement DB)
// Affiche les thèmes et chapitres depuis program_topics,
// avec le nombre de séquences liées et le statut d'évaluation.
// Clic sur un chapitre → affiche la description officielle + mots-clés.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Badge, Button, EmptyState } from '../../components/ui';
import { useApp, useRouter } from '../../stores';
import { db } from '../../services/db';
import './ProgrammeOfficielPage.css';

// ── Types ──

interface Chapter {
  id: number;
  code: string;
  title: string;
  description: string | null;
  expected_hours: number | null;
  sequenceCount: number;
  isEvaluated: boolean;
}

interface Theme {
  id: number;
  code: string;
  title: string;
  description: string | null;
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

interface ChapterDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  expected_hours: number | null;
  keywords: string[];
  points: { id: number; code: string; title: string; description: string | null }[];
}

// ── Helpers ──

const FILTER_TO_CODE: Record<string, string> = {
  hggsp: 'HGGSP',
  histoire: 'HIST',
  geo: 'GEO',
};

function resolveSubjectId(filter: string | null | undefined, subjects: SubjectInfo[], fallback: number | null): number | null {
  if (filter) {
    const code = FILTER_TO_CODE[filter];
    if (code) {
      const s = subjects.find(x => x.code === code);
      if (s) return s.id;
    }
  }
  return fallback ?? subjects[0]?.id ?? null;
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
  const [selectedChapter, setSelectedChapter] = useState<ChapterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cache des données de référence (évite de les recharger)
  const subjectsRef = useRef<SubjectInfo[]>([]);
  const levelsRef = useRef<LevelInfo[]>([]);

  // ════════════════════════════════════════════════════════════════════════
  // EFFET UNIQUE : résolution du sujet + chargement des thèmes
  // Déclenché par : route.filter, selectedSubject (dropdown), selectedLevel
  // Pas de race condition : tout est fait dans une seule pipeline async.
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedChapter(null);

    (async () => {
      try {
        // 1. Charger les données de référence (une seule fois, mise en cache via ref)
        let subs = subjectsRef.current;
        let lvls = levelsRef.current;
        if (subs.length === 0) {
          subs = await db.select<SubjectInfo[]>('SELECT id, code, label, short_label, color FROM subjects ORDER BY sort_order');
          lvls = await db.select<LevelInfo[]>('SELECT id, code, label FROM levels ORDER BY sort_order');
          if (cancelled) return;
          subjectsRef.current = subs;
          levelsRef.current = lvls;
          setSubjects(subs);
          setLevels(lvls);
        }

        // 2. Déterminer le niveau (le dropdown ou Terminale par défaut)
        const levelId = selectedLevel ?? lvls[lvls.length - 1]?.id ?? null;
        if (levelId !== selectedLevel) setSelectedLevel(levelId);

        // 3. Déterminer la matière depuis le filtre sidebar OU le dropdown OU défaut
        const subjectId = resolveSubjectId(route.filter, subs, selectedSubject);
        if (subjectId !== selectedSubject) setSelectedSubject(subjectId);

        if (!subjectId || !levelId) {
          if (!cancelled) { setThemes([]); setLoading(false); }
          return;
        }

        // 4. Charger les thèmes
        const dbThemes = await db.select<{
          id: number; code: string; title: string; description: string | null; expected_hours: number | null;
        }[]>(
          `SELECT id, code, title, description, expected_hours
           FROM program_topics
           WHERE subject_id = ? AND level_id = ? AND parent_id IS NULL AND topic_type = 'theme'
           ORDER BY sort_order`,
          [subjectId, levelId]
        );

        if (cancelled) return;

        // 5. Charger chapitres + stats pour chaque thème
        const themesWithChapters: Theme[] = [];

        for (const t of dbThemes) {
          const chapters = await db.select<{
            id: number; code: string; title: string; description: string | null; expected_hours: number | null;
          }[]>(
            `SELECT id, code, title, description, expected_hours
             FROM program_topics
             WHERE parent_id = ? AND topic_type = 'chapter'
             ORDER BY sort_order`,
            [t.id]
          );

          const chaptersWithStats: Chapter[] = [];
          let coveredChapters = 0;

          for (const ch of chapters) {
            const seqResult = await db.selectOne<{ cnt: number }>(
              `SELECT COUNT(*) as cnt FROM sequence_program_topics WHERE program_topic_id = ?`,
              [ch.id]
            );
            const sequenceCount = seqResult?.cnt ?? 0;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.filter, selectedSubject, selectedLevel]);

  const toggleTheme = (id: number) => {
    setOpenThemes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Charger le détail d'un chapitre (description, mots-clés, sous-points)
  const loadChapterDetail = useCallback(async (chapterId: number) => {
    // Toggle : clic sur le même chapitre → fermer
    if (selectedChapter?.id === chapterId) {
      setSelectedChapter(null);
      return;
    }

    setLoadingDetail(true);
    try {
      // Info chapitre
      const ch = await db.selectOne<{
        id: number; code: string; title: string; description: string | null; expected_hours: number | null;
      }>(
        'SELECT id, code, title, description, expected_hours FROM program_topics WHERE id = ?',
        [chapterId]
      );
      if (!ch) return;

      // Mots-clés
      const keywords = await db.select<{ keyword: string }[]>(
        'SELECT keyword FROM program_topic_keywords WHERE program_topic_id = ? ORDER BY sort_order',
        [chapterId]
      );

      // Sous-points (point, sub_point)
      const points = await db.select<{
        id: number; code: string; title: string; description: string | null;
      }[]>(
        `SELECT id, code, title, description FROM program_topics
         WHERE parent_id = ? AND topic_type IN ('point', 'sub_point')
         ORDER BY sort_order`,
        [chapterId]
      );

      setSelectedChapter({
        ...ch,
        keywords: keywords.map(k => k.keyword),
        points,
      });
    } catch (err) {
      console.error('[Programme] Erreur chargement détail chapitre:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedChapter?.id]);

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
                    {/* Description du thème */}
                    {theme.description && (
                      <div className="theme-card__description">
                        {theme.description}
                      </div>
                    )}

                    {theme.chapters.map(ch => {
                      const isSelected = selectedChapter?.id === ch.id;
                      return (
                        <React.Fragment key={ch.id}>
                          <button
                            className={`chapter-row ${isSelected ? 'chapter-row--active' : ''}`}
                            onClick={() => loadChapterDetail(ch.id)}
                            type="button"
                          >
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
                              <span className="chapter-row__expand">
                                {isSelected ? '▲' : '▼'}
                              </span>
                            </div>
                          </button>

                          {/* Panel détail chapitre */}
                          {isSelected && selectedChapter && (
                            <div className="chapter-detail" style={{ borderLeftColor: subjectColor }}>
                              {loadingDetail ? (
                                <p className="chapter-detail__loading">Chargement…</p>
                              ) : (
                                <>
                                  {/* Description officielle */}
                                  {selectedChapter.description && (
                                    <div className="chapter-detail__section">
                                      <h4 className="chapter-detail__label">Programme officiel</h4>
                                      <p className="chapter-detail__text">{selectedChapter.description}</p>
                                    </div>
                                  )}

                                  {/* Mots-clés */}
                                  {selectedChapter.keywords.length > 0 && (
                                    <div className="chapter-detail__section">
                                      <h4 className="chapter-detail__label">Mots-clés</h4>
                                      <div className="chapter-detail__keywords">
                                        {selectedChapter.keywords.map((kw, i) => (
                                          <span key={i} className="chapter-detail__keyword" style={{ borderColor: subjectColor, color: subjectColor }}>
                                            {kw}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Sous-points / jalons */}
                                  {selectedChapter.points.length > 0 && (
                                    <div className="chapter-detail__section">
                                      <h4 className="chapter-detail__label">Points du programme</h4>
                                      <ul className="chapter-detail__points">
                                        {selectedChapter.points.map(pt => (
                                          <li key={pt.id}>
                                            {pt.code && <strong>{pt.code} — </strong>}
                                            {pt.title}
                                            {pt.description && (
                                              <span className="chapter-detail__point-desc"> — {pt.description}</span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Rien à afficher */}
                                  {!selectedChapter.description && selectedChapter.keywords.length === 0 && selectedChapter.points.length === 0 && (
                                    <p className="chapter-detail__empty">
                                      Aucun contenu officiel renseigné pour ce chapitre.
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
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
