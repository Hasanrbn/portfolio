# Authentication guide

How the admin sign-in works, how to create the admin account, and what to check before adding an admin endpoint.
There is exactly one kind of user, the site owner (`admin`). Visitors never sign in, and there is no sign-up page.

## First time: create the admin account

The database must be running and migrated (`npm run db:migrate`; Phase 13 adds the `users` and `session` tables).

```bash
npm run admin:create
```

It asks for an email and a password (typed twice, **not shown on screen**) and stores only an argon2id hash.
The password is never accepted as a command-line argument or environment variable, because those end up in the
shell history and the process list; for the same reason the command refuses to run without an interactive
terminal. Rules for a password: 12 to 200 characters, not made of one or two repeated characters, and it must not
contain your email address (or its name part). Length matters more than symbols, so a long phrase is fine.

Forgot the password? There is no "forgot password" email, by design: whoever controls the server and database
controls the account.

```bash
npm run admin:reset-password
```

sets a new password **and signs that admin out everywhere** (all of its sessions are deleted), so a stolen session
does not survive the change. On a hosted server, run these two commands in the platform's shell for the service
(Phase 21 explains where).

Also set `SESSION_SECRET` in `.env` (32+ random characters; the command in `.env.example` makes one). Without it
in development a temporary secret is used and everyone is signed out whenever the server restarts; in production
the server refuses to start without it.

## The flow

```
GET  /api/csrf-token        -> { csrfToken }   a session starts; the cookie is set
POST /api/auth/login        -> { user, csrfToken }   header X-CSRF-Token required
GET  /api/auth/me           -> { user }        401 when not signed in
POST /api/auth/logout       -> 204             header X-CSRF-Token required
*    /api/admin/*           -> 401 without a sign-in, 403 for a write without the token
```

1. The admin page asks for a token and keeps it **in memory** (not `localStorage`).
2. It sends the email and password with the token in the `X-CSRF-Token` header. The server checks the per-address
   and per-visitor limits, the token, the shape of the body, and then the password.
3. On success the session id is **replaced** by a new one and a new token is returned; use the new token from then
   on. Any session id known before signing in becomes useless (session fixation).
4. Every request under `/api/admin` goes through the same two checks, installed once in `routes/admin.js`:
   `requireAdmin` (401) and then `requireCsrf` (403 for POST, PUT, PATCH, DELETE). A route added there later cannot
   forget them, and even an admin path that does not exist answers 401 to a visitor who is not signed in.

The React `/admin` pages (Phase 14) are only a convenience for the owner. The real protection is on the API.

All answers use the usual envelope. Sign-in failures:

| Status | When                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| `401`  | Wrong email or wrong password: one message for both, `Invalid email or password.`                    |
| `403`  | The CSRF token is missing or wrong (nothing else is checked)                                         |
| `422`  | The body is not `{ email, password }` as strings                                                     |
| `429`  | Too many attempts from this address (visitor limit) or for this email (see below); `Retry-After` set |

## What protects what

| Threat                         | Defence                                                                                                                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stolen database                | Passwords are argon2id hashes (19 MiB, 2 passes). A hash made with weaker settings is upgraded the next time the right password is used.                                                                                          |
| Guessing passwords             | Per visitor: 20 attempts per 15 minutes. Per email: 10 failures per 15 minutes, from anywhere, then `429` even for the right password until the window ends (it is fixed, not extended by more attempts).                         |
| Finding out which emails exist | Same message and same time for "no such account" and "wrong password" (a throw-away hash is checked); the email limit also applies to emails with no account.                                                                     |
| Cross-site request forgery     | `SameSite=Lax` cookie plus a token per session in `X-CSRF-Token`, compared in constant time. The token is bound to the session and replaced at sign-in.                                                                           |
| Session theft or fixation      | Cookie is `HttpOnly` and `SameSite=Lax`; in production also `Secure` with a `__Host-` name (no `Domain`, path `/`). Session id replaced at sign-in. Sessions live in the database and can be deleted.                             |
| Staying signed in for ever     | Idle limit `SESSION_IDLE_HOURS` (default 8, renewed on activity) and a hard limit of 7 days after sign-in.                                                                                                                        |
| A removed or changed account   | `requireAdmin` reads the account from the database on every request, so deleting it (or changing its role) works at once.                                                                                                         |
| Leaks through logs and errors  | Passwords, emails, tokens and cookies are never logged; the log only records `admin signed in` with the user id. Errors are generic. If the session store or database is down the answer is a generic `500`, never "let through". |

The contact form does not use a CSRF token: nobody is signed in there, so there is no login for another site to
abuse. Its protection is the honeypot and the rate limit (Phase 10). Public pages and the contact form never touch
the session table; a session only exists once something is stored in it (a token request or a sign-in).

## Behind a proxy (production)

The production cookie is `Secure`, so the server must know the request arrived over HTTPS. Set
`TRUST_PROXY_HOPS` to the number of proxies in front of the server (usually `1`) and make sure the proxy sends
`X-Forwarded-Proto: https`. Without it the browser never receives the cookie and sign-in appears to do nothing. The
same setting makes the per-visitor limit see the real IP instead of the proxy's. (Phase 21 repeats this per platform.)

## Adding an admin endpoint (Phase 14 onwards)

1. Write the router as usual (repository, service, controller, `validate`).
2. Register it in `createAdminRouter` through `adminRoutes` (`{ path: '/projects', router }`), never in
   `routes/api.js` directly. That puts it behind `requireAdmin` and `requireCsrf` without extra code.
3. Inside a controller the signed-in user is `req.user` (`{ id, email, role }`).
4. Add tests that call it with no sign-in (401), signed in without the token (403) and with both (success);
   `tests/auth/authApi.test.js` shows the pattern with a probe router.

## Known limits

- The per-email and per-visitor counters live in memory, like the other rate limits: they reset when the server
  restarts and are not shared between several copies. With one small service that is fine; if you run several
  copies, move the counters into the database.
- The per-email limit means someone who knows your email can block sign-ins for it for up to 15 minutes by
  guessing wrongly. That is the price of stopping slow guessing from many machines. It never reveals the password,
  and the window is fixed, so it cannot be extended into a permanent lock.
- Only one role (`admin`) exists. A second kind of user would need a new migration and rules for what each can do.
- There is no two-factor sign-in. A long, unique password stored in a password manager is the defence for now.
