import React, { useEffect, useState } from 'react';
import { documentTagService } from '../../services';
import './TagManager.css';

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
    <div className="tag-manager__list tag-manager__list--inline">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className={`tag-chip ${activeTagId === tag.id ? 'tag-chip--active' : ''}`}
          onClick={() => onTagClick(tag.id, tag.label)}
        >
          #{tag.label}
        </button>
      ))}
    </div>
  );
};
