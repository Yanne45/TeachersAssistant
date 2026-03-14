// ============================================================================
// Teacher Assistant — Email Service (DB layer)
// CRUD pour email_accounts, email_messages, email_attachments
// ============================================================================

import { db } from './db';
import type { ID } from '../types';
import type {
  EmailAccount,
  EmailMessage,
  EmailAttachment,
  EmailFolder,
} from '../types/email';

// ── Comptes ──

export const emailAccountService = {
  async getAll(): Promise<EmailAccount[]> {
    return db.select<EmailAccount[]>(
      'SELECT * FROM email_accounts WHERE is_active = 1 ORDER BY label'
    );
  },

  async getById(id: ID): Promise<EmailAccount | null> {
    return db.selectOne<EmailAccount>(
      'SELECT * FROM email_accounts WHERE id = ?', [id]
    );
  },

  async create(data: {
    label: string;
    provider: string;
    email_address: string;
    config?: string;
    sync_folders?: string;
  }): Promise<number> {
    return db.insert(
      `INSERT INTO email_accounts (label, provider, email_address, config, sync_folders)
       VALUES (?, ?, ?, ?, ?)`,
      [data.label, data.provider, data.email_address, data.config ?? '{}', data.sync_folders ?? '["INBOX","SENT","DRAFTS"]']
    );
  },

  async update(id: ID, data: Partial<Pick<EmailAccount, 'label' | 'sync_folders' | 'is_active'>>): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.label !== undefined) { sets.push('label = ?'); params.push(data.label); }
    if (data.sync_folders !== undefined) { sets.push('sync_folders = ?'); params.push(data.sync_folders); }
    if (data.is_active !== undefined) { sets.push('is_active = ?'); params.push(data.is_active ? 1 : 0); }
    if (sets.length === 0) return;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    await db.execute(`UPDATE email_accounts SET ${sets.join(', ')} WHERE id = ?`, params);
  },

  async updateLastSync(id: ID): Promise<void> {
    await db.execute(
      "UPDATE email_accounts SET last_sync_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  },

  async delete(id: ID): Promise<void> {
    await db.execute('DELETE FROM email_accounts WHERE id = ?', [id]);
  },
};

// ── Messages ──

export const emailMessageService = {
  async getByFolder(accountId: ID, folder: EmailFolder, limit = 50, offset = 0): Promise<EmailMessage[]> {
    return db.select<EmailMessage[]>(
      `SELECT * FROM email_messages
       WHERE account_id = ? AND folder = ?
       ORDER BY date DESC
       LIMIT ? OFFSET ?`,
      [accountId, folder, limit, offset]
    );
  },

  async getById(id: ID): Promise<EmailMessage | null> {
    return db.selectOne<EmailMessage>(
      'SELECT * FROM email_messages WHERE id = ?', [id]
    );
  },

  async getByExternalId(accountId: ID, externalId: string): Promise<EmailMessage | null> {
    return db.selectOne<EmailMessage>(
      'SELECT * FROM email_messages WHERE account_id = ? AND external_id = ?',
      [accountId, externalId]
    );
  },

  async search(accountId: ID, query: string, limit = 50): Promise<EmailMessage[]> {
    const pattern = `%${query}%`;
    return db.select<EmailMessage[]>(
      `SELECT * FROM email_messages
       WHERE account_id = ? AND (subject LIKE ? OR sender_name LIKE ? OR sender_email LIKE ? OR body_text LIKE ?)
       ORDER BY date DESC
       LIMIT ?`,
      [accountId, pattern, pattern, pattern, pattern, limit]
    );
  },

  async countByFolder(accountId: ID, folder: EmailFolder): Promise<number> {
    const row = await db.selectOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM email_messages WHERE account_id = ? AND folder = ?',
      [accountId, folder]
    );
    return row?.cnt ?? 0;
  },

  async countUnread(accountId: ID, folder: EmailFolder): Promise<number> {
    const row = await db.selectOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM email_messages WHERE account_id = ? AND folder = ? AND is_read = 0',
      [accountId, folder]
    );
    return row?.cnt ?? 0;
  },

  async upsert(accountId: ID, data: {
    external_id: string;
    thread_id?: string | null;
    folder: string;
    subject?: string | null;
    sender_name?: string | null;
    sender_email?: string | null;
    recipients?: string;
    date: string;
    body_text?: string | null;
    is_read?: boolean;
    has_attachments?: boolean;
    labels?: string | null;
  }): Promise<number> {
    // Try update first
    const existing = await this.getByExternalId(accountId, data.external_id);
    if (existing) {
      await db.execute(
        `UPDATE email_messages SET
           folder = ?, subject = ?, sender_name = ?, sender_email = ?,
           recipients = ?, body_text = ?, is_read = ?, has_attachments = ?, labels = ?
         WHERE id = ?`,
        [
          data.folder, data.subject ?? null, data.sender_name ?? null, data.sender_email ?? null,
          data.recipients ?? '[]', data.body_text ?? null,
          data.is_read ? 1 : 0, data.has_attachments ? 1 : 0, data.labels ?? null,
          existing.id,
        ]
      );
      return existing.id as number;
    }

    return db.insert(
      `INSERT INTO email_messages
         (account_id, external_id, thread_id, folder, subject, sender_name, sender_email, recipients, date, body_text, is_read, has_attachments, labels)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId, data.external_id, data.thread_id ?? null, data.folder,
        data.subject ?? null, data.sender_name ?? null, data.sender_email ?? null,
        data.recipients ?? '[]', data.date, data.body_text ?? null,
        data.is_read ? 1 : 0, data.has_attachments ? 1 : 0, data.labels ?? null,
      ]
    );
  },

  async markRead(id: ID): Promise<void> {
    await db.execute('UPDATE email_messages SET is_read = 1 WHERE id = ?', [id]);
  },

  async linkToCalendarEvent(id: ID, calendarEventId: ID): Promise<void> {
    await db.execute(
      'UPDATE email_messages SET linked_calendar_event_id = ? WHERE id = ?',
      [calendarEventId, id]
    );
  },

  async deleteByAccount(accountId: ID): Promise<void> {
    await db.execute('DELETE FROM email_messages WHERE account_id = ?', [accountId]);
  },
};

// ── Pièces jointes ──

export const emailAttachmentService = {
  async getByMessage(messageId: ID): Promise<EmailAttachment[]> {
    return db.select<EmailAttachment[]>(
      'SELECT * FROM email_attachments WHERE message_id = ? ORDER BY file_name',
      [messageId]
    );
  },

  async create(data: {
    message_id: ID;
    file_name: string;
    mime_type?: string | null;
    file_size?: number | null;
  }): Promise<number> {
    return db.insert(
      `INSERT INTO email_attachments (message_id, file_name, mime_type, file_size)
       VALUES (?, ?, ?, ?)`,
      [data.message_id, data.file_name, data.mime_type ?? null, data.file_size ?? null]
    );
  },

  async markDownloaded(id: ID, localPath: string): Promise<void> {
    await db.execute(
      'UPDATE email_attachments SET local_path = ? WHERE id = ?',
      [localPath, id]
    );
  },

  async linkToDocument(id: ID, documentId: ID): Promise<void> {
    await db.execute(
      'UPDATE email_attachments SET document_id = ? WHERE id = ?',
      [documentId, id]
    );
  },
};
