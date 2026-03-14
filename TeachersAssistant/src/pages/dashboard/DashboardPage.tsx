// ============================================================================
// DashboardPage — Tableau de bord quotidien (spec §5.1)
// Branché sur DataProvider (DB réelle ou mock)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, ProgressBar, Modal, StatusBadge } from '../../components/ui';
import { useData, useRouter, useApp } from '../../stores';
import type { DashboardIndicators, WeekSlot, CoverageItem, AlertItem, WeeklyPrepData, PrepTask } from '../../stores';
import { ASSIGNMENT_STATUS_META } from '../../constants/statuses';
import { calendarEventService } from '../../services';
import type { CalendarEvent } from '../../types/timetable';
import './DashboardPage.css';

// ── Helpers ──

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

function todayDow(): number {
  const d = new Date().getDay(); // 0=dim
  return d === 0 ? 7 : d; // 1=lun..5=ven
}

function groupByDay(slots: WeekSlot[]): Map<number, WeekSlot[]> {
  const map = new Map<number, WeekSlot[]>();
  for (let d = 1; d <= 5; d++) map.set(d, []);
  for (const s of slots) {
    const arr = map.get(s.dayOfWeek);
    if (arr) arr.push(s);
  }
  return map;
}

function todayDateLabel(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function weekLabel(): string {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  return `Semaine du ${mon.getDate()} ${mon.toLocaleDateString('fr-FR', { month: 'long' })}`;
}

// ── Composants internes ──

const IndicatorCard: React.FC<{
  icon: string; value: string; label: string; isAlert: boolean; onClick: () => void;
}> = ({ icon, value, label, isAlert, onClick }) => (
  <Card borderTopColor={isAlert ? 'var(--color-warn)' : 'var(--color-primary)'} onClick={onClick} className="dashboard-indicator">
    <span className="dashboard-indicator__icon">{icon}</span>
    <span className="dashboard-indicator__value">{value}</span>
    <span className="dashboard-indicator__label">{label}</span>
  </Card>
);

const MiniTimelineSlot: React.FC<{ slot: WeekSlot }> = ({ slot }) => (
  <div className="mini-slot" style={{ borderLeftColor: slot.subjectColor, backgroundColor: `${slot.subjectColor}2E` }}>
    <span className="mini-slot__subject" style={{ color: slot.subjectColor }}>{slot.subjectLabel}</span>
    <span className="mini-slot__time">{slot.startTime}–{slot.endTime}</span>
  </div>
);

const TodaySlot: React.FC<{ slot: WeekSlot }> = ({ slot }) => (
  <div className="today-slot" style={{ borderLeftColor: slot.subjectColor }}>
    <span className="today-slot__time">{slot.startTime}–{slot.endTime}</span>
    <span className="today-slot__subject">{slot.subjectLabel} — {slot.classLabel}</span>
    <Badge variant={slot.sessionReady ? 'success' : 'warn'}>
      {slot.sessionReady ? '✓ Séance prête' : 'À préparer'}
    </Badge>
  </div>
);

const AlertRow: React.FC<{ alert: AlertItem; onClick: () => void }> = ({ alert, onClick }) => (
  <button
    className={`dashboard-alert dashboard-alert--${alert.level}`}
    onClick={onClick}
    type="button"
    aria-label={alert.message}
  >
    <span className="dashboard-alert__icon">{alert.level === 'danger' ? '🔴' : '🟡'}</span>
    <span className="dashboard-alert__message">{alert.message}</span>
  </button>
);

// ── Copilote hebdo ──

function groupPrepByDay(tasks: PrepTask[]): Map<number, PrepTask[]> {
  const map = new Map<number, PrepTask[]>();
  for (let d = 1; d <= 5; d++) map.set(d, []);
  for (const t of tasks) {
    const arr = map.get(t.dayOfWeek);
    if (arr) arr.push(t);
  }
  return map;
}

const WeeklyPrepCopilot: React.FC<{
  data: WeeklyPrepData;
  onNavigate: (path: string) => void;
}> = ({ data, onNavigate }) => {
  const currentDow = todayDow();
  const dayTasks = groupPrepByDay(data.tasks);

  // Count slots needing prep (no session or session not ready/done)
  const needsPrep = data.tasks.filter(
    t => !t.sessionStatus || t.sessionStatus === 'planned'
  ).length;
  const ready = data.tasks.filter(t => t.sessionStatus === 'ready' || t.sessionStatus === 'done').length;

  return (
    <Card className="dashboard__copilot" noHover>
      <div className="copilot__header">
        <h3 className="dashboard__section-title">Copilote de la semaine</h3>
        <div className="copilot__summary">
          {ready > 0 && <Badge variant="success">{ready} prête{ready > 1 ? 's' : ''}</Badge>}
          {needsPrep > 0 && <Badge variant="warn">{needsPrep} à préparer</Badge>}
          {data.upcomingAssignments.length > 0 && (
            <Badge variant="info">{data.upcomingAssignments.length} devoir{data.upcomingAssignments.length > 1 ? 's' : ''}</Badge>
          )}
          {data.missingCahier > 0 && (
            <Badge variant="warn">{data.missingCahier} cahier manquant{data.missingCahier > 1 ? 's' : ''}</Badge>
          )}
        </div>
      </div>

      <div className="copilot__grid">
        {[1, 2, 3, 4, 5].map(dow => {
          const tasks = dayTasks.get(dow) ?? [];
          const isPast = dow < currentDow;
          const isToday = dow === currentDow;
          return (
            <div
              key={dow}
              className={`copilot__day ${isToday ? 'copilot__day--today' : ''} ${isPast ? 'copilot__day--past' : ''}`}
            >
              <span className="copilot__day-label">{DAYS[dow - 1]}</span>
              {tasks.length === 0 && <span className="copilot__empty">—</span>}
              {tasks.map((t, i) => {
                const status = t.sessionStatus;
                const isDone = status === 'done' || status === 'ready';
                return (
                  <div
                    key={i}
                    className={`copilot__task ${isDone ? 'copilot__task--done' : 'copilot__task--todo'}`}
                    style={{ borderLeftColor: t.subjectColor }}
                  >
                    <span className="copilot__task-time">{t.startTime}</span>
                    <span className="copilot__task-label">
                      {t.subjectLabel} — {t.classLabel}
                    </span>
                    {t.sessionTitle && (
                      <span className="copilot__task-session">{t.sessionTitle}</span>
                    )}
                    {!t.sessionTitle && !isDone && (
                      <span className="copilot__task-action">Aucune séance liée</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Devoirs de la semaine */}
      {data.upcomingAssignments.length > 0 && (
        <div className="copilot__assignments">
          <h4 className="copilot__sub-title">Devoirs de la semaine</h4>
          {data.upcomingAssignments.map((a, i) => (
            <button
              key={i}
              type="button"
              className="copilot__assignment"
              style={{ borderLeftColor: a.subjectColor }}
              onClick={() => onNavigate('/evaluation/devoirs')}
            >
              <span className="copilot__assignment-title">{a.title}</span>
              <span className="copilot__assignment-meta">{a.classLabel} — {a.dueDate}</span>
              <StatusBadge value={a.status} meta={ASSIGNMENT_STATUS_META} />
            </button>
          ))}
        </div>
      )}

      {/* Actions rapides */}
      <div className="copilot__actions">
        <Button variant="primary" size="S" onClick={() => onNavigate('/preparation/sequences')}>
          Préparer une séance
        </Button>
        {data.missingCahier > 0 && (
          <Button variant="secondary" size="S" onClick={() => onNavigate('/cahier-de-textes')}>
            Compléter le cahier ({data.missingCahier})
          </Button>
        )}
      </div>
    </Card>
  );
};

// ── Event type metadata ──

const EVENT_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  parent_meeting: { label: 'RDV parents', color: '#4A90D9', icon: '👨‍👩‍👧' },
  staff_meeting:  { label: 'Réunion', color: '#E67E22', icon: '👥' },
  council:        { label: 'Conseil', color: '#9B59B6', icon: '🏛' },
  exam:           { label: 'Examen', color: '#E74C3C', icon: '📝' },
  training:       { label: 'Formation', color: '#27AE60', icon: '🎓' },
  administrative: { label: 'Administratif', color: '#95A5A6', icon: '📋' },
  other:          { label: 'Autre', color: '#34495E', icon: '📌' },
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Aujourd'hui ${time}`;
  if (isTomorrow) return `Demain ${time}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${time}`;
}

// ── Page ──

export const DashboardPage: React.FC = () => {
  const { loadDashboard, loadWeekSlots, loadCoverage, loadAlerts, loadWeeklyPrep } = useData();
  const { activeYear } = useApp();

  const [indicators, setIndicators] = useState<DashboardIndicators | null>(null);
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [prepData, setPrepData] = useState<WeeklyPrepData | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [selectedDow, setSelectedDow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAllCoverage, setShowAllCoverage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadDashboard(), loadWeekSlots(), loadCoverage(), loadAlerts(), loadWeeklyPrep()])
      .then(([ind, slots, cov, al, prep]) => {
        if (cancelled) return;
        setIndicators(ind);
        setWeekSlots(slots);
        setCoverage(cov);
        setAlerts(al);
        setPrepData(prep);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadDashboard, loadWeekSlots, loadCoverage, loadAlerts, loadWeeklyPrep]);

  // Load upcoming events (next 14 days)
  useEffect(() => {
    if (!activeYear?.id) return;
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    calendarEventService.getByDateRange(
      activeYear.id, now.toISOString(), end.toISOString(),
    ).then(setUpcomingEvents).catch(() => {});
  }, [activeYear]);

  const dayMap = groupByDay(weekSlots);
  const currentDow = todayDow();
  const displayDow = selectedDow ?? currentDow;
  const todaySlots = dayMap.get(displayDow) ?? [];

  const { navigate: routerNav } = useRouter();

  const navigate = (path: string) => {
    const routeMap: Record<string, { tab: 'dashboard' | 'programme' | 'preparation' | 'planning' | 'cahier' | 'evaluation' | 'bibliotheque' | 'messagerie' | 'parametres'; page: string }> = {
      '/preparation/sequences': { tab: 'preparation', page: 'sequences' },
      '/planning/edt': { tab: 'planning', page: 'edt' },
      '/planning/agenda': { tab: 'planning', page: 'agenda' },
      '/programme/progression': { tab: 'programme', page: 'progression' },
      '/cahier-de-textes': { tab: 'cahier', page: 'all' },
      '/evaluation/devoirs': { tab: 'evaluation', page: 'devoirs' },
      '/preparation/bibliotheque': { tab: 'preparation', page: 'bibliotheque' },
      '/preparation/ia/generer': { tab: 'preparation', page: 'ia-generer' },
      '/messagerie': { tab: 'messagerie', page: 'inbox' },
    };
    const target = routeMap[path];
    if (target) routerNav(target);
  };

  if (loading) {
    return <div className="dashboard"><p style={{ padding: 40, color: 'var(--color-text-muted)' }}>Chargement…</p></div>;
  }

  const ind = indicators!;

  return (
    <div className="dashboard">
      {/* Indicateurs */}
      <section className="dashboard__indicators">
        <IndicatorCard icon="📚" value={String(ind.activeSequences)} label="Séquences en cours" isAlert={false} onClick={() => navigate('/preparation/sequences')} />
        <IndicatorCard icon="📅" value={String(ind.weekSessions)} label="Séances cette semaine" isAlert={false} onClick={() => navigate('/planning/edt')} />
        <IndicatorCard icon="⏱" value={`${ind.hoursCompleted}/${ind.hoursTarget}`} label="Heures réalisées" isAlert={false} onClick={() => navigate('/programme/progression')} />
        <IndicatorCard icon="📝" value={String(ind.cahierMissing)} label="Cahier à compléter" isAlert={ind.cahierMissing > 0} onClick={() => navigate('/cahier-de-textes')} />
        <IndicatorCard icon="✏️" value={String(ind.pendingCorrections)} label="Corrections en attente" isAlert={ind.pendingCorrections > 0} onClick={() => navigate('/evaluation/devoirs')} />
      </section>

      {/* Mini-timeline semaine */}
      <Card className="dashboard__timeline" noHover>
        <h3 className="dashboard__section-title">{weekLabel()}</h3>
        <div className="mini-timeline">
          {[1, 2, 3, 4, 5].map(dow => {
            const daySlots = dayMap.get(dow) ?? [];
            const dayDate = new Date();
            dayDate.setDate(dayDate.getDate() - (currentDow - dow));
            const label = `${DAYS[dow - 1]} ${dayDate.getDate()}`;
            return (
              <button
                key={dow}
                type="button"
                className={`mini-timeline__day ${dow === currentDow ? 'mini-timeline__day--today' : ''} ${selectedDow === dow ? 'mini-timeline__day--selected' : ''}`}
                onClick={() => setSelectedDow(dow === selectedDow ? null : dow)}
                aria-label={`${label} — ${daySlots.length} séance${daySlots.length !== 1 ? 's' : ''}`}
              >
                <span className="mini-timeline__header">{label}</span>
                <div className="mini-timeline__slots">
                  {daySlots.map(s => <MiniTimelineSlot key={s.id} slot={s} />)}
                  {daySlots.length === 0 && <span className="mini-timeline__empty">—</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Copilote préparation hebdo */}
      {prepData && <WeeklyPrepCopilot data={prepData} onNavigate={navigate} />}

      {/* Événements à venir (agenda) */}
      {upcomingEvents.length > 0 && (
        <Card className="dashboard__upcoming" noHover>
          <div className="upcoming__header">
            <h3 className="dashboard__section-title">📅 Événements à venir</h3>
            <Button variant="ghost" size="S" onClick={() => navigate('/planning/agenda')}>
              Voir l'agenda
            </Button>
          </div>
          <div className="upcoming__list">
            {upcomingEvents.slice(0, 5).map(evt => {
              const meta = EVENT_TYPE_META[evt.event_type] ?? EVENT_TYPE_META['other']!;
              return (
                <button
                  key={evt.id}
                  type="button"
                  className="upcoming__event"
                  style={{ borderLeftColor: meta.color }}
                  onClick={() => navigate('/planning/agenda')}
                >
                  <span className="upcoming__event-icon">{meta.icon}</span>
                  <div className="upcoming__event-info">
                    <span className="upcoming__event-title">{evt.title}</span>
                    <span className="upcoming__event-date">{formatEventDate(evt.start_datetime)}</span>
                  </div>
                  <Badge variant="info" style={{ backgroundColor: meta.color + '22', color: meta.color }}>
                    {meta.label}
                  </Badge>
                </button>
              );
            })}
          </div>
          {upcomingEvents.length > 5 && (
            <button
              className="dashboard__alerts-more"
              onClick={() => navigate('/planning/agenda')}
              type="button"
            >
              Voir les {upcomingEvents.length} événements
            </button>
          )}
        </Card>
      )}

      {/* Aujourd'hui + Alertes / Couverture */}
      <section className="dashboard__middle">
        <Card className="dashboard__today" noHover>
          <h3 className="dashboard__section-title">
            📅 {selectedDow ? `${DAYS[displayDow - 1]}` : todayDateLabel()}
          </h3>
          <div className="today-slots">
            {todaySlots.map(s => <TodaySlot key={s.id} slot={s} />)}
            {todaySlots.length === 0 && <p className="today-slots__empty">Aucun cours prévu</p>}
          </div>
          <div className="today-actions">
            <Button variant="primary" size="S" onClick={() => navigate('/preparation/sequences')}>+ Créer séance</Button>
            <Button variant="secondary" size="S" onClick={() => navigate('/cahier-de-textes')}>Cahier de textes</Button>
          </div>
        </Card>

        <div className="dashboard__right-col">
          <Card className="dashboard__alerts" noHover>
            <h3 className="dashboard__section-title">
              ⚠️ Alertes
              {alerts.length > 0 && <span className="dashboard__alerts-count">{alerts.length}</span>}
            </h3>
            <div className="alerts-list">
              {alerts.slice(0, 5).map(a => <AlertRow key={a.id} alert={a} onClick={() => navigate(a.navigateTo)} />)}
              {alerts.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Aucune alerte</p>}
            </div>
            {alerts.length > 5 && (
              <button
                className="dashboard__alerts-more"
                onClick={() => setShowAllAlerts(true)}
                type="button"
              >
                Voir les {alerts.length} alertes
              </button>
            )}
          </Card>

          {/* Modal toutes les alertes */}
          <Modal open={showAllAlerts} onClose={() => setShowAllAlerts(false)} title={`Toutes les alertes (${alerts.length})`}>
            <div className="alerts-list alerts-list--modal">
              {alerts.map(a => (
                <AlertRow key={a.id} alert={a} onClick={() => { navigate(a.navigateTo); setShowAllAlerts(false); }} />
              ))}
            </div>
          </Modal>

          <Card className="dashboard__coverage" noHover>
            <h3 className="dashboard__section-title">
              📊 Couverture programme
              {coverage.length > 0 && <span className="dashboard__coverage-count">{coverage.length}</span>}
            </h3>
            <div className="coverage-list">
              {coverage.slice(0, 5).map((item, i) => (
                <div key={i} className="coverage-item">
                  <div className="coverage-item__header">
                    <span className="coverage-item__label">{item.label}</span>
                    <span className="coverage-item__pct" style={{ color: item.color }}>{item.percentage}%</span>
                  </div>
                  <ProgressBar value={item.percentage} color={item.color} height={6} />
                </div>
              ))}
            </div>
            {coverage.length > 5 && (
              <button
                className="dashboard__alerts-more"
                onClick={() => setShowAllCoverage(true)}
                type="button"
              >
                Voir les {coverage.length} entrées
              </button>
            )}
          </Card>

          {/* Modal couverture complète */}
          <Modal open={showAllCoverage} onClose={() => setShowAllCoverage(false)} title={`Couverture programme (${coverage.length})`}>
            <div className="coverage-list coverage-list--modal">
              {coverage.map((item, i) => (
                <div key={i} className="coverage-item">
                  <div className="coverage-item__header">
                    <span className="coverage-item__label">{item.label}</span>
                    <span className="coverage-item__pct" style={{ color: item.color }}>{item.percentage}%</span>
                  </div>
                  <ProgressBar value={item.percentage} color={item.color} height={6} />
                </div>
              ))}
            </div>
          </Modal>
        </div>
      </section>

      {/* Accès rapides */}
      <section className="dashboard__quick-actions">
        <Button variant="primary" size="M" onClick={() => navigate('/preparation/sequences')}>Créer séance</Button>
        <Button variant="secondary" size="M" onClick={() => navigate('/preparation/ia/generer')}>Générer contenu IA</Button>
        <Button variant="secondary" size="M" onClick={() => navigate('/preparation/bibliotheque')}>Ajouter document</Button>
        <Button variant="secondary" size="M" onClick={() => navigate('/programme/progression')}>Voir progression</Button>
      </section>
    </div>
  );
};
