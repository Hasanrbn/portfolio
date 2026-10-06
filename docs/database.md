# Database guide

How the PostgreSQL database is set up, filled and used. Read this before changing a table.

## Everyday commands

Run these from the repository root. The database must be running (`docker compose up -d db`, then
`docker compose ps` shows `healthy`) and `DATABASE_URL` must be set in `.env`.

| Command                       | What it does                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `npm run db:migrate`          | Creates or updates the tables (applies every migration that has not run yet)          |
| `npm run db:status`           | Lists applied and pending migrations                                                  |
| `npm run db:seed`             | Adds the content in `shared/data` to the database; rows that already exist are kept   |
| `npm run db:seed -- --update` | Same, but overwrites existing rows with what the files say                            |
| `npm run db:rollback`         | Reverts the last migration (`npm run db:rollback -- 2` reverts two)                   |
| `npm run db:reset`            | Reverts everything, migrates and seeds again. Development only: refuses in production |

When the server starts with a `DATABASE_URL`, it checks that every migration has been applied and stops
with a clear message if not. It never changes the schema by itself.

## Tables

| Table                                                | Holds                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `technologies`                                       | One row per technology name (React, PostgreSQL, ...). Shared by skills, projects, jobs |
| `skills`                                             | A technology shown on the Skills page, with level, description and order               |
| `projects`, `project_technologies`, `project_images` | Projects, the technologies they use (in the order written) and their screenshots       |
| `experiences`, `experience_technologies`             | Work and other experience, and the technologies used                                   |
| `education`, `certificates`                          | Education entries and certificates                                                     |
| `posts`, `tags`, `post_tags`                         | Blog posts (Markdown text), tags, and which post has which tag                         |
| `messages`                                           | Messages sent through the contact form                                                 |
| `pgmigrations`                                       | Which migrations have run (kept by `node-pg-migrate`)                                  |

Decisions that apply to every table:

- **`id` never leaves the server.** The public identifier is the `slug` (URL-safe, unique). The API shows a
  skill, experience, education or certificate `slug` as its `id`, which is what the client already expects.
- **Allowed values live in the database too** (CHECK constraints), not only in the form or the API: a slug is
  lowercase letters, digits and single hyphens; links are `https`; an image or file is a path on this site
  (`/cv.pdf`, never `//host` or `/\host`) or an `https` address; statuses, levels and types come from a fixed
  list; an end date cannot be before its start. A bug or a hand-written query cannot store a value the site
  would refuse to show.
- **Months are stored as the first day of the month** (`2024-03-01`) and shown as `2024-03`. "Until now" is a
  missing end date (`NULL`), never a made-up date.
- **`created_at` and `updated_at` are kept by the database.** A trigger sets `updated_at` on every change.
  (A post's `edited_at` is different: it is the date shown to readers as "Updated", and is empty until the
  author changes the text on purpose.)
- **New projects are hidden** until `is_published` is set on purpose. Posts start as `draft`; a `published`
  post must have a publish date, and a post dated in the future is not public yet.
- **Deleting is careful.** Deleting a project removes its links and images; a technology that is still in use
  cannot be deleted (`ON DELETE RESTRICT`).
- **Blog search is ready**: `posts.search_vector` is a generated, weighted full-text index (title, then excerpt
  and category, then text) using the language-neutral `simple` configuration, because articles may be in
  Indonesian or English.
- **Messages store a hash, not an address.** `ip_hash` is a salted one-way hash (or empty). The column refuses
  anything that is not 64 hex characters, so a plain IP address can never be saved by mistake. The body column is
  called `body`; the API and the stores still call it `message`.

## Migrations

Files in `server/src/db/migrations`, named `<timestamp>_<name>.js`, each with an `up` and a `down`. They run in
name order, each in its own transaction.

- **Never edit a migration that has been applied anywhere else** (your deployed database, a teammate's). Add a
  new migration instead.
- Write `down` so it undoes `up` exactly. The tests apply every migration, revert them all, and apply them
  again, and check nothing is left behind.
- The SQL is written by hand (`pgm.sql`) so the constraints are visible and reviewable.
- To add one, copy an existing file, name it with a later timestamp (`<number>_<what-it-does>.js`), and write its `up` and `down`.

## Seed data

`npm run db:seed` reads `shared/data/*.json` and `shared/data/posts/*.md` (the same files the site shows
today) and writes them in **one transaction**: everything is stored or nothing is.

- The files are validated first, with the same rules as the database. A mistake is reported with the file and
  field (`projects.json: projects[0].repoUrl: must be an https address`). Unlike the website, which quietly
  skips a bad entry so a page never breaks, the seed stops: you should fix the data, not lose it.
- **Default mode only adds what is missing.** A row is identified by its slug. A row that already exists is left
  alone, so edits made later (for example in the admin dashboard, Phase 14) are never overwritten, and running
  the seed twice changes nothing.
- **`--update` overwrites existing rows** from the files and replaces their technologies, images and tags. It
  never deletes rows that are not in the files.
- Technology names used in a project or job are matched to existing technologies ignoring case
  (`node.js` finds `Node.js`). A new name becomes a technology in the category `other`. Two names that give the
  same slug (`C++` and `C#`) get `c` and `c-2`.
- Tags work the same way: `React` and `react` are one tag, and the first spelling wins.

Posts are seeded as published at 00:00 UTC on their `publishedAt` date.

## Repositories

`server/src/repositories/content/*` read the content for the public pages (skills, projects, experiences,
education, certificates, posts). They return exactly what the client's services return after cleaning the same
content. A test seeds sample content and compares both, so the Phase 15 switch from seed files to the API does not
change what a page receives. Two small, deliberate differences:

- A technology or tag has one spelling in the database (the first written). The client would show each file's own
  spelling.
- A post whose `published_at` is in the future is not returned (the client shows every post in its files).

`createPgContactStore` in `server/src/repositories/contactMessages.js` saves contact messages. It has the same two
methods (`create`, `list`) as the memory and file stores, so nothing above it changed. `list` returns at most 200
messages, newest first.

Every query uses parameters (`$1`, `$2`, ...); a value is never joined into SQL text.

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
