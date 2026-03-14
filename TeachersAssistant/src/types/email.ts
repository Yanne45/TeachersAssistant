// ============================================================================
// Teacher Assistant — Types : Messagerie (consultation email)
// Tables : email_accounts, email_messages, email_attachments
// ============================================================================

import type { ID, ISODateTime } from './common';

// ── Comptes email ──

export type EmailProvider = 'gmail' | 'outlook' | 'imap';

export interface EmailAccount {
  id: ID;
  label: string;
  provider: EmailProvider;
  email_address: string;
  config: string;             // JSON (host, port, use_ssl for IMAP)
  last_sync_at: ISODateTime | null;
  sync_folders: string;       // JSON array of folder names
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── Messages ──

export type EmailFolder = 'INBOX' | 'SENT' | 'DRAFTS' | string;

export interface EmailRecipient {
  name: string | null;
  email: string;
}

export interface EmailMessage {
  id: ID;
  account_id: ID;
  external_id: string;
  thread_id: string | null;
  folder: EmailFolder;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  recipients: string;          // JSON array of EmailRecipient
  date: ISODateTime;
  body_text: string | null;    // plain text (for AI search)
  is_read: boolean;
  has_attachments: boolean;
  labels: string | null;       // JSON array of strings
  linked_calendar_event_id: ID | null;
  created_at: ISODateTime;
}

/** Parsed version for display */
export interface EmailMessageDisplay extends EmailMessage {
  parsed_recipients: EmailRecipient[];
  parsed_labels: string[];
  attachment_count: number;
}

// ── Pièces jointes ──

export interface EmailAttachment {
  id: ID;
  message_id: ID;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  local_path: string | null;     // relative path if downloaded
  document_id: ID | null;        // link to documents table if saved
  created_at: ISODateTime;
}
