import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const PgSessionStore = connectPgSimple(session);

/**
 * Keeps login sessions in the `session` table (connect-pg-simple), so they survive a restart,
 * are shared by several server copies, and can be revoked by deleting rows.
 *
 * Expired rows are removed by the store itself every `pruneIntervalSeconds`
 * (`false` turns that off, which tests do). Call `store.close()` when shutting down.
 */
export function createPgSessionStore({ pool, logger, pruneIntervalSeconds = 15 * 60 }) {
  return new PgSessionStore({
    pool,
    tableName: 'session',
    // The table is created by a migration (npm run db:migrate), never by the running server.
    createTableIfMissing: false,
    pruneSessionInterval: pruneIntervalSeconds,
    errorLog: (...args) => logger?.error({ detail: args.map(String).join(' ') }, 'session store'),
  });
}

/**
 * Ends every login session of one user (after a password change, or if an account is
 * suspected to be compromised). Returns how many sessions were closed.
 */
export async function revokeUserSessions(pool, userId) {
  const { rowCount } = await pool.query(`DELETE FROM session WHERE sess ->> 'userId' = $1`, [
    userId,
  ]);
  return rowCount;
}
