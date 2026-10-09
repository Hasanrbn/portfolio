import { fileURLToPath } from 'node:url';
import { loadEnv } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import { importContactMessages } from './importContactMessages.js';
import { formatMessage, listMessages, pruneMessages } from './messages.js';
import { createPool } from './pool.js';
import { getMigrationStatus, runMigrations } from './migrate.js';

const USAGE = `Usage: node src/db/cli.js <command> [options]

Commands:
  migrate            Apply every pending migration
  rollback [count]   Revert the last migration (or the last <count>)
  status             Show applied and pending migrations
  reset              Revert everything and migrate again (development only; deletes the data)
  messages [--limit N] [--full]
                     Show the newest contact messages (default 20, at most 200); --full prints
                     the whole text
  prune-messages [--months N] [--yes]
                     Count the messages older than N months (default 12). Nothing is deleted
                     unless --yes is added
  import-messages [file]
                     Copy messages saved by the old file-based store into the database
                     (default: server/data/contact-messages.jsonl). Safe to run again.
`;

const DEFAULT_MESSAGES_FILE = fileURLToPath(
  new URL('../../data/contact-messages.jsonl', import.meta.url),
);

/** The whole number after `--name`, `fallback` when the option is absent, null when it is not a number. */
function numberOption(args, name, fallback) {
  const at = args.indexOf(name);
  if (at === -1) {
    return fallback;
  }
  const value = Number(args[at + 1]);
  return Number.isInteger(value) ? value : null;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function main(argv) {
  const [command, ...args] = argv;
  if (
    ![
      'migrate',
      'rollback',
      'status',
      'reset',
      'import-messages',
      'messages',
      'prune-messages',
    ].includes(command)
  ) {
    console.error(USAGE);
    process.exitCode = command ? 1 : 0;
    return;
  }

  const env = loadEnv();
  if (!env.DATABASE_URL) {
    fail('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    return;
  }
  if (command === 'reset' && env.NODE_ENV === 'production') {
    fail('Refusing to reset a production database.');
    return;
  }

  const logger = createLogger({
    ...env,
    LOG_LEVEL: env.LOG_LEVEL === 'silent' ? 'silent' : 'info',
  });
  const connection = env.DATABASE_URL;

  if (command === 'migrate') {
    const applied = await runMigrations({ connection, logger });
    logger.info(
      applied.length ? { applied } : {},
      applied.length ? 'migrations applied' : 'nothing to migrate',
    );
    return;
  }

  if (command === 'rollback') {
    const count = args[0] === undefined ? 1 : Number(args[0]);
    if (!Number.isInteger(count) || count < 1) {
      fail('rollback needs a positive whole number, for example: rollback 2');
      return;
    }
    const reverted = await runMigrations({ connection, direction: 'down', count, logger });
    logger.info({ reverted }, reverted.length ? 'migrations reverted' : 'nothing to revert');
    return;
  }

  const pool = createPool({ connectionString: connection, logger });
  try {
    if (command === 'status') {
      const status = await getMigrationStatus(pool);
      console.log(
        `Applied (${status.applied.length}):\n${status.applied.map((n) => `  ${n}`).join('\n') || '  none'}`,
      );
      console.log(
        `Pending (${status.pending.length}):\n${status.pending.map((n) => `  ${n}`).join('\n') || '  none'}`,
      );
      if (status.unknown.length > 0) {
        console.log(
          `Unknown to this code (${status.unknown.length}): ${status.unknown.join(', ')}`,
        );
        process.exitCode = 1;
      }
      return;
    }

    if (command === 'messages' || command === 'prune-messages') {
      const status = await getMigrationStatus(pool);
      if (status.pending.length > 0) {
        fail('The database has pending migrations. Run "npm run db:migrate" first.');
        return;
      }
    }

    if (command === 'messages') {
      const limit = numberOption(args, '--limit', 20);
      if (limit === null) {
        fail('--limit needs a whole number, for example: --limit 50');
        return;
      }
      const messages = await listMessages(pool, { limit });
      if (messages.length === 0) {
        console.log('No messages yet.');
        return;
      }
      const full = args.includes('--full');
      console.log(messages.map((message) => formatMessage(message, { full })).join('\n'));
      console.log(`\n${messages.length} message(s), newest first.`);
      return;
    }

    if (command === 'prune-messages') {
      const months = numberOption(args, '--months', 12);
      if (months === null) {
        fail('--months needs a whole number, for example: --months 6');
        return;
      }
      const apply = args.includes('--yes');
      const { count, deleted } = await pruneMessages(pool, { months, apply });
      console.log(
        deleted
          ? `Deleted ${count} message(s) older than ${months} month(s).`
          : `${count} message(s) are older than ${months} month(s). Nothing was deleted; ` +
              'add --yes to delete them.',
      );
      return;
    }

    if (command === 'import-messages') {
      const status = await getMigrationStatus(pool);
      if (status.pending.length > 0) {
        fail('The database has pending migrations. Run "npm run db:migrate" first.');
        return;
      }
      const file = args.find((arg) => !arg.startsWith('--')) ?? DEFAULT_MESSAGES_FILE;
      const result = await importContactMessages(pool, file);
      console.log(
        result.missing
          ? `No file at ${file}, nothing to import.`
          : `Messages: ${result.imported} imported, ${result.alreadyThere} already there, ` +
              `${result.skipped} skipped.`,
      );
      return;
    }

    // reset
    await runMigrations({ connection, direction: 'down', count: Infinity, logger });
    await runMigrations({ connection, logger });
    console.log('Database reset: every table was dropped and created again.');
  } finally {
    await pool.end();
  }
}

main(process.argv.slice(2)).catch((error) => {
  // Seed and migration problems carry readable messages; keep the stack for anything else.
  console.error(error.name === 'Error' ? error.message : error);
  process.exitCode = 1;
});
