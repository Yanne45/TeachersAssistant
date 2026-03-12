import React from 'react';
import { Card, Badge } from '../../../components/ui';
import '../FicheElevePage.css';

interface BulletinsTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  bulletins: any[];
  onPeriodChange: (periodId: number) => void;
}

export const BulletinsTabPanel: React.FC<BulletinsTabPanelProps> = ({
  periods,
  selectedPeriodId,
  bulletins,
  onPeriodChange,
}) => (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Bulletins</h3>
          {periods.length > 0 && (
            <div className="fiche-eleve__period-badges">
              {periods.map((period) => (
                <Badge
                  key={period.id}
                  variant="filter"
                  active={selectedPeriodId === period.id}
                  onClick={() => onPeriodChange(period.id)}
                >
                  {period.label}
                </Badge>
              ))}
            </div>
          )}
          {bulletins.length === 0 ? (
            <span className="fiche-eleve__placeholder-text">Aucune entrée de bulletin pour cette période.</span>
          ) : (
            <div className="fiche-eleve__item-list">
              {bulletins.map((b) => (
                <div key={b.id} className="fiche-eleve__item-card">
                  <div className="fiche-eleve__item-row fiche-eleve__item-row--mb">
                    <strong className="fiche-eleve__item-title">{b.entry_type}</strong>
                    <span className="fiche-eleve__item-meta">{b.status}</span>
                  </div>
                  <div className="fiche-eleve__item-text">{b.content}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
);
