# Portfolio Website

Personal portfolio built as a full-stack web application: React frontend, Express REST API, PostgreSQL database.

> **Status:** Phase 8 of 22 (certificates). The site has its frame (header, menu, footer), a home page, About, Skills, Projects (list, filters, detail), Experience and Education pages; other pages that are not built yet show "Coming soon". The design system can be reviewed at `/design` while developing. Features below are the plan, not what is built yet. See `docs/portfolio-plan.md` for the full roadmap.

## Features

Planned, in roadmap order: home, about, skills, projects with detail pages, experience, education, certificates, blog, contact form, resume download, admin dashboard.

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
- CI: format check, lint, tests and build on every push and pull request

## Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React, Vite, React Router, CSS Modules   |
| Backend  | Node.js, Express, zod, helmet            |
| Database | PostgreSQL (local container via Docker)  |
| Quality  | ESLint (with jsx-a11y), Prettier, Vitest |
| CI       | GitHub Actions                           |

## Architecture

One Node.js service will serve the API and the built React app, backed by one PostgreSQL database. During development, Vite serves the client on port 5173 and proxies `/api` and `/healthz` to the Express server on port 3000.

## Installation

Requirements: Node.js 22 or newer, npm 10 or newer, Docker (only needed for the database, from Phase 12).

```bash
npm install
cp .env.example .env
```

Edit `.env` and replace the placeholder database password.

## Environment Variables

All variables are listed in `.env.example`. The server validates them on startup and refuses to start if one is invalid.

| Variable                              | Required           | Description                                   |
| ------------------------------------- | ------------------ | --------------------------------------------- |
| `NODE_ENV`                            | No                 | `development` (default), `test`, `production` |
| `PORT`                                | No                 | Server port, default `3000`                   |
| `SITE_URL`                            | In production      | Public site URL, used for canonical links     |
| `DATABASE_URL`                        | From Phase 12      | PostgreSQL connection string                  |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | For local database | Read by `docker-compose.yml`                  |

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

## Database Setup

```bash
docker compose up -d db
```

The container listens on `127.0.0.1:5432` only. Tables and migrations are added in Phase 12.

## API Documentation

| Method | Path       | Description  |
| ------ | ---------- | ------------ |
| GET    | `/healthz` | Health check |

Responses use a consistent envelope: `{ "success": true, "data": {} }` on success and `{ "success": false, "message": "..." }` on error. The full API is documented in Phase 15.

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
docs/      Project plan and, later, architecture and deployment notes
.github/   CI workflow
```

Personal details live in `shared/siteConfig.json`. Values such as `GITHUB_URL` and `CV_URL` are placeholders to replace with real ones; until then the matching elements stay hidden.

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

These pages read JSON files in `shared/data/`. Edit the file and the page updates; nothing in the React code needs to change.

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

The data shapes match what `GET /api/skills`, `GET /api/projects`, `GET /api/experiences`, `GET /api/education` and `GET /api/certificates` will return, so Phase 15 replaces the files with the API without changing the pages.

## Screenshots

Added once the interface is built.

## Future Improvements

Tracked in the roadmap in `docs/portfolio-plan.md`.
