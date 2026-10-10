import { CONTACT_FIELDS } from '@portfolio/shared/contact.js';
import { API_BASE_URL, apiUrl, buildApiUrl } from '../utils/apiUrl.js';

export const CONTACT_ENDPOINT = '/api/contact';
export const CONTACT_SUCCESS_MESSAGE = 'Your message has been sent.';
export const CONTACT_ERROR_MESSAGE = 'Something went wrong.';

// A free host may put an unused server to sleep and need up to about a minute to wake it, so
// the first message after a quiet spell is allowed that long before the form gives up.
const REQUEST_TIMEOUT_MS = 70_000;
const KNOWN_FIELDS = new Set(CONTACT_FIELDS);

/** Field messages from a 422 answer, limited to the form's own fields and to plain text. */
function readFieldErrors(body) {
  const errors = {};
  for (const entry of Array.isArray(body?.errors) ? body.errors : []) {
    if (
      KNOWN_FIELDS.has(entry?.field) &&
      typeof entry.message === 'string' &&
      !errors[entry.field]
    ) {
      errors[entry.field] = entry.message;
    }
  }
  return errors;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Sends the contact message to the API. Never throws; the result tells the form what to show:
 *
 *   { ok: true }
 *   { ok: false, kind: 'validation', fieldErrors }  the server rejected specific fields
 *   { ok: false, kind: 'rate-limit', message }      too many messages from this visitor
 *   { ok: false, kind: 'error', message }           anything else (server, network, timeout)
 *
 * Only messages written for visitors are passed on; raw server or network errors are not.
 */
export async function sendContactMessage(payload, { fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(apiUrl(CONTACT_ENDPOINT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 201) {
      return { ok: true };
    }

    const body = await readJson(response);

    if (response.status === 422) {
      const fieldErrors = readFieldErrors(body);
      if (Object.keys(fieldErrors).length > 0) {
        return { ok: false, kind: 'validation', fieldErrors };
      }
    }

    if (response.status === 429) {
      return {
        ok: false,
        kind: 'rate-limit',
        message:
          typeof body?.message === 'string' && body.message.trim() !== ''
            ? body.message
            : 'Too many messages. Please try again later.',
      };
    }

    return { ok: false, kind: 'error', message: CONTACT_ERROR_MESSAGE };
  } catch {
    return { ok: false, kind: 'error', message: CONTACT_ERROR_MESSAGE };
  } finally {
    clearTimeout(timer);
  }
}

let woken = false;

/**
 * Wakes a sleeping server ahead of time: called when the contact page opens, so that it is
 * usually ready by the time the visitor has written a message. Only does something when the
 * API is on a different address; the answer is never read, and failure is ignored.
 */
export function wakeServer({ fetchImpl = fetch, base = API_BASE_URL } = {}) {
  if (woken || !base) {
    return;
  }
  woken = true;
  try {
    Promise.resolve(
      fetchImpl(buildApiUrl(base, '/healthz'), { mode: 'no-cors', cache: 'no-store' }),
    ).catch(() => {});
  } catch {
    // Nothing to do: this is only a courtesy request.
  }
}

/** For tests: lets wakeServer run again. */
export function resetWakeServer() {
  woken = false;
}
