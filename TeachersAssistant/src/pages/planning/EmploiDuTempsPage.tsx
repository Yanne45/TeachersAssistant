import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, SegmentedControl } from '../../components/ui';
import { useApp, useData, useRouter } from '../../stores';
import { CreneauForm, ICSMappingModal } from '../../components/forms';
import { icsImportService, timetableService } from '../../services';
import type { DayOfWeek } from '../../types';
import './EmploiDuTempsPage.css';

interface CourseSlot {
  id: number;
  dayIndex: number;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  room?: string;
  recurrence: 'all' | 'q1' | 'q2';
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const HOUR_HEIGHT = 36;
const BREAK_START = 12;
const BREAK_END = 13;

const RECURRENCE_SEGMENTS = [
  { id: 'all', label: 'Toutes' },
  { id: 'q1', label: 'Q1' },
  { id: 'q2', label: 'Q2' },
];

const MOCK_SLOTS: CourseSlot[] = [
  { id: 1, dayIndex: 0, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', room: 'A102', recurrence: 'all' },
  { id: 2, dayIndex: 0, startHour: 14, startMinute: 0, durationMinutes: 60, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 4', recurrence: 'all' },
  { id: 3, dayIndex: 1, startHour: 10, startMinute: 0, durationMinutes: 120, subjectLabel: 'Geo', subjectColor: '#27774E', classLabel: '1ère 3', recurrence: 'all' },
  { id: 4, dayIndex: 3, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', recurrence: 'all' },
  { id: 5, dayIndex: 3, startHour: 10, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 4', recurrence: 'q1' },
  { id: 6, dayIndex: 3, startHour: 14, startMinute: 0, durationMinutes: 120, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 2', recurrence: 'all' },
  { id: 7, dayIndex: 4, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'Geo', subjectColor: '#27774E', classLabel: '1ère 3', recurrence: 'all' },
];

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

function mapWeekSlotsToCourseSlots(data: any[]): CourseSlot[] {
  return data.map((s: any, i: number) => ({
    id: i + 1,
    dayIndex: (s.dayOfWeek ?? s.day_of_week ?? 1) - 1,
    startHour: Number.parseInt(s.startTime ?? s.start_time ?? '8', 10),
    startMinute: 0,
    durationMinutes: calcDuration(s.startTime ?? s.start_time, s.endTime ?? s.end_time),
    subjectLabel: s.subjectLabel ?? s.subject_short_label ?? 'Matière',
    subjectColor: s.subjectColor ?? s.subject_color ?? '#888',
    classLabel: s.classLabel ?? s.class_short_name ?? 'Classe',
    room: s.room ?? undefined,
    recurrence: (s.recurrence ?? 'all') as 'all' | 'q1' | 'q2',
  }));
}

export const EmploiDuTempsPage: React.FC = () => {
  const { activeYear, addToast } = useApp();
  const { route, navigate } = useRouter();
  const { loadWeekSlots } = useData();

  const [recurrence, setRecurrence] = useState('all');
  const [slots, setSlots] = useState(MOCK_SLOTS);
  const [creneauFormOpen, setCreneauFormOpen] = useState(false);
  const [icsEvents, setIcsEvents] = useState<any[] | null>(null);
  const autoImportTriggered = useRef(false);

  useEffect(() => {
    loadWeekSlots().then((data) => {
      if (data.length > 0) {
        setSlots(mapWeekSlotsToCourseSlots(data));
      }
    });
  }, [loadWeekSlots]);

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

  return (
    <div className="edt-page">
      <div className="edt-page__toolbar">
        <h1 className="edt-page__title">Emploi du temps</h1>
        <div className="edt-page__actions">
          <SegmentedControl segments={RECURRENCE_SEGMENTS} activeId={recurrence} onChange={setRecurrence} />
          <Button variant="secondary" size="S" onClick={handleImportICS}>Importer ICS</Button>
          <Button
            variant="secondary"
            size="S"
            onClick={() => {
              addToast('info', 'Google Calendar non configuré dans cette version');
              navigate({ tab: 'planning', page: 'calendrier' });
            }}
          >
            Google Calendar
          </Button>
          <Button variant="primary" size="S" onClick={() => setCreneauFormOpen(true)}>+ Nouveau créneau</Button>
        </div>
      </div>

      <Card noHover className="edt-grid-wrapper">
        <div className="edt-grid">
          <div className="edt-grid__corner" />
          {DAYS.map((d) => (
            <div key={d} className="edt-grid__day-header">{d}</div>
          ))}

          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className={`edt-grid__hour ${hour === BREAK_START ? 'edt-grid__hour--break' : ''}`}>
                {hour === BREAK_START ? <span className="edt-grid__pause-label">Pause</span> : `${hour}h`}
              </div>
              {DAYS.map((_, dayIdx) => (
                <div
                  key={`${hour}-${dayIdx}`}
                  className={`edt-grid__cell ${hour >= BREAK_START && hour < BREAK_END ? 'edt-grid__cell--break' : ''}`}
                >
                  {filteredSlots
                    .filter((s) => s.dayIndex === dayIdx && s.startHour === hour)
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
          ))}
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
              recurrence: data.recurrence === 'q1' || data.recurrence === 'q2' ? data.recurrence : 'all',
              color: null,
              notes: null,
            });

            const refreshed = await loadWeekSlots();
            if (refreshed.length > 0) {
              setSlots(mapWeekSlotsToCourseSlots(refreshed));
            }
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
              if (data.length > 0) {
                setSlots(mapWeekSlotsToCourseSlots(data));
              }
            });
          }}
        />
      )}
    </div>
  );
};
