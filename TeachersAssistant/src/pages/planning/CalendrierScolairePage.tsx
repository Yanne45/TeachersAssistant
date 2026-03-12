import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Input } from '../../components/ui';
import { useApp, useData } from '../../stores';
import { calendarPeriodService } from '../../services';
import { CalendrierPeriodeForm } from '../../components/forms';
import './CalendrierScolairePage.css';

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
  month: number;
  days: DayData[];
}

interface DayData {
  date: Date;
  dayOfMonth: number;
  isWeekend: boolean;
}

const PERIOD_TYPE_LABELS: Record<CalendarPeriod['type'], string> = {
  vacation: 'Vacances',
  holiday: 'Jour férié',
  exam: 'Examen',
  closure: 'Fermeture',
};

function dateLabel(month: number): string {
  const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  return labels[month] ?? '';
}

function generateSchoolYear(): MonthData[] {
  const months: MonthData[] = [];
  for (let i = 0; i < 10; i++) {
    const month = (8 + i) % 12;
    const year = month >= 8 ? 2025 : 2026;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: DayData[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      days.push({ date, dayOfMonth: d, isWeekend: dow === 0 || dow === 6 });
    }

    months.push({ label: dateLabel(month), year, month, days });
  }
  return months;
}

function mapPeriod(p: any): CalendarPeriod {
  return {
    id: p.id,
    label: p.label,
    type: p.period_type ?? 'vacation',
    startDate: p.start_date,
    endDate: p.end_date,
  };
}

export const CalendrierScolairePage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { loadCalendarPeriods } = useData();
  const [periods, setPeriods] = useState<CalendarPeriod[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<CalendarPeriod | null>(null);
  const months = generateSchoolYear();

  const refreshPeriods = useCallback(async () => {
    const data = await loadCalendarPeriods();
    setPeriods(data.map(mapPeriod));
  }, [loadCalendarPeriods]);

  useEffect(() => {
    refreshPeriods();
  }, [refreshPeriods]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await calendarPeriodService.delete(id);
      await refreshPeriods();
    } catch {
      addToast('error', 'Échec de la suppression');
    }
  }, [refreshPeriods, addToast]);

  const vacationDays = periods
    .filter((p) => p.type === 'vacation')
    .reduce((acc, p) => {
      const ms = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
      return acc + Math.round(ms / 86400000) + 1;
    }, 0);
  const vacationWeeks = Math.round(vacationDays / 5);
  const totalWeeks = 36;
  const holidays = periods.filter((p) => p.type === 'holiday').length;

  return (
    <div className="calendrier-page">
      <div className="calendrier-page__summary">
        <Badge variant="info" icon="📘">{totalWeeks - vacationWeeks} sem. travaillées</Badge>
        <Badge variant="info" icon="🏖️">{vacationWeeks} sem. vacances</Badge>
        <Badge variant="info" icon="🎉">{holidays} jours fériés</Badge>
      </div>

      <div className="calendrier-page__layout">
        <div className="calendrier-page__calendar">
          <div className="cal-grid">
            {months.map((m) => (
              <div key={`${m.year}-${m.month}`} className="cal-month">
                <div className="cal-month__header">{m.label} {m.year}</div>
                <div className="cal-month__days-header">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i} className="cal-month__dh">{d}</span>
                  ))}
                </div>
                <div className="cal-month__grid">
                  {Array.from({ length: (((m.days[0]?.date.getDay()) ?? 1) + 6) % 7 }, (_, i) => (
                    <span key={`empty-${i}`} className="cal-day cal-day--empty" />
                  ))}
                  {m.days.map((day) => {
                    const iso = day.date.toISOString().split('T')[0] ?? '';
                    const period = periods.find((p) => iso >= p.startDate && iso <= p.endDate);
                    let extraClass = '';
                    if (day.isWeekend) extraClass = 'cal-day--weekend';
                    if (period?.type === 'vacation') extraClass = 'cal-day--vacation';
                    if (period?.type === 'holiday') extraClass = 'cal-day--holiday';
                    if (period?.type === 'exam') extraClass = 'cal-day--exam';
                    if (period?.type === 'closure') extraClass = 'cal-day--closure';

                    return (
                      <span key={day.dayOfMonth} className={`cal-day ${extraClass}`} title={period?.label}>
                        {day.dayOfMonth}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

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
              {periods.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '8px 0' }}>
                  Aucune période configurée
                </p>
              )}
              {periods.map((p) => (
                <div key={p.id} className={`period-row period-row--${p.type}`}>
                  <Badge variant={p.type === 'holiday' ? 'danger' : p.type === 'exam' ? 'warn' : 'info'}>
                    {PERIOD_TYPE_LABELS[p.type]}
                  </Badge>
                  <span className="period-row__label">{p.label}</span>
                  <span className="period-row__dates">
                    {p.startDate === p.endDate ? p.startDate : `${p.startDate} → ${p.endDate}`}
                  </span>
                  <button
                    className="period-row__edit-btn"
                    title="Modifier"
                    onClick={() => { setEditingPeriod(p); setFormOpen(true); }}
                  >✏️</button>
                  <button
                    className="period-row__del-btn"
                    title="Supprimer"
                    onClick={() => handleDelete(p.id)}
                  >×</button>
                </div>
              ))}
            </div>
            <Button variant="primary" size="S" style={{ marginTop: 12 }} onClick={() => { setEditingPeriod(null); setFormOpen(true); }}>
              + Ajouter une période
            </Button>
          </Card>
        </div>
      </div>

      <CalendrierPeriodeForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingPeriod(null); }}
        initialData={editingPeriod ? {
          label: editingPeriod.label,
          period_type: editingPeriod.type,
          start_date: editingPeriod.startDate,
          end_date: editingPeriod.endDate,
          impacts_teaching: true,
        } : undefined}
        onSave={async (data) => {
          if (!activeYear) { addToast('error', 'Aucune année scolaire active'); return; }
          try {
            if (editingPeriod) {
              await calendarPeriodService.update(editingPeriod.id, {
                label: data.label,
                period_type: data.period_type as CalendarPeriod['type'],
                start_date: data.start_date,
                end_date: data.end_date,
                impacts_teaching: data.impacts_teaching,
              });
            } else {
              await calendarPeriodService.create({
                academic_year_id: activeYear.id,
                label: data.label,
                period_type: data.period_type as CalendarPeriod['type'],
                start_date: data.start_date,
                end_date: data.end_date,
                impacts_teaching: data.impacts_teaching,
                color: null,
                notes: null,
              });
            }
            await refreshPeriods();
            setFormOpen(false);
            setEditingPeriod(null);
          } catch {
            addToast('error', 'Échec de la sauvegarde');
          }
        }}
      />
    </div>
  );
};
