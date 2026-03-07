// ============================================================================
// ICSMappingModal — Map imported ICS events to subjects & classes
// Shown after parsing an ICS file, before importing into timetable
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Badge } from '../../components/ui';
import { subjectService, levelService, classService, icsImportService } from '../../services';
import { useApp } from '../../stores';
import type { Subject, Class } from '../../types';
import type { ID } from '../../types/common';
import './ICSMappingModal.css';

interface ICSEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  rrule?: string;
}

interface EventGroup {
  summary: string;
  count: number;
  sampleTime: string;
  location?: string;
  subjectId: ID | null;
  classId: ID | null;
}

interface Props {
  events: ICSEvent[];
  onClose: () => void;
  onImported: (result: { imported: number; skipped: number }) => void;
}

export const ICSMappingModal: React.FC<Props> = ({ events, onClose, onImported }) => {
  const { addToast } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [importing, setImporting] = useState(false);

  // Load subjects and classes
  useEffect(() => {
    subjectService.getAll().then(setSubjects).catch(() => setSubjects([]));
    classService.getAll().then(setClasses).catch(() => setClasses([]));
  }, []);

  // Group events by summary
  useEffect(() => {
    const map = new Map<string, { count: number; sample: ICSEvent }>();
    for (const evt of events) {
      const key = evt.summary.trim();
      if (!map.has(key)) {
        map.set(key, { count: 0, sample: evt });
      }
      map.get(key)!.count++;
    }

    const grouped: EventGroup[] = Array.from(map.entries()).map(([summary, data]) => {
      const s = data.sample;
      const time = s.dtstart
        ? `${s.dtstart.getHours()}h${String(s.dtstart.getMinutes()).padStart(2, '0')} — ${s.dtend.getHours()}h${String(s.dtend.getMinutes()).padStart(2, '0')}`
        : '';

      // Auto-detect from summary keywords
      let autoSubject: ID | null = null;
      let autoClass: ID | null = null;
      const lower = summary.toLowerCase();

      for (const sub of subjects) {
        if (lower.includes(sub.label.toLowerCase()) || lower.includes(sub.short_label?.toLowerCase() ?? '___')) {
          autoSubject = sub.id;
          break;
        }
      }
      for (const cls of classes) {
        if (lower.includes(cls.label?.toLowerCase() ?? '___')) {
          autoClass = cls.id;
          break;
        }
      }

      return {
        summary,
        count: data.count,
        sampleTime: time,
        location: s.location,
        subjectId: autoSubject,
        classId: autoClass,
      };
    });

    grouped.sort((a, b) => b.count - a.count);
    setGroups(grouped);
  }, [events, subjects, classes]);

  const mappedCount = groups.filter(g => g.subjectId && g.classId).length;
  const totalEvents = events.length;
  const mappedEvents = groups
    .filter(g => g.subjectId && g.classId)
    .reduce((sum, g) => sum + g.count, 0);

  const handleSubjectChange = (summary: string, subjectId: ID | null) => {
    setGroups(prev => prev.map(g =>
      g.summary === summary ? { ...g, subjectId } : g
    ));
  };

  const handleClassChange = (summary: string, classId: ID | null) => {
    setGroups(prev => prev.map(g =>
      g.summary === summary ? { ...g, classId } : g
    ));
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const mappings = new Map<string, { subjectId: ID; classId: ID }>();
      for (const g of groups) {
        if (g.subjectId && g.classId) {
          mappings.set(g.summary, { subjectId: g.subjectId, classId: g.classId });
        }
      }

      const result = await icsImportService.importToTimetable(events, 1, mappings);
      addToast('success', `${result.imported} créneaux importés, ${result.skipped} ignorés`);
      onImported(result);
    } catch (err: any) {
      addToast('error', `Erreur d'import : ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="ics-modal__overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="ics-modal">
        {/* Header */}
        <div className="ics-modal__header">
          <div>
            <h2 className="ics-modal__title">Mapper les événements ICS</h2>
            <span className="ics-modal__subtitle">
              {events.length} événements trouvés · {groups.length} créneaux uniques · {mappedEvents}/{totalEvents} mappés
            </span>
          </div>
          <button className="ics-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Table */}
        <div className="ics-modal__body">
          <table className="ics-modal__table">
            <thead>
              <tr>
                <th>Événement ICS</th>
                <th>Occurrences</th>
                <th>Horaire</th>
                <th>Salle</th>
                <th>Matière</th>
                <th>Classe</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.summary} className={g.subjectId && g.classId ? 'ics-modal__row--mapped' : ''}>
                  <td className="ics-modal__summary">{g.summary}</td>
                  <td className="ics-modal__count">{g.count}×</td>
                  <td className="ics-modal__time">{g.sampleTime}</td>
                  <td className="ics-modal__room">{g.location || '—'}</td>
                  <td>
                    <select
                      className="ics-modal__select"
                      value={g.subjectId ?? ''}
                      onChange={e => handleSubjectChange(g.summary, e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">—</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ics-modal__select"
                      value={g.classId ?? ''}
                      onChange={e => handleClassChange(g.summary, e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">—</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {g.subjectId && g.classId ? (
                      <Badge variant="status" status="finalized">✓ Prêt</Badge>
                    ) : (
                      <Badge variant="status" status="not_started">À mapper</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {groups.length === 0 && (
            <div className="ics-modal__empty">Aucun événement à mapper.</div>
          )}
        </div>

        {/* Footer */}
        <div className="ics-modal__footer">
          <span className="ics-modal__footer-info">
            {mappedCount}/{groups.length} créneaux mappés ({mappedEvents}/{totalEvents} événements)
          </span>
          <div className="ics-modal__footer-actions">
            <Button variant="secondary" size="S" onClick={onClose}>Annuler</Button>
            <Button
              variant="primary"
              size="S"
              onClick={handleImport}
              disabled={mappedCount === 0 || importing}
            >
              {importing ? '⏳ Import…' : `Importer ${mappedEvents} créneaux`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
