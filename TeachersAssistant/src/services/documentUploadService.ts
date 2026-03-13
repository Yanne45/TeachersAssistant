// ============================================================================
// Teacher Assistant — Service : Upload & classification IA de documents
// Flux : File[] → copie disque → classification IA → suggestions → DB
// ============================================================================

import { assemblePrompt, getApiKey } from './aiService';
import { workspaceService } from './workspaceService';
import type { ID } from '../types';

// ── Types ──

export interface ClassificationResult {
  /** Code matière : 'HGGSP' | 'HIST' | 'GEO' | null */
  subjectCode: string | null;
  /** Libellé matière pour arborescence dossiers */
  subjectLabel: string | null;
  /** Code niveau : 'TLE' | 'PRE' | null */
  levelCode: string | null;
  /** Libellé niveau pour arborescence dossiers */
  levelLabel: string | null;
  /** Code type de document : 'cours' | 'diaporama' | etc */
  docTypeCode: string | null;
  /** Tags suggérés (libellés) */
  tags: string[];
  /** Titre suggéré */
  suggestedTitle: string;
  /** Résumé court */
  summary: string;
}

export interface ProcessedFile {
  originalFile: File;
  /** Chemin de destination sur disque (vide si erreur copie) */
  destPath: string;
  /** Extension normalisée */
  fileExt: string;
  /** Taille en octets */
  fileSize: number;
  /** Suggestions IA */
  classification: ClassificationResult;
  /** Erreur éventuelle lors du traitement */
  error: string | null;
}

// ── Helpers filesystem ──

function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

async function writeFileToDisk(file: File, destPath: string): Promise<void> {
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const buffer = await file.arrayBuffer();
  await writeFile(destPath, new Uint8Array(buffer));
}

function uniqueDestPath(docsDir: string, filename: string): string {
  const ext = getFileExtension(filename);
  const nameNoExt = filename.slice(0, filename.length - ext.length - 1);
  const safe = nameNoExt.replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 60);
  const ts = Date.now();
  return `${docsDir}/${safe}_${ts}.${ext}`;
}

// ── Classification IA ──

const FALLBACK_CLASSIFICATION: ClassificationResult = {
  subjectCode: null, subjectLabel: null,
  levelCode: null, levelLabel: null,
  docTypeCode: null,
  tags: [], suggestedTitle: '', summary: '',
};

/** Normalise la réponse brute de l'IA vers les codes internes */
function normalizeAIResponse(raw: Record<string, unknown>, filename: string): ClassificationResult {
  const subject = String(raw.subject ?? '').toLowerCase();
  const level   = String(raw.level   ?? '').toLowerCase();
  const docType = String(raw.doc_type ?? raw.docType ?? '').toLowerCase();

  const subjectCode =
    subject.includes('hggsp') ? 'HGGSP' :
    subject.includes('hist')  ? 'HIST'  :
    subject.includes('geo')   ? 'GEO'   : null;

  const subjectLabel =
    subjectCode === 'HGGSP' ? 'HGGSP' :
    subjectCode === 'HIST'  ? 'Histoire-Géographie' :
    subjectCode === 'GEO'   ? 'Géographie' : null;

  const levelCode =
    level.includes('terminale') || level === 'tle' ? 'TLE' :
    level.includes('premi')     || level === 'pre' ? 'PRE' : null;

  const levelLabel =
    levelCode === 'TLE' ? 'Terminale' :
    levelCode === 'PRE' ? 'Première'  : null;

  const docTypeCode =
    docType.includes('cours')      ? 'cours'      :
    docType.includes('diapo')      ? 'diaporama'  :
    docType.includes('fiche')      ? 'fiche'      :
    docType.includes('sujet')      ? 'sujet'      :
    docType.includes('corrig')     ? 'corrige'    :
    docType.includes('methode')    ? 'methode'    :
    docType.includes('progress')   ? 'progression':
    docType || null;

  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');

  return {
    subjectCode,
    subjectLabel,
    levelCode,
    levelLabel,
    docTypeCode,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]).slice(0, 5) : [],
    suggestedTitle: String(raw.title ?? raw.titre ?? baseName),
    summary: String(raw.summary ?? raw.resume ?? ''),
  };
}

export async function classifyDocument(
  filename: string,
  fileExt: string,
): Promise<ClassificationResult> {
  try {
    const { systemMessage, userMessage } = await assemblePrompt({
      taskCode: 'classify_document',
      variables: {
        documents_contenu: '(contenu non extrait — classification par nom de fichier)',
        documents_titres: filename,
        file_type: fileExt,
        document_content: '(contenu non extrait — classification par nom de fichier)',
      },
    });

    const apiKey = await getApiKey();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error('API ' + response.status);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return normalizeAIResponse(parsed, filename);
  } catch (err) {
    console.warn('[classify_document] fallback (pas de clé API ou erreur):', err);
    return {
      ...FALLBACK_CLASSIFICATION,
      suggestedTitle: filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
    };
  }
}

// ── Pipeline principal ──

export async function processFiles(
  files: File[],
  onProgress: (idx: number, total: number, step: 'copy' | 'classify', name: string) => void,
): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    const ext = getFileExtension(file.name);

    // 1. Classification IA d'abord → détermine le dossier de destination
    onProgress(i, files.length, 'classify', file.name);
    const classification = await classifyDocument(file.name, ext);

    // 2. Copie sur disque dans le bon sous-dossier documents/<niveau>/<matière>
    onProgress(i, files.length, 'copy', file.name);
    let destPath = '';
    let copyError: string | null = null;

    try {
      const docsDir = await workspaceService.getAppSubDir(
        'documents',
        classification.levelLabel,
        classification.subjectLabel,
      );
      destPath = uniqueDestPath(docsDir, file.name);
      await writeFileToDisk(file, destPath);
    } catch (err) {
      copyError = String(err);
    }

    results.push({
      originalFile: file,
      destPath,
      fileExt: ext,
      fileSize: file.size,
      classification,
      error: copyError,
    });
  }

  return results;
}

// ── Résolution subject/level/type IDs depuis codes ──

export async function resolveIds(
  subjectCode: string | null,
  levelCode: string | null,
  docTypeCode: string | null,
): Promise<{ subjectId: ID | null; levelId: ID | null; docTypeId: ID | null }> {
  const { db } = await import('./db');

  const [subjectRow, levelRow, docTypeRow] = await Promise.all([
    subjectCode
      ? db.selectOne<{ id: ID }>('SELECT id FROM subjects WHERE code = ?', [subjectCode])
      : Promise.resolve(null),
    levelCode
      ? db.selectOne<{ id: ID }>('SELECT id FROM levels WHERE code = ?', [levelCode])
      : Promise.resolve(null),
    docTypeCode
      ? db.selectOne<{ id: ID }>('SELECT id FROM document_types WHERE code = ?', [docTypeCode])
      : Promise.resolve(null),
  ]);

  return {
    subjectId: subjectRow?.id ?? null,
    levelId: levelRow?.id ?? null,
    docTypeId: docTypeRow?.id ?? null,
  };
}

// ── Aperçu fichier (URL sûre pour Tauri) ──

export function isImageFile(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext.toLowerCase());
}

export async function getFilePreviewUrl(filePath: string): Promise<string | null> {
  try {
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    return convertFileSrc(filePath);
  } catch {
    return null;
  }
}
