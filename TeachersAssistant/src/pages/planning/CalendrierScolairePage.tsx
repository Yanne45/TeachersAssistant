import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '../../components/ui';
import { useData } from '../../stores';
import { CalendrierPeriodeForm } from '../../components/forms';
import './CalendrierScolairePage.css';

// ── Types ──

interface CalendarPeriod {
  id: number;
  label: string;
  type: 'vacation' | 'holiday' | 'exam' | 'closure';
  startDate: string;
  endDate: string;
}

interface MonthData {
  label: string;
  year: number;
  month: number; // 0-based
  days: DayData[];
}

interface DayData {
  date: Date;
  dayOfMonth: number;
  isWeekend: boolean;
  periodType?: CalendarPeriod['type'];
  periodLabel?: string;
}

// ── Mock data ──

const MOCK_PERIODS: CalendarPeriod[] = [
  { id: 1, label: 'Vacances de Toussaint', type: 'vacation', startDate: '2025-10-18', endDate: '2025-11-03' },
  { id: 2, label: 'Vacances de Noël', type: 'vacation', startDate: '2025-12-20', endDate: '2026-01-05' },
  { id: 3, label: "Vacances d'hiver", type: 'vacation', startDate: '2026-02-14', endDate: '2026-03-02' },
  { id: 4, label: 'Vacances de printemps', type: 'vacation', startDate: '2026-04-11', endDate: '2026-04-27' },
  { id: 5, label: 'Jour de Noël', type: 'holiday', startDate: '2025-12-25', endDate: '2025-12-25' },
  { id: 6, label: 'Jour de l\'an', type: 'holiday', startDate: '2026-01-01', endDate: '2026-01-01' },
  { id: 7, label: 'Bac blanc', type: 'exam', startDate: '2026-02-02', endDate: '2026-02-06' },
];

const PERIOD_TYPE_LABELS: Record<CalendarPeriod['type'], string> = {
  vacation: 'Vacances',
  holiday: 'Jour férié',
  exam: 'Examen',
  closure: 'Fermeture',
};

// ── Helpers ──

function generateSchoolYear(): MonthData[] {
  const months: MonthData[] = [];
  // Sept 2025 → Juin 2026
  for (let i = 0; i < 10; i++) {
    const month = (8 + i) % 12; // 8=Sept
    const year = month >= 8 ? 2025 : 2026;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayData[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      days.push({
        date,
        dayOfMonth: d,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    months.push({
      label: date_label(month),
      year,
      month,
      days,
    });
  }
  return months;
}

function date_label(month: number): string {
  const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  return labels[month];
}

// ── Composant ──

export const CalendrierScolairePage: React.FC = () => {
  const { loadCalendarPeriods, isDbMode } = useData();
  const [periods, setPeriods] = useState<CalendarPeriod[]>(MOCK_PERIODS);
  const [formOpen, setFormOpen] = useState(false);
  const months = generateSchoolYear();

  useEffect(() => {
    loadCalendarPeriods().then(data => {
      if (data.length > 0) {
        setPeriods(data.map((p: any) => ({
          id: p.id,
          label: p.label,
          type: p.period_type ?? 'vacation',
          startDate: p.start_date,
          endDate: p.end_date,
        })));
      }
    });
  }, [loadCalendarPeriods]);

  // Stats
  const totalWeeks = 36;
  const vacationWeeks = 8;
  const holidays = periods.filter(p => p.type === 'holiday').length;

  return (
    <div className="calendrier-page">
      {/* Résumé */}
      <div className="calendrier-page__summary">
        <Badge variant="info" icon="📅">{totalWeeks - vacationWeeks} sem. travaillées</Badge>
        <Badge variant="info" icon="🏖">{vacationWeeks} sem. vacances</Badge>
        <Badge variant="info" icon="📌">{holidays} jours fériés</Badge>
      </div>

      <div className="calendrier-page__layout">
        {/* ── Calendrier annuel ── */}
        <div className="calendrier-page__calendar">
          <div className="cal-grid">
            {months.map(m => (
              <div key={`${m.year}-${m.month}`} className="cal-month">
                <div className="cal-month__header">{m.label} {m.year}</div>
                <div className="cal-month__days-header">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i} className="cal-month__dh">{d}</span>
                  ))}
                </div>
                <div className="cal-month__grid">
                  {/* Décalage pour le premier jour */}
                  {Array.from({ length: (m.days[0].date.getDay() + 6) % 7 }, (_, i) => (
                    <span key={`empty-${i}`} className="cal-day cal-day--empty" />
                  ))}
                  {m.days.map(day => {
                    const iso = day.date.toISOString().split('T')[0];
                    const period = periods.find(p => iso >= p.startDate && iso <= p.endDate);
                    let extraClass = '';
                    if (day.isWeekend) extraClass = 'cal-day--weekend';
                    if (period?.type === 'vacation') extraClass = 'cal-day--vacation';
                    if (period?.type === 'holiday') extraClass = 'cal-day--holiday';
                    if (period?.type === 'exam') extraClass = 'cal-day--exam';
                    if (period?.type === 'closure') extraClass = 'cal-day--closure';

                    return (
                      <span
                        key={day.dayOfMonth}
                        className={`cal-day ${extraClass}`}
                        title={period?.label}
                      >
                        {day.dayOfMonth}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Panneau paramètres ── */}
        <div className="calendrier-page__params">
          <Card noHover>
            <h3 className="calendrier-page__param-title">Année scolaire</h3>
            <div className="calendrier-page__field-row">
              <Input label="Début" type="date" defaultValue="2025-09-01" />
              <Input label="Fin" type="date" defaultValue="2026-07-04" />
            </div>
          </Card>

          <Card noHover>
            <h3 className="calendrier-page__param-title">Périodes</h3>
            <div className="periods-list">
              {periods.map(p => (
                <div key={p.id} className={`period-row period-row--${p.type}`}>
                  <Badge variant={p.type === 'holiday' ? 'danger' : p.type === 'exam' ? 'warn' : 'info'}>
                    {PERIOD_TYPE_LABELS[p.type]}
                  </Badge>
                  <span className="period-row__label">{p.label}</span>
                  <span className="period-row__dates">
                    {p.startDate === p.endDate ? p.startDate : `${p.startDate} → ${p.endDate}`}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="primary" size="S" style={{ marginTop: 12 }}>
              + Ajouter une période
            </Button>
          </Card>
        </div>
      </div>

      <CalendrierPeriodeForm open={formOpen} onClose={() => setFormOpen(false)} onSave={(data) => { console.log('Save période:', data); setFormOpen(false); }} />
    </div>
  );
};
