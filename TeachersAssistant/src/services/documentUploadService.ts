// ============================================================================
// Teacher Assistant — Service : Upload & classification IA de documents
// Flux : File[] → copie disque → classification IA → suggestions → DB
// ============================================================================

import { assemblePrompt, getApiKey } from './aiService';
import { workspaceService, toRelativePath, resolveDocPath } from './workspaceService';
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
  /** Chemin relatif du thumbnail généré (null si non image) */
  thumbnailPath: string | null;
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
      const absoluteDest = uniqueDestPath(docsDir, file.name);
      await writeFileToDisk(file, absoluteDest);
      // Stocker en chemin relatif pour portabilité
      destPath = await toRelativePath(absoluteDest);
    } catch (err) {
      copyError = String(err);
    }

    // 3. Génération thumbnail (images, PDF, DOCX, PPTX — non bloquant)
    let thumbnailPath: string | null = null;
    if (!copyError) {
      try {
        thumbnailPath = await generateThumbnail(file, ext);
      } catch {
        // Thumbnail non critique — on continue
      }
    }

    results.push({
      originalFile: file,
      destPath,
      fileExt: ext,
      fileSize: file.size,
      classification,
      thumbnailPath,
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
    const resolved = await resolveDocPath(filePath);
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    return convertFileSrc(resolved);
  } catch {
    return null;
  }
}

// ── Thumbnail generation ──

const THUMB_W = 200;
const THUMB_H = 260;

const THUMB_SUPPORTED_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx'];

function canGenerateThumbnail(ext: string): boolean {
  return THUMB_SUPPORTED_EXTS.includes(ext.toLowerCase());
}

/** Sauvegarde un canvas en JPEG dans thumbnails/ et retourne le chemin relatif */
async function saveCanvasThumb(canvas: HTMLCanvasElement): Promise<string | null> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.80),
  );
  if (!blob) return null;

  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const thumbDir = await workspaceService.getAppSubDir('thumbnails');
  const thumbName = `thumb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { join } = await import('@tauri-apps/api/path');
  const thumbPath = await join(thumbDir, thumbName);
  const buffer = await blob.arrayBuffer();
  await writeFile(thumbPath, new Uint8Array(buffer));

  return await toRelativePath(thumbPath);
}

/** Thumbnail d'une image (resize proportionnel) */
async function thumbnailFromImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const ratio = Math.min(THUMB_W / w, THUMB_H / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    return await saveCanvasThumb(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Thumbnail d'un PDF (rendu de la 1ère page via pdfjs-dist) */
async function thumbnailFromPdf(file: File): Promise<string | null> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuf = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuf) }).promise;
  const page = await pdfDoc.getPage(1);

  // Rendre à une taille raisonnable (scale pour que le plus grand côté = THUMB_W)
  const vp = page.getViewport({ scale: 1 });
  const scale = Math.min(THUMB_W / vp.width, THUMB_H / vp.height, 1.5);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fond blanc (les PDFs n'ont pas toujours de fond)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;
  pdfDoc.destroy();

  return await saveCanvasThumb(canvas);
}

/** Thumbnail d'un DOCX (extraction texte mammoth → rendu canvas) */
async function thumbnailFromDocx(file: File): Promise<string | null> {
  const mammoth = await import('mammoth');
  const arrayBuf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: arrayBuf });
  const text = result.value.slice(0, 600);

  return renderTextThumbnail(text, '#2B579A', '📝');
}

/** Thumbnail placeholder stylisé (PPTX et autres) */
function renderTextThumbnail(text: string, accentColor: string, icon: string): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  // Fond
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  // Barre de couleur en haut
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, THUMB_W, 6);

  // Icône
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, THUMB_W / 2, 36);

  // Texte (word-wrap manuel)
  if (text.trim()) {
    ctx.fillStyle = '#333';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    const maxW = THUMB_W - 20;
    const lines: string[] = [];
    const words = text.replace(/\n+/g, ' ').split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
      if (lines.length >= 18) break;
    }
    if (line && lines.length < 18) lines.push(line);

    let y = 50;
    for (const l of lines) {
      ctx.fillText(l, 10, y);
      y += 13;
    }
  }

  return saveCanvasThumb(canvas);
}

/**
 * Génère un thumbnail pour un fichier uploadé.
 * Supporte : images, PDF, DOCX, PPTX (placeholder stylisé).
 */
export async function generateThumbnail(
  file: File,
  ext: string,
): Promise<string | null> {
  const e = ext.toLowerCase();
  if (!canGenerateThumbnail(e)) return null;

  try {
    if (isImageFile(e)) return await thumbnailFromImage(file);
    if (e === 'pdf') return await thumbnailFromPdf(file);
    if (e === 'docx' || e === 'doc') return await thumbnailFromDocx(file);
    if (e === 'pptx' || e === 'ppt') {
      // Pas de rendu natif pour PPT — placeholder avec le nom du fichier
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      return await renderTextThumbnail(name, '#D24726', '📊');
    }
    return null;
  } catch (err) {
    console.warn('[generateThumbnail] Erreur:', err);
    return null;
  }
}

/**
 * Génère un thumbnail depuis un chemin de fichier déjà sauvé sur disque.
 * Utile pour les documents existants (migration batch).
 * Supporte les images et les PDF.
 */
export async function generateThumbnailFromPath(
  filePath: string,
  ext: string,
): Promise<string | null> {
  const e = ext.toLowerCase();
  if (!canGenerateThumbnail(e)) return null;

  try {
    // Pour les PDF : lire le fichier et passer à thumbnailFromPdf
    if (e === 'pdf') {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const resolved = await resolveDocPath(filePath);
      const data = await readFile(resolved);
      const file = new File([data], 'doc.pdf', { type: 'application/pdf' });
      return await thumbnailFromPdf(file);
    }

    // Pour les DOCX : lire et passer à thumbnailFromDocx
    if (e === 'docx' || e === 'doc') {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const resolved = await resolveDocPath(filePath);
      const data = await readFile(resolved);
      const file = new File([data], 'doc.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      return await thumbnailFromDocx(file);
    }

    // Pour les PPT : placeholder
    if (e === 'pptx' || e === 'ppt') {
      const name = filePath.replace(/.*[/\\]/, '').replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      return await renderTextThumbnail(name, '#D24726', '📊');
    }

    // Pour les images : charger via convertFileSrc
    if (isImageFile(e)) {
      const resolved = await resolveDocPath(filePath);
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const src = convertFileSrc(resolved);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = src;
      });

      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const ratio = Math.min(THUMB_W / w, THUMB_H / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);

      return await saveCanvasThumb(canvas);
    }

    return null;
  } catch (err) {
    console.warn('[generateThumbnailFromPath] Erreur:', err);
    return null;
  }
}
