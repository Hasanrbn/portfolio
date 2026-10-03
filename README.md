# Portfolio Website

Personal portfolio built as a full-stack web application: React frontend, Express REST API, PostgreSQL database.

> **Status:** Phase 1 of 22 (project setup). The site currently shows a placeholder home page. Features below are the plan, not what is built yet. See `docs/portfolio-plan.md` for the full roadmap.

## Features

Planned, in roadmap order: home, about, skills, projects with detail pages, experience, education, certificates, blog, contact form, resume download, dark mode, admin dashboard.

Built so far:

- Monorepo with client, server and shared packages
- `GET /healthz` health endpoint
- Environment validation, security headers, and a central JSON error handler
- CI: format check, lint, tests and build on every push and pull request

## Tech Stack

| Layer    | Technology                               |
| -------- | ---------------------------------------- |
| Frontend | React, Vite, React Router, plain CSS     |
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

Server tests use Vitest and Supertest. Client tests are added together with the first interactive components.

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

Personal details (name, role, email, social links, CV) live in `shared/siteConfig.json`. Values such as `GITHUB_URL` and `CV_URL` are placeholders to replace with real ones.

## Screenshots

Added once the interface is built.

## Future Improvements

Tracked in the roadmap in `docs/portfolio-plan.md`.
