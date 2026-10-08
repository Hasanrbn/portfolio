# Database guide

How the PostgreSQL database is set up, filled and used. Read this before changing a table.

## Everyday commands

Run these from the repository root. The database must be running (`docker compose up -d db`, then
`docker compose ps` shows `healthy`) and `DATABASE_URL` must be set in `.env`.

| Command                      | What it does                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:migrate`         | Creates or updates the tables (applies every migration that has not run yet)                                                                    |
| `npm run db:status`          | Lists applied and pending migrations                                                                                                            |
| `npm run db:import-messages` | Copies messages from the old `server/data/contact-messages.jsonl` (or the path you add) into `messages`. Keeps ids and dates; safe to run again |
| `npm run db:rollback`        | Reverts the last migration (`npm run db:rollback -- 2` reverts two)                                                                             |
| `npm run db:reset`           | Reverts everything and migrates again, which deletes all data. Development only: refuses in production                                          |

When the server starts with a `DATABASE_URL`, it checks that every migration has been applied and stops
with a clear message if not. It never changes the schema by itself.

## What the database is for

The site's content (skills, projects, experience, education, certificates, blog posts) lives in files in
`shared/data` and `shared/posts`, under version control, and the pages read those files directly. The database
holds one thing the files cannot: what visitors send.

| Table          | Holds                                                 |
| -------------- | ----------------------------------------------------- |
| `messages`     | Messages sent through the contact form                |
| `pgmigrations` | Which migrations have run (kept by `node-pg-migrate`) |

Earlier versions also had tables for the content (technologies, skills, projects, ...). Nothing ever read them,
so migration `..._drop-unused-content-tables.js` removes them; they only held copies of the files. Check the files
with `npm run content:check` before committing a change (it names the file and field of any mistake).

Decisions for `messages`:

- **Allowed values live in the database too** (CHECK constraints), not only in the form or the API: the length
  limits repeat the contact form's, the status is `new`, `read` or `archived`, and `ip_hash` must be 64 hex
  characters. A bug or a hand-written query cannot store a value the form would refuse.
- **`created_at` is kept by the database.**
- **Messages store a hash, not an address.** `ip_hash` is a salted one-way hash (or empty), so a plain IP address
  can never be saved by mistake. The body column is called `body`; the API and the stores still call it `message`.

## Migrations

Files in `server/src/db/migrations`, named `<timestamp>_<name>.js`, each with an `up` and a `down`. They run in
name order, each in its own transaction.

- **Never edit a migration that has been applied anywhere else** (your deployed database, a teammate's). Add a
  new migration instead.
- Write `down` so it undoes `up` exactly. The tests apply every migration, revert them all, and apply them
  again, and check nothing is left behind.
- The SQL is written by hand (`pgm.sql`) so the constraints are visible and reviewable.
- The first two migrations created the content tables and the last one removes them again. They stay, because a
  database that has run them must keep a matching history; a new database simply runs all of them.
- To add one, copy an existing file, name it with a later timestamp (`<number>_<what-it-does>.js`), and write its `up` and `down`.

## Reading and cleaning up messages

```bash
npm run messages                  # the newest 20 messages, one line each
npm run messages -- --limit 50    # more (at most 200)
npm run messages -- --full        # with the whole text
npm run messages:prune            # counts the messages older than 12 months; deletes nothing
npm run messages:prune -- --months 6 --yes    # really deletes messages older than 6 months
```

Names, emails and message texts are personal data. Decide how long you keep them (twelve months is a
reasonable default) and run the prune command now and then; it never deletes without `--yes`. Anything that could
move the cursor or rewrite earlier lines in your terminal is removed before a message is printed.

## Messages

`createPgContactStore` in `server/src/repositories/contactMessages.js` saves contact messages. It has the same
methods (`create`, `list`) as the memory and file stores, so nothing above it changes. `list` returns at most 200
messages, newest first. There is no admin page: you get an email for each message (see the README) and read the stored ones with
`npm run messages`. Every query uses parameters (`$1`, `$2`, ...); a value is never joined into SQL text.

## Connection and health

- One shared connection pool (`src/db/pool.js`): at most 10 connections, 5 seconds to get one, 10 seconds per
  query. A broken idle connection is logged instead of crashing the process.
- `GET /healthz` says the process is alive and never touches the database.
- `GET /readyz` says the server can serve visitors: `200` when the database answers `SELECT 1` within 2 seconds,
  `503` (with no details) when it does not. Point a hosting platform's readiness check here.
- On `SIGTERM` the server stops taking requests, lets running ones finish, then closes the pool and exits.
- Without `DATABASE_URL` (local development only) contact messages go to a file, as before. In production
  `DATABASE_URL` is required, because a hosted disk is often temporary.

## Tests

`npm test` runs the database tests only when `TEST_DATABASE_URL` is set (in the shell or in `.env`), and skips them
otherwise. Use a database that may be emptied freely:

```bash
docker compose exec db createdb -U portfolio portfolio_test
# then in .env:
# TEST_DATABASE_URL=postgres://portfolio:<your password>@localhost:5432/portfolio_test
```

Each test file creates its own temporary schema, applies the migrations in it and drops it afterwards, so files run
in parallel and leave nothing behind. GitHub Actions starts a PostgreSQL service and runs the same tests.

## Backups and personal data

`messages` holds names and email addresses. Decide how long to keep them and delete old ones. Back up the
database before every deployment that includes a migration (Phase 21 covers hosted backups), and never commit a
dump.
