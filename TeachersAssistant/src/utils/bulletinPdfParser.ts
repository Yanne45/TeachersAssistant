// ============================================================================
// bulletinPdfParser — Extraction d'informations depuis des bulletins PDF Pronote
// Batch import : un fichier PDF = un bulletin d'un eleve
// ============================================================================

import { extractTextFromFile } from './textExtractor';

// ── Types ──

export interface ParsedBulletin {
  fileName: string;
  studentLastName: string | null;
  studentFirstName: string | null;
  periodLabel: string | null;
  classLabel: string | null;
  rawText: string;
}

// ── Helpers ──

/**
 * Tente d'extraire le nom/prenom de l'eleve depuis le texte du bulletin.
 * Plusieurs formats Pronote possibles :
 *   - "Eleve : DUPONT Jean"
 *   - "Nom : DUPONT Jean"
 *   - Ligne en debut de document "DUPONT Jean-Pierre"
 *   - "Bulletin de DUPONT Jean"
 */
function extractStudentName(text: string): { lastName: string | null; firstName: string | null } {
  // Pattern 1 : "Eleve : NOM Prenom" ou "Nom : NOM Prenom"
  const labelPattern = /(?:[EÉ]l[eè]ve|Nom)\s*:\s*([A-ZÀ-Ü][A-ZÀ-Ü\s-]+)\s+([A-Za-zà-ü][a-zà-ü\s-]+)/;
  const m1 = text.match(labelPattern);
  if (m1) {
    return { lastName: m1[1]!.trim(), firstName: m1[2]!.trim() };
  }

  // Pattern 2 : "Bulletin de NOM Prenom" / "Bulletin trimestriel de NOM Prenom"
  const bulletinPattern = /[Bb]ulletin\s+(?:\w+\s+)?de\s+([A-ZÀ-Ü][A-ZÀ-Ü\s-]+)\s+([A-Za-zà-ü][a-zà-ü\s-]+)/;
  const m2 = text.match(bulletinPattern);
  if (m2) {
    return { lastName: m2[1]!.trim(), firstName: m2[2]!.trim() };
  }

  // Pattern 3 : ligne commencant par NOM en majuscules suivi de prenom
  const linePattern = /^([A-ZÀ-Ü][A-ZÀ-Ü\s-]{1,30})\s+([A-Za-zà-ü][a-zà-ü\s-]{1,30})$/m;
  const lines = text.split('\n');
  // Chercher dans les 15 premieres lignes
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i]!.trim();
    const m3 = line.match(linePattern);
    if (m3) {
      const candidate = m3[1]!.trim();
      // Eviter les faux positifs : "BULLETIN TRIMESTRIEL", "CLASSE DE", etc.
      if (/^(?:BULLETIN|CLASSE|COLLEGE|LYCEE|ANNEE|PERIODE|TRIMESTRE|SEMESTRE|CONSEIL)\b/i.test(candidate)) continue;
      return { lastName: candidate, firstName: m3[2]!.trim() };
    }
  }

  return { lastName: null, firstName: null };
}

/**
 * Extrait la periode (trimestre, semestre, periode) du bulletin.
 */
function extractPeriodLabel(text: string): string | null {
  const pattern = /(?:Trimestre|P[ée]riode|Semestre)\s*:?\s*(\d|[A-Za-zÀ-ü\s]+)/i;
  const m = text.match(pattern);
  if (m) {
    return m[0]!.trim();
  }

  // Pattern alternatif : "1er trimestre", "2eme trimestre", "3eme trimestre"
  const altPattern = /(\d(?:er|[eè]me)?\s+trimestre)/i;
  const m2 = text.match(altPattern);
  if (m2) {
    return m2[1]!.trim();
  }

  return null;
}

/**
 * Extrait le nom de la classe.
 */
function extractClassLabel(text: string): string | null {
  const pattern = /(?:Classe|Groupe)\s*:?\s*([^\n]+)/i;
  const m = text.match(pattern);
  if (m) {
    return m[1]!.trim();
  }
  return null;
}

// ── Parsing principal ──

/**
 * Parse un fichier PDF bulletin pour en extraire les informations cles.
 * Retourne les metadonnees detectees et le texte brut.
 */
export async function parseBulletinPdf(file: File): Promise<ParsedBulletin> {
  const rawText = await extractTextFromFile(file, 'pdf');

  if (!rawText) {
    return {
      fileName: file.name,
      studentLastName: null,
      studentFirstName: null,
      periodLabel: null,
      classLabel: null,
      rawText: '',
    };
  }

  const { lastName, firstName } = extractStudentName(rawText);
  const periodLabel = extractPeriodLabel(rawText);
  const classLabel = extractClassLabel(rawText);

  return {
    fileName: file.name,
    studentLastName: lastName,
    studentFirstName: firstName,
    periodLabel,
    classLabel,
    rawText,
  };
}
