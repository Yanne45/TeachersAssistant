-- Migration 029: Email consultation tables (messagerie)

-- Comptes email synchronisés
CREATE TABLE IF NOT EXISTS email_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('gmail', 'outlook', 'imap')),
  email_address TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  last_sync_at TEXT,
  sync_folders TEXT DEFAULT '["INBOX","SENT","DRAFTS"]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Messages synchronisés (body_html chargé à la demande via API)
CREATE TABLE IF NOT EXISTS email_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  thread_id TEXT,
  folder TEXT DEFAULT 'INBOX',
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT,
  recipients TEXT DEFAULT '[]',
  date TEXT NOT NULL,
  body_text TEXT,
  is_read INTEGER DEFAULT 0,
  has_attachments INTEGER DEFAULT 0,
  labels TEXT,
  linked_calendar_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(account_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_email_messages_account_folder ON email_messages(account_id, folder);
CREATE INDEX IF NOT EXISTS idx_email_messages_date ON email_messages(date DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);

-- Pièces jointes (téléchargées à la demande)
CREATE TABLE IF NOT EXISTS email_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  local_path TEXT,
  document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON email_attachments(message_id);
