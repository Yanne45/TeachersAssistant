import React from 'react';
import { Card, Badge } from '../../../components/ui';
import type { ProfileData } from './types';
import '../FicheElevePage.css';

interface ProfileTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  profile: ProfileData | null;
  onPeriodChange: (periodId: number) => void;
}

export const ProfileTabPanel: React.FC<ProfileTabPanelProps> = ({
  periods,
  selectedPeriodId,
  profile,
  onPeriodChange,
}) => (
        <Card noHover className="fiche-eleve__placeholder">
          <h3 className="fiche-eleve__section-title">Profil période</h3>
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

          {!profile ? (
            <span className="fiche-eleve__placeholder-text">Aucun profil saisi pour cette période.</span>
          ) : (
            <div className="fiche-eleve__item-list fiche-eleve__item-list--gap-lg">
              {[
                { key: 'behavior', label: 'Comportement' },
                { key: 'work_ethic', label: 'Travail' },
                { key: 'participation', label: 'Participation' },
                { key: 'autonomy', label: 'Autonomie' },
                { key: 'methodology', label: 'Méthode' },
              ].map((item) => {
                const value = profile[item.key as keyof ProfileData] as number | null;
                return (
                  <div
                    key={item.key}
                    className="fiche-eleve__item-card fiche-eleve__item-row"
                  >
                    <span className="fiche-eleve__item-text">{item.label}</span>
                    <span className="fiche-eleve__item-text fiche-eleve__item-text--bold">{value ?? '-'}/5</span>
                  </div>
                );
              })}

              {profile.notes && (
                <div className="fiche-eleve__item-card fiche-eleve__item-text">
                  <strong>Notes:</strong> {profile.notes}
                </div>
              )}
            </div>
          )}
        </Card>
);
