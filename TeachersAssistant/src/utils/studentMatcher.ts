// ============================================================================
// Student Matcher — Matching noms de fichiers / CSV → élèves
// ============================================================================

export interface MatchableStudent {
  id: number;
  name: string; // "DUPONT Jean"
}

export interface MatchResult {
  studentId: number;
  studentName: string;
  confidence: 'exact' | 'partial' | 'none';
}

/** Remove diacritics and lowercase */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Clean a filename for matching: strip extension, replace separators */
function cleanFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/[_\-. ]+/g, ' ')        // normalize separators to spaces
    .replace(/\d{10,}/g, '')           // strip timestamps
    .trim();
}

/**
 * Match a filename to a student.
 * Tries exact (last+first), then partial (last only).
 */
export function matchFileToStudent(
  filename: string,
  students: MatchableStudent[],
): MatchResult | null {
  const cleaned = normalizeName(cleanFilename(filename));
  if (!cleaned) return null;

  // Try exact: full name in filename
  for (const s of students) {
    const parts = s.name.split(' ').filter(Boolean);
    if (parts.length < 2) continue;
    const lastName = normalizeName(parts[0] ?? '');
    const firstName = normalizeName(parts.slice(1).join(' '));

    if (cleaned.includes(lastName + ' ' + firstName) || cleaned.includes(firstName + ' ' + lastName)) {
      return { studentId: s.id, studentName: s.name, confidence: 'exact' };
    }
  }

  // Try partial: last name only (must be at least 3 chars to avoid false matches)
  for (const s of students) {
    const lastName = normalizeName(s.name.split(' ')[0] ?? '');
    if (lastName.length >= 3 && cleaned.includes(lastName)) {
      return { studentId: s.id, studentName: s.name, confidence: 'partial' };
    }
  }

  return null;
}

/**
 * Match a parsed name (from CSV) to a student.
 */
export function matchNameToStudent(
  lastName: string,
  firstName: string,
  students: MatchableStudent[],
): MatchResult | null {
  const normLast = normalizeName(lastName);
  const normFirst = normalizeName(firstName);

  // Exact: both match
  for (const s of students) {
    const parts = s.name.split(' ').filter(Boolean);
    const sLast = normalizeName(parts[0] ?? '');
    const sFirst = normalizeName(parts.slice(1).join(' '));

    if (sLast === normLast && sFirst === normFirst) {
      return { studentId: s.id, studentName: s.name, confidence: 'exact' };
    }
  }

  // Partial: last name matches
  for (const s of students) {
    const sLast = normalizeName(s.name.split(' ')[0] ?? '');
    if (sLast === normLast) {
      return { studentId: s.id, studentName: s.name, confidence: 'partial' };
    }
  }

  return null;
}
