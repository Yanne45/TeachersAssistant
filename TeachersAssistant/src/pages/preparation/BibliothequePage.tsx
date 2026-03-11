// ============================================================================
// BibliothequePage — Bibliothèque documentaire (connectée à la DB)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Badge, Button, Input, EmptyState } from '../../components/ui';
import { DropZone } from '../../components/dnd';
import { ImportModal } from '../../components/library/ImportModal';
import { TagManager } from '../../components/library/TagManager';
import { db, documentService, subjectService } from '../../services';
import { useWorkspace } from '../../stores';
import { useRouter } from '../../stores';
import type { DocumentWithDetails } from '../../types';
import './BibliothequePage.css';

// ── Helpers ──

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝',
  png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', default: '📎',
};

function fileIcon(ext?: string): string {
  return FILE_ICONS[ext?.toLowerCase() ?? ''] ?? FILE_ICONS.default ?? '📎';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

type ViewMode = 'gallery' | 'list';

// ── Composant ──

export const BibliothequePage: React.FC = () => {
  const { currentPath } = useWorkspace();
  const { route } = useRouter();

  const page   = route.page   ?? 'recents';
  const filter = route.filter ?? null;

  const [docs, setDocs] = useState<DocumentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [filesToImport, setFilesToImport] = useState<File[] | null>(null);
  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [activeTagLabel, setActiveTagLabel] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeKey = filter ?? page;

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTagId !== null) {
        setDocs(await documentService.getByTag(activeTagId));
      } else if (search.trim()) {
        setDocs(await documentService.search(search.trim()));
      } else if (activeKey === 'hggsp') {
        const sub = await subjectService.getAll().then(s => s.find(x => x.code === 'HGGSP'));
        setDocs(sub ? await documentService.getBySubject(sub.id) : []);
      } else if (activeKey === 'histoire') {
        const sub = await subjectService.getAll().then(s => s.find(x => x.code === 'HIST'));
        setDocs(sub ? await documentService.getBySubject(sub.id) : []);
      } else if (activeKey === 'geo') {
        const sub = await subjectService.getAll().then(s => s.find(x => x.code === 'GEO'));
        setDocs(sub ? await documentService.getBySubject(sub.id) : []);
      } else if (activeKey === 'matiere') {
        const results = await db.select<DocumentWithDetails[]>(
          `SELECT d.*,
             dt.label as document_type_label,
             sub.label as subject_label, sub.color as subject_color,
             l.label as level_label,
             CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
           FROM documents d
           LEFT JOIN document_types dt ON d.document_type_id = dt.id
           LEFT JOIN subjects sub ON d.subject_id = sub.id
           LEFT JOIN levels l ON d.level_id = l.id
           WHERE d.subject_id IS NOT NULL
           ORDER BY d.updated_at DESC`,
          []
        );
        setDocs(results);
      } else if (activeKey === 'terminale') {
        const results = await db.select<DocumentWithDetails[]>(
          `SELECT d.*,
             dt.label as document_type_label,
             sub.label as subject_label, sub.color as subject_color,
             l.label as level_label,
             CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
           FROM documents d
           LEFT JOIN document_types dt ON d.document_type_id = dt.id
           LEFT JOIN subjects sub ON d.subject_id = sub.id
           LEFT JOIN levels l ON d.level_id = l.id
           WHERE l.code = 'TLE'
           ORDER BY d.updated_at DESC`,
          []
        );
        setDocs(results);
      } else if (activeKey === 'premiere') {
        const results = await db.select<DocumentWithDetails[]>(
          `SELECT d.*,
             dt.label as document_type_label,
             sub.label as subject_label, sub.color as subject_color,
             l.label as level_label,
             CASE WHEN d.generated_from_ai_generation_id IS NOT NULL THEN 1 ELSE 0 END as is_ai_generated
           FROM documents d
           LEFT JOIN document_types dt ON d.document_type_id = dt.id
           LEFT JOIN subjects sub ON d.subject_id = sub.id
           LEFT JOIN levels l ON d.level_id = l.id
           WHERE l.code = 'PRE'
           ORDER BY d.updated_at DESC`,
          []
        );
        setDocs(results);
      } else {
        setDocs(await documentService.getRecent(50));
      }
    } catch (err) {
      console.error('[Bibliothèque] Erreur chargement:', err);
      setDocs([]);
    }
    setLoading(false);
  }, [activeKey, search, activeTagId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleImportSaved = useCallback((count: number) => {
    if (count > 0) loadDocs();
  }, [loadDocs]);

  const handleTagClick = useCallback((tagId: number, tagLabel: string) => {
    if (activeTagId === tagId) {
      setActiveTagId(null);
      setActiveTagLabel(null);
    } else {
      setActiveTagId(tagId);
      setActiveTagLabel(tagLabel);
    }
  }, [activeTagId]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setFilesToImport(files);
    e.target.value = '';
  }, []);

  // Titre de la vue
  const viewTitle =
    activeTagId !== null     ? `Tag : ${activeTagLabel}` :
    activeKey === 'recents'  ? 'Récents'                 :
    activeKey === 'tous'     ? 'Tous les documents'       :
    activeKey === 'hggsp'    ? 'HGGSP'                   :
    activeKey === 'histoire' ? 'Histoire'                 :
    activeKey === 'geo'      ? 'Géographie'               :
    activeKey === 'matiere'  ? 'Par matière'              :
    activeKey === 'terminale'? 'Terminale'                :
    activeKey === 'premiere' ? 'Première'                 : 'Bibliothèque';

  // ── Vue import ──
  if (page === 'importer') {
    return (
      <div className="bib-page">
        <div className="bib-page__toolbar">
          <h1 className="bib-page__title">Importer des documents</h1>
        </div>
        <DropZone
          accept={['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.gif']}
          acceptLabel="PDF, DOCX, PPTX, Images"
          onDrop={files => { if (files.length > 0) setFilesToImport(files); }}
          label="Glissez vos documents ici pour les importer"
        />
        {filesToImport && filesToImport.length > 0 && currentPath && (
          <ImportModal
            files={filesToImport}
            dbPath={currentPath}
            onClose={() => setFilesToImport(null)}
            onSaved={handleImportSaved}
          />
        )}
      </div>
    );
  }

  // ── Vue galerie / liste ──
  return (
    <div className="bib-page">
      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.gif"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Barre supérieure */}
      <div className="bib-page__toolbar">
        <h1 className="bib-page__title">Bibliothèque — {viewTitle}</h1>
        <div className="bib-page__actions">
          <Input
            placeholder="Rechercher…"
            icon={<span>🔍</span>}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {/* Toggle vue */}
          <div className="bib-page__view-toggle">
            <button
              className={`bib-page__view-btn ${viewMode === 'gallery' ? 'bib-page__view-btn--active' : ''}`}
              onClick={() => setViewMode('gallery')}
              title="Vue galerie"
            >
              ▦
            </button>
            <button
              className={`bib-page__view-btn ${viewMode === 'list' ? 'bib-page__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              ☰
            </button>
          </div>
          <Button variant="primary" size="S" onClick={openFilePicker}>
            + Importer
          </Button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="bib-page__loading">Chargement…</div>
      ) : docs.length > 0 ? (
        viewMode === 'gallery' ? (
          /* ── Vue galerie ── */
          <div className="bib-page__grid">
            {docs.map(doc => (
              <Card
                key={doc.id}
                borderTopColor={doc.subject_color ?? undefined}
                className="doc-card"
              >
                <div
                  className="doc-card__thumb"
                  style={{ backgroundColor: doc.subject_color ? `${doc.subject_color}14` : undefined }}
                >
                  <span
                    className="doc-card__icon"
                    style={{ color: doc.subject_color ?? undefined }}
                  >
                    {fileIcon(doc.file_type)}
                  </span>
                </div>
                <div className="doc-card__info">
                  <span className="doc-card__title">{doc.title}</span>
                  <div className="doc-card__meta">
                    {doc.subject_label && (
                      <Badge color={doc.subject_color ?? undefined} variant="subject">
                        {doc.subject_label}
                      </Badge>
                    )}
                    {doc.level_label && (
                      <Badge variant="filter">{doc.level_label}</Badge>
                    )}
                    {doc.document_type_label && (
                      <Badge variant="info">{doc.document_type_label}</Badge>
                    )}
                    {doc.is_ai_generated ? <Badge variant="info" icon="✨">IA</Badge> : null}
                    <span className="doc-card__date">{formatDate(doc.updated_at)}</span>
                  </div>
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="doc-card__tags">
                      {doc.tags.map(tag => (
                        <span key={tag} className="doc-card__tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* ── Vue liste ── */
          <table className="bib-page__table">
            <thead>
              <tr>
                <th className="bib-page__th bib-page__th--icon"></th>
                <th className="bib-page__th">Titre</th>
                <th className="bib-page__th">Matière</th>
                <th className="bib-page__th">Niveau</th>
                <th className="bib-page__th">Type</th>
                <th className="bib-page__th">Tags</th>
                <th className="bib-page__th bib-page__th--date">Modifié</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="bib-page__tr">
                  <td className="bib-page__td bib-page__td--icon">
                    <span style={{ color: doc.subject_color ?? undefined }}>
                      {fileIcon(doc.file_type)}
                    </span>
                  </td>
                  <td className="bib-page__td bib-page__td--title">
                    {doc.title}
                    {doc.is_ai_generated && (
                      <span className="bib-page__ai-badge" title="Généré par IA">✨</span>
                    )}
                  </td>
                  <td className="bib-page__td">
                    {doc.subject_label && (
                      <Badge color={doc.subject_color ?? undefined} variant="subject">
                        {doc.subject_label}
                      </Badge>
                    )}
                  </td>
                  <td className="bib-page__td">
                    {doc.level_label && (
                      <Badge variant="filter">{doc.level_label}</Badge>
                    )}
                  </td>
                  <td className="bib-page__td">
                    {doc.document_type_label && (
                      <Badge variant="info">{doc.document_type_label}</Badge>
                    )}
                  </td>
                  <td className="bib-page__td">
                    <div className="doc-card__tags">
                      {doc.tags?.map(tag => (
                        <span key={tag} className="doc-card__tag">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="bib-page__td bib-page__td--date">
                    {formatDate(doc.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <EmptyState
          icon={search ? '🔍' : activeTagId !== null || activeKey !== 'recents' && activeKey !== 'tous' ? '🗂' : '📁'}
          title={search ? 'Aucun résultat' : 'Aucun document'}
          description={
            search
              ? `Aucun résultat pour « ${search} ».`
              : activeTagId !== null
                ? `Aucun document avec le tag « ${activeTagLabel} ».`
                : activeKey !== 'recents' && activeKey !== 'tous'
                  ? `Aucun document pour ce filtre. Importez des documents et associez-les à la bonne matière ou au bon niveau.`
                  : 'La bibliothèque est vide — importez vos premiers documents pédagogiques.'
          }
          actionLabel={!search && (activeKey === 'recents' || activeKey === 'tous') ? 'Importer un document' : undefined}
          onAction={!search && (activeKey === 'recents' || activeKey === 'tous') ? openFilePicker : undefined}
        />
      )}

      {/* Gestionnaire de tags */}
      <TagManager onTagClick={handleTagClick} activeTagId={activeTagId} />

      {/* Modal import */}
      {filesToImport !== null && filesToImport.length > 0 && currentPath && (
        <ImportModal
          files={filesToImport}
          dbPath={currentPath}
          onClose={() => setFilesToImport(null)}
          onSaved={handleImportSaved}
        />
      )}
    </div>
  );
};
