// ============================================================================
// Teacher Assistant — Constantes : couleurs matières, statuts, labels
// ============================================================================

// ── Couleurs matières (spec §3.2) ──

export const SUBJECT_COLORS: Record<string, string> = {
  histoire: '#2C3E7B',
  geo: '#27774E',
  hggsp: '#7B3FA0',
};

// ── Statuts séquences ──

export const SEQUENCE_STATUS_CONFIG = {
  draft:       { label: 'Brouillon',   color: 'var(--color-text-muted)', badgeVariant: 'info' as const },
  planned:     { label: 'Planifiée',   color: 'var(--color-primary)',    badgeVariant: 'info' as const },
  in_progress: { label: 'En cours',    color: 'var(--color-primary)',    badgeVariant: 'filter' as const },
  done:        { label: 'Terminée',    color: 'var(--color-success)',    badgeVariant: 'success' as const },
};

// ── Statuts séances ──

export const SESSION_STATUS_CONFIG = {
  planned:   { label: 'Prévue',    color: 'var(--color-primary)',    borderColor: 'var(--color-primary)' },
  ready:     { label: 'Prête',     color: 'var(--color-info)',       borderColor: 'var(--color-info)' },
  done:      { label: 'Réalisée',  color: 'var(--color-success)',    borderColor: 'var(--color-success)' },
  cancelled: { label: 'Annulée',   color: 'var(--color-text-muted)', borderColor: 'var(--color-text-muted)' },
};

// ── Statuts correction ──

export const SUBMISSION_STATUS_CONFIG = {
  pending:        { label: 'Non commencé', icon: '⬜', color: 'var(--color-text-muted)' },
  ai_processing:  { label: 'IA en cours',  icon: '⏳', color: 'var(--color-info)' },
  to_confirm:     { label: 'À confirmer',  icon: '⚠',  color: 'var(--color-warn)' },
  final:          { label: 'Final',         icon: '✅', color: 'var(--color-success)' },
};

// ── Statuts bulletin ──

export const BULLETIN_STATUS_CONFIG = {
  draft:  { label: 'Brouillon', color: 'var(--color-text-muted)' },
  review: { label: 'Relecture', color: 'var(--color-warn)' },
  final:  { label: 'Final',     color: 'var(--color-success)' },
};

// ── Types de fichiers → icônes ──

export const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  pptx: '📊',
  png: '🖼',
  jpg: '🖼',
  jpeg: '🖼',
  gif: '🖼',
};

// ── Jours de la semaine ──

export const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;
export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'] as const;

// ── Mois scolaires ──

export const SCHOOL_MONTHS = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'] as const;

// ── Niveaux compétences ──

export const SKILL_LEVEL_LABELS = ['Insuffisant', 'Fragile', 'Satisfaisant', 'Très bon'] as const;

export function skillLevelColor(level: number | null): string {
  if (level === null) return 'var(--color-text-muted)';
  if (level >= 3) return 'var(--color-success)';
  if (level === 2) return 'var(--color-warn)';
  return 'var(--color-danger)';
}

// ── Profil période ──

export const PROFILE_DIMENSION_LABELS = {
  behavior: 'Comportement',
  work_ethic: 'Travail',
  participation: 'Participation',
  autonomy: 'Autonomie',
  methodology: 'Méthode',
} as const;

// ── Notifications ──

export const NOTIFICATION_PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
