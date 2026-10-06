import { readFile } from 'node:fs/promises';
import { validateContact } from '@portfolio/shared/contact.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The table accepts only a SHA-256 hex hash here; anything else is dropped rather than failing the import.
const IP_HASH_PATTERN = /^[0-9a-f]{64}$/;
const STATUSES = new Set(['new', 'read', 'archived']);

/**
 * Copies messages saved by the earlier file-based store (one JSON object per line) into the
 * `messages` table. Ids and dates are kept. A message already imported is left alone, so the
 * command can be run again safely. A line that is damaged, or whose message no longer passes the
 * contact rules, is counted as skipped, never guessed at.
 *
 * @returns {Promise<{ imported: number, alreadyThere: number, skipped: number }>}
 */
export async function importContactMessages(pool, filePath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { imported: 0, alreadyThere: 0, skipped: 0, missing: true };
    }
    throw error;
  }

  const result = { imported: 0, alreadyThere: 0, skipped: 0 };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const line of text.split('\n')) {
      if (line.trim() === '') continue;

      let record;
      try {
        record = JSON.parse(line);
      } catch {
        result.skipped += 1;
        continue;
      }

      const checked = validateContact(record);
      const createdAt = new Date(record?.createdAt);
      if (!checked.ok || !UUID_PATTERN.test(record.id ?? '') || Number.isNaN(createdAt.getTime())) {
        result.skipped += 1;
        continue;
      }

      const { name, email, subject, message } = checked.values;
      const inserted = await client.query(
        `INSERT INTO messages (id, name, email, subject, body, status, ip_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          record.id.toLowerCase(),
          name,
          email,
          subject,
          message,
          STATUSES.has(record.status) ? record.status : 'new',
          IP_HASH_PATTERN.test(record.ipHash ?? '') ? record.ipHash : null,
          createdAt.toISOString(),
        ],
      );
      if (inserted.rowCount === 1) result.imported += 1;
      else result.alreadyThere += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  return result;
}
