import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

// argon2id with the minimum OWASP recommends (19 MiB of memory, 2 passes, 1 thread). It is
// slow and memory-hungry on purpose, which is what makes guessing passwords expensive.
// Tests pass cheaper settings through `overrides`.
const DEFAULT_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

/**
 * Hashing and checking of passwords. Nothing here logs or returns the password itself.
 */
export function createPasswordService(overrides = {}) {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  let decoy;

  return {
    hash(password) {
      return argon2.hash(password, options);
    },

    /** True only for a matching password; a damaged or foreign hash simply does not match. */
    async verify(hash, password) {
      try {
        return await argon2.verify(hash, password);
      } catch {
        return false;
      }
    },

    /** True when the stored hash was made with weaker settings than the current ones. */
    needsRehash(hash) {
      try {
        return argon2.needsRehash(hash, options);
      } catch {
        return false;
      }
    },

    /**
     * Does the same work as a real check against a throw-away hash. Used when the email is
     * unknown, so "no such account" takes as long as "wrong password" and the response time
     * does not reveal which accounts exist.
     */
    async verifyDecoy(password) {
      decoy ??= argon2.hash(randomBytes(16).toString('hex'), options);
      await this.verify(await decoy, password);
    },
  };
}

/**
 * Rules for a NEW password (used by the admin CLI). Returns a message, or null when fine.
 * Length is what matters most, so there are no "needs a symbol" rules; the only extra
 * checks catch the obvious mistakes.
 */
export function checkNewPassword(password, { email = '' } = {}) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (password.trim() === '') {
    return 'The password cannot be only spaces.';
  }
  if (new Set(password).size < 4) {
    return 'Use more different characters.';
  }
  const normalized = password.toLowerCase();
  const address = email.trim().toLowerCase();
  const localPart = address.split('@')[0];
  if (
    address &&
    (normalized.includes(address) || (localPart.length >= 4 && normalized.includes(localPart)))
  ) {
    return 'The password must not contain your email address.';
  }
  return null;
}
