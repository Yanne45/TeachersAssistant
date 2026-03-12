export type SubjectDraft = {
  id: number | null;
  code: string;
  label: string;
  short_label: string;
  color: string;
};

export type ClassDraft = {
  id: number | null;
  level_id: number | null;
  name: string;
  short_name: string;
  student_count: string;
};

export type LevelDraft = {
  id: number | null;
  code: string;
  label: string;
  short_label: string;
};

export const EMPTY_SUBJECT: SubjectDraft = {
  id: null,
  code: '',
  label: '',
  short_label: '',
  color: '#2C3E7B',
};

export const EMPTY_CLASS: ClassDraft = {
  id: null,
  level_id: null,
  name: '',
  short_name: '',
  student_count: '',
};

export const EMPTY_LEVEL: LevelDraft = {
  id: null,
  code: '',
  label: '',
  short_label: '',
};

export type SortDirection = 'asc' | 'desc';

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_PAGE_SIZE = 10;

export const includesQuery = (query: string, ...values: Array<string | number | null | undefined>) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalized));
};

export const compareText = (a: string | null | undefined, b: string | null | undefined, direction: SortDirection) =>
  direction === 'asc'
    ? String(a ?? '').localeCompare(String(b ?? ''), 'fr')
    : String(b ?? '').localeCompare(String(a ?? ''), 'fr');

export const compareNumber = (a: number | null | undefined, b: number | null | undefined, direction: SortDirection) => {
  const left = a ?? 0;
  const right = b ?? 0;
  return direction === 'asc' ? left - right : right - left;
};

export interface PeriodeFormData {
  code: string;
  label: string;
  start_date: string;
  end_date: string;
}

export const EMPTY_PERIODE: PeriodeFormData = { code: '', label: '', start_date: '', end_date: '' };
