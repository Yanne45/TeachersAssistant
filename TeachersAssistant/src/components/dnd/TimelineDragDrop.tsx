// ============================================================================
// TimelineDragDrop — Drag sequences onto progression timeline (spec §5.4)
// Wraps dnd-kit for horizontal positioning on the timeline.
// ============================================================================

import React, { useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import './TimelineDragDrop.css';

// ── Types ──

export interface TimelineSequence {
  id: number | string;
  title: string;
  subjectColor: string;
  totalHours: number;
  /** Position start en % de la timeline (0-100) */
  startPct: number;
  /** Largeur en % */
  widthPct: number;
}

interface Props {
  sequences: TimelineSequence[];
  months: string[];
  vacationBands?: Array<{ startPct: number; widthPct: number; label: string }>;
  onDrop: (sequenceId: number | string, newStartPct: number) => void;
}

// ── Draggable Sequence Bar ──

const DraggableBar: React.FC<{ seq: TimelineSequence }> = ({ seq }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: seq.id,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${seq.startPct}%`,
    width: `${seq.widthPct}%`,
    transform: transform ? `translate(${transform.x}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    borderLeftColor: seq.subjectColor,
    backgroundColor: `${seq.subjectColor}33`,
  };

  return (
    <div
      ref={setNodeRef}
      className="timeline-bar"
      style={style}
      {...attributes}
      {...listeners}
      title={`${seq.title} (${seq.totalHours}h)`}
    >
      <span className="timeline-bar__title" style={{ color: seq.subjectColor }}>
        {seq.title}
      </span>
    </div>
  );
};

// ── Droppable Timeline Area ──

const TimelineArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setNodeRef } = useDroppable({ id: 'timeline-area' });
  return (
    <div ref={setNodeRef} className="timeline-area">
      {children}
    </div>
  );
};

// ── Main Component ──

export const TimelineDragDrop: React.FC<Props> = ({
  sequences,
  months,
  vacationBands = [],
  onDrop,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    if (!delta) return;

    const seq = sequences.find(s => s.id === active.id);
    if (!seq) return;

    // Convert px delta to % (approximate — timeline width varies)
    const timelineEl = document.querySelector('.timeline-area');
    if (!timelineEl) return;
    const timelineWidth = timelineEl.getBoundingClientRect().width;
    const deltaPct = (delta.x / timelineWidth) * 100;
    const newStart = Math.max(0, Math.min(100 - seq.widthPct, seq.startPct + deltaPct));

    onDrop(active.id, newStart);
  }, [sequences, onDrop]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="timeline-dragdrop">
        {/* Month headers */}
        <div className="timeline-months">
          {months.map(m => (
            <div key={m} className="timeline-month">{m}</div>
          ))}
        </div>

        {/* Timeline area */}
        <TimelineArea>
          {/* Vacation bands */}
          {vacationBands.map((v, i) => (
            <div
              key={i}
              className="timeline-vacation"
              style={{ left: `${v.startPct}%`, width: `${v.widthPct}%` }}
            >
              <span className="timeline-vacation__label">{v.label}</span>
            </div>
          ))}

          {/* Sequence bars */}
          {sequences.map((seq, i) => (
            <div key={seq.id} style={{ position: 'absolute', top: `${24 + i * 46}px`, left: 0, right: 0, height: 36 }}>
              <DraggableBar seq={seq} />
            </div>
          ))}
        </TimelineArea>
      </div>
    </DndContext>
  );
};
