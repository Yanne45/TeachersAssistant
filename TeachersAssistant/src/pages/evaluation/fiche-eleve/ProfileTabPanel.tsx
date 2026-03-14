import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import type { ProfileData } from './types';
import '../FicheElevePage.css';

interface ProfileTabPanelProps {
  periods: Array<{ id: number; label: string }>;
  selectedPeriodId: number | null;
  profile: ProfileData | null;
  onPeriodChange: (periodId: number) => void;
  onSave?: (data: ProfileData) => Promise<void>;
}

const PROFILE_FIELDS: { key: keyof ProfileData; label: string }[] = [
  { key: 'behavior', label: 'Comportement' },
  { key: 'work_ethic', label: 'Travail' },
  { key: 'participation', label: 'Participation' },
  { key: 'autonomy', label: 'Autonomie' },
  { key: 'methodology', label: 'Méthode' },
];

const EMPTY_PROFILE: ProfileData = {
  behavior: null, work_ethic: null, participation: null,
  autonomy: null, methodology: null, notes: null,
};

export const ProfileTabPanel: React.FC<ProfileTabPanelProps> = ({
  periods,
  selectedPeriodId,
  profile,
  onPeriodChange,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileData>({ ...EMPTY_PROFILE });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(profile ? { ...profile } : { ...EMPTY_PROFILE });
    setEditing(false);
  }, [profile, selectedPeriodId]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card noHover className="fiche-eleve__placeholder">
      <div className="fiche-eleve__section-header-row">
        <h3 className="fiche-eleve__section-title">Profil période</h3>
        {onSave && !editing && (
          <Button variant="ghost" size="S" onClick={() => setEditing(true)}>Modifier</Button>
        )}
      </div>

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

      {!profile && !editing ? (
        <span className="fiche-eleve__placeholder-text">
          Aucun profil saisi pour cette période.
          {onSave && (
            <Button variant="secondary" size="S" onClick={() => setEditing(true)} className="fiche-eleve__inline-btn">
              Saisir le profil
            </Button>
          )}
        </span>
      ) : editing ? (
        <div className="fiche-eleve__item-list fiche-eleve__item-list--gap-lg">
          {PROFILE_FIELDS.map((item) => (
            <div key={item.key} className="fiche-eleve__item-card fiche-eleve__item-row">
              <span className="fiche-eleve__item-text">{item.label}</span>
              <div className="fiche-eleve__score-pills">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`fiche-eleve__score-pill ${(form[item.key] as number | null) === v ? 'fiche-eleve__score-pill--active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, [item.key]: (f[item.key] as number | null) === v ? null : v }))}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="fiche-eleve__item-card">
            <label className="fiche-eleve__item-text">Notes</label>
            <textarea
              className="fiche-eleve__profile-notes"
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value || null }))}
              placeholder="Observations libres…"
            />
          </div>
          <div className="fiche-eleve__profile-actions">
            <Button variant="ghost" size="S" onClick={() => { setForm(profile ? { ...profile } : { ...EMPTY_PROFILE }); setEditing(false); }}>
              Annuler
            </Button>
            <Button variant="primary" size="S" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="fiche-eleve__item-list fiche-eleve__item-list--gap-lg">
          {PROFILE_FIELDS.map((item) => {
            const value = profile![item.key] as number | null;
            return (
              <div key={item.key} className="fiche-eleve__item-card fiche-eleve__item-row">
                <span className="fiche-eleve__item-text">{item.label}</span>
                <span className="fiche-eleve__item-text fiche-eleve__item-text--bold">{value ?? '-'}/5</span>
              </div>
            );
          })}
          {profile!.notes && (
            <div className="fiche-eleve__item-card fiche-eleve__item-text">
              <strong>Notes:</strong> {profile!.notes}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
