import React, { useEffect, useState } from 'react';
import { documentTagService } from '../../services';

interface TagManagerProps {
  activeTagId: number | null;
  onTagClick: (tagId: number, tagLabel: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ activeTagId, onTagClick }) => {
  const [tags, setTags] = useState<{ id: number; label: string }[]>([]);

  useEffect(() => {
    documentTagService.getAll()
      .then((rows) => setTags(rows.map((t) => ({ id: t.id, label: t.label }))))
      .catch(() => setTags([]));
  }, []);

  if (tags.length === 0) return null;

  return (
    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onTagClick(tag.id, tag.label)}
          style={{
            padding: '4px 8px',
            borderRadius: 999,
            border: 'var(--border-default)',
            background: activeTagId === tag.id ? 'var(--color-primary-light)' : 'transparent',
            fontSize: 12,
          }}
        >
          #{tag.label}
        </button>
      ))}
    </div>
  );
};
