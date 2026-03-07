// ============================================================================
// DashboardPage — Tableau de bord quotidien (spec §5.1)
// Branché sur DataProvider (DB réelle ou mock)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, ProgressBar } from '../../components/ui';
import { useData, useRouter } from '../../stores';
import type { DashboardIndicators, WeekSlot, CoverageItem, AlertItem } from '../../stores';
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
  <div className={`dashboard-alert dashboard-alert--${alert.level}`} onClick={onClick} role="button" tabIndex={0}>
    <span className="dashboard-alert__icon">{alert.level === 'danger' ? '🔴' : '🟡'}</span>
    <span className="dashboard-alert__message">{alert.message}</span>
  </div>
);

// ── Page ──

export const DashboardPage: React.FC = () => {
  const { loadDashboard, loadWeekSlots, loadCoverage, loadAlerts } = useData();

  const [indicators, setIndicators] = useState<DashboardIndicators | null>(null);
  const [weekSlots, setWeekSlots] = useState<WeekSlot[]>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedDow, setSelectedDow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadDashboard(), loadWeekSlots(), loadCoverage(), loadAlerts()])
      .then(([ind, slots, cov, al]) => {
        if (cancelled) return;
        setIndicators(ind);
        setWeekSlots(slots);
        setCoverage(cov);
        setAlerts(al);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadDashboard, loadWeekSlots, loadCoverage, loadAlerts]);

  const dayMap = groupByDay(weekSlots);
  const currentDow = todayDow();
  const displayDow = selectedDow ?? currentDow;
  const todaySlots = dayMap.get(displayDow) ?? [];

  const { navigate: routerNav } = useRouter();

  const navigate = (path: string) => {
    // Parse path to Route
    const routeMap: Record<string, { tab: 'dashboard' | 'programme' | 'preparation' | 'planning' | 'cahier' | 'evaluation'; page: string }> = {
      '/preparation/sequences': { tab: 'preparation', page: 'sequences' },
      '/planning/edt': { tab: 'planning', page: 'edt' },
      '/programme/progression': { tab: 'programme', page: 'progression' },
      '/cahier-de-textes': { tab: 'cahier', page: 'all' },
      '/evaluation/devoirs': { tab: 'evaluation', page: 'devoirs' },
      '/preparation/bibliotheque': { tab: 'preparation', page: 'bibliotheque' },
      '/preparation/ia/generer': { tab: 'preparation', page: 'ia-generer' },
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
              <div
                key={dow}
                className={`mini-timeline__day ${dow === currentDow ? 'mini-timeline__day--today' : ''} ${selectedDow === dow ? 'mini-timeline__day--selected' : ''}`}
                onClick={() => setSelectedDow(dow === selectedDow ? null : dow)}
                role="button" tabIndex={0}
              >
                <span className="mini-timeline__header">{label}</span>
                <div className="mini-timeline__slots">
                  {daySlots.map(s => <MiniTimelineSlot key={s.id} slot={s} />)}
                  {daySlots.length === 0 && <span className="mini-timeline__empty">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

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
            <h3 className="dashboard__section-title">⚠️ Alertes</h3>
            <div className="alerts-list">
              {alerts.map(a => <AlertRow key={a.id} alert={a} onClick={() => navigate(a.navigateTo)} />)}
              {alerts.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Aucune alerte</p>}
            </div>
          </Card>

          <Card className="dashboard__coverage" noHover>
            <h3 className="dashboard__section-title">📊 Couverture programme</h3>
            <div className="coverage-list">
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
          </Card>
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
