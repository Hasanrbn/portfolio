# Deployment

The whole site runs on free plans, in two places:

| Part                                  | Where               | What it does                                                         |
| ------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| Website and contact API (one project) | **Vercel** (Hobby)  | Serves the pages; `api/index.js` runs the Express API as a function. |
| Database (contact messages)           | **Neon** PostgreSQL | Stores the messages. Free, no expiry; pauses itself when idle.       |

No credit card is needed for either. (Render was tried first and asks for a card, even for free
services, so it is not used.)

## How it fits together

- `vercel.json` tells Vercel to build the client (`client/dist`), to send `/api/*`, `/healthz` and
  `/readyz` to the function `api/index.js`, and to open the app for every other address.
- `api/index.js` is the same Express app that `npm start` runs locally. Both are assembled by
  `server/src/runtime.js`, so they cannot drift apart.
- The website and the API share one address, so there is no CORS to configure and the browser
  calls plain `/api/contact`.
- The site address is not typed in anywhere: Vercel announces the project's domain to every
  build and to the function (`VERCEL_PROJECT_PRODUCTION_URL`), which becomes `SITE_URL`. Set
  `SITE_URL` yourself only to override it (for example after adding a custom domain).
- Node is pinned to 22.x in `package.json`, the version the tests run on.

## Limits (checked October 2026; plans can change)

- Vercel Hobby is for personal, non-commercial use. A portfolio fits. When a monthly limit is
  used up, features pause for about 30 days; nothing is billed.
- The database pauses after 5 minutes idle; the first message after a quiet spell is a little slow.
- The "5 messages per hour per visitor" limit counts inside each running copy of the function, so
  on Vercel it is a best-effort brake, not an exact limit.
- Email notifications are off by default (no `SMTP_HOST`); messages are always saved.

## One-time setup

### 1. Neon (database)

1. Sign in at neon.com with GitHub and create a project. Pick the **AWS Singapore** region.
2. Open **Connect**. Turn **Connection pooling off**, so the address has no `-pooler` in it.
3. Copy the connection string (`postgresql://…?sslmode=require`). It contains the password:
   keep it private and never put it in a file that Git tracks.

### 2. Create the tables (from your own computer, once)

The function never changes tables itself. In the repository folder, put the Neon string in `.env`
(the file is ignored by Git):

```
DATABASE_URL=postgresql://…the Neon string…
```

Then run `npm run db:migrate`. It should list the migrations it applied. Afterwards put your local
database address back in `.env` (or comment the line out) so development does not touch the live data.
Run the same command again after any future change to `server/src/db/migrations`.

### 3. Vercel (website and API)

1. Sign in at vercel.com with GitHub (Hobby plan).
2. **Add New…** then **Project**, import `Hasanrbn/portfolio`.
3. Leave **Framework Preset** on **Other** and the **Root Directory** as it is. The build and output
   settings come from `vercel.json`.
4. Open **Environment Variables** and add:

   | Name               | Value                                                     |
   | ------------------ | --------------------------------------------------------- |
   | `DATABASE_URL`     | the Neon connection string                                |
   | `TRUST_PROXY_HOPS` | `1`                                                       |
   | `IP_HASH_SALT`     | 30 or more random letters and digits you make up yourself |

   Do **not** add `NODE_ENV`. A variable set in the project also applies while building, where
   `production` makes `npm ci` skip the build tools. The function sets it for itself.

5. **Deploy**. The first build takes a minute or two.

### 4. Check it

1. Open the project's address (`https://<project>.vercel.app`). All pages work, and reloading
   `/about` gives no error.
2. `<address>/healthz` answers `{"success":true,…}`. `<address>/readyz` also asks the database and
   should say `"database":"up"`.
3. Send a test message from the Contact page, then read it (below).
4. Open `<address>/sitemap.xml` and `<address>/robots.txt`.

If `/healthz` shows a "not found" message in JSON, the function runs but received a different path
than expected; if it shows the website's 404 page, the rewrite did not match. Either way, open the
deployment's **Logs** in Vercel and send the first error lines when asking for help.

## Reading messages

There is no admin page. With the Neon string in `.env` as `DATABASE_URL` (see step 2), run:

```
npm run messages
```

## Updating the site

Merging a pull request into `main` redeploys automatically. Content changes (`shared/data`) need
no server work: the website is rebuilt from the files.

## Custom domain later

Add the domain in the Vercel project's **Domains** settings. The sitemap and link previews follow
it automatically (the announced production domain becomes the new one). If you set `SITE_URL`
yourself, change it too.
