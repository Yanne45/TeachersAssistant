import React, { useState } from 'react';
import { Card, Badge, Button, Input, EmptyState } from '../../components/ui';
import { DropZone } from '../../components/dnd';
import './BibliothequePage.css';

// ── Types ──

interface DocItem {
  id: number;
  title: string;
  fileType: string;
  subjectLabel: string;
  subjectColor: string;
  isAIGenerated: boolean;
  createdAt: string;
}

// ── Mock ──

const FILE_ICONS: Record<string, string> = { pdf: '📄', pptx: '📊', docx: '📝', png: '🖼', jpg: '🖼' };

const MOCK_DOCS: DocItem[] = [
  { id: 1, title: 'Carte du monde bipolaire 1947', fileType: 'pdf', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', isAIGenerated: false, createdAt: '25/02' },
  { id: 2, title: 'Discours Churchill Fulton', fileType: 'docx', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', isAIGenerated: false, createdAt: '24/02' },
  { id: 3, title: 'Fiche révision — Guerre froide', fileType: 'pdf', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', isAIGenerated: true, createdAt: '23/02' },
  { id: 4, title: 'Diaporama Méditerranée médiévale', fileType: 'pptx', subjectLabel: 'Histoire', subjectColor: '#2C3E7B', isAIGenerated: false, createdAt: '20/02' },
  { id: 5, title: 'Croquis métropolisation', fileType: 'png', subjectLabel: 'Géo', subjectColor: '#27774E', isAIGenerated: false, createdAt: '18/02' },
  { id: 6, title: 'Sujet bac blanc HGGSP', fileType: 'pdf', subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', isAIGenerated: true, createdAt: '15/02' },
];

const FILTERS = ['Récents', 'Par matière', 'Par niveau', 'Tags'];

// ── Composant ──

export const BibliothequePage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('Récents');
  const [search, setSearch] = useState('');

  const filtered = MOCK_DOCS.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bib-page">
      {/* Barre supérieure */}
      <div className="bib-page__toolbar">
        <h1 className="bib-page__title">Bibliothèque — {activeFilter}</h1>
        <div className="bib-page__actions">
          <Input
            placeholder="Rechercher..."
            icon={<span>🔍</span>}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="primary" size="S">+ Importer</Button>
        </div>
      </div>

      {/* Filtres badges */}
      <div className="bib-page__filters">
        {FILTERS.map(f => (
          <Badge
            key={f}
            variant="filter"
            active={activeFilter === f}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </Badge>
        ))}
      </div>

      {/* Grille documents */}
      {filtered.length > 0 ? (
        <div className="bib-page__grid">
          {filtered.map(doc => (
            <Card
              key={doc.id}
              borderTopColor={doc.subjectColor}
              className="doc-card"
            >
              <div className="doc-card__thumb" style={{ backgroundColor: `${doc.subjectColor}14` }}>
                <span className="doc-card__icon" style={{ color: doc.subjectColor }}>
                  {FILE_ICONS[doc.fileType] || '📎'}
                </span>
              </div>
              <div className="doc-card__info">
                <span className="doc-card__title">{doc.title}</span>
                <div className="doc-card__meta">
                  <Badge color={doc.subjectColor} variant="subject">{doc.subjectLabel}</Badge>
                  {doc.isAIGenerated && <Badge variant="info" icon="✨">IA</Badge>}
                  <span className="doc-card__date">{doc.createdAt}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📁"
          title="Aucun document trouvé"
          description="Importez vos premiers documents pédagogiques."
          actionLabel="Importer un document"
          onAction={() => {}}
        />
      )}

      {/* Zone drag & drop */}
      <DropZone
        accept={['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg']}
        acceptLabel="PDF, DOCX, PPTX, Images"
        onDrop={(files) => console.log('Imported files:', files.map(f => f.name))}
      />
    </div>
  );
};
