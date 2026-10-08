import { loadEnv } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { assertMigrated } from '../db/migrate.js';
import { createPgUserStore } from '../repositories/users.js';
import { revokeUserSessions } from '../repositories/sessions.js';
import {
  AdminAccountError,
  createAdminAccount,
  resetAdminPassword,
} from '../services/adminAccountService.js';
import { PASSWORD_MIN_LENGTH, createPasswordService } from '../services/passwordService.js';
import { createLogger } from '../utils/logger.js';
import { ask } from './prompt.js';

const USAGE = `Usage: node src/auth/cli.js <command>

Commands:
  create-admin      Create an admin account (asks for the email and a password)
  reset-password    Set a new password for an existing admin and sign it out everywhere

The password is typed at the prompt and is never accepted as an argument or stored
anywhere except as a hash in the database. There is no sign-up page.
`;

async function askPassword(label) {
  const first = await ask(`${label} (at least ${PASSWORD_MIN_LENGTH} characters, hidden): `, {
    secret: true,
  });
  const second = await ask('Type it again: ', { secret: true });
  if (first !== second) {
    throw new AdminAccountError('The two passwords are not the same. Nothing was changed.');
  }
  return first;
}

async function main(argv) {
  const [command] = argv;
  if (!['create-admin', 'reset-password'].includes(command)) {
    console.error(USAGE);
    process.exitCode = command ? 1 : 0;
    return;
  }

  const env = loadEnv();
  if (!env.DATABASE_URL) {
    throw new AdminAccountError(
      'DATABASE_URL is not set. Copy .env.example to .env and fill it in.',
    );
  }

  const logger = createLogger({ ...env, LOG_LEVEL: 'silent' });
  const pool = createPool({ connectionString: env.DATABASE_URL, logger });
  try {
    try {
      await assertMigrated(pool);
    } catch (error) {
      throw new AdminAccountError(error.message);
    }

    const userStore = createPgUserStore({ pool });
    const passwordService = createPasswordService();

    // Questions come before any change, so cancelling leaves the database as it was.
    const email = await ask('Email: ');

    if (command === 'create-admin') {
      const password = await askPassword('Password');
      const user = await createAdminAccount({ userStore, passwordService, email, password });
      console.log(`Admin account created for ${user.email}. You can sign in now.`);
      return;
    }

    const password = await askPassword('New password');
    const result = await resetAdminPassword({
      userStore,
      passwordService,
      revokeSessions: (userId) => revokeUserSessions(pool, userId),
      email,
      password,
    });
    console.log(
      `Password changed for ${result.email}. ${result.closedSessions} signed-in session(s) were closed.`,
    );
  } finally {
    await pool.end();
  }
}

main(process.argv.slice(2)).catch((error) => {
  // Messages of AdminAccountError and Cancelled are meant for the person typing; anything
  // else keeps its details to be debugged.
  const expected = error instanceof AdminAccountError || error.message === 'Cancelled.';
  console.error(expected || error.name === 'Error' ? error.message : error);
  process.exitCode = 1;
});
