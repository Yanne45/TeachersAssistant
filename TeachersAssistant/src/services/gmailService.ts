// ============================================================================
// Teacher Assistant — Gmail API Service
// Réutilise le flow OAuth de Google Calendar (même client_id/secret)
// Scope supplémentaire : gmail.readonly
// ============================================================================

import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { emailAccountService, emailMessageService, emailAttachmentService } from './emailService';
import { getCurrentPath } from './db';
import type { ID } from '../types';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API = 'https://www.googleapis.com/gmail/v1';

const CONFIG_KEY = 'gmail_config';
const KEYRING_SERVICE = 'teacher-assistant';
const KEYRING_KEY = 'gmail-refresh-token';

// ── Types ──

interface GmailConfig {
  clientId: string;
  clientSecret: string;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  mimeType: string;
  filename?: string;
  body?: { size: number; attachmentId?: string; data?: string };
  headers?: GmailMessageHeader[];
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: GmailMessagePart;
}

interface GmailListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// ── Config & Token helpers ──

function loadConfig(): GmailConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { clientId: '', clientSecret: '' };
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

function saveConfig(partial: Partial<GmailConfig>): void {
  const current = loadConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...partial }));
}

async function getRefreshToken(): Promise<string | null> {
  try {
    const token = await invoke<string>('plugin:keyring|get', {
      service: KEYRING_SERVICE, key: KEYRING_KEY,
    });
    return token || null;
  } catch {
    return localStorage.getItem(KEYRING_KEY);
  }
}

async function storeRefreshToken(token: string): Promise<void> {
  try {
    await invoke('plugin:keyring|set', {
      service: KEYRING_SERVICE, key: KEYRING_KEY, value: token,
    });
  } catch {
    localStorage.setItem(KEYRING_KEY, token);
  }
}

async function clearRefreshToken(): Promise<void> {
  try {
    await invoke('plugin:keyring|delete', { service: KEYRING_SERVICE, key: KEYRING_KEY });
  } catch { /* ignore */ }
  localStorage.removeItem(KEYRING_KEY);
}

// ── Access token cache ──

let _cachedToken: { token: string; expiresAt: number } | null = null;

// ── Helpers ──

function getHeader(headers: GmailMessageHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
  } catch {
    return atob(base64);
  }
}

function extractPlainText(payload: GmailMessagePart): string | null {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return null;
}

function extractAttachments(payload: GmailMessagePart): { fileName: string; mimeType: string; size: number }[] {
  const result: { fileName: string; mimeType: string; size: number }[] = [];
  if (payload.filename && payload.body?.attachmentId) {
    result.push({
      fileName: payload.filename,
      mimeType: payload.mimeType,
      size: payload.body.size,
    });
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      result.push(...extractAttachments(part));
    }
  }
  return result;
}

function labelToFolder(labelIds: string[]): string {
  if (labelIds.includes('SENT')) return 'SENT';
  if (labelIds.includes('DRAFT')) return 'DRAFTS';
  return 'INBOX';
}

// ── Service ──

export const gmailService = {
  loadConfig,
  saveConfig,

  async isConnected(): Promise<boolean> {
    const token = await getRefreshToken();
    return !!token;
  },

  async connect(clientId: string, clientSecret: string): Promise<void> {
    const port = await invoke<number>('oauth_init');
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
    });

    const [, code] = await Promise.all([
      open(`${AUTH_URL}?${authParams.toString()}`),
      invoke<string>('oauth_wait'),
    ]);

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
        "Aucun refresh_token reçu. Révoquez l'accès dans myaccount.google.com/permissions et réessayez."
      );
    }

    await storeRefreshToken(data.refresh_token);
    saveConfig({ clientId, clientSecret });
    _cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
    };
  },

  async disconnect(): Promise<void> {
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

  async getAccessToken(): Promise<string> {
    if (_cachedToken && _cachedToken.expiresAt > Date.now()) {
      return _cachedToken.token;
    }

    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error('Non connecté à Gmail');

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
      throw new Error('Échec du rafraîchissement du token Gmail — reconnectez-vous.');
    }

    const data: any = await res.json();
    _cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in ?? 3600) - 60) * 1000,
    };
    return data.access_token;
  },

  /** Fetch email profile (address). */
  async getProfile(): Promise<{ emailAddress: string }> {
    const token = await this.getAccessToken();
    const res = await fetch(`${GMAIL_API}/users/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Impossible de charger le profil Gmail');
    return res.json();
  },

  /** List message IDs from a Gmail label/folder. */
  async listMessageIds(
    labelId: string,
    maxResults = 50,
    pageToken?: string,
  ): Promise<GmailListResponse> {
    const token = await this.getAccessToken();
    const params = new URLSearchParams({
      labelIds: labelId,
      maxResults: String(maxResults),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `${GMAIL_API}/users/me/messages?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Impossible de lister les messages Gmail');
    return res.json();
  },

  /** Get a full message by ID. */
  async getMessage(messageId: string): Promise<GmailMessage> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Impossible de charger le message ${messageId}`);
    return res.json();
  },

  /** Get message body as HTML (for display in iframe). */
  async getMessageHtml(messageId: string): Promise<string> {
    const msg = await this.getMessage(messageId);
    const htmlPart = findHtmlPart(msg.payload);
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }
    // Fallback: wrap plain text
    const text = extractPlainText(msg.payload);
    return text
      ? `<pre style="font-family:sans-serif;white-space:pre-wrap;">${text.replace(/</g, '&lt;')}</pre>`
      : '<p style="color:#999;">Contenu indisponible</p>';
  },

  /** Download an attachment to the local documents/email_attachments/ folder. */
  async downloadAttachment(
    gmailMessageId: string,
    attachmentId: string,
    fileName: string,
  ): Promise<string> {
    const token = await this.getAccessToken();
    const res = await fetch(
      `${GMAIL_API}/users/me/messages/${gmailMessageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Impossible de télécharger la pièce jointe');
    const data: any = await res.json();

    const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const dbPath = getCurrentPath();
    if (!dbPath) throw new Error('Aucune base de données ouverte');

    const dbDir = dbPath.replace(/[/\\][^/\\]+$/, '');
    const attachDir = `${dbDir}/documents/email_attachments`;

    const { mkdir, exists, writeFile } = await import('@tauri-apps/plugin-fs');
    if (!(await exists(attachDir))) {
      await mkdir(attachDir, { recursive: true });
    }

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = `${attachDir}/${safeName}`;
    await writeFile(destPath, bytes);

    return destPath;
  },

  /**
   * Synchronise les messages Gmail vers la base locale.
   * Récupère les N derniers messages de chaque dossier configuré.
   */
  async sync(accountId: ID, maxPerFolder = 50): Promise<{ synced: number; errors: number }> {
    const folderMap: Record<string, string> = {
      INBOX: 'INBOX',
      SENT: 'SENT',
      DRAFTS: 'DRAFT', // Gmail label name
    };

    let synced = 0;
    let errors = 0;

    for (const [folder, labelId] of Object.entries(folderMap)) {
      try {
        const list = await this.listMessageIds(labelId, maxPerFolder);
        if (!list.messages) continue;

        for (const stub of list.messages) {
          try {
            // Skip if already synced
            const existing = await emailMessageService.getByExternalId(accountId, stub.id);
            if (existing) continue;

            const msg = await this.getMessage(stub.id);
            const headers = msg.payload.headers;
            const subject = getHeader(headers, 'Subject');
            const from = getHeader(headers, 'From');
            const to = getHeader(headers, 'To');
            const date = getHeader(headers, 'Date');

            // Parse sender
            const fromMatch = from?.match(/^(.+?)\s*<(.+?)>$/);
            const senderName = fromMatch?.[1] ? fromMatch[1].replace(/^"|"$/g, '').trim() : null;
            const senderEmail = fromMatch?.[2] ?? from;

            // Parse recipients
            const recipients: { name: string | null; email: string }[] = [];
            if (to) {
              for (const part of to.split(',')) {
                const rMatch = part.trim().match(/^(.+?)\s*<(.+?)>$/);
                if (rMatch?.[1] && rMatch[2]) {
                  recipients.push({ name: rMatch[1].replace(/^"|"$/g, '').trim(), email: rMatch[2] });
                } else {
                  recipients.push({ name: null, email: part.trim() });
                }
              }
            }

            const bodyText = extractPlainText(msg.payload);
            const attachments = extractAttachments(msg.payload);
            const isRead = !msg.labelIds.includes('UNREAD');
            const msgFolder = labelToFolder(msg.labelIds);

            const msgId = await emailMessageService.upsert(accountId, {
              external_id: stub.id,
              thread_id: stub.threadId,
              folder: msgFolder,
              subject,
              sender_name: senderName,
              sender_email: senderEmail ?? null,
              recipients: JSON.stringify(recipients),
              date: date ? new Date(date).toISOString() : new Date(Number(msg.internalDate)).toISOString(),
              body_text: bodyText ? bodyText.slice(0, 10000) : null, // limit stored text
              is_read: isRead,
              has_attachments: attachments.length > 0,
              labels: JSON.stringify(msg.labelIds),
            });

            // Register attachments (metadata only, not downloaded)
            for (const att of attachments) {
              await emailAttachmentService.create({
                message_id: msgId,
                file_name: att.fileName,
                mime_type: att.mimeType,
                file_size: att.size,
              });
            }

            synced++;
          } catch (err) {
            console.error(`[Gmail] Erreur message ${stub.id}:`, err);
            errors++;
          }
        }
      } catch (err) {
        console.error(`[Gmail] Erreur sync dossier ${folder}:`, err);
        errors++;
      }
    }

    await emailAccountService.updateLastSync(accountId);
    return { synced, errors };
  },
};

// ── Internal helpers ──

function findHtmlPart(part: GmailMessagePart): GmailMessagePart | null {
  if (part.mimeType === 'text/html' && part.body?.data) return part;
  if (part.parts) {
    for (const p of part.parts) {
      const found = findHtmlPart(p);
      if (found) return found;
    }
  }
  return null;
}
