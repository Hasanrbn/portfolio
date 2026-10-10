# Deployment

The site is deployed as three free parts:

| Part                        | Where                  | What it does                                                      |
| --------------------------- | ---------------------- | ----------------------------------------------------------------- |
| Website (built React app)   | Render **Static Site** | Serves the pages. Always on, never sleeps.                        |
| API (contact form)          | Render **Web Service** | `POST /api/contact`, health checks. Sleeps when idle (free plan). |
| Database (contact messages) | **Neon** PostgreSQL    | Stores the messages. Free, no expiry; pauses itself when idle.    |

`render.yaml` in the repository root describes both Render services, so Render can create them in
one step (a "Blueprint"). It contains no secret.

## Why this shape

- Visitors who only read the site always get fast pages: they never touch the sleeping API.
- Only sending a message needs the API. Opening the Contact page sends it a harmless request to
  wake it, and the form explains the wait if the server is still starting.
- Render's own free PostgreSQL is deleted 30 days after creation, so the database lives on Neon.
- The website and the API are on different addresses, so the API allows exactly one origin
  (`SITE_URL`, the website) through CORS. Any other site gets no permission.

## Limits of the free plans (checked October 2026; they can change)

- The API sleeps after 15 minutes without requests and needs up to about a minute to wake.
- Render's free web services cannot send email over ports 25, 465 or 587, so SMTP notifications
  are off. Messages are still saved; read them with `npm run messages` (see below).
- Render says free web services are not meant for production use and may restart at any time.
  Fine for a personal portfolio; move the API to a paid plan if it ever matters more.
- Neon free: 1 GB, compute pauses after 5 minutes idle (the first query afterwards is slower).

## One-time setup

### 1. Neon (database)

1. Sign in at neon.com with GitHub and create a project. Pick the **AWS Singapore** region.
2. Open **Connect**. Turn **Connection pooling off**, so the address has no `-pooler` in it
   (the migration tool needs a direct connection).
3. Copy the connection string (it starts with `postgresql://` and ends with `?sslmode=require`).
   It contains the password: keep it private, never put it in a file in this repository.

### 2. Render (website and API)

1. Sign in at render.com with GitHub and allow it to read the `Hasanrbn/portfolio` repository.
2. **New +** then **Blueprint**, choose the repository and the `main` branch.
3. Render reads `render.yaml` and asks for the values marked `sync: false`. Enter:

   | Variable                   | Value                                         |
   | -------------------------- | --------------------------------------------- |
   | `SITE_URL` (both services) | `https://hasanrbn-portfolio.onrender.com`     |
   | `VITE_API_URL` (website)   | `https://hasanrbn-portfolio-api.onrender.com` |
   | `DATABASE_URL` (API)       | the Neon connection string                    |

   The addresses are the service names in `render.yaml` plus `.onrender.com`. If a name was
   already taken, Render adds a random suffix: after creating the services, read the real
   addresses on each service's page and correct the variables (**Environment** tab), then
   redeploy both.

4. **Apply**. The first build takes a few minutes.

### 3. Check it

1. Open the website address. All pages should work, and reloading `/about` must not give an error.
2. Open `<API address>/healthz`: it answers `{"success":true,...}`. `/readyz` also checks the
   database and should say `"database":"up"`.
3. Send a test message from the Contact page. The first one may take up to a minute.
4. Read it: see "Reading messages" below.
5. Open `<website address>/sitemap.xml` and `/robots.txt`.

## Reading messages

There is no admin page. On your own computer, put the Neon connection string in `.env` as
`DATABASE_URL` (the file is ignored by Git), then run:

```
npm run messages
```

Remove or comment out the line afterwards if you use a local database for development.

## Updating the site

Merging a pull request into `main` redeploys both services automatically. Content changes
(`shared/data`) need no server work: the website is rebuilt from the files.

## Custom domain later

Add the domain to the website service on Render, then change `SITE_URL` on **both** services to
the new address and redeploy both (the API must allow the new address; the sitemap must list it).
