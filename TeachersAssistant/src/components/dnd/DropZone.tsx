// ============================================================================
// DropZone — Zone de dépôt de fichiers (bibliothèque, import docs)
// Spec §5.7 : "Glissez vos documents ici pour les importer"
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import './DropZone.css';

interface Props {
  /** Types MIME acceptés */
  accept?: string[];
  /** Extensions acceptées (display) */
  acceptLabel?: string;
  /** Callback avec les fichiers déposés */
  onDrop: (files: File[]) => void;
  /** Texte personnalisé */
  label?: string;
  /** Autoriser multiple fichiers */
  multiple?: boolean;
  /** Classe CSS */
  className?: string;
}

export const DropZone: React.FC<Props> = ({
  accept,
  acceptLabel = 'PDF, DOCX, PPTX, Images',
  onDrop,
  label = 'Glissez vos documents ici pour les importer',
  multiple = true,
  className,
}) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    const filtered = accept
      ? files.filter(f => accept.some(t => f.type === t || f.name.endsWith(t.replace('*', ''))))
      : files;

    if (filtered.length > 0) {
      onDrop(multiple ? filtered : [filtered[0]]);
    }
  }, [accept, multiple, onDrop]);

  const handleClick = () => inputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onDrop(files);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--active' : ''} ${className ?? ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        className="dropzone__input"
        multiple={multiple}
        accept={accept?.join(',')}
        onChange={handleFileInput}
      />
      <span className="dropzone__icon">📁</span>
      <span className="dropzone__label">{label}</span>
      <span className="dropzone__hint">{acceptLabel} · Cliquer ou glisser</span>
    </div>
  );
};
