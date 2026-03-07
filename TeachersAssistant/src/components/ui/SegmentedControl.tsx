import React from 'react';
import './SegmentedControl.css';

export interface Segment {
  id: string;
  label: string;
}

export interface SegmentedControlProps {
  segments: Segment[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  activeId,
  onChange,
  className = '',
}) => (
  <div className={`segmented-control ${className}`} role="radiogroup">
    {segments.map((seg) => (
      <button
        key={seg.id}
        className={`segmented-control__item ${activeId === seg.id ? 'segmented-control__item--active' : ''}`}
        role="radio"
        aria-checked={activeId === seg.id}
        onClick={() => onChange(seg.id)}
        type="button"
      >
        {seg.label}
      </button>
    ))}
  </div>
);
