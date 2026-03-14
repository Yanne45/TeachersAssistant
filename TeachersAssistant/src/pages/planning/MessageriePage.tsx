// ============================================================================
// MessageriePage — Client mail intégré (consultation uniquement)
// Layout 3 colonnes : dossiers | liste messages | preview
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../components/ui';
import { emailAccountService, emailMessageService, emailAttachmentService } from '../../services/emailService';
import { gmailService } from '../../services/gmailService';
import type { EmailAccount, EmailMessage, EmailFolder, EmailAttachment } from '../../types/email';
import type { ID } from '../../types';
import './MessageriePage.css';

// ── Folder config ──

interface FolderDef {
  id: EmailFolder;
  label: string;
  icon: string;
}

const FOLDERS: FolderDef[] = [
  { id: 'INBOX',  label: 'Boîte de réception', icon: '📥' },
  { id: 'SENT',   label: 'Envoyés',            icon: '📤' },
  { id: 'DRAFTS', label: 'Brouillons',         icon: '📝' },
];

// ── Helpers ──

function formatEmailDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Component ──

export const MessageriePage: React.FC = () => {
  // State
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Connect form
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);

  // Messages
  const [folder, setFolder] = useState<EmailFolder>('INBOX');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  // Preview
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedMsg = messages.find(m => m.id === selectedId) ?? null;

  // ── Init: check for existing account ──

  useEffect(() => {
    (async () => {
      try {
        const accounts = await emailAccountService.getAll();
        if (accounts.length > 0) {
          setAccount(accounts[0] ?? null);
          const isConn = await gmailService.isConnected();
          setConnected(isConn);
          if (isConn) {
            // Pre-fill config from stored values
            const cfg = gmailService.loadConfig();
            setClientId(cfg.clientId);
            setClientSecret(cfg.clientSecret);
          }
        }
      } catch (err) {
        console.error('[Messagerie] Init error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load messages when folder or account changes ──

  const loadMessages = useCallback(async () => {
    if (!account) return;
    try {
      let msgs: EmailMessage[];
      if (searchQuery.trim()) {
        msgs = await emailMessageService.search(account.id, searchQuery.trim());
      } else {
        msgs = await emailMessageService.getByFolder(account.id, folder);
      }
      setMessages(msgs);
    } catch (err) {
      console.error('[Messagerie] Load messages error:', err);
    }
  }, [account, folder, searchQuery]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ── Load unread counts ──

  useEffect(() => {
    if (!account) return;
    (async () => {
      const counts: Record<string, number> = {};
      for (const f of FOLDERS) {
        counts[f.id] = await emailMessageService.countUnread(account.id, f.id);
      }
      setUnreadCounts(counts);
    })();
  }, [account, messages]);

  // ── Preview: load HTML body on demand ──

  useEffect(() => {
    if (!selectedMsg) {
      setPreviewHtml(null);
      setPreviewText(null);
      setAttachments([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingPreview(true);
      setPreviewHtml(null);
      setPreviewText(null);

      // Mark as read
      if (!selectedMsg.is_read) {
        await emailMessageService.markRead(selectedMsg.id);
        setMessages(prev => prev.map(m => m.id === selectedMsg.id ? { ...m, is_read: true } : m));
      }

      // Load attachments
      const atts = await emailAttachmentService.getByMessage(selectedMsg.id);
      if (!cancelled) setAttachments(atts);

      // Load HTML body from Gmail API
      try {
        if (connected && selectedMsg.external_id) {
          const html = await gmailService.getMessageHtml(selectedMsg.external_id);
          if (!cancelled) setPreviewHtml(html);
        } else if (selectedMsg.body_text) {
          if (!cancelled) setPreviewText(selectedMsg.body_text);
        }
      } catch (err) {
        console.error('[Messagerie] Preview error:', err);
        if (!cancelled && selectedMsg.body_text) {
          setPreviewText(selectedMsg.body_text);
        }
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId, connected]);

  // ── Write HTML to iframe ──

  useEffect(() => {
    if (!iframeRef.current || !previewHtml) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                 font-size: 14px; line-height: 1.5; color: #333; margin: 16px;
                 word-wrap: break-word; }
          img { max-width: 100%; height: auto; }
          a { color: #3db4c6; }
          table { max-width: 100% !important; }
        </style>
      </head><body>${previewHtml}</body></html>
    `);
    doc.close();
  }, [previewHtml]);

  // ── Connect handler ──

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setConnectError('Client ID et Client Secret requis');
      return;
    }
    setConnectError(null);

    try {
      await gmailService.connect(clientId.trim(), clientSecret.trim());

      // Get email address
      const profile = await gmailService.getProfile();

      // Create account in DB
      const id = await emailAccountService.create({
        label: 'Gmail',
        provider: 'gmail',
        email_address: profile.emailAddress,
      });

      const acc = await emailAccountService.getById(id);
      setAccount(acc);
      setConnected(true);

      // Auto-sync
      handleSync(id);
    } catch (err: any) {
      setConnectError(err.message || 'Erreur de connexion');
    }
  };

  // ── Sync handler ──

  const handleSync = async (accountIdOverride?: number) => {
    const accId = accountIdOverride ?? account?.id;
    if (!accId) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const result = await gmailService.sync(accId as ID);
      setSyncResult(`${result.synced} message(s) synchronisé(s)${result.errors ? `, ${result.errors} erreur(s)` : ''}`);
      await loadMessages();
    } catch (err: any) {
      setSyncResult(`Erreur : ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Disconnect handler ──

  const handleDisconnect = async () => {
    await gmailService.disconnect();
    if (account) {
      await emailAccountService.delete(account.id);
    }
    setAccount(null);
    setConnected(false);
    setMessages([]);
    setSelectedId(null);
  };

  // ── Download attachment ──

  const handleDownloadAttachment = async (att: EmailAttachment) => {
    if (!selectedMsg?.external_id) return;
    try {
      // We need the Gmail attachment ID — stored in the external system
      // For now, re-fetch the message to get attachment IDs
      const gmailMsg = await gmailService.getMessage(selectedMsg.external_id);
      const parts = flattenParts(gmailMsg.payload);
      const matchingPart = parts.find(p => p.filename === att.file_name && p.body?.attachmentId);

      if (!matchingPart?.body?.attachmentId) {
        console.error('Attachment ID not found');
        return;
      }

      const localPath = await gmailService.downloadAttachment(
        selectedMsg.external_id,
        matchingPart.body.attachmentId,
        att.file_name,
      );

      await emailAttachmentService.markDownloaded(att.id, localPath);
      setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, local_path: localPath } : a));
    } catch (err) {
      console.error('[Messagerie] Download attachment error:', err);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="messagerie">
        <div className="messagerie__header">
          <div className="messagerie__header-left">
            <h1 className="messagerie__title">Messagerie</h1>
          </div>
        </div>
        <div className="messagerie__connect">
          <div className="messagerie__spinner" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Not connected — show connect form
  if (!connected) {
    return (
      <div className="messagerie">
        <div className="messagerie__header">
          <div className="messagerie__header-left">
            <h1 className="messagerie__title">Messagerie</h1>
          </div>
        </div>
        <div className="messagerie__connect">
          <div className="messagerie__connect-icon">📧</div>
          <div className="messagerie__connect-title">Connecter votre messagerie Gmail</div>
          <div className="messagerie__connect-desc">
            Consultez vos emails professionnels directement dans l'application.
            Vous aurez besoin d'un Client ID et Client Secret Google (OAuth 2.0).
          </div>
          <div className="messagerie__connect-form">
            <input
              className="messagerie__connect-input"
              type="text"
              placeholder="Client ID Google"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            />
            <input
              className="messagerie__connect-input"
              type="password"
              placeholder="Client Secret"
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
            />
            {connectError && (
              <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{connectError}</p>
            )}
            <Button variant="primary" onClick={handleConnect}>
              Se connecter avec Google
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Connected — show mail client
  return (
    <div className="messagerie">
      {/* Header */}
      <div className="messagerie__header">
        <div className="messagerie__header-left">
          <h1 className="messagerie__title">Messagerie</h1>
          {account && (
            <span className="messagerie__account-badge">{account.email_address}</span>
          )}
        </div>
        <div className="messagerie__header-actions">
          <Button
            variant="ghost"
            size="S"
            onClick={() => handleSync()}
            disabled={syncing}
          >
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
          <Button variant="ghost" size="S" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>
      </div>

      {/* Sync bar */}
      {(syncing || syncResult) && (
        <div className="messagerie__sync-bar">
          {syncing && <span className="messagerie__spinner" />}
          {syncing ? 'Synchronisation en cours...' : syncResult}
        </div>
      )}

      {/* Folders sidebar */}
      <div className="messagerie__folders">
        <div className="messagerie__folder-section">Dossiers</div>
        {FOLDERS.map(f => (
          <button
            key={f.id}
            className={`messagerie__folder-item ${folder === f.id ? 'messagerie__folder-item--active' : ''}`}
            onClick={() => { setFolder(f.id); setSelectedId(null); setSearchQuery(''); }}
          >
            <span>
              <span className="messagerie__folder-icon">{f.icon}</span>
              {f.label}
            </span>
            {(unreadCounts[f.id] ?? 0) > 0 && (
              <span className="messagerie__folder-count">{unreadCounts[f.id]}</span>
            )}
          </button>
        ))}

        <div className="messagerie__folder-section" style={{ marginTop: 'var(--space-3)' }}>Actions</div>
        <button
          className="messagerie__folder-item"
          onClick={() => handleSync()}
          disabled={syncing}
        >
          <span>
            <span className="messagerie__folder-icon">🔄</span>
            Actualiser
          </span>
        </button>
      </div>

      {/* Message list */}
      <div className="messagerie__list">
        <div className="messagerie__search">
          <input
            className="messagerie__search-input"
            type="text"
            placeholder="Rechercher dans les messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="messagerie__msg-list">
          {messages.length === 0 ? (
            <div className="messagerie__empty">
              <div className="messagerie__empty-icon">📭</div>
              <span>{searchQuery ? 'Aucun résultat' : 'Aucun message'}</span>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id as number}
                className={[
                  'messagerie__msg-item',
                  selectedId === msg.id ? 'messagerie__msg-item--active' : '',
                  !msg.is_read ? 'messagerie__msg-item--unread' : '',
                ].join(' ')}
                onClick={() => setSelectedId(msg.id)}
              >
                <div className="messagerie__msg-row">
                  <span className="messagerie__msg-sender">
                    {msg.sender_name || msg.sender_email || '(inconnu)'}
                  </span>
                  <span className="messagerie__msg-date">{formatEmailDate(msg.date)}</span>
                </div>
                <div className="messagerie__msg-row">
                  <span className="messagerie__msg-subject">{msg.subject || '(sans objet)'}</span>
                  <span className="messagerie__msg-badges">
                    {msg.has_attachments && <span className="messagerie__msg-badge-attach">📎</span>}
                  </span>
                </div>
                {msg.body_text && (
                  <span className="messagerie__msg-snippet">
                    {msg.body_text.slice(0, 100)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview pane */}
      <div className="messagerie__preview">
        {!selectedMsg ? (
          <div className="messagerie__preview-empty">
            Sélectionnez un message pour le lire
          </div>
        ) : (
          <>
            <div className="messagerie__preview-header">
              <h2 className="messagerie__preview-subject">
                {selectedMsg.subject || '(sans objet)'}
              </h2>
              <div className="messagerie__preview-meta">
                <div>
                  <span className="messagerie__preview-from">
                    {selectedMsg.sender_name || selectedMsg.sender_email}
                  </span>
                  {selectedMsg.sender_name && selectedMsg.sender_email && (
                    <span style={{ marginLeft: 'var(--space-1)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      &lt;{selectedMsg.sender_email}&gt;
                    </span>
                  )}
                </div>
                <span className="messagerie__preview-date">{formatFullDate(selectedMsg.date)}</span>
              </div>
              {selectedMsg.recipients && selectedMsg.recipients !== '[]' && (
                <div className="messagerie__preview-to">
                  À : {parseRecipients(selectedMsg.recipients)}
                </div>
              )}
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="messagerie__attachments">
                {attachments.map(att => (
                  <div key={att.id as number} className="messagerie__attachment-chip">
                    <span className="messagerie__attachment-icon">📎</span>
                    <span>{att.file_name}</span>
                    {att.file_size && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                        ({(att.file_size / 1024).toFixed(0)} Ko)
                      </span>
                    )}
                    <span className="messagerie__attachment-actions">
                      {!att.local_path && (
                        <button
                          className="messagerie__attachment-btn"
                          onClick={() => handleDownloadAttachment(att)}
                          title="Télécharger"
                        >
                          ⬇
                        </button>
                      )}
                      {att.local_path && (
                        <span style={{ color: 'var(--color-success)', fontSize: 11 }}>✓</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="messagerie__preview-body">
              {loadingPreview ? (
                <div className="messagerie__empty">
                  <div className="messagerie__spinner" />
                  <span>Chargement du message...</span>
                </div>
              ) : previewHtml ? (
                <iframe
                  ref={iframeRef}
                  className="messagerie__body-iframe"
                  sandbox="allow-same-origin"
                  title="Email body"
                />
              ) : previewText ? (
                <div className="messagerie__body-text">{previewText}</div>
              ) : (
                <div className="messagerie__empty">
                  <span>Contenu indisponible</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Helpers ──

function parseRecipients(json: string): string {
  try {
    const list = JSON.parse(json) as { name: string | null; email: string }[];
    return list.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ');
  } catch {
    return json;
  }
}

interface GmailPart {
  mimeType: string;
  filename?: string;
  body?: { size: number; attachmentId?: string; data?: string };
  parts?: GmailPart[];
}

function flattenParts(part: GmailPart): GmailPart[] {
  const result: GmailPart[] = [part];
  if (part.parts) {
    for (const p of part.parts) {
      result.push(...flattenParts(p));
    }
  }
  return result;
}
