import { validateContact } from '@portfolio/shared/contact.js';
import { ValidationError } from '../utils/httpError.js';
import { hashIp } from '../utils/hashIp.js';

// Name of the hidden form field that only bots fill in.
export const HONEYPOT_FIELD = 'website';

function isFilled(value) {
  return typeof value === 'string' ? value.trim() !== '' : value != null;
}

/**
 * Business rules for contact messages. Knows nothing about HTTP: it receives plain values and
 * returns plain results, so it can be tested without a server and reused unchanged by the
 * admin screens later.
 *
 * - A message with the hidden trap field filled in is dropped without a word: the caller
 *   still answers "sent", so a bot learns nothing from the reply.
 * - Everything else is validated again here, because the browser check is only a convenience.
 * - After the message is saved, the notification starts but is not waited for: a slow or
 *   broken mail server must never delay or fail a message that is already stored.
 */
export function createContactService({ store, notifier = null, ipHashSalt }) {
  return {
    /** @returns {Promise<{ stored: boolean }>} */
    async submit(input, { ip } = {}) {
      const body = input !== null && typeof input === 'object' ? input : {};

      if (isFilled(body[HONEYPOT_FIELD])) {
        return { stored: false };
      }

      const result = validateContact(body);
      if (!result.ok) {
        throw new ValidationError(result.errors);
      }

      await store.create({ ...result.values, ipHash: hashIp(ip, ipHashSalt) });
      notifier?.notify(result.values);
      return { stored: true };
    },
  };
}
