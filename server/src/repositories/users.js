import { randomUUID } from 'node:crypto';

/**
 * Storage for admin accounts. The memory and PostgreSQL stores expose the same methods:
 *
 *   findByEmail(email)            -> user or null
 *   findById(id)                  -> user or null
 *   create({ email, passwordHash }) -> user          (throws DuplicateEmailError)
 *   updatePasswordHash(id, hash)  -> true when the user exists
 *   recordLogin(id)               -> void
 *
 * A user is `{ id, email, role, passwordHash, lastLoginAt, createdAt }`. The hash is only for
 * the password check: use `toPublicUser` for anything that leaves the server.
 */

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'DuplicateEmailError';
  }
}

/** The one spelling the database stores: trimmed and lower case. */
export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** What may be shown to the signed-in user (never the hash). */
export function toPublicUser(user) {
  return { id: user.id, email: user.email, role: user.role };
}

export function createMemoryUserStore() {
  const users = new Map();

  const copy = (user) => (user ? { ...user } : null);

  return {
    async findByEmail(email) {
      const wanted = normalizeEmail(email);
      return copy([...users.values()].find((user) => user.email === wanted));
    },

    async findById(id) {
      return copy(users.get(id));
    },

    async create({ email, passwordHash }) {
      const normalized = normalizeEmail(email);
      if ([...users.values()].some((user) => user.email === normalized)) {
        throw new DuplicateEmailError();
      }
      const user = {
        id: randomUUID(),
        email: normalized,
        role: 'admin',
        passwordHash,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      };
      users.set(user.id, user);
      return copy(user);
    },

    async updatePasswordHash(id, passwordHash) {
      const user = users.get(id);
      if (!user) {
        return false;
      }
      user.passwordHash = passwordHash;
      return true;
    },

    async recordLogin(id) {
      const user = users.get(id);
      if (user) {
        user.lastLoginAt = new Date().toISOString();
      }
    },
  };
}

function fromRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

const COLUMNS = 'id, email, role, password_hash, last_login_at, created_at';

/** Stores accounts in the `users` table. Values are always query parameters. */
export function createPgUserStore({ pool }) {
  return {
    async findByEmail(email) {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM users WHERE email = $1`, [
        normalizeEmail(email),
      ]);
      return fromRow(rows[0]);
    },

    async findById(id) {
      // A value that is not a UUID can never match; asking the database would only raise an error.
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
        return null;
      }
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
      return fromRow(rows[0]);
    },

    async create({ email, passwordHash }) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING ${COLUMNS}`,
          [normalizeEmail(email), passwordHash],
        );
        return fromRow(rows[0]);
      } catch (error) {
        // 23505 = unique_violation
        if (error.code === '23505') {
          throw new DuplicateEmailError();
        }
        throw error;
      }
    },

    async updatePasswordHash(id, passwordHash) {
      const { rowCount } = await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
        id,
        passwordHash,
      ]);
      return rowCount > 0;
    },

    async recordLogin(id) {
      await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [id]);
    },
  };
}
