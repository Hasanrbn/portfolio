import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Storage for contact messages.
 *
 * Both stores expose the same two methods, which are also what the PostgreSQL
 * version will expose in Phase 12, so the route does not change when the
 * database arrives:
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
