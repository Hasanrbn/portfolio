import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Storage for contact messages.
 *
 * The memory, file and PostgreSQL stores expose the same two methods, so the route does
 * not change with the storage:
 *
 *   create({ name, email, subject, message, ipHash }) -> { id, createdAt }
 *   list()                                           -> records, newest first
 *
 * A record mirrors the planned `messages` table: id, name, email, subject,
 * message (body), status, ipHash, createdAt.
 */

const DEFAULT_MEMORY_CAPACITY = 1000;
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

function buildRecord({ name, email, subject, message, ipHash = null }) {
  return {
    id: randomUUID(),
    name,
    email,
    subject,
    message,
    status: 'new',
    ipHash,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Keeps messages in memory only. Used by tests (no files touched). Messages
 * are lost when the process ends, and the oldest are dropped once `capacity`
 * is reached so a flood cannot exhaust memory.
 */
export function createMemoryContactStore({ capacity = DEFAULT_MEMORY_CAPACITY } = {}) {
  const records = [];

  return {
    persistent: false,

    async create(input) {
      const record = buildRecord(input);
      records.push(record);
      if (records.length > capacity) {
        records.shift();
      }
      return { id: record.id, createdAt: record.createdAt };
    },

    /** Returns copies so callers cannot change what is stored. */
    async list() {
      return records.map((record) => ({ ...record })).reverse();
    },
  };
}

/**
 * Appends each message as one JSON line to a local file (JSON Lines), so
 * messages survive a restart while the database does not exist yet.
 *
 * - The file holds personal data (emails), so it is created readable by the
 *   server's user only, and the default location is git-ignored.
 * - Once the file reaches `maxBytes`, new messages are refused with an error
 *   (the visitor sees the generic failure) instead of filling the disk.
 * - Meant for local development. A hosted server's disk is often temporary,
 *   which is why Phase 12 moves messages into PostgreSQL.
 */
export function createFileContactStore({ filePath, maxBytes = DEFAULT_MAX_FILE_BYTES }) {
  async function currentSize() {
    try {
      return (await stat(filePath)).size;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  return {
    persistent: true,

    async create(input) {
      if ((await currentSize()) >= maxBytes) {
        throw new Error('Contact message file is full');
      }

      const record = buildRecord(input);
      await mkdir(path.dirname(filePath), { recursive: true });
      await appendFile(filePath, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 });
      return { id: record.id, createdAt: record.createdAt };
    },

    /** Skips lines that are not valid JSON (for example one cut off by a crash). */
    async list() {
      let text;
      try {
        text = await readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }

      const records = [];
      for (const line of text.split('\n')) {
        if (line.trim() === '') {
          continue;
        }
        try {
          records.push(JSON.parse(line));
        } catch {
          // Ignore the damaged line; the rest of the file is still good.
        }
      }
      return records.reverse();
    },
  };
}

/**
 * Stores messages in the `messages` table. This is what runs in production; the file store
 * is only a development fallback.
 *
 * Values go in as query parameters (never joined into the SQL text). The database also
 * enforces the length limits, so a bug elsewhere cannot store an oversized message.
 */
export function createPgContactStore({ pool, listLimit = 200 }) {
  return {
    persistent: true,

    async create({ name, email, subject, message, ipHash = null }) {
      const { rows } = await pool.query(
        `INSERT INTO messages (name, email, subject, body, ip_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [name, email, subject, message, ipHash],
      );
      return { id: rows[0].id, createdAt: rows[0].created_at.toISOString() };
    },

    /** The newest messages first, at most `listLimit` of them. */
    async list() {
      const { rows } = await pool.query(
        `SELECT id, name, email, subject, body, status, ip_hash, created_at
           FROM messages
          ORDER BY created_at DESC, id
          LIMIT $1`,
        [listLimit],
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.body,
        status: row.status,
        ipHash: row.ip_hash,
        createdAt: row.created_at.toISOString(),
      }));
    },
  };
}
