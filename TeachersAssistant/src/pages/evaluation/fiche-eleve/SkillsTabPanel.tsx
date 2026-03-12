import React from 'react';
import { Card, Badge, SegmentedBar } from '../../../components/ui';
import { levelColor } from './helpers';
import type { SkillEvolution } from './types';
import '../FicheElevePage.css';

function trend(first: number | null, last: number | null) {
  if (first === null || last === null) return { arrow: '-', color: 'var(--color-text-muted)' };
  if (last > first) return { arrow: '↑', color: 'var(--color-success)' };
  if (last < first) return { arrow: '↓', color: 'var(--color-danger)' };
  return { arrow: '→', color: 'var(--color-text-muted)' };
}

interface SkillsTabPanelProps {
  skillLevels: { name: string; level: number }[];
  skillEvolution: SkillEvolution[];
}

export const SkillsTabPanel: React.FC<SkillsTabPanelProps> = ({
  skillLevels,
  skillEvolution,
}) => (
        <div className="fiche-eleve__skills">
          <Card noHover>
            <h3 className="fiche-eleve__section-title">Niveau actuel par compétence</h3>
            <div className="fiche-eleve__skill-list">
              {skillLevels.map((s) => (
                <div key={s.name} className="skill-current">
                  <div className="skill-current__header">
                    <span className="skill-current__name">{s.name}</span>
                    <span className="skill-current__score">{s.level}/4</span>
                  </div>
                  <SegmentedBar level={s.level} maxLevel={4} height={8} />
                </div>
              ))}
            </div>
          </Card>

          <Card noHover>
            <h3 className="fiche-eleve__section-title">Évolution sur l'année</h3>
            <div className="fiche-eleve__period-badges">
              <Badge variant="filter" active>T1</Badge>
              <Badge variant="filter" active>T2</Badge>
              <Badge variant="info">T3</Badge>
            </div>

            <div className="fiche-eleve__evolution-list">
              {skillEvolution.map((s) => {
                const t = trend(s.t1, s.t2);
                return (
                  <div key={s.name} className="evolution-row">
                    <span className="evolution-row__name">{s.name}</span>
                    {[s.t1, s.t2, s.t3].map((level, i) => {
                      const c = levelColor(level);
                      return (
                        <span key={i} className="evolution-row__dot" style={{ backgroundColor: c.bg, color: c.text }}>
                          {level ?? '-'}
                        </span>
                      );
                    })}
                    <span className="evolution-row__trend" style={{ color: t.color }}>
                      {t.arrow}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
);
