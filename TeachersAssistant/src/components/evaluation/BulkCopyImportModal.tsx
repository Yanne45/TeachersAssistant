// ============================================================================
// BulkCopyImportModal — Import lot de copies avec matching élèves
// ============================================================================

import React, { useState, useRef } from 'react';
import { Button, Modal, ProgressBar } from '../ui';
import { submissionService, workspaceService, toRelativePath } from '../../services';
import { matchFileToStudent, type MatchableStudent } from '../../utils/studentMatcher';
import { extractTextFromFile } from '../../utils/textExtractor';
import './BulkCopyImportModal.css';

interface StudentSubmissionRef {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  students: StudentSubmissionRef[];
  onImported: () => void;
  /** Nom de la classe (ex: "Terminale 2") — sert à organiser le dossier copies/ */
  className?: string;
  /** Titre du devoir (ex: "Dissertation HGGSP") — sert à organiser le dossier copies/ */
  assignmentTitle?: string;
}

interface FileEntry {
  file: File;
  ext: string;
  matchedStudentId: number | null;
  confidence: 'exact' | 'partial' | 'none';
  skip: boolean;
}

type Phase = 'select' | 'review' | 'saving' | 'done';

export const BulkCopyImportModal: React.FC<Props> = ({ open, onClose, students, onImported, className, assignmentTitle }) => {
  const [phase, setPhase] = useState<Phase>('select');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchables: MatchableStudent[] = students.map((s) => ({ id: s.id, name: s.name }));

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const entries: FileEntry[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]!;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const match = matchFileToStudent(file.name, matchables);
      entries.push({
        file,
        ext,
        matchedStudentId: match?.studentId ?? null,
        confidence: match?.confidence ?? 'none',
        skip: false,
      });
    }

    setFiles(entries);
    setPhase('review');
  };

  const handleSave = async () => {
    setPhase('saving');
    setProgress(0);
    setSavedCount(0);

    const copiesDir = await workspaceService.getAppSubDir('copies', className, assignmentTitle);
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const toProcess = files.filter((f) => !f.skip && f.matchedStudentId != null);
    let count = 0;

    for (const entry of toProcess) {
      const safeName = entry.file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-. ]/g, '_').slice(0, 60);
      const absoluteDest = `${copiesDir}/${safeName}_${Date.now()}.${entry.ext}`;
      const buffer = await entry.file.arrayBuffer();
      await writeFile(absoluteDest, new Uint8Array(buffer));

      const relPath = await toRelativePath(absoluteDest);
      // Find the submission for this student
      const student = students.find((s) => s.id === entry.matchedStudentId);
      if (student) {
        await submissionService.updateFilePath(student.id, relPath);

        const textContent = await extractTextFromFile(entry.file, entry.ext);
        if (textContent) {
          await submissionService.updateTextContent(student.id, textContent);
        }
      }

      count++;
      setProgress(Math.round((count / toProcess.length) * 100));
    }

    setSavedCount(count);
    setPhase('done');
  };

  const handleClose = () => {
    if (phase === 'done') onImported();
    setPhase('select');
    setFiles([]);
    setProgress(0);
    onClose();
  };

  const updateEntry = (idx: number, update: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...update } : f)));
  };

  const matchedCount = files.filter((f) => !f.skip && f.matchedStudentId != null).length;

  return (
    <Modal open={open} onClose={handleClose} title="Importer copies (lot)" size="large">
      {phase === 'select' && (
        <div className="bulk-import__select">
          <p className="bulk-import__hint">
            Sélectionnez les fichiers de copies (PDF, images, DOCX). Les noms de fichiers seront associés aux élèves automatiquement.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            Choisir les fichiers
          </Button>
        </div>
      )}

      {phase === 'review' && (
        <div className="bulk-import__review">
          <p className="bulk-import__hint">
            {matchedCount} fichier(s) associé(s) sur {files.length}. Vérifiez et corrigez les associations.
          </p>
          <div className="bulk-import__table-wrap">
            <table className="bulk-import__table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Élève</th>
                  <th>Confiance</th>
                  <th>Ignorer</th>
                </tr>
              </thead>
              <tbody>
                {files.map((entry, idx) => (
                  <tr key={idx} className={entry.skip ? 'bulk-import__row--skip' : ''}>
                    <td className="bulk-import__filename" title={entry.file.name}>
                      {entry.file.name}
                    </td>
                    <td>
                      <select
                        className="bulk-import__select-student"
                        value={entry.matchedStudentId ?? ''}
                        onChange={(e) => updateEntry(idx, {
                          matchedStudentId: e.target.value ? Number(e.target.value) : null,
                          confidence: e.target.value ? 'exact' : 'none',
                        })}
                      >
                        <option value="">— Non associé —</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`bulk-import__badge bulk-import__badge--${entry.confidence}`}>
                        {entry.confidence === 'exact' ? 'Exact' : entry.confidence === 'partial' ? 'Partiel' : '—'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={entry.skip}
                        onChange={(e) => updateEntry(idx, { skip: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bulk-import__actions">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={matchedCount === 0}>
              Importer {matchedCount} copie(s)
            </Button>
          </div>
        </div>
      )}

      {phase === 'saving' && (
        <div className="bulk-import__saving">
          <p>Import en cours…</p>
          <ProgressBar value={progress} />
        </div>
      )}

      {phase === 'done' && (
        <div className="bulk-import__done">
          <p>{savedCount} copie(s) importée(s) avec succès.</p>
          <Button variant="primary" onClick={handleClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  );
};
