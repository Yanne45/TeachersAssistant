// ============================================================================
// ListeElevesPage — Liste élèves (spec §5.10) — branché DataProvider
// ============================================================================

import React, { useState, useEffect } from 'react';
import { EmptyState } from '../../components/ui';
import { useData, useRouter } from '../../stores';
import { MOCK_STUDENTS } from '../../stores/mockData';
import { EleveForm, ImportElevesModal } from '../../components/forms';
import './ListeElevesPage.css';

const CLASSES = [
  { id: 1, key: 'tle2', label: 'Terminale 2', count: 28 },
  { id: 2, key: 'tle4', label: 'Terminale 4', count: 30 },
  { id: 3, key: '1ere3', label: 'Première 3', count: 32 },
];

export const ListeElevesPage: React.FC = () => {
  const { loadStudents, isDbMode } = useData();
  const { setPage, setEntity } = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClassId, setActiveClassId] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'avg'>('name');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadStudents(activeClassId).then(data => {
      if (cancelled) return;
      setStudents(data.length > 0 ? data : MOCK_STUDENTS);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadStudents, activeClassId]);

  const filtered = students
    .filter(s => {
      const name = `${s.last_name} ${s.first_name}`.toLowerCase();
      return !search || name.includes(search.toLowerCase());
    })
    .sort((a, b) => sortBy === 'name'
      ? (`${a.last_name} ${a.first_name}`).localeCompare(`${b.last_name} ${b.first_name}`)
      : (b.avg ?? 0) - (a.avg ?? 0));

  const classAvg = filtered.length > 0
    ? (filtered.reduce((s, e) => s + (e.avg ?? 0), 0) / filtered.length).toFixed(1)
    : '—';

  const activeClassName = CLASSES.find(c => c.id === activeClassId)?.label ?? '';

  return (
    <div className="eleves-page">
      <div className="eleves-page__header">
        <h1 className="eleves-page__title">Suivi des élèves</h1>
        <div className="eleves-page__header-actions">
          <input className="eleves-page__search" type="text" placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="eleves-page__btn-import" onClick={() => setImportOpen(true)}>📥 Importer CSV</button>
          <button className="eleves-page__btn-new" onClick={() => setFormOpen(true)}>+ Ajouter élève</button>
        </div>
      </div>

      <div className="eleves-page__classes">
        {CLASSES.map(c => (
          <button key={c.id} className={`eleves-page__class-btn ${activeClassId === c.id ? 'eleves-page__class-btn--active' : ''}`} onClick={() => setActiveClassId(c.id)}>
            {c.label} <span className="eleves-page__class-count">{c.count}</span>
          </button>
        ))}
        <div className="eleves-page__class-stats">Moyenne classe : <strong>{classAvg}</strong></div>
      </div>

      {loading ? (
        <p style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>Chargement…</p>
      ) : (
        <div className="eleves-page__table-wrap">
          <table className="eleves-page__table">
            <thead>
              <tr>
                <th onClick={() => setSortBy('name')} className="eleves-page__th-sort">Élève {sortBy === 'name' && '▼'}</th>
                <th onClick={() => setSortBy('avg')} className="eleves-page__th-sort">Moyenne {sortBy === 'avg' && '▼'}</th>
                <th>Tendance</th>
                <th>Comportement</th>
                <th>Alertes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const avg = s.avg ?? 0;
                const trend = s.trend ?? 'stable';
                const behavior = s.behavior ?? 3;
                const alerts: string[] = s.alerts ?? [];
                return (
                  <tr key={s.id} className="eleves-page__row">
                    <td>
                      <div className="eleves-page__student-name">
                        <span className="eleves-page__avatar">{(s.last_name ?? '?')[0]}</span>
                        <span className="eleves-page__name-text">{s.last_name} {s.first_name}</span>
                      </div>
                    </td>
                    <td><span className={`eleves-page__avg ${avg < 8 ? 'eleves-page__avg--low' : avg >= 14 ? 'eleves-page__avg--high' : ''}`}>{avg.toFixed(1)}</span></td>
                    <td><span className={`eleves-page__trend eleves-page__trend--${trend}`}>{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span></td>
                    <td>
                      <div className="eleves-page__behavior">
                        {[1, 2, 3, 4, 5].map(n => <span key={n} className={`eleves-page__dot ${n <= behavior ? 'eleves-page__dot--filled' : ''}`} />)}
                      </div>
                    </td>
                    <td>
                      {alerts.length > 0 && <div className="eleves-page__alerts">{alerts.map((a, i) => <span key={i} className="eleves-page__alert-badge">⚠ {a}</span>)}</div>}
                    </td>
                    <td><button className="eleves-page__open-btn" onClick={(e) => { e.stopPropagation(); setEntity(s.id); setPage('fiche-eleve'); }}>Fiche →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon="👥"
              title="Aucun élève dans cette classe"
              description="Ajoutez des élèves manuellement ou importez une liste CSV."
              actionLabel="+ Ajouter un élève"
              onAction={() => setFormOpen(true)}
            />
          )}
        </div>
      )}

      <EleveForm open={formOpen} onClose={() => setFormOpen(false)} onSave={(data) => { console.log('Save élève:', data); setFormOpen(false); }} />
      <ImportElevesModal open={importOpen} onClose={() => setImportOpen(false)} onImport={async (data) => {
        try {
          const { csvImportService } = await import('../../services');
          const students = data.map(d => ({
            last_name: d.last_name,
            first_name: d.first_name,
            birth_year: d.birth_year ? parseInt(d.birth_year) : undefined,
            gender: d.gender,
          }));
          const result = await csvImportService.importStudents(students, activeClassId);
          console.log(`Imported ${result.imported}, duplicates ${result.duplicates}`);
        } catch (e) { console.error('Import CSV error:', e); }
        setImportOpen(false);
      }} className={activeClassName} />
    </div>
  );
};
