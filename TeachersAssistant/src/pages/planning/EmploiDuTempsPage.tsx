import React, { useState, useEffect } from 'react';
import { Card, Button, SegmentedControl } from '../../components/ui';
import { useData } from '../../stores';
import { CreneauForm, ICSMappingModal } from '../../components/forms';
import './EmploiDuTempsPage.css';

// ── Types ──

interface CourseSlot {
  id: number;
  dayIndex: number;       // 0=Lun, 4=Ven
  startHour: number;      // ex: 8
  startMinute: number;    // ex: 0
  durationMinutes: number;
  subjectLabel: string;
  subjectColor: string;
  classLabel: string;
  room?: string;
  recurrence: 'all' | 'q1' | 'q2';
}

// ── Constants ──

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const HOUR_HEIGHT = 36; // px par heure
const BREAK_START = 12;
const BREAK_END = 13;

const RECURRENCE_SEGMENTS = [
  { id: 'all', label: 'Toutes' },
  { id: 'q1', label: 'Q1' },
  { id: 'q2', label: 'Q2' },
];

// ── Mock data ──

const MOCK_SLOTS: CourseSlot[] = [
  { id: 1, dayIndex: 0, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', room: 'A102', recurrence: 'all' },
  { id: 2, dayIndex: 0, startHour: 14, startMinute: 0, durationMinutes: 60, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 4', recurrence: 'all' },
  { id: 3, dayIndex: 1, startHour: 10, startMinute: 0, durationMinutes: 120, subjectLabel: 'Géo', subjectColor: '#27774E', classLabel: '1ère 3', recurrence: 'all' },
  { id: 4, dayIndex: 3, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 2', recurrence: 'all' },
  { id: 5, dayIndex: 3, startHour: 10, startMinute: 0, durationMinutes: 120, subjectLabel: 'HGGSP', subjectColor: '#7B3FA0', classLabel: 'Tle 4', recurrence: 'q1' },
  { id: 6, dayIndex: 3, startHour: 14, startMinute: 0, durationMinutes: 120, subjectLabel: 'Histoire', subjectColor: '#2C3E7B', classLabel: 'Tle 2', recurrence: 'all' },
  { id: 7, dayIndex: 4, startHour: 8, startMinute: 0, durationMinutes: 120, subjectLabel: 'Géo', subjectColor: '#27774E', classLabel: '1ère 3', recurrence: 'all' },
];

// ── Composant ──

// Duration helper
function calcDuration(start?: string, end?: string): number {
  if (!start || !end) return 120;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export const EmploiDuTempsPage: React.FC = () => {
  const { loadWeekSlots, isDbMode } = useData();
  const [recurrence, setRecurrence] = useState('all');
  const [slots, setSlots] = useState(MOCK_SLOTS);
  const [creneauFormOpen, setCreneauFormOpen] = useState(false);
  const [icsEvents, setIcsEvents] = useState<any[] | null>(null);

  useEffect(() => {
    loadWeekSlots().then(data => {
      if (data.length > 0) {
        setSlots(data.map((s: any, i: number) => ({
          id: i + 1,
          dayIndex: (s.dayOfWeek ?? s.day_of_week ?? 1) - 1,
          startHour: parseInt(s.startTime ?? s.start_time ?? '8'),
          startMinute: 0,
          durationMinutes: calcDuration(s.startTime ?? s.start_time, s.endTime ?? s.end_time),
          subjectLabel: s.subjectLabel ?? s.subject_short_label ?? 'Matière',
          subjectColor: s.subjectColor ?? s.subject_color ?? '#888',
          classLabel: s.classLabel ?? s.class_short_name ?? 'Classe',
          room: s.room ?? undefined,
          recurrence: (s.recurrence ?? 'all') as 'all' | 'q1' | 'q2',
        })));
      }
    });
  }, [loadWeekSlots]);

  const filteredSlots = slots.filter(
    s => recurrence === 'all' || s.recurrence === 'all' || s.recurrence === recurrence
  );

  return (
    <div className="edt-page">
      {/* Barre supérieure */}
      <div className="edt-page__toolbar">
        <h1 className="edt-page__title">Emploi du temps</h1>
        <div className="edt-page__actions">
          <SegmentedControl
            segments={RECURRENCE_SEGMENTS}
            activeId={recurrence}
            onChange={setRecurrence}
          />
          <Button variant="secondary" size="S" onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file'; input.accept = '.ics';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const text = await file.text();
              const { icsImportService } = await import('../../services');
              const events = icsImportService.parse(text);
              if (events.length > 0) {
                setIcsEvents(events);
              } else {
                alert('Aucun événement trouvé dans le fichier ICS');
              }
            };
            input.click();
          }}>Importer ICS</Button>
          <Button variant="secondary" size="S">Google Calendar</Button>
        </div>
      </div>

      {/* Grille EDT */}
      <Card noHover className="edt-grid-wrapper">
        <div className="edt-grid">
          {/* Header vide (coin) */}
          <div className="edt-grid__corner" />
          {/* Headers jours */}
          {DAYS.map(d => (
            <div key={d} className="edt-grid__day-header">{d}</div>
          ))}

          {/* Lignes horaires */}
          {HOURS.map(hour => (
            <React.Fragment key={hour}>
              {/* Colonne heure */}
              <div className={`edt-grid__hour ${hour === BREAK_START ? 'edt-grid__hour--break' : ''}`}>
                {hour === BREAK_START ? (
                  <span className="edt-grid__pause-label">Pause</span>
                ) : (
                  `${hour}h`
                )}
              </div>
              {/* Cellules par jour */}
              {DAYS.map((_, dayIdx) => (
                <div
                  key={`${hour}-${dayIdx}`}
                  className={`edt-grid__cell ${hour >= BREAK_START && hour < BREAK_END ? 'edt-grid__cell--break' : ''}`}
                >
                  {/* Créneaux positionnés */}
                  {filteredSlots
                    .filter(s => s.dayIndex === dayIdx && s.startHour === hour)
                    .map(slot => {
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
                            backgroundColor: `${slot.subjectColor}26`, // ~15%
                          }}
                          title={`${slot.subjectLabel} — ${slot.classLabel}${slot.room ? ` (${slot.room})` : ''}`}
                        >
                          <span className="edt-slot__subject" style={{ color: slot.subjectColor }}>
                            {slot.subjectLabel}
                          </span>
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

      <CreneauForm open={creneauFormOpen} onClose={() => setCreneauFormOpen(false)} onSave={(data) => { console.log('Save créneau:', data); setCreneauFormOpen(false); }} />

      {/* ICS Mapping Modal */}
      {icsEvents && (
        <ICSMappingModal
          events={icsEvents}
          onClose={() => setIcsEvents(null)}
          onImported={(result) => {
            setIcsEvents(null);
            // Reload slots after import
            loadWeekSlots().then(data => {
              if (data.length > 0) {
                setSlots(data.map((s: any, i: number) => ({
                  id: i + 1,
                  dayIndex: (s.dayOfWeek ?? s.day_of_week ?? 1) - 1,
                  startHour: parseInt(s.startTime ?? s.start_time ?? '8'),
                  startMinute: 0,
                  durationMinutes: calcDuration(s.startTime ?? s.start_time, s.endTime ?? s.end_time),
                  subjectLabel: s.subjectLabel ?? s.subject_short_label ?? 'Matière',
                  subjectColor: s.subjectColor ?? s.subject_color ?? '#888',
                  classLabel: s.classLabel ?? s.class_short_name ?? 'Classe',
                  room: s.room ?? undefined,
                  recurrence: (s.recurrence ?? 'all') as 'all' | 'q1' | 'q2',
                })));
              }
            });
          }}
        />
      )}
    </div>
  );
};
