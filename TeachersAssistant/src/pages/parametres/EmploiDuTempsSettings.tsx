import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../components/ui';
import { useApp } from '../../stores';
import { preferenceService } from '../../services';
import type { RecurrenceMode } from '../../types';
import './ParametresPage.css';

const ALL_DAYS = [
  { value: 7, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

const WEEK_START_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 7, label: 'Dimanche' },
  { value: 6, label: 'Samedi' },
];

const RECURRENCE_MODES: { value: RecurrenceMode; label: string; detail: string }[] = [
  { value: 'quarters', label: 'Quadrimestres', detail: 'Q1 / Q2' },
  { value: 'trimesters', label: 'Trimestres', detail: 'T1 / T2 / T3' },
  { value: 'semesters', label: 'Semestres', detail: 'S1 / S2' },
];

export const EmploiDuTempsSettings: React.FC = () => {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weekStart, setWeekStart] = useState(1);
  const [dayStart, setDayStart] = useState('08:00');
  const [dayEnd, setDayEnd] = useState('17:00');
  const [breakStart, setBreakStart] = useState('12:00');
  const [breakEnd, setBreakEnd] = useState('13:00');
  const [recess1Start, setRecess1Start] = useState('');
  const [recess1End, setRecess1End] = useState('');
  const [recess2Start, setRecess2Start] = useState('');
  const [recess2End, setRecess2End] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('quarters');

  useEffect(() => {
    preferenceService.getAll().then((prefs) => {
      setWorkingDays(prefs.timetable_working_days);
      setWeekStart(prefs.timetable_week_start);
      setDayStart(prefs.timetable_day_start);
      setDayEnd(prefs.timetable_day_end);
      setBreakStart(prefs.timetable_break_start);
      setBreakEnd(prefs.timetable_break_end);
      setRecess1Start(prefs.timetable_recess1_start);
      setRecess1End(prefs.timetable_recess1_end);
      setRecess2Start(prefs.timetable_recess2_start);
      setRecess2End(prefs.timetable_recess2_end);
      setRecurrenceMode(prefs.timetable_recurrence_mode);
      setLoading(false);
    });
  }, []);

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const handleSave = async () => {
    if (workingDays.length === 0) {
      addToast('warn', 'Sélectionnez au moins un jour travaillé');
      return;
    }
    if (dayStart >= dayEnd) {
      addToast('warn', "L'heure de fin doit être après l'heure de début");
      return;
    }
    try {
      await Promise.all([
        preferenceService.set('timetable_working_days', JSON.stringify(workingDays)),
        preferenceService.set('timetable_week_start', String(weekStart)),
        preferenceService.set('timetable_day_start', dayStart),
        preferenceService.set('timetable_day_end', dayEnd),
        preferenceService.set('timetable_break_start', breakStart),
        preferenceService.set('timetable_break_end', breakEnd),
        preferenceService.set('timetable_recess1_start', recess1Start),
        preferenceService.set('timetable_recess1_end', recess1End),
        preferenceService.set('timetable_recess2_start', recess2Start),
        preferenceService.set('timetable_recess2_end', recess2End),
        preferenceService.set('timetable_recurrence_mode', recurrenceMode),
      ]);
      addToast('success', 'Paramètres emploi du temps enregistrés');
    } catch (error) {
      console.error('[EmploiDuTempsSettings] Erreur sauvegarde:', error);
      addToast('error', 'Échec de la sauvegarde');
    }
  };

  if (loading) return <p className="loading-text">Chargement…</p>;

  return (
    <div className="settings-sub settings-sub--two-col">
      <div className="settings-sub__col-left">
        {/* Jours travaillés */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Jours travaillés</h3>
          <p className="settings-sub__desc">
            Cochez les jours de cours. La grille emploi du temps n'affichera que ces jours.
          </p>
          <div className="edt-settings__days-grid">
            {ALL_DAYS.map((d) => (
              <label key={d.value} className="edt-settings__day-check">
                <input
                  type="checkbox"
                  checked={workingDays.includes(d.value)}
                  onChange={() => toggleDay(d.value)}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
          <div className="settings-sub__field" style={{ marginTop: 12 }}>
            <label className="settings-sub__label">Premier jour de la semaine</label>
            <select
              className="settings-sub__input"
              value={weekStart}
              onChange={(e) => setWeekStart(Number(e.target.value))}
            >
              {WEEK_START_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Mode de récurrence */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Périodes de l'emploi du temps</h3>
          <p className="settings-sub__desc">
            Choisissez comment découper l'année pour les créneaux récurrents.
          </p>
          <div className="interface-settings__toggle-group">
            {RECURRENCE_MODES.map((mode) => (
              <button
                key={mode.value}
                className={`interface-settings__toggle-btn ${recurrenceMode === mode.value ? 'interface-settings__toggle-btn--active' : ''}`}
                onClick={() => setRecurrenceMode(mode.value)}
              >
                <span>{mode.label}</span>
                <span className="interface-settings__toggle-detail">{mode.detail}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="settings-sub__col-right">
        {/* Horaires */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Horaires de la journée</h3>
          <p className="settings-sub__desc">
            Définissez les bornes de la grille horaire. Les créneaux peuvent commencer et finir à n'importe quelle heure (ex : 7:45).
          </p>
          <div className="settings-sub__row">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Début de journée</label>
              <input
                type="time"
                className="settings-sub__input"
                value={dayStart}
                onChange={(e) => setDayStart(e.target.value)}
              />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Fin de journée</label>
              <input
                type="time"
                className="settings-sub__input"
                value={dayEnd}
                onChange={(e) => setDayEnd(e.target.value)}
              />
            </div>
          </div>

          <h3 className="settings-sub__title" style={{ marginTop: 16 }}>Pause déjeuner</h3>
          <div className="settings-sub__row">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Début</label>
              <input
                type="time"
                className="settings-sub__input"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
              />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Fin</label>
              <input
                type="time"
                className="settings-sub__input"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Récréations */}
        <Card className="settings-sub__card">
          <h3 className="settings-sub__title">Récréations</h3>
          <p className="settings-sub__desc">
            Optionnel. Définissez jusqu'à deux récréations (matin et après-midi). Laissez vide pour ne pas afficher.
          </p>
          <h4 className="settings-sub__label" style={{ marginBottom: 4 }}>Récréation matin</h4>
          <div className="settings-sub__row">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Début</label>
              <input
                type="time"
                className="settings-sub__input"
                value={recess1Start}
                onChange={(e) => setRecess1Start(e.target.value)}
              />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Fin</label>
              <input
                type="time"
                className="settings-sub__input"
                value={recess1End}
                onChange={(e) => setRecess1End(e.target.value)}
              />
            </div>
          </div>
          <h4 className="settings-sub__label" style={{ marginTop: 12, marginBottom: 4 }}>Récréation après-midi</h4>
          <div className="settings-sub__row">
            <div className="settings-sub__field">
              <label className="settings-sub__label">Début</label>
              <input
                type="time"
                className="settings-sub__input"
                value={recess2Start}
                onChange={(e) => setRecess2Start(e.target.value)}
              />
            </div>
            <div className="settings-sub__field">
              <label className="settings-sub__label">Fin</label>
              <input
                type="time"
                className="settings-sub__input"
                value={recess2End}
                onChange={(e) => setRecess2End(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="edt-settings__save-row">
        <Button variant="primary" size="S" onClick={() => void handleSave()}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
};
