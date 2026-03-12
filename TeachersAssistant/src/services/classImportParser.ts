// ============================================================================
// classImportParser — Extraction élèves depuis CSV/PDF (Pronote)
// ============================================================================

export interface ParsedStudent {
  last_name: string;
  first_name: string;
  birth_year?: number;
  gender?: string;
}

// ── CSV / TXT ──

export function parseCSVText(text: string): { students: ParsedStudent[]; error?: string } {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return { students: [], error: 'Fichier vide' };

  const firstLine = lines[0] ?? '';
  const sep = firstLine.includes(';') ? ';' : ',';
  const rows = lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));

  const first = (rows[0] ?? []).map(c => c.toLowerCase());
  const hasHeader = first.includes('nom') || first.includes('last_name') || first.includes('prénom')
    || first.includes('élève') || first.includes('eleve');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (dataRows.length === 0) return { students: [], error: 'Aucune donnée trouvée' };
  const firstDataRow = dataRows[0];
  if (!firstDataRow || firstDataRow.length < 2) {
    return { students: [], error: 'Format attendu : Nom ; Prénom [; Année ; Genre]' };
  }

  const students = dataRows
    .map(r => ({
      last_name: r[0] || '',
      first_name: r[1] || '',
      birth_year: r[2] ? parseInt(r[2]) : undefined,
      gender: r[3] || undefined,
    }))
    .filter(s => s.last_name && s.first_name);

  return { students };
}

// ── PDF (Pronote) ──

/**
 * Extraction basique de texte depuis un buffer PDF.
 * Parcourt les streams décompressés pour extraire les opérateurs Tj/TJ.
 * Pour les PDF complexes (Pronote), une librairie dédiée serait préférable.
 */
export function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);

  // Chercher les blocs de texte entre BT...ET
  const textBlocks: string[] = [];
  const btRegex = /BT\s([\s\S]*?)ET/g;
  let match;

  while ((match = btRegex.exec(raw)) !== null) {
    const block = match[1] ?? '';

    // Extraire les chaînes Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tj;
    while ((tj = tjRegex.exec(block)) !== null) {
      const value = tj[1];
      if (value !== undefined) textBlocks.push(value);
    }

    // Extraire les arrays TJ
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tja;
    while ((tja = tjArrayRegex.exec(block)) !== null) {
      const inner = tja[1] ?? '';
      const strRegex = /\(([^)]*)\)/g;
      let s;
      let line = '';
      while ((s = strRegex.exec(inner)) !== null) {
        line += s[1] ?? '';
      }
      if (line.trim()) textBlocks.push(line);
    }
  }

  // Aussi chercher le texte brut entre les streams (fallback)
  if (textBlocks.length === 0) {
    // Essayer FlateDecode streams (non compressé — cas rare mais possible)
    const plainText = raw.replace(/[^\x20-\x7EÀ-ÿ\n\r]/g, ' ');
    return plainText;
  }

  return textBlocks.join('\n');
}

/**
 * Extraire des noms d'élèves depuis du texte brut (PDF/Pronote).
 * Heuristiques :
 * - Lignes "NOM Prénom" (NOM tout en majuscules)
 * - Lignes "NOM;Prénom" (séparateur)
 * - Lignes numérotées "1. NOM Prénom"
 */
export function extractStudentsFromText(text: string): ParsedStudent[] {
  const students: ParsedStudent[] = [];
  const seen = new Set<string>();

  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);

  for (const line of lines) {
    let lastName = '';
    let firstName = '';

    // Pattern 1 : "NOM Prénom" — NOM entièrement en majuscules
    const namePattern = /^(?:\d+[.\s)]*)?([A-ZÀ-Ü]{2,}(?:[\s-][A-ZÀ-Ü]+)*)\s+([A-ZÀ-ÿa-z][\wà-ÿ-]+(?:\s+[A-ZÀ-ÿa-z][\wà-ÿ-]+)*)$/;
    const m1 = line.match(namePattern);
    if (m1) {
      const ln = m1[1];
      const fn = m1[2];
      if (ln && fn) {
        lastName = ln.trim();
        firstName = fn.trim();
      }
    }

    // Pattern 2 : séparateur "NOM;Prénom" ou "NOM,Prénom"
    if (!lastName) {
      const parts = line.split(/[;,\t]/).map(p => p.trim());
      const p0 = parts[0];
      const p1 = parts[1];
      if (parts.length >= 2 && p0 && p1 && p0.length >= 2 && p1.length >= 2) {
        // Vérifier que le premier part ressemble à un nom (majuscules)
        if (/^[A-ZÀ-Ü]{2,}/.test(p0)) {
          lastName = p0;
          firstName = p1;
        }
      }
    }

    if (lastName && firstName) {
      // Normaliser : NOM → Nom
      const key = `${lastName}|${firstName}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        students.push({
          last_name: lastName.toUpperCase(),
          first_name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        });
      }
    }
  }

  return students;
}

/**
 * Parse un fichier PDF et retourne la liste d'élèves détectés.
 */
export async function parsePdfFile(file: File): Promise<{ students: ParsedStudent[]; error?: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const text = extractTextFromPdfBuffer(buffer);

    if (!text || text.trim().length < 10) {
      return { students: [], error: 'Impossible d\'extraire le texte du PDF. Essayez avec un export CSV depuis Pronote.' };
    }

    const students = extractStudentsFromText(text);

    if (students.length === 0) {
      return { students: [], error: 'Aucun élève détecté dans ce PDF. Vérifiez qu\'il s\'agit bien d\'une liste de classe Pronote.' };
    }

    return { students };
  } catch (err) {
    console.error('[Import PDF] Erreur:', err);
    return { students: [], error: 'Erreur lors de la lecture du PDF. Essayez avec un export CSV.' };
  }
}
