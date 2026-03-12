import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Button, EmptyState, SegmentedControl } from '../../components/ui';
import { useApp, useData, useRouter } from '../../stores';
import { CreneauForm, ICSMappingModal, GoogleCalendarModal } from '../../components/forms';
import { icsImportService, timetableService, preferenceService } from '../../services';
import type { DayOfWeek, RecurrenceMode } from '../../types';
import './EmploiDuTempsPage.css';

interface CourseSlot {
  id: number;
  dayOfWeek: number;        // 1-7
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  room?: string;
  recurrence: string;
}

const ALL_DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
};

const RECURRENCE_SEGMENTS_MAP: Record<RecurrenceMode, { id: string; label: string }[]> = {
  quarters: [
    { id: 'all', label: 'Toutes' }, { id: 'q1', label: 'Q1' }, { id: 'q2', label: 'Q2' },
  ],
  trimesters: [
    { id: 'all', label: 'Toutes' }, { id: 't1', label: 'T1' }, { id: 't2', label: 'T2' }, { id: 't3', label: 'T3' },
  ],
  semesters: [
    { id: 'all', label: 'Toutes' }, { id: 's1', label: 'S1' }, { id: 's2', label: 'S2' },
  ],
};

const HOUR_HEIGHT = 36;

function calcDuration(start?: string, end?: string): number {
  if (!start || !end) return 120;
  const [shRaw = 0, smRaw = 0] = start.split(':').map(Number);
  const [ehRaw = shRaw, emRaw = smRaw] = end.split(':').map(Number);
  const sh = Number.isFinite(shRaw) ? shRaw : 0;
  const sm = Number.isFinite(smRaw) ? smRaw : 0;
  const eh = Number.isFinite(ehRaw) ? ehRaw : sh;
  const em = Number.isFinite(emRaw) ? emRaw : sm;
  return (eh * 60 + em) - (sh * 60 + sm);
}

function parseHour(timeStr: string): number {
  return Number.parseInt(timeStr.split(':')[0] ?? '8', 10) || 8;
}

function mapWeekSlotsToCourseSlots(data: any[]): CourseSlot[] {
  return data.map((s: any, i: number) => {
    const startTime = s.startTime ?? s.start_time ?? '8:00';
    const [hStr, mStr] = startTime.split(':');
    return {
      id: i + 1,
      dayOfWeek: s.dayOfWeek ?? s.day_of_week ?? 1,
      startHour: Number.parseInt(hStr, 10) || 8,
      startMinute: Number.parseInt(mStr, 10) || 0,
      durationMinutes: calcDuration(startTime, s.endTime ?? s.end_time),
      subjectLabel: s.subjectLabel ?? s.subject_short_label ?? 'Matière',
      subjectColor: s.subjectColor ?? s.subject_color ?? '#888',
      classLabel: s.classLabel ?? s.class_short_name ?? 'Classe',
      room: s.room ?? undefined,
      recurrence: s.recurrence ?? 'all',
    };
  });
}

/** Sort days according to week start preference */
function orderDays(workingDays: number[], weekStart: number): number[] {
  const sorted = [...workingDays].sort((a, b) => a - b);
  // Rotate so weekStart comes first
  const startIdx = sorted.findIndex((d) => d >= weekStart);
  if (startIdx <= 0) return sorted;
  return [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)];
}

export const EmploiDuTempsPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route } = useRouter();
  const { loadWeekSlots } = useData();

  const [recurrence, setRecurrence] = useState('all');
  const [slots, setSlots] = useState<CourseSlot[]>([]);
  const [creneauFormOpen, setCreneauFormOpen] = useState(false);
  const [icsEvents, setIcsEvents] = useState<any[] | null>(null);
  const [gcalOpen, setGcalOpen] = useState(false);
  const autoImportTriggered = useRef(false);

  // Timetable preferences
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [weekStart, setWeekStart] = useState(1);
  const [dayStartTime, setDayStartTime] = useState('08:00');
  const [dayEndTime, setDayEndTime] = useState('17:00');
  const [breakStartTime, setBreakStartTime] = useState('12:00');
  const [breakEndTime, setBreakEndTime] = useState('13:00');
  const [recess1Start, setRecess1Start] = useState('');
  const [recess1End, setRecess1End] = useState('');
  const [recess2Start, setRecess2Start] = useState('');
  const [recess2End, setRecess2End] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('quarters');

  useEffect(() => {
    preferenceService.getAll().then((prefs) => {
      setWorkingDays(prefs.timetable_working_days);
      setWeekStart(prefs.timetable_week_start);
      setDayStartTime(prefs.timetable_day_start);
      setDayEndTime(prefs.timetable_day_end);
      setBreakStartTime(prefs.timetable_break_start);
      setBreakEndTime(prefs.timetable_break_end);
      setRecess1Start(prefs.timetable_recess1_start);
      setRecess1End(prefs.timetable_recess1_end);
      setRecess2Start(prefs.timetable_recess2_start);
      setRecess2End(prefs.timetable_recess2_end);
      setRecurrenceMode(prefs.timetable_recurrence_mode);
    });
  }, []);

  useEffect(() => {
    loadWeekSlots().then((data) => {
      setSlots(mapWeekSlotsToCourseSlots(data));
    });
  }, [loadWeekSlots]);

  // Derived grid values
  const orderedDays = useMemo(() => orderDays(workingDays, weekStart), [workingDays, weekStart]);
  const dayLabels = useMemo(() => orderedDays.map((d) => ALL_DAY_LABELS[d] ?? `Jour ${d}`), [orderedDays]);
  const startHour = parseHour(dayStartTime);
  const endHour = parseHour(dayEndTime);
  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h <= endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);
  const breakStart = parseHour(breakStartTime);
  const breakEnd = parseHour(breakEndTime);
  const rec1Start = recess1Start ? parseHour(recess1Start) : -1;
  const rec1End = recess1End ? parseHour(recess1End) : -1;
  const rec2Start = recess2Start ? parseHour(recess2Start) : -1;
  const rec2End = recess2End ? parseHour(recess2End) : -1;
  const recurrenceSegments = RECURRENCE_SEGMENTS_MAP[recurrenceMode] ?? RECURRENCE_SEGMENTS_MAP.quarters;

  const isBreakHour = (hour: number) =>
    (hour >= breakStart && hour < breakEnd) ||
    (rec1Start >= 0 && hour >= rec1Start && hour < rec1End) ||
    (rec2Start >= 0 && hour >= rec2Start && hour < rec2End);

  const breakLabel = (hour: number): string | null => {
    if (hour >= breakStart && hour < breakEnd) return 'Pause';
    if (rec1Start >= 0 && hour >= rec1Start && hour < rec1End) return 'Récré';
    if (rec2Start >= 0 && hour >= rec2Start && hour < rec2End) return 'Récré';
    return null;
  };

  const filteredSlots = slots.filter(
    (s) => recurrence === 'all' || s.recurrence === 'all' || s.recurrence === recurrence,
  );

  const handleImportICS = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const events = icsImportService.parse(text);
      if (events.length > 0) {
        setIcsEvents(events);
      } else {
        addToast('warn', 'Aucun événement trouvé dans le fichier ICS');
      }
    };
    input.click();
  }, [addToast]);

  useEffect(() => {
    if (route.page === 'edt-import') {
      if (!autoImportTriggered.current) {
        autoImportTriggered.current = true;
        handleImportICS();
      }
      return;
    }
    autoImportTriggered.current = false;
  }, [route.page, handleImportICS]);

  const numDays = orderedDays.length;

  return (
    <div className="edt-page">
      <div className="edt-page__toolbar">
        <h1 className="edt-page__title">Emploi du temps</h1>
        <div className="edt-page__actions">
          <SegmentedControl segments={recurrenceSegments} activeId={recurrence} onChange={setRecurrence} />
          <Button variant="secondary" size="S" onClick={handleImportICS}>Importer ICS</Button>
          <Button
            variant="secondary"
            size="S"
            onClick={() => setGcalOpen(true)}
          >
            Google Calendar
          </Button>
          <Button variant="primary" size="S" onClick={() => setCreneauFormOpen(true)}>+ Nouveau créneau</Button>
        </div>
      </div>

      {slots.length === 0 && (
        <EmptyState
          icon="🗓️"
          title="Emploi du temps vide"
          description="Importez un fichier ICS ou ajoutez des créneaux manuellement."
          actionLabel="+ Nouveau créneau"
          onAction={() => setCreneauFormOpen(true)}
        />
      )}

      <Card noHover className="edt-grid-wrapper">
        <div className="edt-grid" style={{ gridTemplateColumns: `50px repeat(${numDays}, 1fr)` }}>
          <div className="edt-grid__corner" />
          {dayLabels.map((d) => (
            <div key={d} className="edt-grid__day-header">{d}</div>
          ))}

          {hours.map((hour) => {
            const bLabel = breakLabel(hour);
            const isBrk = isBreakHour(hour);
            return (
            <React.Fragment key={hour}>
              <div className={`edt-grid__hour ${isBrk ? 'edt-grid__hour--break' : ''}`}>
                {bLabel ? <span className="edt-grid__pause-label">{bLabel}</span> : `${hour}h`}
              </div>
              {orderedDays.map((dayNum) => (
                <div
                  key={`${hour}-${dayNum}`}
                  className={`edt-grid__cell ${isBrk ? 'edt-grid__cell--break' : ''}`}
                >
                  {filteredSlots
                    .filter((s) => s.dayOfWeek === dayNum && s.startHour === hour)
                    .map((slot) => {
                      const heightPx = (slot.durationMinutes / 60) * HOUR_HEIGHT;
                      const topOffset = (slot.startMinute / 60) * HOUR_HEIGHT;
                      return (
                        <div
                          key={slot.id}
                          className="edt-slot"
                          style={{
                            height: `${heightPx}px`,
                            top: `${topOffset}px`,
                            borderLeftColor: slot.subjectColor,
                            backgroundColor: `${slot.subjectColor}26`,
                          }}
                          title={`${slot.subjectLabel} - ${slot.classLabel}${slot.room ? ` (${slot.room})` : ''}`}
                        >
                          <span className="edt-slot__subject" style={{ color: slot.subjectColor }}>{slot.subjectLabel}</span>
                          <span className="edt-slot__class">{slot.classLabel}</span>
                        </div>
                      );
                    })}
                </div>
              ))}
            </React.Fragment>
          );
          })}
        </div>
      </Card>

      <CreneauForm
        open={creneauFormOpen}
        onClose={() => setCreneauFormOpen(false)}
        onSave={async (data) => {
          if (!activeYear) {
            addToast('error', 'Aucune année scolaire active');
            return;
          }

          const dayRaw = Number.parseInt(data.day_of_week, 10);
          const subjectId = Number.parseInt(data.subject_id, 10);
          const classId = Number.parseInt(data.class_id, 10);
          if (!Number.isFinite(dayRaw) || dayRaw < 1 || dayRaw > 7 || !Number.isFinite(subjectId) || !Number.isFinite(classId)) {
            addToast('error', 'Impossible de créer le créneau: données invalides');
            return;
          }

          try {
            await timetableService.create({
              academic_year_id: activeYear.id,
              day_of_week: dayRaw as DayOfWeek,
              start_time: data.start_time,
              end_time: data.end_time,
              subject_id: subjectId,
              class_id: classId,
              room: data.room.trim() || null,
              recurrence: (data.recurrence as any) || 'all',
              color: null,
              notes: null,
            });

            const refreshed = await loadWeekSlots();
            setSlots(mapWeekSlotsToCourseSlots(refreshed));
            addToast('success', 'Créneau ajouté');
          } catch (error) {
            console.error('[EmploiDuTempsPage] Erreur création créneau:', error);
            addToast('error', 'Échec de création du créneau');
          }
        }}
      />

      {icsEvents && (
        <ICSMappingModal
          events={icsEvents}
          onClose={() => setIcsEvents(null)}
          onImported={() => {
            setIcsEvents(null);
            loadWeekSlots().then((data) => {
              setSlots(mapWeekSlotsToCourseSlots(data));
            });
          }}
        />
      )}

      <GoogleCalendarModal
        open={gcalOpen}
        onClose={() => setGcalOpen(false)}
        onImported={(result) => {
          addToast('success', `${result.imported} créneaux importés depuis Google Calendar`);
          void loadWeekSlots().then((data) => setSlots(mapWeekSlotsToCourseSlots(data)));
        }}
      />
    </div>
  );
};
