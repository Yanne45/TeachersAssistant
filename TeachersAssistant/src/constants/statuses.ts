// ============================================================================
// Dictionnaire centralisé des statuts métiers
// Chaque entrée : label (affiché), icon (emoji/char), color (CSS var), bg
// ============================================================================

export interface StatusMeta {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

// ── Copies / soumissions ──────────────────────────────────────────────────────

export type SubmissionStatus = 'pending' | 'ai_processing' | 'to_confirm' | 'final';

export const SUBMISSION_STATUS_META: Record<SubmissionStatus, StatusMeta> = {
  pending: {
    label: 'En attente',
    icon: '–',
    color: 'var(--color-text-muted)',
    bg: 'transparent',
  },
  ai_processing: {
    label: 'Traitement IA',
    icon: '…',
    color: 'var(--color-info)',
    bg: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
  },
  to_confirm: {
    label: 'À confirmer',
    icon: '!',
    color: 'var(--color-warn)',
    bg: 'color-mix(in srgb, var(--color-warn) 10%, transparent)',
  },
  final: {
    label: 'Finalisée',
    icon: '✓',
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
  },
};

// ── Bulletins ─────────────────────────────────────────────────────────────────

export type BulletinStatusUI = 'draft' | 'review' | 'final' | 'empty';

export const BULLETIN_STATUS_META: Record<BulletinStatusUI, StatusMeta> = {
  draft: {
    label: 'Brouillon',
    icon: '✎',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-bg)',
  },
  review: {
    label: 'Relecture',
    icon: '!',
    color: 'var(--color-warn)',
    bg: 'color-mix(in srgb, var(--color-warn) 10%, transparent)',
  },
  final: {
    label: 'Final',
    icon: '✓',
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
  },
  empty: {
    label: '–',
    icon: '–',
    color: 'var(--color-text-muted)',
    bg: 'transparent',
  },
};

// ── Devoirs ───────────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | 'draft'
  | 'assigned'
  | 'collecting'
  | 'correcting'
  | 'corrected'
  | 'returned';

export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, StatusMeta> = {
  draft: {
    label: 'Brouillon',
    icon: '✎',
    color: 'var(--color-text-muted)',
    bg: 'var(--color-bg)',
  },
  assigned: {
    label: 'Distribué',
    icon: '→',
    color: 'var(--color-info)',
    bg: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
  },
  collecting: {
    label: 'Collecte',
    icon: '↓',
    color: 'var(--color-info)',
    bg: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
  },
  correcting: {
    label: 'En correction',
    icon: '✎',
    color: 'var(--color-warn)',
    bg: 'color-mix(in srgb, var(--color-warn) 10%, transparent)',
  },
  corrected: {
    label: 'Corrigé',
    icon: '✓',
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
  },
  returned: {
    label: 'Rendu',
    icon: '✓✓',
    color: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
  },
};
