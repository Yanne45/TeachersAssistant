// ============================================================================
// SlideViewer — Visualisateur de diaporama diapo par diapo
// Affiche le JSON structuré généré par generate_slideshow
// Modes : navigation unitaire (prev/next) ou vue liste complète
// ============================================================================

import React, { useState, useCallback } from 'react';
import type { SlideshowData, SlideshowSlide } from '../../types/ai';
import './SlideViewer.css';

const SLIDE_TYPE_ICONS: Record<string, string> = {
  title: '🎯',
  content: '📄',
  document: '📎',
  activity: '✏️',
  transition: '➡️',
  summary: '📋',
};

const SLIDE_TYPE_LABELS: Record<string, string> = {
  title: 'Titre',
  content: 'Contenu',
  document: 'Document',
  activity: 'Activité',
  transition: 'Transition',
  summary: 'Synthèse',
};

interface Props {
  data: SlideshowData;
}

export const SlideViewer: React.FC<Props> = ({ data }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'slide' | 'list'>('slide');
  const [showNotes, setShowNotes] = useState(true);

  const slide = data.slides[currentIdx];
  const total = data.slides.length;

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, total - 1)));
  }, [total]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goTo(currentIdx - 1);
    else if (e.key === 'ArrowRight') goTo(currentIdx + 1);
  }, [currentIdx, goTo]);

  if (!data.slides.length) {
    return <div className="slide-viewer__empty">Aucune diapositive générée.</div>;
  }

  return (
    <div className="slide-viewer" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="slide-viewer__toolbar">
        <div className="slide-viewer__title-bar">
          <h3 className="slide-viewer__title">{data.title}</h3>
          {data.subtitle && <span className="slide-viewer__subtitle">{data.subtitle}</span>}
        </div>
        <div className="slide-viewer__controls">
          <button
            className={'slide-viewer__mode-btn' + (viewMode === 'slide' ? ' slide-viewer__mode-btn--active' : '')}
            onClick={() => setViewMode('slide')}
          >
            Diapo
          </button>
          <button
            className={'slide-viewer__mode-btn' + (viewMode === 'list' ? ' slide-viewer__mode-btn--active' : '')}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
          <label className="slide-viewer__notes-toggle">
            <input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)} />
            Notes prof
          </label>
        </div>
      </div>

      {/* Vue diapo par diapo */}
      {viewMode === 'slide' && slide && (
        <>
          <div className="slide-viewer__slide">
            <div className="slide-viewer__slide-header">
              <span className="slide-viewer__slide-type">
                {SLIDE_TYPE_ICONS[slide.type] || '📄'} {SLIDE_TYPE_LABELS[slide.type] || slide.type}
              </span>
              <span className="slide-viewer__slide-number">{slide.number} / {total}</span>
            </div>
            <h2 className="slide-viewer__slide-title">{slide.title}</h2>
            <ul className="slide-viewer__slide-content">
              {slide.content.map((point, i) => (
                <li key={i} className="slide-viewer__slide-point">{point}</li>
              ))}
            </ul>
            {slide.visualSuggestion && (
              <div className="slide-viewer__visual">
                <span className="slide-viewer__visual-icon">🖼️</span>
                <span className="slide-viewer__visual-text">{slide.visualSuggestion}</span>
              </div>
            )}
            {showNotes && slide.notes && (
              <div className="slide-viewer__notes">
                <span className="slide-viewer__notes-label">Notes professeur</span>
                <p className="slide-viewer__notes-text">{slide.notes}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="slide-viewer__nav">
            <button
              className="slide-viewer__nav-btn"
              onClick={() => goTo(currentIdx - 1)}
              disabled={currentIdx === 0}
            >
              ← Précédente
            </button>
            <div className="slide-viewer__dots">
              {data.slides.map((_, i) => (
                <button
                  key={i}
                  className={'slide-viewer__dot' + (i === currentIdx ? ' slide-viewer__dot--active' : '')}
                  onClick={() => goTo(i)}
                  title={`Diapo ${i + 1}`}
                />
              ))}
            </div>
            <button
              className="slide-viewer__nav-btn"
              onClick={() => goTo(currentIdx + 1)}
              disabled={currentIdx === total - 1}
            >
              Suivante →
            </button>
          </div>
        </>
      )}

      {/* Vue liste */}
      {viewMode === 'list' && (
        <div className="slide-viewer__list">
          {data.slides.map((s, i) => (
            <SlideCard key={i} slide={s} showNotes={showNotes} onClick={() => { setCurrentIdx(i); setViewMode('slide'); }} />
          ))}
        </div>
      )}

      {/* Conclusion / Activité */}
      {(data.conclusion || data.suggestedActivity) && (
        <div className="slide-viewer__footer">
          {data.conclusion && (
            <div className="slide-viewer__conclusion">
              <strong>Conclusion :</strong> {data.conclusion}
            </div>
          )}
          {data.suggestedActivity && (
            <div className="slide-viewer__activity">
              <strong>Activité suggérée :</strong> {data.suggestedActivity}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Carte de diapo pour la vue liste */
const SlideCard: React.FC<{ slide: SlideshowSlide; showNotes: boolean; onClick: () => void }> = ({ slide, showNotes, onClick }) => (
  <div className="slide-viewer__card" onClick={onClick} role="button" tabIndex={0}>
    <div className="slide-viewer__card-header">
      <span className="slide-viewer__card-number">{slide.number}</span>
      <span className="slide-viewer__card-type">
        {SLIDE_TYPE_ICONS[slide.type] || '📄'} {SLIDE_TYPE_LABELS[slide.type] || slide.type}
      </span>
    </div>
    <h4 className="slide-viewer__card-title">{slide.title}</h4>
    <ul className="slide-viewer__card-content">
      {slide.content.map((p, i) => <li key={i}>{p}</li>)}
    </ul>
    {slide.visualSuggestion && (
      <div className="slide-viewer__card-visual">🖼️ {slide.visualSuggestion}</div>
    )}
    {showNotes && slide.notes && (
      <div className="slide-viewer__card-notes">{slide.notes}</div>
    )}
  </div>
);
