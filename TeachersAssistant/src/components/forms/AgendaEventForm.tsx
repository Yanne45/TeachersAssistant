// ============================================================================
// Teacher Assistant — Formulaire d'événement Agenda
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { CalendarEventType } from '../../types';

const EVENT_TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'parent_meeting', label: 'RDV parents' },
  { value: 'staff_meeting', label: 'R\u00e9union' },
  { value: 'council', label: 'Conseil de classe' },
  { value: 'exam', label: 'Examen' },
  { value: 'training', label: 'Formation' },
  { value: 'administrative', label: 'Administratif' },
  { value: 'other', label: 'Autre' },
];

export interface EventFormData {
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  event_type: CalendarEventType;
  location: string;
  description: string;
}

export interface AgendaEventFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: Partial<EventFormData>;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
}

export const AgendaEventForm: React.FC<AgendaEventFormProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
  initialDate,
  initialTime,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [eventType, setEventType] = useState<CalendarEventType>('other');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form on open/data change
  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? '');
      setDate(initialData?.date ?? initialDate ?? '');
      setStartTime(initialData?.startTime ?? initialTime ?? '08:00');
      setEndTime(initialData?.endTime ?? (initialTime ? `${String(Number(initialTime.split(':')[0]) + 1).padStart(2, '0')}:${initialTime.split(':')[1]}` : '09:00'));
      setEventType(initialData?.event_type ?? 'other');
      setLocation(initialData?.location ?? '');
      setDescription(initialData?.description ?? '');
      setSaving(false);
      setDeleting(false);
    }
  }, [open, initialData, initialDate, initialTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || !endTime) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), date, startTime, endTime, event_type: eventType, location, description });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const isEdit = !!initialData?.title;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifier l\u2019\u00e9v\u00e9nement' : 'Nouvel \u00e9v\u00e9nement'}
      footer={
        <div style={{ display: 'flex', justifyContent: onDelete ? 'space-between' : 'flex-end', width: '100%' }}>
          {onDelete && (
            <Button variant="danger" size="M" onClick={handleDelete} disabled={saving || deleting}>
              {deleting ? '\u2026' : 'Supprimer'}
            </Button>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="ghost" size="M" onClick={onClose} disabled={saving || deleting}>
              Annuler
            </Button>
            <Button variant="primary" size="M" onClick={handleSubmit} disabled={saving || deleting || !title.trim() || !date}>
              {saving ? '\u2026' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="agenda-event-form">
        <div className="agenda-event-form__field">
          <label htmlFor="aef-title">Titre *</label>
          <input
            id="aef-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex : R\u00e9union parents T2"
            required
            autoFocus
          />
        </div>

        <div className="agenda-event-form__row">
          <div className="agenda-event-form__field">
            <label htmlFor="aef-date">Date *</label>
            <input
              id="aef-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="agenda-event-form__field">
            <label htmlFor="aef-start">D\u00e9but *</label>
            <input
              id="aef-start"
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="agenda-event-form__field">
            <label htmlFor="aef-end">Fin *</label>
            <input
              id="aef-end"
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="agenda-event-form__row">
          <div className="agenda-event-form__field">
            <label htmlFor="aef-type">Type</label>
            <select
              id="aef-type"
              value={eventType}
              onChange={e => setEventType(e.target.value as CalendarEventType)}
            >
              {EVENT_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="agenda-event-form__field">
            <label htmlFor="aef-location">Lieu</label>
            <input
              id="aef-location"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Salle, b\u00e2timent\u2026"
            />
          </div>
        </div>

        <div className="agenda-event-form__field">
          <label htmlFor="aef-desc">Notes</label>
          <textarea
            id="aef-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Informations compl\u00e9mentaires\u2026"
          />
        </div>
      </form>
    </Modal>
  );
};
