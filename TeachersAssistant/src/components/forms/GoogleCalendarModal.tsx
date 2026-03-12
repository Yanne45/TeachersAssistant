// ============================================================================
// GoogleCalendarModal — OAuth connection + event import from Google Calendar
// Reuses ICSMappingModal for the subject/class mapping step.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge } from '../../components/ui';
import { googleCalendarService } from '../../services';
import type { GoogleCalendarConfig, GCalCalendar } from '../../services/googleCalendarService';
import { ICSMappingModal } from './ICSMappingModal';
import { useApp } from '../../stores';
import './GoogleCalendarModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (result: { imported: number; skipped: number }) => void;
}

type Step = 'setup' | 'connecting' | 'connected' | 'syncing';

type TimeRange = 'week' | 'month' | 'trimester' | 'year';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week:      '7 jours',
  month:     '30 jours',
  trimester: 'Trimestre (90j)',
  year:      'Année scolaire',
};

function buildTimeRange(range: TimeRange): { timeMin: Date; timeMax: Date } {
  const now = new Date();
  switch (range) {
    case 'week':
      return { timeMin: now, timeMax: new Date(now.getTime() + 7 * 86_400_000) };
    case 'month':
      return { timeMin: now, timeMax: new Date(now.getTime() + 30 * 86_400_000) };
    case 'trimester':
      return { timeMin: now, timeMax: new Date(now.getTime() + 90 * 86_400_000) };
    case 'year': {
      const y = now.getFullYear();
      const sep = now.getMonth() >= 8 ? y : y - 1;
      return { timeMin: new Date(sep, 8, 1), timeMax: new Date(sep + 1, 6, 30) };
    }
  }
}

export const GoogleCalendarModal: React.FC<Props> = ({ open, onClose, onImported }) => {
  const { addToast } = useApp();

  const [config, setConfig] = useState<GoogleCalendarConfig>({
    clientId: '', clientSecret: '', calendarId: 'primary',
  });
  const [step, setStep] = useState<Step>('setup');
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState<GCalCalendar[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [icsEvents, setIcsEvents] = useState<any[] | null>(null);

  // Load config and connection state when modal opens
  useEffect(() => {
    if (!open) return;
    const cfg = googleCalendarService.loadConfig();
    setConfig(cfg);
    void googleCalendarService.isConnected().then((connected) => {
      setIsConnected(connected);
      setStep(connected ? 'connected' : 'setup');
      if (connected) {
        void googleCalendarService
          .listCalendars()
          .then(setCalendars)
          .catch(() => setCalendars([]));
      }
    });
  }, [open]);

  const handleConnect = useCallback(async () => {
    if (!config.clientId.trim() || !config.clientSecret.trim()) {
      addToast('warn', 'Client ID et Client Secret requis');
      return;
    }
    setStep('connecting');
    try {
      await googleCalendarService.connect(config.clientId.trim(), config.clientSecret.trim());
      setIsConnected(true);
      setStep('connected');
      addToast('success', 'Google Calendar connecté avec succès');

      const cals = await googleCalendarService.listCalendars();
      setCalendars(cals);
      const primary = cals.find((c) => c.primary) ?? cals[0];
      if (primary) setConfig((prev) => ({ ...prev, calendarId: primary.id }));
    } catch (err: any) {
      addToast('error', `Connexion échouée : ${err.message ?? String(err)}`);
      setStep('setup');
    }
  }, [config.clientId, config.clientSecret, addToast]);

  const handleDisconnect = useCallback(async () => {
    await googleCalendarService.disconnect();
    setIsConnected(false);
    setCalendars([]);
    setStep('setup');
    addToast('info', 'Déconnecté de Google Calendar');
  }, [addToast]);

  const handleSync = useCallback(async () => {
    setStep('syncing');
    try {
      const { timeMin, timeMax } = buildTimeRange(timeRange);
      const events = await googleCalendarService.listEvents(config.calendarId, timeMin, timeMax);
      const ics = googleCalendarService.toICSEvents(events);
      if (ics.length === 0) {
        addToast('warn', 'Aucun événement trouvé sur cette période');
        setStep('connected');
        return;
      }
      googleCalendarService.saveConfig({ calendarId: config.calendarId });
      setIcsEvents(ics);
      setStep('connected');
    } catch (err: any) {
      addToast('error', `Synchronisation échouée : ${err.message ?? String(err)}`);
      setStep('connected');
    }
  }, [config.calendarId, timeRange, addToast]);

  if (!open) return null;

  // Hand off to ICSMappingModal once events are fetched
  if (icsEvents) {
    return (
      <ICSMappingModal
        events={icsEvents}
        onClose={() => setIcsEvents(null)}
        onImported={(result) => {
          setIcsEvents(null);
          onImported(result);
          onClose();
        }}
      />
    );
  }

  const busy = step === 'connecting' || step === 'syncing';

  return (
    <div
      className="gcal-modal__overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="gcal-modal">
        {/* Header */}
        <div className="gcal-modal__header">
          <div className="gcal-modal__header-left">
            <span className="gcal-modal__icon">📅</span>
            <div>
              <h2 className="gcal-modal__title">Google Calendar</h2>
              <span className="gcal-modal__subtitle">Import d'événements vers l'emploi du temps</span>
            </div>
          </div>
          <button className="gcal-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="gcal-modal__body">
          {/* Connection status */}
          <div className="gcal-modal__status-row">
            {isConnected ? (
              <Badge variant="status" status="finalized">Connecté à Google Calendar</Badge>
            ) : (
              <Badge variant="status" status="not_started">Non connecté</Badge>
            )}
          </div>

          {/* ── Setup panel ─────────────────────────────────────────── */}
          {!isConnected && (
            <div className="gcal-modal__section">
              <h3 className="gcal-modal__section-title">Configuration OAuth</h3>
              <p className="gcal-modal__hint">
                Créez un projet Google Cloud, activez l'API Calendar, puis créez des identifiants
                OAuth de type <strong>Application de bureau</strong>.
              </p>

              <div className="gcal-modal__field">
                <label className="gcal-modal__label">Client ID</label>
                <input
                  className="gcal-modal__input"
                  type="text"
                  placeholder="123456789-xxx.apps.googleusercontent.com"
                  value={config.clientId}
                  onChange={(e) => setConfig((prev) => ({ ...prev, clientId: e.target.value }))}
                  disabled={busy}
                  autoComplete="off"
                />
              </div>

              <div className="gcal-modal__field">
                <label className="gcal-modal__label">Client Secret</label>
                <input
                  className="gcal-modal__input"
                  type="password"
                  placeholder="GOCSPX-…"
                  value={config.clientSecret}
                  onChange={(e) => setConfig((prev) => ({ ...prev, clientSecret: e.target.value }))}
                  disabled={busy}
                  autoComplete="off"
                />
              </div>

              <Button
                variant="primary"
                size="M"
                onClick={() => void handleConnect()}
                disabled={busy || !config.clientId.trim() || !config.clientSecret.trim()}
              >
                {step === 'connecting' ? '⏳ Connexion en cours…' : '🔐 Connecter avec Google'}
              </Button>

              {step === 'connecting' && (
                <p className="gcal-modal__connecting-hint">
                  Une fenêtre s'est ouverte dans votre navigateur.
                  Autorisez l'accès et revenez ici automatiquement.
                </p>
              )}
            </div>
          )}

          {/* ── Connected panel ──────────────────────────────────────── */}
          {isConnected && (
            <div className="gcal-modal__section">
              <h3 className="gcal-modal__section-title">Importer des événements</h3>

              {calendars.length > 0 && (
                <div className="gcal-modal__field">
                  <label className="gcal-modal__label">Calendrier source</label>
                  <select
                    className="gcal-modal__select"
                    value={config.calendarId}
                    onChange={(e) => setConfig((prev) => ({ ...prev, calendarId: e.target.value }))}
                    disabled={busy}
                  >
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.primary ? `⭐ ${c.summary} (principal)` : c.summary}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="gcal-modal__field">
                <label className="gcal-modal__label">Période à importer</label>
                <div className="gcal-modal__range-grid">
                  {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
                    <button
                      key={r}
                      className={`gcal-modal__range-btn${timeRange === r ? ' gcal-modal__range-btn--active' : ''}`}
                      onClick={() => setTimeRange(r)}
                      disabled={busy}
                    >
                      {TIME_RANGE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gcal-modal__actions-row">
                <Button
                  variant="primary"
                  size="M"
                  onClick={() => void handleSync()}
                  disabled={busy}
                >
                  {step === 'syncing' ? '⏳ Récupération…' : '🔄 Synchroniser'}
                </Button>
                <Button variant="secondary" size="S" onClick={() => void handleDisconnect()} disabled={busy}>
                  Déconnecter
                </Button>
              </div>
            </div>
          )}

          {/* ── Help ─────────────────────────────────────────────────── */}
          <details className="gcal-modal__help">
            <summary className="gcal-modal__help-summary">Comment configurer ?</summary>
            <ol className="gcal-modal__help-steps">
              <li>Ouvrez <strong>console.cloud.google.com</strong></li>
              <li>Créez ou sélectionnez un projet</li>
              <li>Activez l'<strong>API Google Calendar</strong></li>
              <li>Allez dans <strong>Identifiants → Créer → OAuth 2.0</strong></li>
              <li>Type d'application : <strong>Application de bureau</strong></li>
              <li>Téléchargez le JSON — copiez le <strong>client_id</strong> et <strong>client_secret</strong></li>
              <li>Ajoutez <code>http://127.0.0.1</code> aux origines JavaScript autorisées (optionnel)</li>
            </ol>
          </details>
        </div>

        <div className="gcal-modal__footer">
          <Button variant="secondary" size="S" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
};
