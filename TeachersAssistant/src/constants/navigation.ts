// ============================================================================
// Teacher Assistant — Constantes de navigation (spec §4.3, §4.4, §4.7)
// Chaque item sidebar porte un `page` compatible avec RouterContext.
// ============================================================================

import type { TabId } from '../stores';

// ── Tabs principaux (spec §4.3) ──

export const APP_TABS: { id: TabId; label: string; icon?: string }[] = [
  { id: 'dashboard',     label: 'Dashboard',        icon: '📊' },
  { id: 'programme',     label: 'Programme',         icon: '📚' },
  { id: 'preparation',   label: 'Préparation',       icon: '🧩' },
  { id: 'planning',      label: 'Planning',          icon: '📅' },
  { id: 'cahier',        label: 'Cahier de textes',  icon: '📝' },
  { id: 'classes',       label: 'Classes',            icon: '👥' },
  { id: 'evaluation',    label: 'Évaluation',        icon: '📋' },
  { id: 'bibliotheque',  label: 'Bibliothèque',      icon: '📁' },
  { id: 'messagerie',   label: 'Messagerie',         icon: '📧' },
  { id: 'parametres',    label: 'Paramètres',        icon: '⚙️' },
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
  /** Si true sur une section, elle est dépliable (cliquable pour replier/déplier) */
  collapsible?: boolean;
  /** Si true sur une section collapsible, elle est dépliée au démarrage */
  defaultOpen?: boolean;
  /** ID de la section parente (pour masquer cet item quand la section est repliée) */
  sectionId?: string;
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
    { id: 'prog-sep-timeline', label: 'PROJECTION',               isSection: true },
    { id: 'prog-timeline-i',   label: 'Timeline intelligente',    page: 'timeline',    indent: 1, icon: '🧠' },
  ],

  preparation: [
    { id: 'prep-workflow',     label: 'Workflow guidé',            page: 'workflow',    icon: '🧭' },
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
    { id: 'prep-queue',        label: 'File d\'attente',             page: 'ia-queue',    indent: 1 },
    { id: 'prep-couts',        label: 'Consommation & coûts',       page: 'ia-couts',    indent: 1, icon: '💰' },
  ],

  planning: [
    { id: 'plan-agenda',       label: 'Agenda',                   page: 'agenda',      icon: '📅' },
    { id: 'plan-edt',          label: 'Emploi du temps',          page: 'edt',         icon: '🕐' },
    { id: 'plan-edt-semaine',  label: 'Vue semaine',              page: 'edt',         indent: 1 },
    { id: 'plan-edt-import',   label: 'Import',                   page: 'edt-import',  indent: 1 },
    { id: 'plan-cal',          label: 'Calendrier scolaire',      page: 'calendrier',  icon: '🗓' },
    { id: 'plan-cal-annuel',   label: 'Vue annuelle',             page: 'calendrier',  indent: 1 },
    { id: 'plan-sep-mail',     label: 'MESSAGERIE',               isSection: true },
    { id: 'plan-messagerie',   label: 'Messagerie',               page: 'messagerie',  indent: 1, icon: '📧' },
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
    { id: 'cls-sep-suivi',    label: 'SUIVI',                    isSection: true },
    { id: 'cls-skill-map',    label: 'Cartographie compétences', page: 'skill-map',    indent: 1, icon: '🗺️' },
    { id: 'cls-sep-import',   label: 'IMPORT',                   isSection: true },
    { id: 'cls-import',       label: 'Importer une classe',      page: 'import',       indent: 1, icon: '📥' },
  ],

  bibliotheque: [
    { id: 'bib-sep-docs',     label: 'DOCUMENTS',                   isSection: true },
    { id: 'bib-recents',      label: 'Récents',                     page: 'recents',      indent: 1, icon: '📄' },
    { id: 'bib-par-matiere',  label: 'Par matière',                 page: 'par-matiere',  indent: 1 },
    { id: 'bib-par-type',     label: 'Par type',                    page: 'par-type',     indent: 1 },
    { id: 'bib-sep-import',   label: 'GESTION',                     isSection: true },
    { id: 'bib-importer',     label: 'Importer documents',          page: 'importer',     indent: 1, icon: '📥' },
  ],

  messagerie: [],

  parametres: [
    { id: 'param-sep-cadre',       label: 'CADRE ANNUEL',            isSection: true },
    { id: 'param-annee-cal',       label: 'Année & calendrier',      page: 'annee-calendrier', indent: 1, icon: '📘' },
    { id: 'param-matieres',        label: 'Matières & volumes',      page: 'matieres',         indent: 1, icon: '📚' },
    { id: 'param-programme',       label: 'Programmes',              page: 'programme',        indent: 1, icon: '📖' },
    { id: 'param-sep-eval',        label: 'ÉVALUATION',              isSection: true },
    { id: 'param-competences',     label: 'Compétences & capacités', page: 'competences-capacites', indent: 1, icon: '🎯' },
    { id: 'param-types-eval',      label: "Types d'évaluation",      page: 'types-evaluation',     indent: 1 },
    { id: 'param-sep-systeme',     label: 'SYSTÈME',                 isSection: true },
    { id: 'param-interface',       label: 'Interface',               page: 'interface',        indent: 1, icon: '🎨' },
    { id: 'param-export',          label: 'Export & impressions',    page: 'export-pdf',       indent: 1 },
    { id: 'param-sauvegardes',     label: 'Sauvegardes',            page: 'sauvegardes',      indent: 1, icon: '💾' },
    { id: 'param-ia',              label: 'Templates IA',           page: 'ia-templates',     indent: 1, icon: '🤖' },
  ],

  evaluation: [
    { id: 'eval-sep-devoirs',   label: 'DEVOIRS & CORRECTIONS',   isSection: true },
    { id: 'eval-liste',         label: 'Liste devoirs',           page: 'devoirs',          indent: 1, icon: '📋' },
    { id: 'eval-correction',    label: 'Correction en série',     page: 'correction-serie', indent: 1 },
    { id: 'eval-bilan',         label: 'Bilan devoir',            page: 'bilan',            indent: 1 },
    { id: 'eval-rubrics',       label: 'Banque de grilles',       page: 'rubrics',          indent: 1, icon: '📋' },
    { id: 'eval-feedback',      label: 'Studio feedback vocal',   page: 'feedback-vocal',   indent: 1, icon: '🎤' },
    { id: 'eval-sep-notes',     label: 'NOTES',                    isSection: true },
    { id: 'eval-tableau',        label: 'Tableau de notes',         page: 'tableau-notes',    indent: 1, icon: '📊' },
    { id: 'eval-sep-eleves',     label: 'ÉLÈVES',                  isSection: true },
    { id: 'eval-par-classe',    label: 'Par classe',              page: 'eleves',           indent: 1, icon: '👥' },
    { id: 'eval-fiche',         label: 'Fiche élève',             page: 'fiche-eleve',      indent: 1 },
    { id: 'eval-sep-grand-oral', label: 'GRAND ORAL',              isSection: true },
    { id: 'eval-grand-oral',    label: 'Suivi Grand Oral',        page: 'grand-oral',       indent: 1, icon: '🎤' },
    { id: 'eval-sep-bulletins', label: 'BULLETINS',               isSection: true },
    { id: 'eval-bulletins',     label: 'Gestion bulletins',       page: 'bulletins',        indent: 1, icon: '📄' },
  ],
};

// ── Résolution page → sidebar item actif ──

export function findActiveSidebarItem(tab: TabId, page: string, filter?: string | null, customItems?: SidebarItem[]): string | null {
  const items = customItems ?? SIDEBAR_MENUS[tab];
  // Match exact page + filter
  const exact = items.find(i => i.page === page && i.filter === filter);
  if (exact) return exact.id;
  // Match page only
  const byPage = items.find(i => i.page === page && !i.filter);
  if (byPage) return byPage.id;
  // First non-section item
  return items.find(i => !i.isSection)?.id ?? null;
}
