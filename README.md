# Portfolio Website

Personal portfolio: a React site whose content lives in files in this repository, plus a small Express API and PostgreSQL database for one purpose: the contact form.

> **Status:** Phases 1 to 12 are done; the project direction was simplified afterwards (see "Decisions" below). The site has its frame (header, menu, footer), a home page, About, Skills, Projects (list, filters, detail), Experience, Education, Certificates, Blog and Contact pages. The design system can be reviewed at `/design` while developing. See `docs/portfolio-plan.md` for the full roadmap.

## Features

Pages: home, about, skills, projects with detail pages, experience, education, certificates, blog, contact form, and a "Download CV" button that opens your CV as a PDF (there is no separate resume page).

Built so far:

- Monorepo with client, server and shared packages
- `GET /healthz` health endpoint
- Environment validation, security headers, and a central JSON error handler
- Design system: colour, type and spacing tokens, self-hosted Inter and JetBrains Mono, UI components (Button, LinkButton, Card, Badge, Tag, Spinner, Skeleton, EmptyState, ErrorState, form fields)
- Light, dark and system themes, remembered in `localStorage`, applied before first paint so there is no flash
- Colour contrast checked against WCAG AA by automated tests
- Page frame: skip link, sticky header with a menu for small screens, footer, active page marked in the navigation, focus moved to the new page's heading after each navigation, and a branded 404 page
- Profile links (GitHub, LinkedIn, email) in the footer appear only once `shared/siteConfig.json` holds real `https` URLs and a real email, so placeholders never show up as broken links
- Home page: hero with name, role, introduction, picture (or initials), "View My Projects", "Contact Me" and "Download CV" buttons, profile links, optional availability badge, core technologies and a closing call to action. Anything that is empty or still a placeholder (CV, picture, availability, profile links) is left out instead of shown broken
- About page: introduction, picture (or initials), personal highlights and written sections; a section with no content is not shown
- Skills page: skills grouped by area (Frontend, Backend, Database, Tools, Other) with an optional Familiar / Intermediate / Advanced label and short description per skill, and loading, empty and error states. No percentages
- Projects page: cards with status, category, year, technologies and GitHub / live demo links; search, category and technology filters (shown from two projects on, kept in the address so a filtered view can be shared); a detail page per project at `/projects/<slug>` with overview, problem, solution, features, technology stack, an architecture diagram, challenges, lessons learned and screenshots. Sections without content are not shown
- Experience page: a timeline (newest first) of roles, internships, academic or personal projects, with dates, type, description, responsibilities and technologies. Education page: institution, programme, years, relevant subjects and achievements. Both show an honest empty state until real entries are added, and nothing is invented
- Certificates page: a gallery with the title, issuer, date, category, credential ID, a preview (image or PDF symbol), a link to the file and a link to the issuer's verification page. Filters by issuer, year and category (shown from two certificates on, kept in the address). Empty until real certificates are added; nothing is invented
- Blog: articles written as markdown files, with a list (search, category and tag filters, six per page, kept in the address) and an article page with date, reading time, a table of contents for longer articles, related articles, share buttons and a safe markdown renderer (raw HTML is never rendered, unsafe links and pictures are dropped). Empty until you add an article
- Contact: a form (name, email, subject, message) at `/contact`, checked in the browser for quick feedback and again on the server, which is the check that counts. Errors appear next to each field and keyboard focus moves to the first one; success ("Your message has been sent.") and failure ("Something went wrong.") are announced to screen readers; what the visitor typed is kept when sending fails. Spam protection: a hidden trap field, a limit of five messages per hour per visitor, length limits and no line breaks in single-line fields. Messages are saved on the server, and optionally emailed to you (see below). Profile links appear beside the form once real ones are set
- Backend structure: layered server (routes, controllers, services, repositories), one envelope for all answers, a central error handler (generic 500 in every environment, fixed messages for framework errors), structured JSON logging with a request id and no personal data in the log, zod request validation middleware, a reusable rate limiter, and a clean shutdown on SIGTERM/SIGINT or a fatal error
- CI: format check, lint, tests and build on every push and pull request

## Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React, Vite, React Router, CSS Modules   |
| Backend  | Node.js, Express, zod, helmet, pino      |
| Database | PostgreSQL (contact messages only)       |
| Quality  | ESLint (with jsx-a11y), Prettier, Vitest |
| CI       | GitHub Actions                           |

## Architecture

The site is a React single-page app (static files). The only server code is a small Express API for the contact form (`POST /api/contact`, plus `/healthz` and `/readyz`), which saves each message in PostgreSQL and optionally emails it to you. How both are hosted is decided in Phase 21. During development, Vite serves the client on port 5173 and proxies `/api` and `/healthz` to the Express server on port 3000.

The server is built in layers: `routes` (URLs and middleware) → `controllers` (HTTP in, HTTP out) → `services` (the rules) → `repositories` (the only code that touches stored data). Errors thrown anywhere end up in one error handler that never shows a visitor anything but a prepared message; every request gets an id and one structured log line that contains no personal data. See [docs/backend.md](docs/backend.md) for the details and a checklist for adding an endpoint.

## Decisions

- **No accounts, no admin page.** Visitors open the site and see everything; nobody signs in. A login would protect nothing here, because the site has no data that anyone but its owner edits.
- **Content lives in files** (`shared/data`, `shared/posts`), under version control: every change is reviewed, tested (`npm run content:check`) and can be undone with Git. Changing a text means a commit and a deploy.
- **The backend exists for the contact form only.** Messages are stored in PostgreSQL (so a failed email never loses one) and announced by email. Read and clean them up with `npm run messages` and `npm run messages:prune`.
- An authentication system (sessions, CSRF, password hashing, an admin CLI) was built in a separate branch and deliberately not merged; it is kept in the Git history as `phase-13-authentication`.

## Installation

Requirements: Node.js 22 or newer, npm 10 or newer, Docker (for the local database).

```bash
npm install
cp .env.example .env
```

Edit `.env` and replace the placeholder database password (in both `POSTGRES_PASSWORD` and `DATABASE_URL`). Then create the table for contact messages:

```bash
docker compose up -d db     # wait until `docker compose ps` shows "healthy"
npm run db:migrate
```

## Environment Variables

All variables are listed in `.env.example`. The server validates them on startup and refuses to start if one is invalid.

| Variable                                                                                                        | Required           | Description                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                                                      | No                 | `development` (default), `test`, `production`                                      |
| `PORT`                                                                                                          | No                 | Server port, default `3000`                                                        |
| `LOG_LEVEL`                                                                                                     | No                 | `silent` … `fatal`; default `debug` in development, `info` in production           |
| `SITE_URL`                                                                                                      | In production      | Public site URL, used for canonical links                                          |
| `DATABASE_URL`                                                                                                  | In production      | PostgreSQL connection string; without it (development) messages go to a file       |
| `TEST_DATABASE_URL`                                                                                             | For database tests | A database the tests may fill and empty; the database tests are skipped without it |
| `POSTGRES_USER` / `_PASSWORD` / `_DB`                                                                           | For local database | Read by `docker-compose.yml`                                                       |
| `TRUST_PROXY_HOPS`                                                                                              | No                 | Reverse proxies in front of the server, default `0`                                |
| `IP_HASH_SALT`                                                                                                  | No                 | 16+ random characters; stores a hash of the visitor's IP instead of nothing        |
| `CONTACT_STORE_PATH`                                                                                            | No                 | Where messages are saved without a database                                        |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `CONTACT_NOTIFY_TO`, `CONTACT_MAIL_FROM` | No                 | Email notification for new messages; off while `SMTP_HOST` is empty                |

Never commit `.env`. Only `.env.example` belongs in Git.

## Running Locally

```bash
npm run dev
```

- Client: http://localhost:5173
- Design system review page (development only, not part of production builds): http://localhost:5173/design
- API health check: http://localhost:3000/healthz

Other commands:

```bash
npm run lint           # ESLint
npm run format:check   # Prettier check (use `npm run format` to fix)
npm test               # tests in all workspaces
npm run build          # production build of the client
```

## Contact Messages

Messages are saved in the `messages` table of PostgreSQL whenever `DATABASE_URL` is set (always in production). Without it (local development only) each message is appended as one JSON line to `server/data/contact-messages.jsonl` (created when the first message arrives, readable by the server's user only, ignored by Git, stops at 5 MB instead of filling the disk). Messages saved by the earlier file-based version can be copied into the database once with `npm run db:import-messages` (add a file path to import another file); running it again does not duplicate anything. Read stored messages with `npm run messages` (add `-- --full` for the whole text). Delete old ones with `npm run messages:prune` (it only counts until you add `-- --yes`; the default is messages older than 12 months).

To get an email for every new message, set the `SMTP_*` and `CONTACT_NOTIFY_TO` values in `.env`. With Gmail, turn on 2-step verification, create an App Password at https://myaccount.google.com/apppasswords, use `smtp.gmail.com`, port `587`, your address as `SMTP_USER` and the App Password as `SMTP_PASSWORD`. Never use your normal password, and never put these values in Git or in a file other than `.env`. A mail failure never loses a message or shows the visitor an error: the message is already saved, and the failure is logged with an error code only.

Only the visitor's name, email, subject and message are stored. The visitor's IP address is never stored; with `IP_HASH_SALT` set, a salted one-way hash is kept so repeated spam from one source can be noticed. Twelve months is a reasonable time to keep them; delete older ones with `npm run messages:prune`.

## Database Setup

```bash
docker compose up -d db
```

The container listens on `127.0.0.1:5432` only. The database only stores contact messages; the site's content lives in files (see below). Tables are created by migrations; see [docs/database.md](docs/database.md) for the commands (`db:migrate`, `db:status`, `db:rollback`, `db:reset`) and the tests.

The password in `POSTGRES_PASSWORD` is only used the first time the container is created. If you change it later, run `docker compose down -v` (this deletes the local data) and start again, then migrate.

## API Documentation

| Method | Path           | Description                                                |
| ------ | -------------- | ---------------------------------------------------------- |
| GET    | `/healthz`     | Liveness: the server is running                            |
| GET    | `/readyz`      | Readiness: `200` when the database answers, `503` when not |
| POST   | `/api/contact` | Send a contact message                                     |

`POST /api/contact` takes JSON `{ "name", "email", "subject", "message" }` (plus the hidden `website` trap field, which must stay empty). It answers `201` with `{ "success": true, "data": { "message": "Your message has been sent." } }`; `422` with `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }` for invalid fields; `429` after five messages per hour from one address; and a generic `500` otherwise. Limits: name 100, email 254, subject 150, message 10 to 2000 characters.

Responses use a consistent envelope: `{ "success": true, "data": {} }` on success and `{ "success": false, "message": "..." }` on error. That is the whole API: the site's content is read from files, not from the API.

## Testing

```bash
npm test
```

Server tests use Vitest and Supertest. Client tests use Vitest and Testing Library: theme switching, form and UI component behaviour, heading order on the design page, and an automated WCAG AA contrast check of every colour pair in `client/src/styles/tokens.css`. Change colours there and run `npm test` to confirm they still pass.

## Deployment

Documented in Phase 21.

## Project Structure

```
client/    React app (Vite)
server/    Express API
shared/    Data used by both, e.g. siteConfig.json
docs/      Project plan, backend guide, and later deployment notes
.github/   CI workflow
```

Personal details live in `shared/siteConfig.json`. Values such as `CV_URL` are placeholders to replace with real ones; until then the matching elements stay hidden. To show the CV button, put your CV in `client/public/cv.pdf` and set `"resumeUrl": "/cv.pdf"`.

| Field               | What it does                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `name`, `role`      | Hero heading, browser title, footer                                                                   |
| `intro`             | Short introduction in the hero                                                                        |
| `availability`      | Optional status badge, e.g. `Open to internships`. Leave empty to hide it                             |
| `avatar`            | Picture: a file in `client/public` such as `/avatar.jpg`, or an `https` address. Empty shows initials |
| `highlights`        | Technology names shown on the home page                                                               |
| `resumeUrl`         | CV: a file in `client/public` such as `/cv.pdf` (downloads), or an `https` address (opens a new tab)  |
| `email`, `social.*` | Profile links in the hero and footer; only real `https` URLs and a real email are shown               |

### Editing site content

These pages read JSON files in `shared/data/`. Edit the file and the page updates; nothing in the React code needs to change. Before committing a change, run `npm run content:check`: it applies strict rules and names the file and field of any mistake (the site itself quietly skips a bad entry so a page never breaks, which would hide it).

- `about.json`: `paragraphs` (extra biography paragraphs under the introduction), `highlights` (short labels) and `sections`. Each section is `{ "id", "title", "paragraphs": [], "items": [] }`; add sections such as Background, Career goals or Approach. Sections with no text are not shown.
- `skills.json`: categories with skills. Each skill has `id`, `name`, `level` (`"familiar"`, `"intermediate"`, `"advanced"` or `null`) and `description`. A skill without a level or description simply shows its name. The "What the levels mean" guide appears as soon as one skill has a level. Only set a level you can stand behind in an interview.

- `projects.json`: a list of projects. Fields: `slug` (lowercase letters, digits and hyphens; it becomes the address `/projects/<slug>`), `title`, `summary`, `description`, `problem`, `solution`, `features` (list), `architecture` (`description` and `layers`, each `{ "name", "detail" }`, shown in order as Frontend, API, Backend, Database or whatever fits), `challenges`, `lessons`, `category`, `status` (`planned`, `in_progress`, `completed` or `archived`), `year`, `technologies` (list of names), `thumbnail` and `screenshots` (`{ "url", "alt", "caption" }`; put image files in `client/public` and use a path such as `/images/shop.png`), `repoUrl` and `demoUrl` (`https` only), `featured`, `published` (`false` hides the project) and `sortOrder`. Text fields are plain text, and a blank line starts a new paragraph. Anything empty is simply not shown, so only fill in what is true.

- `experiences.json`: `{ "experiences": [] }`. Each entry: `id` (unique), `position`, `organization`, `type` (`employment`, `internship`, `freelance`, `academic`, `personal`, `organization` or `volunteer`), `startDate` and `endDate` (`"YYYY-MM"`; leave `endDate` out or `null` for something current), `description` (a blank line starts a new paragraph), `responsibilities` (list), `technologies` (list), `visible` (`false` hides it) and `sortOrder`. An entry with a missing or impossible date is left out rather than guessed. Without formal work, honest types such as `personal` or `academic` are fine. Example:

  ```json
  {
    "id": "portfolio-website",
    "position": "Full-Stack Developer",
    "organization": "Personal project: Portfolio Website",
    "type": "personal",
    "startDate": "2026-10",
    "endDate": null,
    "description": "Building this portfolio as a full-stack application.",
    "responsibilities": ["Building the React front end", "Setting up the Express server"],
    "technologies": ["React", "Express"]
  }
  ```

- `education.json`: `{ "education": [] }`. Each entry: `id` (unique), `institution`, `program`, `startYear`, `endYear` (numbers; leave `endYear` out or `null` while studying), `subjects` (list), `achievements` (list), `visible` and `sortOrder`. Add only what is true.

- `certificates.json`: `{ "certificates": [] }`. Each entry: `id` (unique), `title`, `issuer`, `issuedDate` (`"YYYY-MM"`), `category`, `credentialId` and `credentialUrl` (`https` only), `file` (`{ "url", "alt" }`), `visible` and `sortOrder`. Put the image or PDF in `client/public/certificates/` and use a path such as `/certificates/web-basics.pdf`; a `.pdf` file is shown as a PDF symbol and opens in a new tab, anything else is shown as a picture. Give each picture an `alt` that describes it (without one, a generic text naming the certificate and issuer is used). Add only certificates you actually earned, and keep personal details such as a home address out of the files, because they are public.

Anything that is empty is not shown, so a page never displays a placeholder. Run `npm run content:check` after editing.

### Writing blog articles

Each article is one markdown file in `shared/data/posts/`. The file name is the address: `shared/data/posts/my-first-post.md` becomes `/blog/my-first-post` (lowercase letters, digits and hyphens). Start the file with a header between two `---` lines:

```markdown
---
title: My first post
excerpt: One or two sentences shown in the list.
category: Web
tags: React, Vite
publishedAt: 2026-10-05
updatedAt: 2026-10-12
coverImage: /images/my-first-post.png
coverAlt: Describe the picture for people who cannot see it
---

## A section

Text with **bold**, `code`, lists and [links](https://example.org).
```

- Required: `title` and `publishedAt` (`YYYY-MM-DD`). Files without them, with a repeated address or with an empty text are skipped. `updatedAt`, `excerpt`, `category`, `tags` (separated by commas), `coverImage` (a path in `client/public` or an `https` address), `coverAlt` and `slug` (to override the file name) are optional.
- The header supports plain `key: value` lines only. Put quotes around a value if you like.
- In the text, `#` is shown as a second-level heading, because the article title is the page's only top-level heading. `##` and `###` headings make the table of contents, which appears from three headings on.
- Reading time is worked out from the word count (200 words a minute).
- Everything in `shared/data/posts/` is published when the site is built. Keep unfinished writing in another folder, for example `shared/data/drafts/`, which the site does not read.
- Raw HTML in an article is ignored, `javascript:` links are removed, plain `http://` links are shown as text and `https://` links open in a new tab. Tables and strikethrough (GitHub-style markdown) are not supported.

## Screenshots

Added once the interface is built.

## Future Improvements

Tracked in the roadmap in `docs/portfolio-plan.md`.
