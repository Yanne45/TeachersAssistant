// ============================================================================
// PronoteImportModal — Import notes depuis CSV Pronote
// ============================================================================

import React, { useState, useRef } from 'react';
import { Button, Modal, ProgressBar } from '../ui';
import { submissionService } from '../../services';
import { matchNameToStudent, type MatchableStudent } from '../../utils/studentMatcher';
import './PronoteImportModal.css';

interface StudentSubmissionRef {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  students: StudentSubmissionRef[];
  onImported: () => void;
}

interface PronoteRow {
  rawName: string;
  parsedLastName: string;
  parsedFirstName: string;
  score: number | null;
  matchedStudentId: number | null;
  matchedStudentName: string;
  submissionId: number | null;
  confidence: 'exact' | 'partial' | 'none';
  skip: boolean;
}

type Phase = 'upload' | 'preview' | 'saving' | 'done';

function detectSeparator(line: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch]!++;
  }
  return Object.entries(counts).reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
}

function parseScore(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export const PronoteImportModal: React.FC<Props> = ({ open, onClose, students, onImported }) => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [rows, setRows] = useState<PronoteRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchables: MatchableStudent[] = students.map((s) => ({ id: s.id, name: s.name }));

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;

    const sep = detectSeparator(lines[0] ?? '');
    const headerLine = lines[0]!.split(sep).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    // Find column indices
    const nomIdx = headerLine.findIndex((h) => h.includes('nom'));
    const prenomIdx = headerLine.findIndex((h) => h.includes('prénom') || h.includes('prenom'));
    const noteIdx = headerLine.findIndex((h) => h.includes('note') || h.includes('score') || h.includes('moyenne'));

    if (nomIdx === -1 || noteIdx === -1) {
      // Try without header: assume Nom;Prénom;Note
      const parsed = lines.map((line) => {
        const cols = line.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
        return parseLine(cols, 0, 1, 2);
      });
      setRows(parsed);
      setPhase('preview');
      return;
    }

    const dataLines = lines.slice(1);
    const parsed = dataLines.map((line) => {
      const cols = line.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
      return parseLine(cols, nomIdx, prenomIdx, noteIdx);
    });

    setRows(parsed);
    setPhase('preview');
  };

  const parseLine = (cols: string[], nomIdx: number, prenomIdx: number, noteIdx: number): PronoteRow => {
    const lastName = cols[nomIdx] ?? '';
    const firstName = prenomIdx >= 0 ? cols[prenomIdx] ?? '' : '';
    const score = parseScore(cols[noteIdx] ?? '');
    const rawName = `${lastName} ${firstName}`.trim();

    const match = matchNameToStudent(lastName, firstName, matchables);
    const submissionId = match ? students.find((s) => s.id === match.studentId)?.id ?? null : null;

    return {
      rawName,
      parsedLastName: lastName,
      parsedFirstName: firstName,
      score,
      matchedStudentId: match?.studentId ?? null,
      matchedStudentName: match?.studentName ?? '',
      submissionId,
      confidence: match?.confidence ?? 'none',
      skip: false,
    };
  };

  const handleSave = async () => {
    setPhase('saving');
    setProgress(0);
    setSavedCount(0);

    const toProcess = rows.filter((r) => !r.skip && r.submissionId != null && r.score != null);
    let count = 0;

    for (const row of toProcess) {
      await submissionService.updateScore(row.submissionId!, row.score);
      count++;
      setProgress(Math.round((count / toProcess.length) * 100));
    }

    setSavedCount(count);
    setPhase('done');
  };

  const handleClose = () => {
    if (phase === 'done') onImported();
    setPhase('upload');
    setRows([]);
    setProgress(0);
    onClose();
  };

  const updateRow = (idx: number, update: Partial<PronoteRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...update } : r)));
  };

  const matchedCount = rows.filter((r) => !r.skip && r.submissionId != null && r.score != null).length;

  return (
    <Modal open={open} onClose={handleClose} title="Importer notes Pronote (CSV)" size="large">
      {phase === 'upload' && (
        <div className="pronote-import__upload">
          <p className="pronote-import__hint">
            Sélectionnez le fichier CSV exporté depuis Pronote. Format attendu : Nom;Prénom;Note
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
          />
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            Choisir le fichier CSV
          </Button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="pronote-import__preview">
          <p className="pronote-import__hint">
            {matchedCount} note(s) à importer sur {rows.length} ligne(s).
          </p>
          <div className="pronote-import__table-wrap">
            <table className="pronote-import__table">
              <thead>
                <tr>
                  <th>Nom CSV</th>
                  <th>Élève</th>
                  <th>Note</th>
                  <th>Confiance</th>
                  <th>Ignorer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.skip ? 'pronote-import__row--skip' : ''}>
                    <td>{row.rawName}</td>
                    <td>
                      <select
                        className="pronote-import__select-student"
                        value={row.matchedStudentId ?? ''}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          const s = students.find((st) => st.id === id);
                          updateRow(idx, {
                            matchedStudentId: id,
                            matchedStudentName: s?.name ?? '',
                            submissionId: id,
                            confidence: id ? 'exact' : 'none',
                          });
                        }}
                      >
                        <option value="">— Non associé —</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.score ?? '—'}</td>
                    <td>
                      <span className={`pronote-import__badge pronote-import__badge--${row.confidence}`}>
                        {row.confidence === 'exact' ? 'Exact' : row.confidence === 'partial' ? 'Partiel' : '—'}
                      </span>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={(e) => updateRow(idx, { skip: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pronote-import__actions">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            <Button variant="primary" onClick={handleSave} disabled={matchedCount === 0}>
              Importer {matchedCount} note(s)
            </Button>
          </div>
        </div>
      )}

      {phase === 'saving' && (
        <div className="pronote-import__saving">
          <p>Import en cours…</p>
          <ProgressBar value={progress} />
        </div>
      )}

      {phase === 'done' && (
        <div className="pronote-import__done">
          <p>{savedCount} note(s) importée(s) avec succès.</p>
          <Button variant="primary" onClick={handleClose}>Fermer</Button>
        </div>
      )}
    </Modal>
  );
};
