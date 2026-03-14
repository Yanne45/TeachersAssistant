// ============================================================================
// SkillMapPage — Cartographie des compétences de la classe
// Heatmap : compétences en lignes, périodes en colonnes
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '../../stores';
import { classService, subjectService, skillMapService } from '../../services';
import { EmptyState } from '../../components/ui';
import type { SkillMapResult, SkillMapCell } from '../../types';
import type { ClassWithLevel, Subject } from '../../types/academic';
import './SkillMapPage.css';

// ── Couleur par seuil ──

function cellColor(pct: number | null): string {
  if (pct === null) return 'var(--color-bg)';
  if (pct >= 80) return '#d4edda';
  if (pct >= 50) return '#fff3cd';
  return '#f8d7da';
}

function cellTextColor(pct: number | null): string {
  if (pct === null) return 'var(--color-text-muted)';
  if (pct >= 80) return '#155724';
  if (pct >= 50) return '#856404';
  return '#721c24';
}

function barColor(pct: number): string {
  if (pct >= 80) return '#28a745';
  if (pct >= 50) return '#ffc107';
  return '#dc3545';
}

// ── Composant ──

export const SkillMapPage: React.FC = () => {
  const { activeYear, addToast } = useApp();

  const [classes, setClasses] = useState<ClassWithLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [data, setData] = useState<SkillMapResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Charger classes et matières
  useEffect(() => {
    if (!activeYear) return;
    Promise.all([
      classService.getByYear(activeYear.id),
      subjectService.getAll(),
    ]).then(([cls, subs]) => {
      setClasses(cls);
      setSubjects(subs);
      if (cls.length > 0 && !selectedClassId) setSelectedClassId(cls[0]!.id);
      if (subs.length > 0 && !selectedSubjectId) setSelectedSubjectId(subs[0]!.id);
    });
  }, [activeYear]);

  // Charger les données de la heatmap
  const loadData = useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId || !activeYear) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const result = await skillMapService.getClassSkillMap(
        selectedClassId, selectedSubjectId, activeYear.id,
      );
      setData(result);
    } catch (err) {
      console.error('[SkillMapPage] Erreur:', err);
      addToast('error', 'Impossible de charger la cartographie');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSubjectId, activeYear, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Lookup rapide : cellule par (skill_id, period_id)
  const cellLookup = useMemo(() => {
    const map = new Map<string, SkillMapCell>();
    if (data) {
      for (const c of data.cells) {
        map.set(`${c.skill_id}-${c.period_id}`, c);
      }
    }
    return map;
  }, [data]);

  // Grouper les compétences par catégorie
  const groupedSkills = useMemo(() => {
    if (!data) return [];
    const groups: { category: string; skills: typeof data.skills }[] = [];
    const catMap = new Map<string, typeof data.skills>();
    for (const sk of data.skills) {
      const cat = sk.category || 'Autres';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(sk);
    }
    for (const [category, skills] of catMap) {
      groups.push({ category, skills });
    }
    return groups;
  }, [data]);

  // Données pour le bar chart résumé (moyenne d'acquisition par période)
  const barData = useMemo(() => {
    if (!data || data.periods.length === 0) return [];
    return data.periods.map(p => {
      const periodCells = data.cells.filter(c => c.period_id === p.id);
      const avg = periodCells.length > 0
        ? Math.round(periodCells.reduce((s, c) => s + c.pct_acquired, 0) / periodCells.length)
        : 0;
      return { code: p.code, label: p.label, pct: avg };
    });
  }, [data]);

  const className = classes.find(c => c.id === selectedClassId)?.name ?? '';
  const subjectLabel = subjects.find(s => s.id === selectedSubjectId)?.label ?? '';

  return (
    <div className="skill-map">
      <div className="skill-map__header">
        <h1 className="skill-map__title">Cartographie des compétences</h1>
      </div>

      {/* Filtres */}
      <div className="skill-map__filters">
        <div className="skill-map__filter">
          <label className="skill-map__filter-label">Classe</label>
          <select
            className="skill-map__select"
            value={selectedClassId ?? ''}
            onChange={e => setSelectedClassId(Number(e.target.value) || null)}
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="skill-map__filter">
          <label className="skill-map__filter-label">Matière</label>
          <select
            className="skill-map__select"
            value={selectedSubjectId ?? ''}
            onChange={e => setSelectedSubjectId(Number(e.target.value) || null)}
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        {data && (
          <span className="skill-map__meta">
            {data.totalStudents} élèves · {data.skills.length} compétences · {data.cells.length} évaluations
          </span>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="skill-map__loading">Chargement…</p>
      ) : !data || data.skills.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="Aucune évaluation de compétences"
          description={`Aucune donnée trouvée pour ${className || 'cette classe'} en ${subjectLabel || 'cette matière'}. Les compétences apparaissent ici après correction de devoirs avec grille de compétences.`}
        />
      ) : (
        <>
          {/* Heatmap */}
          <div className="skill-map__table-wrap">
            <table className="skill-map__table">
              <thead>
                <tr>
                  <th className="skill-map__th skill-map__th--skill">Compétence</th>
                  {data.periods.map(p => (
                    <th key={p.id as number} className="skill-map__th">{p.code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedSkills.map(group => (
                  <React.Fragment key={group.category}>
                    <tr className="skill-map__cat-row">
                      <td colSpan={data.periods.length + 1} className="skill-map__cat-label">
                        {group.category}
                      </td>
                    </tr>
                    {group.skills.map(sk => (
                      <tr key={sk.id as number} className="skill-map__row">
                        <td className="skill-map__td skill-map__td--skill">{sk.label}</td>
                        {data.periods.map(p => {
                          const cell = cellLookup.get(`${sk.id}-${p.id}`);
                          const pct = cell ? cell.pct_acquired : null;
                          return (
                            <td
                              key={p.id as number}
                              className="skill-map__td skill-map__td--cell"
                              style={{ backgroundColor: cellColor(pct), color: cellTextColor(pct) }}
                              title={cell
                                ? `${cell.count_acquired}/${cell.total_evaluated} élèves (moy. ${cell.avg_level}/4)`
                                : 'Pas de données'}
                            >
                              {pct !== null ? `${Math.round(pct)}%` : '–'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="skill-map__legend">
            <span className="skill-map__legend-item">
              <span className="skill-map__legend-swatch" style={{ background: '#d4edda' }} />
              ≥ 80 % acquis
            </span>
            <span className="skill-map__legend-item">
              <span className="skill-map__legend-swatch" style={{ background: '#fff3cd' }} />
              50–79 %
            </span>
            <span className="skill-map__legend-item">
              <span className="skill-map__legend-swatch" style={{ background: '#f8d7da' }} />
              &lt; 50 %
            </span>
            <span className="skill-map__legend-item">
              <span className="skill-map__legend-swatch" style={{ background: 'var(--color-bg)' }} />
              Pas de données
            </span>
          </div>

          {/* Bar chart résumé */}
          {barData.length > 0 && (
            <div className="skill-map__chart-section">
              <h2 className="skill-map__section-title">Taux d'acquisition moyen par période</h2>
              <div className="skill-map__chart">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Taux d\'acquisition']}
                      labelFormatter={(label: string) => {
                        const item = barData.find(b => b.code === label);
                        return item ? item.label : label;
                      }}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={barColor(entry.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
