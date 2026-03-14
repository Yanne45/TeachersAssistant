// ============================================================================
// PronoteGradeImportModal — Import de notes depuis PDF/CSV Pronote
// Supporte les tableaux multi-évaluations (format Pronote standard)
// Crée les évaluations + submissions + scores automatiquement
// ============================================================================

import React, { useState, useRef, useCallback } from 'react';
import { Button, Modal, ProgressBar } from '../ui';
import { assignmentService, submissionService, db } from '../../services';
import { matchNameToStudent, type MatchableStudent } from '../../utils/studentMatcher';
import { parsePronoteGradeFile, type ParsedAssignment, type ParsedStudentRow } from '../../utils/pronoteGradeParser';
import type { ID } from '../../types';
import '../evaluation/PronoteImportModal.css';

interface StudentInfo {
  id: number;
  last_name: string;
  first_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  classId: number;
  subjectId: number;
  yearId: number;
  students: StudentInfo[];
  onImported: () => void;
}

/** Config editable pour chaque évaluation détectée */
interface EvalConfig extends ParsedAssignment {
  selected: boolean;   // importer cette évaluation ?
}

/** Matching élève Pronote → élève DB */
interface MatchedRow {
  parsed: ParsedStudentRow;
  matchedStudentId: number | null;
  matchedStudentName: string;
  confidence: 'exact' | 'partial' | 'none';
  skip: boolean;
}

type Phase = 'upload' | 'config' | 'preview' | 'saving' | 'done';

export const PronoteGradeImportModal: React.FC<Props> = ({
  open, onClose, classId, subjectId, yearId, students, onImported,
}) => {
  const [phase, setPhase] = useState<Phase>('upload');
  const [error, setError] = useState<string | null>(null);

  // Résultat du parsing
  const [evals, setEvals] = useState<EvalConfig[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [metaInfo, setMetaInfo] = useState<{ subject: string | null; period: string | null; group: string | null }>({ subject: null, period: null, group: null });

  // Saving
  const [progress, setProgress] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchables: MatchableStudent[] = students.map(s => ({
    id: s.id,
    name: `${s.last_name} ${s.first_name}`,
  }));

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setError(null);

    try {
      const parsed = await parsePronoteGradeFile(file);

      if (parsed.rows.length === 0) {
        setError('Aucune ligne de notes détectée dans le fichier.');
        return;
      }

      setMetaInfo({
        subject: parsed.subjectLabel,
        period: parsed.periodLabel,
        group: parsed.groupLabel,
      });

      // Config des évaluations (toutes sélectionnées par défaut)
      setEvals(parsed.assignments.map(a => ({ ...a, selected: true })));

      // Matching élèves
      const matched: MatchedRow[] = parsed.rows.map(r => {
        const match = matchNameToStudent(r.lastName, r.firstName, matchables);
        return {
          parsed: r,
          matchedStudentId: match?.studentId ?? null,
          matchedStudentName: match?.studentName ?? '',
          confidence: match?.confidence ?? 'none',
          skip: false,
        };
      });
      setMatchedRows(matched);
      setPhase('config');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la lecture du fichier');
    }
  }, [matchables]);

  const selectedEvals = evals.filter(e => e.selected);
  const activeRows = matchedRows.filter(r => !r.skip && r.matchedStudentId != null);

  const handleSave = async () => {
    if (selectedEvals.length === 0 || activeRows.length === 0) return;
    setPhase('saving');
    setProgress(0);
    setSavedCount(0);

    try {
      const totalWork = selectedEvals.length * activeRows.length;
      let done = 0;

      for (let ei = 0; ei < evals.length; ei++) {
        const evalCfg = evals[ei]!;
        if (!evalCfg.selected) continue;

        // 1. Créer l'évaluation
        const assignmentId = await assignmentService.create({
          academic_year_id: yearId as ID,
          class_id: classId as ID,
          subject_id: subjectId as ID,
          sequence_id: null,
          assignment_type_id: null,
          title: evalCfg.title,
          description: null,
          instructions: null,
          max_score: evalCfg.maxScore,
          coefficient: evalCfg.coefficient,
          assignment_date: evalCfg.date && evalCfg.date.includes('-') ? evalCfg.date : null,
          due_date: null,
          status: 'corrected',
          is_graded: true,
        });

        // 2. Créer les submissions pour toute la classe
        await submissionService.createBatch(assignmentId, classId as ID);

        // 3. Récupérer les IDs des submissions
        const subs = await db.select<{ id: number; student_id: number }[]>(
          'SELECT id, student_id FROM submissions WHERE assignment_id = ?',
          [assignmentId],
        );
        const subByStudent = new Map<number, number>();
        for (const sub of subs) {
          subByStudent.set(sub.student_id, sub.id);
        }

        // 4. Injecter les notes pour cette évaluation
        // L'index de l'éval dans le tableau original (pas juste les selected)
        for (const row of matchedRows) {
          if (row.skip || row.matchedStudentId == null) continue;
          const score = row.parsed.scores[ei] ?? null;
          const subId = subByStudent.get(row.matchedStudentId);
          if (subId != null && score !== null) {
            await submissionService.updateScore(subId as ID, score);
            await submissionService.updateStatus(subId as ID, 'final');
          }
          done++;
          setProgress(Math.round((done / totalWork) * 100));
        }
      }

      setSavedCount(selectedEvals.length);
      setPhase('done');
    } catch (err: any) {
      console.error('[PronoteGradeImport] Error:', err);
      setError(err.message || 'Erreur lors de l\'import');
      setPhase('preview');
    }
  };

  const handleClose = () => {
    if (phase === 'done') onImported();
    setPhase('upload');
    setEvals([]);
    setMatchedRows([]);
    setError(null);
    setProgress(0);
    onClose();
  };

  const toggleEval = (idx: number) => {
    setEvals(prev => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const updateEval = (idx: number, update: Partial<EvalConfig>) => {
    setEvals(prev => prev.map((e, i) => i === idx ? { ...e, ...update } : e));
  };

  const updateRow = (idx: number, update: Partial<MatchedRow>) => {
    setMatchedRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...update } : r)));
  };

  return (
    <Modal open={open} onClose={handleClose} title="Importer notes Pronote (PDF)" size="large">
      {/* Phase : upload */}
      {phase === 'upload' && (
        <div className="pronote-import__upload">
          <p className="pronote-import__hint">
            Sélectionnez le tableau de notes exporté depuis Pronote (PDF).
            Les évaluations seront automatiquement créées.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            Choisir le fichier PDF
          </Button>
          {error && <p style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)', fontSize: 12 }}>{error}</p>}
        </div>
      )}

      {/* Phase : config — évaluations détectées */}
      {phase === 'config' && (
        <div className="pronote-import__preview">
          {/* Métadonnées */}
          {(metaInfo.subject || metaInfo.period || metaInfo.group) && (
            <div style={{ marginBottom: 'var(--space-3)', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {metaInfo.subject && <div>Matière : <strong>{metaInfo.subject}</strong></div>}
              {metaInfo.period && <div>Période : <strong>{metaInfo.period}</strong></div>}
              {metaInfo.group && <div>Groupe : <strong>{metaInfo.group}</strong></div>}
            </div>
          )}

          <p className="pronote-import__hint" style={{ marginBottom: 'var(--space-3)' }}>
            {evals.length} évaluation(s) détectée(s), {matchedRows.length} élève(s).
            Cochez les évaluations à importer et vérifiez les paramètres.
          </p>

          {/* Tableau des évaluations */}
          <div className="pronote-import__table-wrap" style={{ marginBottom: 'var(--space-3)' }}>
            <table className="pronote-import__table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Titre</th>
                  <th style={{ width: 70 }}>Barème</th>
                  <th style={{ width: 70 }}>Coeff.</th>
                  <th style={{ width: 80 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((ev, idx) => (
                  <tr key={idx} style={{ opacity: ev.selected ? 1 : 0.4 }}>
                    <td>
                      <input type="checkbox" checked={ev.selected} onChange={() => toggleEval(idx)} />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={ev.title}
                        onChange={e => updateEval(idx, { title: e.target.value })}
                        style={{ width: '100%', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '2px 6px', fontSize: 12, height: 28 }}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min={1} max={100}
                        value={ev.maxScore}
                        onChange={e => updateEval(idx, { maxScore: Number(e.target.value) || 20 })}
                        style={{ width: '100%', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '2px 6px', fontSize: 12, height: 28, textAlign: 'center' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min={0.5} max={10} step={0.5}
                        value={ev.coefficient}
                        onChange={e => updateEval(idx, { coefficient: Number(e.target.value) || 1 })}
                        style={{ width: '100%', border: 'var(--border-default)', borderRadius: 'var(--radius-xs)', padding: '2px 6px', fontSize: 12, height: 28, textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ fontSize: 11, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      {ev.date || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pronote-import__actions">
            <Button variant="ghost" onClick={handleClose}>Annuler</Button>
            <Button variant="primary" onClick={() => setPhase('preview')} disabled={selectedEvals.length === 0}>
              Vérifier les correspondances ({matchedRows.length} élèves)
            </Button>
          </div>
        </div>
      )}

      {/* Phase : preview — matching élèves */}
      {phase === 'preview' && (
        <div className="pronote-import__preview">
          <p className="pronote-import__hint">
            {activeRows.length} élève(s) avec correspondance sur {matchedRows.length}.
            {selectedEvals.length} évaluation(s) seront créées.
          </p>
          <div className="pronote-import__table-wrap">
            <table className="pronote-import__table">
              <thead>
                <tr>
                  <th>Nom PDF</th>
                  <th>Élève</th>
                  {selectedEvals.map((ev, i) => (
                    <th key={i} style={{ fontSize: 10, maxWidth: 60, textAlign: 'center' }} title={ev.title}>
                      {ev.title.length > 10 ? ev.title.slice(0, 10) + '…' : ev.title}
                    </th>
                  ))}
                  <th>Confiance</th>
                  <th>Ignorer</th>
                </tr>
              </thead>
              <tbody>
                {matchedRows.map((row, idx) => (
                  <tr key={idx} className={row.skip ? 'pronote-import__row--skip' : ''}>
                    <td>{row.parsed.lastName} {row.parsed.firstName}</td>
                    <td>
                      <select
                        className="pronote-import__select-student"
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
                        <option value="">— Non associé —</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                        ))}
                      </select>
                    </td>
                    {evals.map((ev, ei) => {
                      if (!ev.selected) return null;
                      const score = row.parsed.scores[ei] ?? null;
                      return (
                        <td key={ei} style={{ textAlign: 'center', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                          {score !== null ? String(score).replace('.', ',') : '–'}
                        </td>
                      );
                    })}
                    <td>
                      <span className={`pronote-import__badge pronote-import__badge--${row.confidence}`}>
                        {row.confidence === 'exact' ? 'Exact' : row.confidence === 'partial' ? 'Partiel' : '—'}
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
          {error && <p style={{ color: 'var(--color-danger)', marginTop: 'var(--space-2)', fontSize: 12 }}>{error}</p>}
          <div className="pronote-import__actions">
            <Button variant="ghost" onClick={() => setPhase('config')}>Retour</Button>
            <Button variant="primary" onClick={handleSave} disabled={activeRows.length === 0 || selectedEvals.length === 0}>
              Créer {selectedEvals.length} évaluation(s) et importer
            </Button>
          </div>
        </div>
      )}

      {/* Phase : saving */}
      {phase === 'saving' && (
        <div className="pronote-import__saving">
          <p>Création des évaluations et import des notes…</p>
          <ProgressBar value={progress} />
        </div>
      )}

      {/* Phase : done */}
      {phase === 'done' && (
        <div className="pronote-import__done">
          <p>{savedCount} évaluation(s) créée(s) avec succès.</p>
          <ul style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
            {selectedEvals.map((ev, i) => (
              <li key={i}>{ev.title} (/{ev.maxScore}, coeff. {ev.coefficient})</li>
            ))}
          </ul>
          <Button variant="primary" onClick={handleClose} style={{ marginTop: 'var(--space-3)' }}>Fermer</Button>
        </div>
      )}
    </Modal>
  );
};
