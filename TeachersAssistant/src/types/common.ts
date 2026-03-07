// ============================================================================
// Teacher Assistant — Types communs
// ============================================================================

/** Timestamp ISO 8601 stocké en TEXT dans SQLite */
export type ISODateTime = string;

/** Date ISO (YYYY-MM-DD) */
export type ISODate = string;

/** Heure (HH:MM) */
export type TimeString = string;

/** ID auto-incrémenté SQLite */
export type ID = number;

/** Statut générique de contenu */
export type ContentStatus = 'draft' | 'planned' | 'in_progress' | 'done';

/** Source d'un contenu (manuel, IA, template, etc.) */
export type ContentSource = 'manual' | 'ai' | 'template' | 'duplicate' | 'session' | 'mixed';

/** Jour de la semaine (1=lundi … 7=dimanche) */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Champs communs à toute entité persistée */
export interface BaseEntity {
  id: ID;
  created_at: ISODateTime;
}

/** Entité avec tracking de modification */
export interface TrackedEntity extends BaseEntity {
  updated_at: ISODateTime;
}
