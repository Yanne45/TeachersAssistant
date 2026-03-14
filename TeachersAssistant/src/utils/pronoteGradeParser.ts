// ============================================================================
// pronoteGradeParser — Extraction de notes depuis PDF ou CSV Pronote
// Supporte les tableaux multi-évaluations (format Pronote "Tableau de notes")
// et les relevés simples (une seule colonne de notes)
// ============================================================================

import { extractTextFromFile } from './textExtractor';

// ── Types ──

/** Une évaluation détectée dans le tableau Pronote */
export interface ParsedAssignment {
  title: string;
  coefficient: number;
  maxScore: number;
  date: string | null;   // ISO date or dd/mm
}

/** Un élève avec ses notes pour chaque évaluation */
export interface ParsedStudentRow {
  lastName: string;
  firstName: string;
  className: string;     // TB, TD, TA...
  average: number | null;
  scores: (number | null)[];  // une entrée par ParsedAssignment, null = Abs/X/-
  rawLine: string;
}

/** Résultat complet du parsing */
export interface ParsedGradeSheet {
  /** Métadonnées du tableau */
  groupLabel: string | null;    // "Groupe : THISTGEO"
  subjectLabel: string | null;  // "Matière : HISTGEO-GEOPO-SC."
  periodLabel: string | null;   // "Période : Semestre 1"
  /** Évaluations détectées (colonnes) */
  assignments: ParsedAssignment[];
  /** Lignes élèves */
  rows: ParsedStudentRow[];
  /** Texte brut pour debug */
  rawText: string;
}

// ── Helpers ──

/** Parse un score textuel (gère virgules, "Abs", "X", "-", "N.N", "Disp") */
function parseScore(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t || t === 'abs' || t === 'disp' || t === 'n.n' || t === 'nn'
    || t === '-' || t === '–' || t === 'x') {
    return null;
  }
  const cleaned = t.replace(',', '.').replace(/\s/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Détecte une date ISO depuis dd/mm ou dd/mm/yyyy */
function parseDateToken(token: string): string | null {
  const m = token.match(/^(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?$/);
  if (!m) return null;
  const day = m[1]!.padStart(2, '0');
  const month = m[2]!.padStart(2, '0');
  const year = m[3] ?? null;
  return year ? `${year}-${month}-${day}` : `${day}/${month}`;
}

/** Vérifie si un token ressemble à un code classe Pronote (2-3 lettres majuscules) */
function isClassCode(token: string): boolean {
  return /^T[A-Z]$|^[12][A-Z]\d?$|^[A-Z]{2,3}$/.test(token);
}

/** Vérifie si un token est un score ou score-like */
function isScoreToken(token: string): boolean {
  return /^\d{1,2}(?:[.,]\d{1,2})?$/.test(token)
    || /^(?:abs|disp|n\.?n\.?|x|-|–)$/i.test(token.trim());
}

// ── Parsing des en-têtes Pronote ──

/**
 * Extrait les métadonnées du header :
 * - "Coef. X - Y" → coefficient X, barème Y
 * - Titres des évaluations (Dissertation N°2, Exposé de 5 mn, etc.)
 * - Dates (22/01, 07/12, etc.)
 */
function parseHeaderArea(lines: string[]): {
  assignments: ParsedAssignment[];
  headerEndIdx: number;
} {
  const assignments: ParsedAssignment[] = [];

  // Chercher les motifs "Coef. X - Y" ou "Coef. X,X - Y"
  const coefPattern = /Coef\.?\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+)/gi;
  const coefEntries: { coeff: number; maxScore: number }[] = [];

  // Aussi chercher les titres d'évals associés
  const evalTitles: string[] = [];

  let headerEndIdx = 0;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i]!;

    // Détecter la ligne de dates (ex: "22/01 07/12 30/11 05/11 05/10 28/09")
    const dateTokens = line.split(/\s+/).filter(t => /^\d{1,2}\/\d{1,2}/.test(t));
    if (dateTokens.length >= 2) {
      // Associer les dates aux assignments déjà trouvés
      if (assignments.length === 0 && coefEntries.length > 0) {
        // Construire les assignments à partir des coef entries + dates
        for (let j = 0; j < coefEntries.length; j++) {
          assignments.push({
            title: evalTitles[j] || `Evaluation ${j + 1}`,
            coefficient: coefEntries[j]!.coeff,
            maxScore: coefEntries[j]!.maxScore,
            date: dateTokens[j] ? parseDateToken(dateTokens[j]!) : null,
          });
        }
      } else if (assignments.length > 0) {
        // Mettre à jour les dates
        for (let j = 0; j < Math.min(assignments.length, dateTokens.length); j++) {
          assignments[j]!.date = parseDateToken(dateTokens[j]!) ?? assignments[j]!.date;
        }
      }
      headerEndIdx = i + 1;
      continue;
    }

    // Détecter "Coef. X - Y" (peut y en avoir plusieurs sur une même ligne ou lignes séparées)
    let coefMatch;
    while ((coefMatch = coefPattern.exec(line)) !== null) {
      coefEntries.push({
        coeff: parseFloat(coefMatch[1]!.replace(',', '.')),
        maxScore: parseInt(coefMatch[2]!, 10),
      });
    }

    // Détecter les titres d'évaluation (lignes contenant Dissertation, Exposé, Etude, etc.)
    const titleCandidates = line.match(/(?:Dissertation|Expos[ée]|[EÉ]tude|Commentaire|Contr[ôo]le|[ÉE]valuation|Interro|DS\b|DM\b|repr[ée]sentation|critique)[^,;]*/gi);
    if (titleCandidates) {
      for (const tc of titleCandidates) {
        evalTitles.push(tc.trim());
      }
    }

    // Détecter la ligne "N élèves" qui marque la fin du header
    if (/^\d+\s+[ée]l[eè]ves?\b/i.test(line)) {
      // Souvent sur la même ligne que les dates
      headerEndIdx = Math.max(headerEndIdx, i);
    }
  }

  // Si on a des coef entries mais pas encore créé les assignments
  if (assignments.length === 0 && coefEntries.length > 0) {
    for (let j = 0; j < coefEntries.length; j++) {
      assignments.push({
        title: evalTitles[j] || `Evaluation ${j + 1}`,
        coefficient: coefEntries[j]!.coeff,
        maxScore: coefEntries[j]!.maxScore,
        date: null,
      });
    }
  }

  return { assignments, headerEndIdx };
}

// ── Parsing des lignes de données ──

/**
 * Parse une ligne de données Pronote multi-colonnes.
 * Format typique: "ASKRI Anas TB 14,20 - 12,00 7,50 15,00 9,00 13,00"
 */
function parseDataRow(line: string, expectedScoreCount: number): ParsedStudentRow | null {
  // Ignorer les lignes de moyenne ou de pied
  if (/^Moy\.?\s/i.test(line) || /du\s+groupe/i.test(line) || /^Ecole\s/i.test(line)
    || /Index\s+Education/i.test(line) || /^\d+\s+[ée]l[eè]ves?/i.test(line)) {
    return null;
  }

  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  // Stratégie : identifier les parties nom, classe, puis les scores numériques
  // Le nom est au début, la classe est un code court (TB, TD, TA), les scores sont à la fin

  // Trouver le code classe
  let classIdx = -1;
  for (let i = 1; i < tokens.length - 1; i++) {
    if (isClassCode(tokens[i]!)) {
      // Vérifier que ce qui suit ressemble à des scores
      const rest = tokens.slice(i + 1);
      const scoreCount = rest.filter(t => isScoreToken(t)).length;
      if (scoreCount >= 2) {
        classIdx = i;
        break;
      }
    }
  }

  if (classIdx === -1) {
    // Pas de code classe trouvé — essayer un format plus simple (NOM Prénom SCORES...)
    // Trouver le premier token qui est un score
    let firstScoreIdx = -1;
    for (let i = 1; i < tokens.length; i++) {
      if (isScoreToken(tokens[i]!)) {
        firstScoreIdx = i;
        break;
      }
    }
    if (firstScoreIdx <= 0) return null;

    const nameParts = tokens.slice(0, firstScoreIdx);
    const scoreParts = tokens.slice(firstScoreIdx);

    const { lastName, firstName } = extractName(nameParts);
    if (!lastName) return null;

    const scores = scoreParts.map(t => parseScore(t));

    return {
      lastName,
      firstName,
      className: '',
      average: null,
      scores,
      rawLine: line,
    };
  }

  // Extraire le nom (tout avant le code classe)
  const nameParts = tokens.slice(0, classIdx);
  const classCode = tokens[classIdx]!;
  const afterClass = tokens.slice(classIdx + 1);

  const { lastName, firstName } = extractName(nameParts);
  if (!lastName) return null;

  // afterClass = [moyenne, N.R., score1, score2, ...]
  // La moyenne est le premier nombre, N.R. est souvent "-" ou un nombre
  // On doit déterminer combien de colonnes "avant les évals" il y a

  // Si on connaît le nombre d'évals attendu, on peut déduire
  const allScores = afterClass.map(t => ({ raw: t, val: parseScore(t), isScore: isScoreToken(t) }));

  let scores: (number | null)[];
  let average: number | null = null;

  if (expectedScoreCount > 0 && allScores.length >= expectedScoreCount) {
    // Prendre les N derniers tokens comme scores
    const evalScores = allScores.slice(allScores.length - expectedScoreCount);
    scores = evalScores.map(s => s.val);

    // La moyenne est généralement le premier nombre avant les scores d'évals
    const before = allScores.slice(0, allScores.length - expectedScoreCount);
    const avgEntry = before.find(s => s.val !== null);
    average = avgEntry?.val ?? null;
  } else {
    // Fallback : tout est score
    scores = allScores.map(s => s.val);
  }

  return {
    lastName,
    firstName,
    className: classCode,
    average,
    scores,
    rawLine: line,
  };
}

/** Extrait nom/prénom à partir de tokens (le NOM est en majuscules) */
function extractName(parts: string[]): { lastName: string; firstName: string } {
  if (parts.length === 0) return { lastName: '', firstName: '' };

  // Regrouper les parties en majuscules consécutives = nom de famille
  // Ex: ["BEN", "ABDELLAH", "Wacil"] → lastName="BEN ABDELLAH", firstName="Wacil"
  // Ex: ["ASKRI", "Anas"] → lastName="ASKRI", firstName="Anas"
  // Ex: ["KY", "Mibiempan", "Dalila"] → lastName="KY", firstName="Mibiempan Dalila"

  let lastUpperIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    // Considérer comme partie du nom si tout en majuscules (et contient des lettres)
    if (p === p.toUpperCase() && /[A-ZÀ-Ü]/.test(p)) {
      lastUpperIdx = i;
    } else {
      break; // Dès qu'on trouve un mot mixte, c'est le prénom
    }
  }

  if (lastUpperIdx >= 0) {
    return {
      lastName: parts.slice(0, lastUpperIdx + 1).join(' '),
      firstName: parts.slice(lastUpperIdx + 1).join(' '),
    };
  }

  // Fallback
  return { lastName: parts[0]!, firstName: parts.slice(1).join(' ') };
}

// ── Parsing de la liste d'élèves Pronote ──

/**
 * Détecte si le texte est une "Liste des élèves" Pronote (pas un tableau de notes)
 */
function isStudentListFormat(text: string): boolean {
  return /Liste\s+des\s+[ée]l[eè]ves/i.test(text)
    && !/Tableau\s+de\s+notes/i.test(text);
}

// ── Parsing principal ──

/**
 * Parse un fichier PDF Pronote (tableau de notes multi-évaluations).
 * Pronote n'exporte qu'en PDF — pas de CSV.
 */
export async function parsePronoteGradeFile(file: File): Promise<ParsedGradeSheet> {
  const extracted = await extractTextFromFile(file, 'pdf');
  if (!extracted) {
    throw new Error('Impossible d\'extraire le texte du PDF. Le fichier est peut-être un scan (image).');
  }
  const rawText = extracted;

  if (isStudentListFormat(rawText)) {
    throw new Error('Ce fichier semble être une liste d\'élèves, pas un tableau de notes. Utilisez l\'import classe pour ce type de fichier.');
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  // Extraire les métadonnées
  const groupMatch = rawText.match(/Groupe\s*:\s*(.+)/i);
  const subjectMatch = rawText.match(/Mati[eè]re\s*:\s*(.+?)(?:\s+Professeur|$)/im);
  const periodMatch = rawText.match(/P[ée]riode\s*:\s*(.+)/i);

  const groupLabel = groupMatch?.[1]?.trim() ?? null;
  const subjectLabel = subjectMatch?.[1]?.trim() ?? null;
  const periodLabel = periodMatch?.[1]?.trim() ?? null;

  // Parser les en-têtes pour détecter les évaluations
  const { assignments, headerEndIdx } = parseHeaderArea(lines);

  // Parser les lignes de données
  const dataLines = lines.slice(headerEndIdx);
  const rows: ParsedStudentRow[] = [];

  for (const line of dataLines) {
    const row = parseDataRow(line, assignments.length);
    if (row) {
      rows.push(row);
    }
  }

  // Si aucune évaluation détectée dans le header mais des rows avec scores,
  // déduire le nombre d'évaluations depuis les lignes
  if (assignments.length === 0 && rows.length > 0) {
    // Prendre le nombre de scores le plus fréquent
    const scoreCounts = rows.map(r => r.scores.length);
    const maxCount = Math.max(...scoreCounts);

    if (maxCount === 1) {
      // Format simple : une seule note par élève
      assignments.push({
        title: file.name.replace(/\.[^.]+$/, ''),
        coefficient: 1,
        maxScore: 20,
        date: null,
      });
    } else {
      for (let i = 0; i < maxCount; i++) {
        assignments.push({
          title: `Evaluation ${i + 1}`,
          coefficient: 1,
          maxScore: 20,
          date: null,
        });
      }
    }
  }

  // S'assurer que chaque row a le bon nombre de scores
  for (const row of rows) {
    while (row.scores.length < assignments.length) {
      row.scores.push(null);
    }
    if (row.scores.length > assignments.length) {
      row.scores = row.scores.slice(0, assignments.length);
    }
  }

  return {
    groupLabel,
    subjectLabel,
    periodLabel,
    assignments,
    rows,
    rawText,
  };
}
