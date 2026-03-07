// ============================================================================
// RechercheGlobalePage — Recherche transversale (spec §8)
// Branchée sur searchService (cross-table scoring)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EmptyState } from '../../components/ui';
import { searchService } from '../../services';
import { useRouter } from '../../stores';
import type { SearchResult } from '../../services';
import './RechercheGlobalePage.css';

const TYPE_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'sequence', label: 'Séquences' },
  { key: 'session', label: 'Séances' },
  { key: 'document', label: 'Documents' },
  { key: 'student', label: 'Élèves' },
  { key: 'assignment', label: 'Devoirs' },
  { key: 'lesson_log', label: 'Cahier' },
  { key: 'program_topic', label: 'Programme' },
];

export const RechercheGlobalePage: React.FC<{ initialQuery?: string; onClose?: () => void }> = ({
  initialQuery = '',
  onClose,
}) => {
  const { navigate, setEntity } = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await searchService.search(q);
      setResults(res);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Filter by type
  const filtered = typeFilter === 'all'
    ? results
    : results.filter(r => r.type === typeFilter);

  // Counts per type
  const countByType = (key: string) =>
    key === 'all' ? results.length : results.filter(r => r.type === key).length;

  // Navigate to result
  const handleOpen = (r: SearchResult) => {
    if (r.navigateTo) {
      navigate({ tab: r.navigateTo.tab, page: r.navigateTo.page });
      if (r.navigateTo.entity) setEntity(r.navigateTo.entity);
    }
    onClose?.();
  };

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="search-page">
      {/* Search bar */}
      <div className="search-page__bar">
        <span className="search-page__icon">🔍</span>
        <input
          ref={inputRef}
          className="search-page__input"
          type="text"
          placeholder="Rechercher partout…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button className="search-page__clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>✕</button>
        )}
        {onClose && (
          <button className="search-page__close" onClick={onClose}>Fermer</button>
        )}
      </div>

      {/* Type filters */}
      {results.length > 0 && (
        <div className="search-page__filters">
          {TYPE_FILTERS.map(f => {
            const count = countByType(f.key);
            if (f.key !== 'all' && count === 0) return null;
            return (
              <button
                key={f.key}
                className={`search-page__filter ${typeFilter === f.key ? 'search-page__filter--active' : ''}`}
                onClick={() => setTypeFilter(f.key)}
              >
                {f.label}
                <span className="search-page__filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {searched && !loading && (
        <div className="search-page__summary">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          {typeFilter !== 'all' ? ` (${TYPE_FILTERS.find(f => f.key === typeFilter)?.label})` : ''}
          {query.trim() ? ` pour « ${query.trim()} »` : ''}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="search-page__loading">Recherche en cours…</div>
      )}

      {/* Results */}
      <div className="search-page__results">
        {filtered.map(r => (
          <div
            key={`${r.type}-${r.id}`}
            className="search-page__result"
            onClick={() => handleOpen(r)}
          >
            <div className="search-page__result-icon">{r.typeIcon}</div>
            <div className="search-page__result-body">
              <div className="search-page__result-header">
                <span className="search-page__result-title">{r.title}</span>
                <span className="search-page__result-type-badge">{r.typeLabel}</span>
                {r.subject && (
                  <span
                    className="search-page__result-subject"
                    style={{ color: r.subjectColor, backgroundColor: `${r.subjectColor}15` }}
                  >
                    {r.subject}
                  </span>
                )}
              </div>
              <div className="search-page__result-subtitle">{r.subtitle}</div>
              <div
                className="search-page__result-excerpt"
                dangerouslySetInnerHTML={{ __html: r.matchExcerpt }}
              />
            </div>
            <span className="search-page__result-score" title="Score de pertinence">{r.score}</span>
            <button className="search-page__result-open" onClick={(e) => { e.stopPropagation(); handleOpen(r); }}>
              Ouvrir →
            </button>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {searched && !loading && filtered.length === 0 && (
        <EmptyState
          icon="🔍"
          title={`Aucun résultat pour « ${query} »`}
          description="Essayez d'autres termes ou vérifiez l'orthographe."
        />
      )}

      {/* Initial state */}
      {!searched && !loading && (
        <div className="search-page__hint">
          Tapez au moins 2 caractères pour lancer la recherche.
        </div>
      )}
    </div>
  );
};
