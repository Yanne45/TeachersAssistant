// ============================================================================
// Teacher Assistant — Constantes de navigation (spec §4.3, §4.4, §4.7)
// Chaque item sidebar porte un `page` compatible avec RouterContext.
// ============================================================================

import type { TabId } from '../stores';

// ── Tabs principaux (spec §4.3) ──

export const APP_TABS: { id: TabId; label: string; icon?: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',        icon: '📊' },
  { id: 'programme',    label: 'Programme',         icon: '📚' },
  { id: 'preparation',  label: 'Préparation',       icon: '🧩' },
  { id: 'planning',     label: 'Planning',          icon: '📅' },
  { id: 'cahier',       label: 'Cahier de textes',  icon: '📝' },
  { id: 'classes',      label: 'Classes',            icon: '👥' },
  { id: 'evaluation',   label: 'Évaluation',        icon: '📊' },
];

// ── Sidebar items ──

export interface SidebarItem {
  id: string;
  label: string;
  /** Clé `page` utilisée par le router (ex: 'sequences', 'edt') */
  page?: string;
  indent?: number;        // 0 = root, 1 = indent
  isSection?: boolean;    // label section uppercase separator
  icon?: string;
  /** Filtre optionnel passé à la page (ex: status=in_progress) */
  filter?: string;
  /** Si true, l'item est injecté dynamiquement depuis la DB (classes) */
  dynamic?: boolean;
}

export const SIDEBAR_MENUS: Record<TabId, SidebarItem[]> = {
  dashboard: [],

  programme: [
    { id: 'prog-officiel',    label: 'Programme officiel',       page: 'officiel',    icon: '📖' },
    { id: 'prog-hggsp',       label: 'HGGSP',                    page: 'officiel',    indent: 1, filter: 'hggsp' },
    { id: 'prog-histoire',    label: 'Histoire',                  page: 'officiel',    indent: 1, filter: 'histoire' },
    { id: 'prog-geo',         label: 'Géographie',                page: 'officiel',    indent: 1, filter: 'geo' },
    { id: 'prog-sep1',        label: 'PROGRESSION ANNUELLE',      isSection: true },
    { id: 'prog-par-matiere', label: 'Par matière',               page: 'progression', indent: 1 },
    { id: 'prog-par-classe',  label: 'Par classe',                page: 'progression', indent: 1, filter: 'classe' },
    { id: 'prog-timeline',    label: 'Vue timeline',              page: 'progression', indent: 1, filter: 'timeline' },
    { id: 'prog-liste',       label: 'Vue liste',                 page: 'progression', indent: 1, filter: 'liste' },
  ],

  preparation: [
    { id: 'prep-sep-seq',      label: 'SÉQUENCES',                isSection: true },
    { id: 'prep-all-seq',      label: 'Toutes les séquences',     page: 'sequences',   indent: 1, icon: '📚' },
    { id: 'prep-en-cours',     label: 'En cours',                  page: 'sequences',   indent: 1, filter: 'in_progress' },
    { id: 'prep-templates',    label: 'Templates',                 page: 'templates',   indent: 1 },
    { id: 'prep-sep-bib',      label: 'BIBLIOTHÈQUE',             isSection: true },
    { id: 'prep-recents',      label: 'Récents',                   page: 'bibliotheque', indent: 1, icon: '📁' },
    { id: 'prep-par-matiere',  label: 'Par matière',               page: 'bibliotheque', indent: 1, filter: 'matiere' },
    { id: 'prep-importer',     label: 'Importer docs',             page: 'importer',     indent: 1, icon: '📥' },
    { id: 'prep-sep-ia',       label: 'GÉNÉRATEUR IA',            isSection: true },
    { id: 'prep-generer',      label: 'Générer contenu',           page: 'ia-generer',  indent: 1, icon: '🤖' },
    { id: 'prep-historique',   label: 'Historique',                 page: 'ia-historique', indent: 1 },
    { id: 'prep-couts',        label: 'Consommation & coûts',       page: 'ia-couts',    indent: 1, icon: '💰' },
  ],

  planning: [
    { id: 'plan-edt',          label: 'Emploi du temps',          page: 'edt',         icon: '🕐' },
    { id: 'plan-edt-semaine',  label: 'Vue semaine',              page: 'edt',         indent: 1 },
    { id: 'plan-edt-import',   label: 'Import',                   page: 'edt-import',  indent: 1 },
    { id: 'plan-cal',          label: 'Calendrier scolaire',      page: 'calendrier',  icon: '🗓' },
    { id: 'plan-cal-annuel',   label: 'Vue annuelle',             page: 'calendrier',  indent: 1 },
  ],

  cahier: [
    // Items dynamiques injectés depuis les classes (DB)
    // Fallback statique :
    { id: 'cahier-all',  label: 'Toutes les classes', page: 'all',  icon: '📝' },
    { id: 'cahier-tle2', label: 'Terminale 2',        page: 'classe', filter: '1', dynamic: true },
    { id: 'cahier-tle4', label: 'Terminale 4',        page: 'classe', filter: '2', dynamic: true },
    { id: 'cahier-1e3',  label: 'Première 3',         page: 'classe', filter: '3', dynamic: true },
  ],

  classes: [
    { id: 'cls-sep-classes',  label: 'MES CLASSES',              isSection: true },
    { id: 'cls-overview',     label: 'Vue d\'ensemble',          page: 'overview',     indent: 1, icon: '👥' },
    { id: 'cls-sep-import',   label: 'IMPORT',                   isSection: true },
    { id: 'cls-import',       label: 'Importer une classe',      page: 'import',       indent: 1, icon: '📥' },
  ],

  evaluation: [
    { id: 'eval-sep-devoirs',   label: 'DEVOIRS & CORRECTIONS',   isSection: true },
    { id: 'eval-liste',         label: 'Liste devoirs',           page: 'devoirs',          indent: 1, icon: '📋' },
    { id: 'eval-correction',    label: 'Correction en série',     page: 'correction-serie', indent: 1 },
    { id: 'eval-bilan',         label: 'Bilan devoir',            page: 'bilan',            indent: 1 },
    { id: 'eval-sep-eleves',    label: 'ÉLÈVES',                  isSection: true },
    { id: 'eval-par-classe',    label: 'Par classe',              page: 'eleves',           indent: 1, icon: '👥' },
    { id: 'eval-fiche',         label: 'Fiche élève',             page: 'fiche-eleve',      indent: 1 },
    { id: 'eval-sep-bulletins', label: 'BULLETINS',               isSection: true },
    { id: 'eval-bulletins',     label: 'Gestion bulletins',       page: 'bulletins',        indent: 1, icon: '📄' },
  ],
};

// ── Résolution page → sidebar item actif ──

export function findActiveSidebarItem(tab: TabId, page: string, filter?: string | null): string | null {
  const items = SIDEBAR_MENUS[tab];
  // Match exact page + filter
  const exact = items.find(i => i.page === page && i.filter === filter);
  if (exact) return exact.id;
  // Match page only
  const byPage = items.find(i => i.page === page && !i.filter);
  if (byPage) return byPage.id;
  // First non-section item
  return items.find(i => !i.isSection)?.id ?? null;
}
