// ============================================================================
// useBibliothequeSidebar — Items sidebar dynamiques pour l'onglet Bibliothèque
// Charge matières+niveaux, types de documents, thèmes du programme depuis la DB.
// ============================================================================

import { useState, useEffect } from 'react';
import {
  db,
  subjectService,
  levelService,
  documentTypeService,
  programTopicService,
} from '../services';
import { useApp } from '../stores';
import type { SidebarItem } from '../constants/navigation';
import type { Subject, Level, DocumentType, ProgramTopic } from '../types';

interface SubjectLevelPair { subject_id: number; level_id: number }

/**
 * Construit dynamiquement les items sidebar pour le tab Bibliothèque.
 * - PAR MATIÈRE : matières enregistrées, chacune dépliée avec ses niveaux
 * - PAR TYPE : types de documents enregistrés
 * - PROGRAMME : thèmes & chapitres groupés par matière+niveau
 */
export function useBibliothequeSidebar(): SidebarItem[] {
  const { activeYear } = useApp();
  const [items, setItems] = useState<SidebarItem[]>(buildStatic());

  useEffect(() => {
    if (!activeYear) return;
    let cancelled = false;

    (async () => {
      try {
        const [subjects, levels, docTypes] = await Promise.all([
          subjectService.getAll(),
          levelService.getAll(),
          documentTypeService.getAll(),
        ]);

        // Get subject+level pairs from multiple sources (allocations, teaching_scopes, program_topics)
        const pairs = await getSubjectLevelPairs(activeYear.id);

        // If no pairs found, fall back to showing all subjects without level breakdown
        const subjectIds = pairs.length > 0
          ? [...new Set(pairs.map(p => p.subject_id))]
          : subjects.map(s => s.id as number);

        // Load programme themes for each subject+level combo
        const topicsByKey = new Map<string, ProgramTopic[]>();
        for (const p of pairs) {
          const key = `${p.subject_id}-${p.level_id}`;
          if (topicsByKey.has(key)) continue;
          const flat = await programTopicService.getBySubjectLevel(
            activeYear.id, p.subject_id, p.level_id
          );
          const themes = flat.filter(t => t.topic_type === 'theme' || t.topic_type === 'chapter');
          if (themes.length > 0) {
            topicsByKey.set(key, themes);
          }
        }

        if (cancelled) return;

        const built = buildDynamic(subjects, levels, subjectIds, pairs, docTypes, topicsByKey);
        setItems(built);
      } catch (err) {
        console.error('[BibSidebar] Error loading dynamic items:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [activeYear]);

  return items;
}

// ── Get subject+level pairs from all available sources ──

async function getSubjectLevelPairs(yearId: number | string): Promise<SubjectLevelPair[]> {
  // Try allocations first
  const allocs = await db.select<SubjectLevelPair[]>(
    `SELECT DISTINCT subject_id, level_id FROM subject_hour_allocations WHERE academic_year_id = ?`,
    [yearId]
  );
  if (allocs.length > 0) return allocs;

  // Fallback: teaching_scopes → join with classes to get level_id
  const scopes = await db.select<SubjectLevelPair[]>(
    `SELECT DISTINCT ts.subject_id, c.level_id
     FROM teaching_scopes ts
     JOIN classes c ON ts.class_id = c.id
     WHERE ts.academic_year_id = ? AND ts.is_active = 1`,
    [yearId]
  );
  if (scopes.length > 0) return scopes;

  // Last fallback: infer from program_topics
  const fromTopics = await db.select<SubjectLevelPair[]>(
    `SELECT DISTINCT subject_id, level_id FROM program_topics WHERE academic_year_id = ?`,
    [yearId]
  );
  return fromTopics;
}

// ── Static fallback (before DB loads) ──

function buildStatic(): SidebarItem[] {
  return [
    { id: 'bib-sep-docs', label: 'DOCUMENTS', isSection: true },
    { id: 'bib-recents', label: 'Récents', page: 'recents', indent: 1, icon: '📄' },
    { id: 'bib-tous', label: 'Tous', page: 'tous', indent: 1 },
    { id: 'bib-sep-import', label: 'GESTION', isSection: true },
    { id: 'bib-importer', label: 'Importer documents', page: 'importer', indent: 1, icon: '📥' },
  ];
}

// ── Build dynamic items ──

function buildDynamic(
  subjects: Subject[],
  levels: Level[],
  subjectIds: number[],
  pairs: SubjectLevelPair[],
  docTypes: DocumentType[],
  topicsByKey: Map<string, ProgramTopic[]>,
): SidebarItem[] {
  const levelMap = new Map(levels.map(l => [l.id as number, l]));
  const subjectMap = new Map(subjects.map(s => [s.id as number, s]));

  // Group pairs by subject
  const pairsBySubject = new Map<number, number[]>();
  for (const p of pairs) {
    const arr = pairsBySubject.get(p.subject_id) ?? [];
    if (!arr.includes(p.level_id)) arr.push(p.level_id);
    pairsBySubject.set(p.subject_id, arr);
  }

  const result: SidebarItem[] = [];

  // ── DOCUMENTS ──
  result.push({ id: 'bib-sep-docs', label: 'DOCUMENTS', isSection: true });
  result.push({ id: 'bib-recents', label: 'Récents', page: 'recents', indent: 1, icon: '📄' });
  result.push({ id: 'bib-tous', label: 'Tous', page: 'tous', indent: 1 });

  // ── PAR MATIÈRE (replié par défaut) ──
  if (subjectIds.length > 0) {
    result.push({ id: 'bib-sep-matiere', label: 'PAR MATIÈRE', isSection: true, collapsible: true, defaultOpen: false });

    for (const subId of subjectIds) {
      const sub = subjectMap.get(subId);
      if (!sub) continue;

      const levelIds = pairsBySubject.get(subId) ?? [];
      const hasLevels = levelIds.length > 0;

      result.push({
        id: `bib-sub-${subId}`,
        label: sub.short_label || sub.label,
        page: 'par-matiere',
        filter: `s-${subId}`,
        indent: 1,
        icon: sub.icon ?? '📚',
        sectionId: 'bib-sep-matiere',
        collapsible: hasLevels,
        defaultOpen: false,
      });

      // Level sub-items
      for (const lvlId of levelIds) {
        const lvl = levelMap.get(lvlId);
        if (!lvl) continue;
        result.push({
          id: `bib-sub-${subId}-lvl-${lvlId}`,
          label: lvl.short_label || lvl.label,
          page: 'par-matiere',
          filter: `s-${subId}-l-${lvlId}`,
          indent: 2,
          sectionId: `bib-sub-${subId}`,
        });
      }
    }
  }

  // ── PAR TYPE (replié par défaut) ──
  if (docTypes.length > 0) {
    result.push({ id: 'bib-sep-type', label: 'PAR TYPE', isSection: true, collapsible: true, defaultOpen: false });

    for (const dt of docTypes) {
      result.push({
        id: `bib-type-${dt.id}`,
        label: dt.label,
        page: 'par-type',
        filter: `t-${dt.id}`,
        indent: 1,
        icon: dt.icon ?? '📎',
        sectionId: 'bib-sep-type',
      });
    }
  }

  // ── PROGRAMME (replié par défaut) ──
  if (topicsByKey.size > 0) {
    result.push({ id: 'bib-sep-prog', label: 'PROGRAMME', isSection: true, collapsible: true, defaultOpen: false });

    for (const [key, topics] of topicsByKey) {
      const [sId, lId] = key.split('-').map(Number);
      const sub = subjectMap.get(sId!);
      const lvl = levelMap.get(lId!);
      if (!sub || !lvl) continue;

      const themes = topics.filter(t => t.topic_type === 'theme');

      result.push({
        id: `bib-prog-header-${key}`,
        label: `${sub.short_label || sub.label} — ${lvl.short_label || lvl.label}`,
        page: 'par-programme',
        filter: `s-${sId}-l-${lId}`,
        indent: 1,
        icon: '📖',
        sectionId: 'bib-sep-prog',
        collapsible: themes.length > 0,
        defaultOpen: false,
      });
      for (const theme of themes) {
        const label = theme.code ? `${theme.code} ${theme.title}` : theme.title;
        const shortLabel = label.length > 35 ? label.slice(0, 32) + '…' : label;

        const hasChapters = topics.some(t => t.topic_type === 'chapter' && t.parent_id === theme.id);

        result.push({
          id: `bib-prog-theme-${theme.id}`,
          label: shortLabel,
          page: 'par-programme',
          filter: `topic-${theme.id}`,
          indent: 2,
          sectionId: `bib-prog-header-${key}`,
          collapsible: hasChapters,
          defaultOpen: false,
        });

        const chapters = topics.filter(t => t.topic_type === 'chapter' && t.parent_id === theme.id);
        for (const ch of chapters) {
          const chLabel = ch.code ? `${ch.code} ${ch.title}` : ch.title;
          const shortChLabel = chLabel.length > 30 ? chLabel.slice(0, 27) + '…' : chLabel;

          result.push({
            id: `bib-prog-ch-${ch.id}`,
            label: shortChLabel,
            page: 'par-programme',
            filter: `topic-${ch.id}`,
            indent: 3,
            sectionId: `bib-prog-theme-${theme.id}`,
          });
        }
      }
    }
  }

  // ── GESTION ──
  result.push({ id: 'bib-sep-import', label: 'GESTION', isSection: true });
  result.push({ id: 'bib-importer', label: 'Importer documents', page: 'importer', indent: 1, icon: '📥' });

  return result;
}
