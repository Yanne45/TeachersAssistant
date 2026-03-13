import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../components/ui';
import { useApp } from '../../stores';
import { db, newYearService } from '../../services';
import './ParametresPage.css';

// Compute default academic year dates from current date
function defaultAcademicYear() {
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    label: `${y}-${y + 1}`,
    start: `${y}-09-01`,
    end: `${y + 1}-07-04`,
  };
}

function nextAcademicYear(currentLabel: string, currentEnd: string) {
  const match = currentLabel.match(/(\d{4})-(\d{4})/);
  if (match?.[2]) {
    const y2 = parseInt(match[2], 10);
    return { label: `${y2}-${y2 + 1}`, start: `${y2}-09-01`, end: `${y2 + 1}-07-04` };
  }
  const endYear = new Date(currentEnd).getFullYear();
  return { label: `${endYear}-${endYear + 1}`, start: `${endYear}-09-01`, end: `${endYear + 1}-07-04` };
}

export const AnneeSettings: React.FC = () => {
  const { addToast } = useApp();
  const defaults = defaultAcademicYear();
  const [label, setLabel] = useState(defaults.label);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  const [showNewYear, setShowNewYear] = useState(false);
  const nextDefaults = nextAcademicYear(label, endDate);
  const [newYearLabel, setNewYearLabel] = useState(nextDefaults.label);
  const [newYearStart, setNewYearStart] = useState(nextDefaults.start);
  const [newYearEnd, setNewYearEnd] = useState(nextDefaults.end);
  const [creatingYear, setCreatingYear] = useState(false);

  useEffect(() => {
    db.selectOne<any>('SELECT * FROM academic_years WHERE is_active = 1').then((year) => {
      if (!year) return;
      setLabel(year.label);
      setStartDate(year.start_date ?? defaults.start);
      setEndDate(year.end_date ?? defaults.end);
      // Update new year defaults based on loaded active year
      const next = nextAcademicYear(year.label, year.end_date ?? defaults.end);
      setNewYearLabel(next.label);
      setNewYearStart(next.start);
      setNewYearEnd(next.end);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await db.execute(
        "UPDATE academic_years SET label = ?, start_date = ?, end_date = ?, updated_at = datetime('now') WHERE is_active = 1",
        [label, startDate, endDate],
      );
      addToast('success', 'Année scolaire mise à jour');
    } catch {
      addToast('error', 'Erreur de sauvegarde');
    }
  };

  const handleCreateYear = async () => {
    setCreatingYear(true);
    try {
      const result = await newYearService.createFromExisting(1, newYearLabel.trim(), newYearStart, newYearEnd);
      const summary = Object.entries(result.copied)
        .filter(([, value]) => value > 0)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      addToast('success', `Année "${newYearLabel}" créée (${summary})`);
      setShowNewYear(false);
    } catch (err: any) {
      addToast('error', 'Erreur: ' + (err?.message || 'inconnue'));
    } finally {
      setCreatingYear(false);
    }
  };

  return (
    <div className="settings-sub">
      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Année scolaire active</h3>
        <div className="settings-sub__field">
          <label className="settings-sub__label">Libellé</label>
          <input className="settings-sub__input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="settings-sub__row">
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de début</label>
            <input className="settings-sub__input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="settings-sub__field">
            <label className="settings-sub__label">Date de fin</label>
            <input className="settings-sub__input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <Button variant="primary" size="S" onClick={handleSave}>Enregistrer</Button>
      </Card>

      <Card className="settings-sub__card">
        <h3 className="settings-sub__title">Nouvelle année depuis existante</h3>
        <p className="settings-sub__desc">
          Copie les programmes, templates de séquences, capacités et paramètres IA.
          Les élèves, notes, bulletins et cahier de textes ne sont pas copiés.
        </p>

        {!showNewYear ? (
          <Button variant="secondary" size="S" onClick={() => setShowNewYear(true)}>Créer nouvelle année</Button>
        ) : (
          <div className="settings-sub__new-year">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Libellé nouvelle année</label>
              <input className="settings-sub__input" value={newYearLabel} onChange={(e) => setNewYearLabel(e.target.value)} />
            </div>
            <div className="settings-sub__row">
              <div className="settings-sub__field">
                <label className="settings-sub__label">Début</label>
                <input className="settings-sub__input" type="date" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)} />
              </div>
              <div className="settings-sub__field">
                <label className="settings-sub__label">Fin</label>
                <input className="settings-sub__input" type="date" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="S" disabled={creatingYear || !newYearLabel.trim()} onClick={handleCreateYear}>
                {creatingYear ? 'Création…' : 'Confirmer la création'}
              </Button>
              <Button variant="secondary" size="S" onClick={() => setShowNewYear(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
