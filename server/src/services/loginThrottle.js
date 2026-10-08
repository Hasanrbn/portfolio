import { createHash } from 'node:crypto';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Counts FAILED sign-in attempts per email address and blocks further attempts for that
 * address once the limit is reached, whatever IP they come from. (The per-IP limit is a
 * separate express-rate-limit middleware; the two together slow down both one machine
 * guessing many accounts and many machines guessing one account.)
 *
 * - A fixed window: the block ends `windowMs` after the first failure. It is not extended by
 *   more attempts, so an attacker cannot keep the real admin locked out forever.
 * - Works for any email string, including ones that have no account, so being blocked says
 *   nothing about whether an account exists.
 * - Counts live in memory (see docs/auth.md for what that means with several servers). The
 *   table holds at most `maxKeys` addresses; the oldest are dropped first.
 * - Keys are hashed, so the addresses are not kept in memory in readable form.
 *
 * `now` is injectable for tests.
 */
export function createLoginThrottle({
  limit = 10,
  windowMs = FIFTEEN_MINUTES_MS,
  maxKeys = 10_000,
  now = Date.now,
} = {}) {
  const entries = new Map();

  const keyOf = (email) => createHash('sha256').update(String(email)).digest('hex');

  function liveEntry(key) {
    const entry = entries.get(key);
    if (entry && entry.resetAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  function makeRoom() {
    if (entries.size < maxKeys) {
      return;
    }
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now()) {
        entries.delete(key);
      }
    }
    // Map keeps insertion order, so the first keys are the oldest.
    for (const key of entries.keys()) {
      if (entries.size < maxKeys) {
        break;
      }
      entries.delete(key);
    }
  }

  return {
    /** Seconds until attempts are allowed again, or 0 when the address is not blocked. */
    blockedFor(email) {
      const entry = liveEntry(keyOf(email));
      if (!entry || entry.count < limit) {
        return 0;
      }
      return Math.max(1, Math.ceil((entry.resetAt - now()) / 1000));
    },

    recordFailure(email) {
      const key = keyOf(email);
      const entry = liveEntry(key);
      if (entry) {
        entry.count += 1;
        return;
      }
      makeRoom();
      entries.set(key, { count: 1, resetAt: now() + windowMs });
    },

    /** A correct password clears the count. */
    reset(email) {
      entries.delete(keyOf(email));
    },
  };
}
