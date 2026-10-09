import { createPgContactStore } from '../repositories/contactMessages.js';

const MAX_LIMIT = 200;
const PREVIEW_LENGTH = 70;

// A message cannot contain control characters (the form refuses them), but the terminal is the one
// place where such a character is dangerous: it can move the cursor or rewrite earlier lines. So
// everything below a space except newline and tab, DEL, the C1 range and the Unicode line
// separators is removed again before anything is printed.
function isUnsafeForTerminal(code) {
  return (
    (code <= 0x1f && code !== 0x0a && code !== 0x09) ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029
  );
}

function printable(value) {
  let result = '';
  for (const char of String(value)) {
    if (!isUnsafeForTerminal(char.codePointAt(0))) {
      result += char;
    }
  }
  return result;
}

/** Newest messages first, at most `limit` (1 to 200). */
export async function listMessages(pool, { limit = 20 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`The limit must be a whole number from 1 to ${MAX_LIMIT}.`);
  }
  return createPgContactStore({ pool, listLimit: limit }).list();
}

const stamp = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/**
 * Text for one message. Short form: one line with date, status, sender and the start of the text.
 * Full form: a header and the whole text.
 */
export function formatMessage(message, { full = false } = {}) {
  const sender = `${printable(message.name)} <${printable(message.email)}>`;
  if (!full) {
    const oneLine = printable(message.message).replace(/\s+/g, ' ').trim();
    const preview =
      oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH - 1)}…` : oneLine;
    return `${stamp(message.createdAt)}  ${message.status.padEnd(8)} ${sender}  ${printable(message.subject)} | ${preview}`;
  }
  return [
    `${'-'.repeat(60)}`,
    `Date:    ${stamp(message.createdAt)}   Status: ${message.status}   Id: ${message.id}`,
    `From:    ${sender}`,
    `Subject: ${printable(message.subject)}`,
    '',
    printable(message.message),
  ].join('\n');
}

/**
 * Messages older than `months` months. With `apply: false` (the default) nothing is deleted and
 * the count says what would be. Returns `{ count, deleted }`.
 */
export async function pruneMessages(pool, { months = 12, apply = false } = {}) {
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error('The number of months must be a whole number from 1 to 120.');
  }

  if (!apply) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM messages WHERE created_at < now() - make_interval(months => $1)`,
      [months],
    );
    return { count: rows[0].n, deleted: false };
  }

  const { rowCount } = await pool.query(
    `DELETE FROM messages WHERE created_at < now() - make_interval(months => $1)`,
    [months],
  );
  return { count: rowCount, deleted: true };
}
