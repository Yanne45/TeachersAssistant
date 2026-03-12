// ============================================================================
// Teacher Assistant — Google Calendar Service
// OAuth 2.0 Desktop flow (loopback redirect) + Calendar API
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CONFIG_KEY = 'google_calendar_config';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  calendarId: string;
}

export interface GCalCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface GCalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end:   { dateTime?: string; date?: string };
  location?: string;
  recurrence?: string[];
}

/** ICS-compatible event shape (reuses ICSMappingModal contract) */
export interface ICSCompatEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  rrule?: string;
}

// ── Persistent config (non-sensitive, stored in localStorage) ────────────────

function loadConfig(): GoogleCalendarConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw
      ? (JSON.parse(raw) as GoogleCalendarConfig)
      : { clientId: '', clientSecret: '', calendarId: 'primary' };
  } catch {
    return { clientId: '', clientSecret: '', calendarId: 'primary' };
  }
}

function saveConfig(partial: Partial<GoogleCalendarConfig>): void {
  const current = loadConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...partial }));
}

// ── Refresh token (sensitive — keyring with localStorage fallback) ────────────

const KEYRING_SERVICE = 'teacher-assistant';
const KEYRING_KEY = 'google-refresh-token';

async function getRefreshToken(): Promise<string | null> {
  try {
    const token = await invoke<string>('plugin:keyring|get', {
      service: KEYRING_SERVICE,
      key: KEYRING_KEY,
    });
    return token || null;
  } catch {
    return localStorage.getItem(KEYRING_KEY);
  }
}

async function storeRefreshToken(token: string): Promise<void> {
  try {
    await invoke('plugin:keyring|set', {
      service: KEYRING_SERVICE,
      key: KEYRING_KEY,
      value: token,
    });
  } catch {
    localStorage.setItem(KEYRING_KEY, token);
  }
}

async function clearRefreshToken(): Promise<void> {
  try {
    await invoke('plugin:keyring|delete', {
      service: KEYRING_SERVICE,
      key: KEYRING_KEY,
    });
  } catch {
    /* ignore */
  }
  localStorage.removeItem(KEYRING_KEY);
}

// ── In-memory access token cache ─────────────────────────────────────────────

let _cachedToken: { token: string; expiresAt: number } | null = null;

// ── Service ──────────────────────────────────────────────────────────────────

export const googleCalendarService = {
  loadConfig,
  saveConfig,

  async isConnected(): Promise<boolean> {
    const token = await getRefreshToken();
    return !!token;
  },

  /**
   * Full OAuth Desktop flow:
   * 1. Start loopback HTTP server (Tauri command)
   * 2. Open Google OAuth consent URL in the system browser
   * 3. Wait for the redirect with the auth code
   * 4. Exchange code for access_token + refresh_token
   * 5. Persist refresh_token
   */
  async connect(clientId: string, clientSecret: string): Promise<void> {
    // Step 1: start loopback listener
    const port = await invoke<number>('oauth_init');
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    // Step 2 + 3: open browser AND wait for redirect in parallel
    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });

    const [, code] = await Promise.all([
      open(`${AUTH_URL}?${authParams.toString()}`),
      invoke<string>('oauth_wait'),
    ]);

    // Step 4: exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      throw new Error(`Échange de code échoué (${tokenRes.status}) : ${detail}`);
    }

    const data: any = await tokenRes.json();
    if (!data.refresh_token) {
      throw new Error(
        'Aucun refresh_token reçu. Révoquez l\'accès dans myaccount.google.com/permissions et réessayez.'
      );
    }

    // Step 5: persist
    await storeRefreshToken(data.refresh_token);
    saveConfig({ clientId, clientSecret });
    _cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
    };
  },

  /** Revoke and clear all stored credentials. */
  async disconnect(): Promise<void> {
    // Best-effort revocation (ignore errors)
    try {
      const token = await getRefreshToken();
      if (token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
        });
      }
    } catch { /* ignore */ }
    await clearRefreshToken();
    _cachedToken = null;
  },

  /** Return a valid access token, refreshing if needed. */
  async getAccessToken(): Promise<string> {
    if (_cachedToken && _cachedToken.expiresAt > Date.now()) {
      return _cachedToken.token;
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error('Non connecté à Google Calendar');

    const cfg = loadConfig();
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      throw new Error('Échec du rafraîchissement du token Google — reconnectez-vous.');
    }

    const data: any = await res.json();
    _cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
    };
    return data.access_token;
  },

  /** List the user's calendars. */
  async listCalendars(): Promise<GCalCalendar[]> {
    const token = await this.getAccessToken();
    const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Impossible de charger la liste des calendriers');
    const data: any = await res.json();
    return (data.items ?? []) as GCalCalendar[];
  },

  /** Fetch events from a calendar between two dates. */
  async listEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
  ): Promise<GCalEvent[]> {
    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '500',
    });
    const res = await fetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Impossible de charger les événements Google Calendar');
    const data: any = await res.json();
    return (data.items ?? []) as GCalEvent[];
  },

  /** Convert Google Calendar events to the ICS-compatible format used by ICSMappingModal. */
  toICSEvents(events: GCalEvent[]): ICSCompatEvent[] {
    const result: ICSCompatEvent[] = [];
    for (const e of events) {
      const startStr = e.start.dateTime ?? e.start.date;
      const endStr = e.end.dateTime ?? e.end.date;
      if (!startStr || !endStr || !e.summary) continue;
      const dtstart = new Date(startStr);
      const dtend = new Date(endStr);
      if (isNaN(dtstart.getTime()) || isNaN(dtend.getTime())) continue;
      result.push({
        uid: e.id,
        summary: e.summary,
        dtstart,
        dtend,
        location: e.location,
        rrule: e.recurrence?.[0],
      });
    }
    return result;
  },
};
