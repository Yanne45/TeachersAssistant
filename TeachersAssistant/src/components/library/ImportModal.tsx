// ============================================================================
// ImportModal — Pipeline import documents
// Flux: File[] → copy disk → classify IA → validate/edit → persist DB
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui';
import './ImportModal.css';
import { processFiles, resolveIds } from '../../services/documentUploadService';
import { documentService, documentTypeService, subjectService, levelService } from '../../services';
import type { ProcessedFile } from '../../services/documentUploadService';
import type { Subject, Level, DocumentType } from '../../types';

interface ImportModalProps {
  files: File[];
  onClose: () => void;
  onSaved: (count: number) => void;
}

interface EditableFile {
  processed: ProcessedFile;
  title: string;
  subjectId: number | null;
  levelId: number | null;
  docTypeId: number | null;
  skip: boolean;
}

type Phase = 'processing' | 'review' | 'saving' | 'done';

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', default: '📎',
};
function fileIcon(ext: string): string {
  return FILE_ICONS[ext.toLowerCase()] ?? FILE_ICONS.default ?? '📎';
}

export const ImportModal: React.FC<ImportModalProps> = ({ files, onClose, onSaved }) => {
  const [phase, setPhase] = useState<Phase>('processing');
  const [progressMsg, setProgressMsg] = useState('Préparation…');
  const [progressIdx, setProgressIdx] = useState(0);
  const [editables, setEditables] = useState<EditableFile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chargement des référentiels en parallèle du traitement
  useEffect(() => {
    Promise.all([
      subjectService.getAll(),
      levelService.getAll(),
      documentTypeService.getAll(),
    ]).then(([s, l, dt]) => {
      setSubjects(s);
      setLevels(l);
      setDocTypes(dt);
    }).catch(() => {});
  }, []);

  // Pipeline traitement
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPhase('processing');
      setProgressIdx(0);

      const results = await processFiles(files, (idx, total, step, name) => {
        if (!cancelled) {
          setProgressIdx(idx + 1);
          setProgressMsg(
            step === 'copy'
              ? `Copie (${idx + 1}/${total}) : ${name}`
              : `Classification IA (${idx + 1}/${total}) : ${name}`
          );
        }
      });

      if (cancelled) return;

      // Résolution des IDs depuis les codes IA
      const resolved = await Promise.all(
        results.map(async (r) => {
          const { subjectId, levelId, docTypeId } = await resolveIds(
            r.classification.subjectCode,
            r.classification.levelCode,
            r.classification.docTypeCode,
          );
          return { processed: r, subjectId, levelId, docTypeId };
        })
      );

      if (cancelled) return;

      setEditables(resolved.map(({ processed, subjectId, levelId, docTypeId }) => ({
        processed,
        title: processed.classification.suggestedTitle || processed.originalFile.name.replace(/\.[^.]+$/, ''),
        subjectId,
        levelId,
        docTypeId,
        skip: !!processed.error,
      })));
      setPhase('review');
    };

    run().catch(() => { if (!cancelled) setPhase('review'); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEditable = useCallback((idx: number, patch: Partial<EditableFile>) => {
    setEditables(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }, []);

  const handleSave = useCallback(async () => {
    setPhase('saving');
    setSaveError(null);
    const toSave = editables.filter(e => !e.skip && !e.processed.error);
    let saved = 0;
    try {
      for (const e of toSave) {
        const f = e.processed.originalFile;
        const ext = e.processed.fileExt;
        const mime =
          ext === 'pdf' ? 'application/pdf' :
          ext === 'pptx' || ext === 'ppt' ? 'application/vnd.ms-powerpoint' :
          ext === 'docx' || ext === 'doc' ? 'application/msword' :
          ext === 'png' ? 'image/png' :
          (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : 'application/octet-stream';

        await documentService.create({
          title: e.title.trim() || f.name,
          file_path: e.processed.destPath,
          file_name: f.name,
          file_type: ext,
          file_size: e.processed.fileSize,
          file_hash: null,
          mime_type: mime,
          document_type_id: e.docTypeId,
          subject_id: e.subjectId,
          level_id: e.levelId,
          thumbnail_path: e.processed.thumbnailPath ?? null,
          extracted_text: e.processed.classification.summary || null,
          source: 'import',
          generated_from_ai_generation_id: null,
          notes: null,
        });
        saved++;
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setSaveError(String(err));
      setPhase('review');
    }
  }, [editables, onSaved, onClose]);

  // ── Phase : traitement en cours ──
  if (phase === 'processing') {
    return (
      <div className="import-modal">
        <div className="import-modal__progress">
          <div className="import-modal__spinner" />
          <div className="import-modal__progress-msg">{progressMsg}</div>
          <div className="import-modal__progress-bar-wrap">
            <div
              className="import-modal__progress-bar-fill"
              style={{ width: `${files.length > 0 ? (progressIdx / files.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button variant="secondary" size="S" onClick={onClose}>Annuler</Button>
        </div>
      </div>
    );
  }

  // ── Phase : sauvegarde ──
  if (phase === 'saving') {
    return (
      <div className="import-modal">
        <div className="import-modal__progress">
          <div className="import-modal__spinner" />
          <div className="import-modal__progress-msg">Enregistrement en base…</div>
        </div>
      </div>
    );
  }

  // ── Phase : revue / confirmation ──
  const toSaveCount = editables.filter(e => !e.skip && !e.processed.error).length;

  return (
    <div className="import-modal">
      <div className="import-modal__header">
        <span className="import-modal__title">
          {editables.length} fichier{editables.length > 1 ? 's' : ''} — vérifiez les métadonnées
        </span>
        <span className="import-modal__hint">Les suggestions IA sont modifiables.</span>
      </div>

      {saveError && (
        <div className="import-modal__error">Erreur : {saveError}</div>
      )}

      <div className="import-modal__list">
        {editables.map((e, idx) => (
          <div key={idx} className={`import-modal__item ${e.skip ? 'import-modal__item--skip' : ''} ${e.processed.error ? 'import-modal__item--error' : ''}`}>
            <div className="import-modal__item-header">
              <span className="import-modal__item-icon">{fileIcon(e.processed.fileExt)}</span>
              <span className="import-modal__item-name">{e.processed.originalFile.name}</span>
              {e.processed.error ? (
                <span className="import-modal__item-err" title={e.processed.error}>⚠ Erreur copie</span>
              ) : (
                <label className="import-modal__item-skip">
                  <input
                    type="checkbox"
                    checked={e.skip}
                    onChange={ev => updateEditable(idx, { skip: ev.target.checked })}
                  />
                  Ignorer
                </label>
              )}
            </div>

            {!e.processed.error && !e.skip && (
              <div className="import-modal__item-fields">
                <div className="import-modal__field import-modal__field--full">
                  <label className="import-modal__label">Titre</label>
                  <input
                    className="import-modal__input"
                    value={e.title}
                    onChange={ev => updateEditable(idx, { title: ev.target.value })}
                  />
                </div>
                <div className="import-modal__field">
                  <label className="import-modal__label">Matière</label>
                  <select
                    className="import-modal__select"
                    value={e.subjectId ?? ''}
                    onChange={ev => updateEditable(idx, { subjectId: ev.target.value ? Number(ev.target.value) : null })}
                  >
                    <option value="">—</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="import-modal__field">
                  <label className="import-modal__label">Niveau</label>
                  <select
                    className="import-modal__select"
                    value={e.levelId ?? ''}
                    onChange={ev => updateEditable(idx, { levelId: ev.target.value ? Number(ev.target.value) : null })}
                  >
                    <option value="">—</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
                <div className="import-modal__field">
                  <label className="import-modal__label">Type</label>
                  <select
                    className="import-modal__select"
                    value={e.docTypeId ?? ''}
                    onChange={ev => updateEditable(idx, { docTypeId: ev.target.value ? Number(ev.target.value) : null })}
                  >
                    <option value="">—</option>
                    {docTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="import-modal__footer">
        <Button variant="secondary" size="S" onClick={onClose}>Annuler</Button>
        <Button
          variant="primary"
          size="S"
          onClick={handleSave}
          disabled={toSaveCount === 0}
        >
          Importer {toSaveCount > 0 ? `(${toSaveCount})` : ''}
        </Button>
      </div>
    </div>
  );
};
