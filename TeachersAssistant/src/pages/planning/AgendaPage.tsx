// ============================================================================
// Teacher Assistant — Agenda Page
// Vue hebdomadaire des événements du calendrier
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, format, addDays,
  parseISO, isToday,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button, EmptyState } from '../../components/ui';
import { AgendaEventForm } from '../../components/forms/AgendaEventForm';
import type { EventFormData } from '../../components/forms/AgendaEventForm';
import { useApp } from '../../stores';
import { calendarEventService } from '../../services/timetableService';
import type { CalendarEvent, CalendarEventType } from '../../types';
import './AgendaPage.css';

// ── Event type metadata ──

const EVENT_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  parent_meeting: { label: 'RDV parents', color: '#4A90D9', icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67' },
  staff_meeting:  { label: 'R\u00e9union', color: '#E67E22', icon: '\uD83D\uDC65' },
  council:        { label: 'Conseil de classe', color: '#9B59B6', icon: '\uD83C\uDFDB' },
  exam:           { label: 'Examen', color: '#E74C3C', icon: '\uD83D\uDCDD' },
  training:       { label: 'Formation', color: '#27AE60', icon: '\uD83C\uDF93' },
  administrative: { label: 'Administratif', color: '#95A5A6', icon: '\uD83D\uDCCB' },
  other:          { label: 'Autre', color: '#34495E', icon: '\uD83D\uDCCC' },
};

// ── Constants ──

const HOUR_START = 7;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const CELL_HEIGHT = 48; // px per hour

// ── Helpers ──

function eventToPosition(event: CalendarEvent, _weekStart: Date) {
  const start = parseISO(event.start_datetime);
  const end = parseISO(event.end_datetime);

  // Day column (0-6, Mon-Sun)
  const dayIndex = (start.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

  // Time position
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - HOUR_START) * CELL_HEIGHT;
  const height = Math.max((endHour - startHour) * CELL_HEIGHT, 20);

  return { dayIndex, top, height, startHour, endHour };
}

function formatTimeRange(event: CalendarEvent): string {
  const start = parseISO(event.start_datetime);
  const end = parseISO(event.end_datetime);
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
}

// ── Component ──

export const AgendaPage: React.FC = () => {
  const { activeYear, addToast } = useApp();

  // Week state
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  // Events
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [, setLoading] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | undefined>();
  const [formInitialTime, setFormInitialTime] = useState<string | undefined>();

  // Week days array
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // ── Load events ──

  const loadEvents = useCallback(async () => {
    if (!activeYear) return;
    setLoading(true);
    try {
      const startStr = format(currentWeekStart, "yyyy-MM-dd'T'00:00:00");
      const endStr = format(addDays(weekEnd, 1), "yyyy-MM-dd'T'00:00:00");
      const data = await calendarEventService.getByDateRange(activeYear.id, startStr, endStr);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load agenda events:', err);
      addToast('error', 'Erreur lors du chargement des \u00e9v\u00e9nements');
    } finally {
      setLoading(false);
    }
  }, [activeYear, currentWeekStart, weekEnd, addToast]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── Navigation ──

  const goToPrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd', { locale: fr });
    const end = format(weekEnd, 'd MMMM yyyy', { locale: fr });
    return `${start} - ${end}`;
  }, [currentWeekStart, weekEnd]);

  // ── Interactions ──

  const handleCellClick = (dayIndex: number, hour: number) => {
    const day = weekDays[dayIndex] ?? new Date();
    setEditingEvent(null);
    setFormInitialDate(format(day, 'yyyy-MM-dd'));
    setFormInitialTime(`${String(hour).padStart(2, '0')}:00`);
    setFormOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setFormInitialDate(undefined);
    setFormInitialTime(undefined);
    setFormOpen(true);
  };

  const handleSave = async (data: EventFormData) => {
    if (!activeYear) return;

    const start_datetime = `${data.date}T${data.startTime}:00`;
    const end_datetime = `${data.date}T${data.endTime}:00`;

    try {
      if (editingEvent) {
        await calendarEventService.update(editingEvent.id, {
          title: data.title,
          description: data.description || null,
          start_datetime,
          end_datetime,
          location: data.location || null,
          event_type: data.event_type,
        });
        addToast('success', '\u00c9v\u00e9nement modifi\u00e9');
      } else {
        await calendarEventService.create({
          academic_year_id: activeYear.id,
          title: data.title,
          description: data.description || null,
          start_datetime,
          end_datetime,
          location: data.location || null,
          event_type: data.event_type,
        });
        addToast('success', '\u00c9v\u00e9nement cr\u00e9\u00e9');
      }
      await loadEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
      addToast('error', 'Erreur lors de l\u2019enregistrement');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    try {
      await calendarEventService.delete(editingEvent.id);
      addToast('success', '\u00c9v\u00e9nement supprim\u00e9');
      setFormOpen(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
      addToast('error', 'Erreur lors de la suppression');
      throw err;
    }
  };

  // ── Build initial data for edit form ──

  const formInitialData = useMemo(() => {
    if (!editingEvent) return undefined;
    const start = parseISO(editingEvent.start_datetime);
    const end = parseISO(editingEvent.end_datetime);
    return {
      title: editingEvent.title,
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      event_type: (editingEvent.event_type ?? 'other') as CalendarEventType,
      location: editingEvent.location ?? '',
      description: editingEvent.description ?? '',
    };
  }, [editingEvent]);

  // ── Group events by day ──

  const eventsByDay = useMemo(() => {
    const map: Map<number, { event: CalendarEvent; top: number; height: number }[]> = new Map();
    for (let i = 0; i < 7; i++) map.set(i, []);

    for (const evt of events) {
      const { dayIndex, top, height } = eventToPosition(evt, currentWeekStart);
      if (dayIndex >= 0 && dayIndex < 7) {
        map.get(dayIndex)!.push({ event: evt, top, height });
      }
    }
    return map;
  }, [events, currentWeekStart]);

  // ── No active year ──

  if (!activeYear) {
    return (
      <div className="agenda-page">
        <EmptyState
          icon="📅"
          title="Aucune ann\u00e9e active"
          description="S\u00e9lectionnez une ann\u00e9e scolaire pour afficher l\u2019agenda."
        />
      </div>
    );
  }

  return (
    <div className="agenda-page">
      {/* Header */}
      <div className="agenda-page__header">
        <h1 className="agenda-page__title">Agenda</h1>
        <Button variant="primary" size="M" onClick={() => {
          setEditingEvent(null);
          setFormInitialDate(format(new Date(), 'yyyy-MM-dd'));
          setFormInitialTime(undefined);
          setFormOpen(true);
        }}>
          + Nouvel \u00e9v\u00e9nement
        </Button>
      </div>

      {/* Week navigation */}
      <div className="agenda-page__week-nav">
        <button onClick={goToPrevWeek} aria-label="Semaine pr\u00e9c\u00e9dente">&larr;</button>
        <button onClick={goToToday}>Aujourd&apos;hui</button>
        <button onClick={goToNextWeek} aria-label="Semaine suivante">&rarr;</button>
        <span className="agenda-page__week-label">{weekLabel}</span>
      </div>

      {/* Legend */}
      <div className="agenda-page__legend">
        {Object.entries(EVENT_TYPE_META).map(([key, meta]) => (
          <span key={key} className="agenda-page__legend-item">
            <span className="agenda-page__legend-dot" style={{ backgroundColor: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="agenda-page__grid-wrapper">
        <div className="agenda-page__grid">
          {/* Corner */}
          <div className="agenda-page__corner" />

          {/* Day headers */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`agenda-page__day-header${isToday(day) ? ' agenda-page__day-header--today' : ''}`}
              onClick={() => handleCellClick(i, HOUR_START)}
            >
              <span className="agenda-page__day-name">{DAY_LABELS[i]}</span>
              <span className="agenda-page__day-date">{format(day, 'd MMM', { locale: fr })}</span>
            </div>
          ))}

          {/* Time rows */}
          {HOURS.map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="agenda-page__time-label">
                {hour}h
              </div>

              {/* Day cells for this hour */}
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div
                  key={`${hour}-${dayIndex}`}
                  className="agenda-page__cell"
                  onClick={() => handleCellClick(dayIndex, hour)}
                >
                  {/* Render events that start in this hour's cell (only in first row they appear) */}
                  {hour === HOUR_START && eventsByDay.get(dayIndex)?.map(({ event: evt, top, height }) => (
                    <div
                      key={evt.id}
                      className={`agenda-page__event agenda-page__event--${evt.event_type ?? 'other'}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      onClick={(e) => handleEventClick(evt, e)}
                      title={`${evt.title}\n${formatTimeRange(evt)}${evt.location ? `\n${evt.location}` : ''}`}
                    >
                      <span className="agenda-page__event-title">{evt.title}</span>
                      {height >= 30 && (
                        <span className="agenda-page__event-time">{formatTimeRange(evt)}</span>
                      )}
                      {height >= 44 && evt.location && (
                        <span className="agenda-page__event-location">{evt.location}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Event form modal */}
      <AgendaEventForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingEvent(null); }}
        onSave={handleSave}
        onDelete={editingEvent ? handleDelete : undefined}
        initialData={formInitialData}
        initialDate={formInitialDate}
        initialTime={formInitialTime}
      />
    </div>
  );
};
