// ============================================================================
// BulletinPdfImportModal — Import batch de bulletins PDF (un PDF par eleve)
// Parse chaque PDF, detecte le nom eleve, matche avec la DB, stocke le doc
// ============================================================================

import React, { useState, useCallback } from 'react';
import { Button, Modal, ProgressBar } from '../ui';
import { DropZone } from '../dnd/DropZone';
import { documentService, studentService, getCurrentPath } from '../../services';
import { toRelativePath } from '../../services';
import { parseBulletinPdf, type ParsedBulletin } from '../../utils/bulletinPdfParser';
import type { ID } from '../../types';
import './BulletinPdfImportModal.css';

// ── Types ──

interface StudentInfo {
  id: number;
  last_name: string;
  first_name: string;
}

interface PeriodInfo {
  id: number;
  label: string;
}

export interface BulletinPdfImportModalProps {
  open: boolean;
  onClose: () => void;
  students: StudentInfo[];
  periods: PeriodInfo[];
  defaultPeriodId: number | null;
  onImported: () => void;
}

/** Resultat du matching pour une entree */
interface MatchedBulletin {
  parsed: ParsedBulletin;
  file: File;
  matchedStudentId: number | null;
  matchedStudentName: string;
  confidence: 'exact' | 'partial' | 'none';
  selectedPeriodId: number | null;
  skip: boolean;
}

type Phase = 'upload' | 'preview' | 'saving' | 'done';

// ── Helpers ──

function normalizeForMatch(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function matchStudent(
  lastName: string | null,
  firstName: string | null,
  students: StudentInfo[],
): { studentId: number | null; studentName: string; confidence: 'exact' | 'partial' | 'none' } {
  if (!lastName) return { studentId: null, studentName: '', confidence: 'none' };

  const normLast = normalizeForMatch(lastName);
  const normFirst = firstName ? normalizeForMatch(firstName) : '';

  // Exact match (nom + prenom)
  for (const s of students) {
    const sLast = normalizeForMatch(s.last_name);
    const sFirst = normalizeForMatch(s.first_name);
    if (sLast === normLast && sFirst === normFirst) {
      return { studentId: s.id, studentName: `${s.last_name} ${s.first_name}`, confidence: 'exact' };
    }
  }

  // Partial match (nom seul)
  for (const s of students) {
    const sLast = normalizeForMatch(s.last_name);
    if (sLast === normLast) {
      return { studentId: s.id, studentName: `${s.last_name} ${s.first_name}`, confidence: 'partial' };
    }
  }

  // Partial match (nom contenu)
  for (const s of students) {
    const sLast = normalizeForMatch(s.last_name);
    const sFirst = normalizeForMatch(s.first_name);
    if (normLast.includes(sLast) || sLast.includes(normLast)) {
      return { studentId: s.id, studentName: `${s.last_name} ${s.first_name}`, confidence: 'partial' };
    }
    if (normFirst && (normFirst.includes(sFirst) || sFirst.includes(normFirst)) && normLast.includes(sLast)) {
      return { studentId: s.id, studentName: `${s.last_name} ${s.first_name}`, confidence: 'partial' };
    }
  }

  return { studentId: null, studentName: '', confidence: 'none' };
}

// ── Composant ──

export const BulletinPdfImportModal: React.FC<BulletinPdfImportModalProps> = ({
  open, onClose, students, periods, defaultPeriodId, onImported,
}) => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [matched, setMatched] = useState<MatchedBulletin[]>([]);
  const [progress, setProgress] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const activeRows = matched.filter(r => !r.skip && r.matchedStudentId != null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('Aucun fichier PDF detecte.');
      return;
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleParse = useCallback(async () => {
    if (files.length === 0) return;
    setError(null);

    try {
      const results: MatchedBulletin[] = [];

      for (const file of files) {
        const parsed = await parseBulletinPdf(file);
        const match = matchStudent(parsed.studentLastName, parsed.studentFirstName, students);

        results.push({
          parsed,
          file,
          matchedStudentId: match.studentId,
          matchedStudentName: match.studentName,
          confidence: match.confidence,
          selectedPeriodId: defaultPeriodId,
          skip: false,
        });
      }

      setMatched(results);
      setPhase('preview');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse des fichiers');
    }
  }, [files, students, defaultPeriodId]);

  const updateRow = (idx: number, update: Partial<MatchedBulletin>) => {
    setMatched(prev => prev.map((r, i) => (i === idx ? { ...r, ...update } : r)));
  };

  const handleSave = async () => {
    if (activeRows.length === 0) return;
    setPhase('saving');
    setProgress(0);
    setSavedCount(0);

    try {
      const dbPath = getCurrentPath();
      if (!dbPath) throw new Error('Aucune base de donnees ouverte');

      // Determine the documents directory (sibling to db file)
      const dbDir = dbPath.replace(/[/\\][^/\\]+$/, '');
      const docsDir = `${dbDir}/documents`;

      // Ensure documents directory exists
      const { mkdir, exists, writeFile } = await import('@tauri-apps/plugin-fs');
      const dirExists = await exists(docsDir);
      if (!dirExists) {
        await mkdir(docsDir, { recursive: true });
      }

      let done = 0;
      let importedCount = 0;

      for (const row of matched) {
        if (row.skip || row.matchedStudentId == null) {
          done++;
          setProgress(Math.round((done / matched.length) * 100));
          continue;
        }

        try {
          // 1. Copy file to documents directory
          const timestamp = Date.now();
          const safeFileName = `bulletin_${timestamp}_${row.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const destPath = `${docsDir}/${safeFileName}`;

          const arrayBuf = await row.file.arrayBuffer();
          await writeFile(destPath, new Uint8Array(arrayBuf));

          // 2. Create document record
          const relativePath = await toRelativePath(destPath);
          const docId = await documentService.create({
            title: `Bulletin - ${row.matchedStudentName}`,
            file_path: relativePath,
            file_name: row.file.name,
            file_type: 'pdf',
            file_size: row.file.size,
            file_hash: null,
            mime_type: 'application/pdf',
            document_type_id: null,
            subject_id: null,
            level_id: null,
            thumbnail_path: null,
            extracted_text: row.parsed.rawText || null,
            source: 'import',
            generated_from_ai_generation_id: null,
            notes: row.parsed.periodLabel || null,
          });

          // 3. Link to student
          const periodLabel = row.selectedPeriodId
            ? periods.find(p => p.id === row.selectedPeriodId)?.label ?? null
            : null;

          await studentService.linkDocument(
            row.matchedStudentId as ID,
            docId as ID,
            (row.selectedPeriodId ?? null) as ID | null,
            periodLabel ? `Bulletin ${periodLabel}` : 'Bulletin',
          );

          importedCount++;
        } catch (fileErr) {
          console.error(`[BulletinPdfImport] Erreur pour ${row.file.name}:`, fileErr);
        }

        done++;
        setProgress(Math.round((done / matched.length) * 100));
      }

      setSavedCount(importedCount);
      setPhase('done');
    } catch (err: any) {
      console.error('[BulletinPdfImport] Erreur globale:', err);
      setError(err.message || 'Erreur lors de l\'import');
      setPhase('preview');
    }
  };

  const handleClose = () => {
    if (phase === 'done') onImported();
    setPhase('upload');
    setFiles([]);
    setMatched([]);
    setError(null);
    setProgress(0);
    setSavedCount(0);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importer des bulletins PDF" size="large">
      {/* Phase : upload */}
      {phase === 'upload' && (
        <div className="bulletin-import__upload">
          <p className="bulletin-import__hint">
            Deposez un ou plusieurs bulletins PDF (un fichier par eleve).
            Le nom de l'eleve sera detecte automatiquement dans chaque PDF.
          </p>

          <DropZone
            accept={['application/pdf', '.pdf']}
            acceptLabel="PDF uniquement"
            label="Glissez vos bulletins PDF ici"
            multiple={true}
            onDrop={handleFilesSelected}
          />

          {files.length > 0 && (
            <div className="bulletin-import__file-list">
              <p className="bulletin-import__file-count">{files.length} fichier(s) selectionne(s)</p>
              <ul className="bulletin-import__files">
                {files.map((f, i) => (
                  <li key={i} className="bulletin-import__file-item">
                    <span className="bulletin-import__file-name">{f.name}</span>
                    <span className="bulletin-import__file-size">
                      {(f.size / 1024).toFixed(0)} Ko
                    </span>
                    <button
                      className="bulletin-import__file-remove"
                      onClick={() => removeFile(i)}
                      title="Retirer"
                    >
                      x
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="bulletin-import__error">{error}</p>
          )}

          <div className="bulletin-import__actions">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            <Button variant="primary" onClick={handleParse} disabled={files.length === 0}>
              Analyser {files.length} fichier(s)
            </Button>
          </div>
        </div>
      )}

      {/* Phase : preview / match */}
      {phase === 'preview' && (
        <div className="bulletin-import__preview">
          <p className="bulletin-import__hint">
            {activeRows.length} eleve(s) avec correspondance sur {matched.length} fichier(s).
            Verifiez les associations avant d'importer.
          </p>

          <div className="bulletin-import__table-wrap">
            <table className="bulletin-import__table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Nom detecte</th>
                  <th>Eleve</th>
                  <th>Periode</th>
                  <th>Confiance</th>
                  <th>Ignorer</th>
                </tr>
              </thead>
              <tbody>
                {matched.map((row, idx) => (
                  <tr key={idx} className={row.skip ? 'bulletin-import__row--skip' : ''}>
                    <td className="bulletin-import__cell-file" title={row.parsed.fileName}>
                      {row.parsed.fileName.length > 30
                        ? row.parsed.fileName.slice(0, 27) + '...'
                        : row.parsed.fileName}
                    </td>
                    <td>
                      {row.parsed.studentLastName
                        ? `${row.parsed.studentLastName} ${row.parsed.studentFirstName ?? ''}`
                        : <span style={{ color: 'var(--color-text-muted)' }}>Non detecte</span>}
                    </td>
                    <td>
                      <select
                        className="bulletin-import__select-student"
                        value={row.matchedStudentId ?? ''}
                        onChange={e => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          const s = students.find(st => st.id === id);
                          updateRow(idx, {
                            matchedStudentId: id,
                            matchedStudentName: s ? `${s.last_name} ${s.first_name}` : '',
                            confidence: id ? 'exact' : 'none',
                          });
                        }}
                      >
                        <option value="">-- Non associe --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="bulletin-import__select-period"
                        value={row.selectedPeriodId ?? ''}
                        onChange={e => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          updateRow(idx, { selectedPeriodId: id });
                        }}
                      >
                        <option value="">-- Aucune --</option>
                        {periods.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`bulletin-import__badge bulletin-import__badge--${row.confidence}`}>
                        {row.confidence === 'exact' ? 'Exact' : row.confidence === 'partial' ? 'Partiel' : '--'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={e => updateRow(idx, { skip: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <p className="bulletin-import__error">{error}</p>}

          <div className="bulletin-import__actions">
            <Button variant="ghost" onClick={() => { setPhase('upload'); setMatched([]); }}>Retour</Button>
            <Button variant="primary" onClick={handleSave} disabled={activeRows.length === 0}>
              Importer {activeRows.length} bulletin(s)
            </Button>
          </div>
        </div>
      )}

      {/* Phase : saving */}
      {phase === 'saving' && (
        <div className="bulletin-import__saving">
          <p>Import des bulletins en cours...</p>
          <ProgressBar value={progress} showLabel />
        </div>
      )}

      {/* Phase : done */}
      {phase === 'done' && (
        <div className="bulletin-import__done">
          <p>{savedCount} bulletin(s) importe(s) avec succes.</p>
          <Button variant="primary" onClick={handleClose} style={{ marginTop: 'var(--space-3)' }}>
            Fermer
          </Button>
        </div>
      )}
    </Modal>
  );
};
