# Backend guide

How the Express server in `server/` is organised, and how to add to it. Read this before adding an endpoint.

## Layers

A request passes through four layers. Each one has one job, and a layer only talks to the one below it.

```
routes  ->  controllers  ->  services  ->  repositories  ->  storage
```

| Layer          | Folder             | Does                                                                                    | Must not                                   |
| -------------- | ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------ |
| `routes`       | `src/routes`       | Maps a URL and method to a controller function and attaches middleware (limits, checks) | Contain logic                              |
| `controllers`  | `src/controllers`  | Reads the request, calls one service, answers with `sendSuccess`                        | Contain rules or touch storage             |
| `services`     | `src/services`     | Holds the rules ("a bot's message is dropped", "only published posts are public")       | Know about `req`/`res` (plain values only) |
| `repositories` | `src/repositories` | The only code that reads or writes stored data                                          | Contain rules                              |

`src/app.js` is the one place where the layers are connected (`createApp`). Everything with a side effect
(configuration, logger, storage, email) is passed into it, so tests build the same app with fakes and
nothing needs to be mocked globally. `src/server.js` is the other half: it creates the real pieces and starts
listening.

Supporting folders: `middleware/` (request id, request log, rate limit, validation, 404, error handler),
`utils/` (`httpError`, `respond`, `logger`, `hashIp`), `config/env.js` (environment checks), `lifecycle.js`
(clean shutdown), `db/` (connection pool, migrations and the `db:*` command line; see
[database.md](database.md)).

## One request, step by step

1. `requestId` gives the request an id (or keeps a safe one sent by a proxy) and returns it as `X-Request-Id`.
2. `requestLogger` waits for the response to finish, then writes one log line.
3. `helmet` adds security headers; `express.json` reads a body of at most 10 kB.
4. The route runs its middleware (for example the rate limit or `validate`), then the controller.
5. Any error thrown or any rejected promise, in any layer, goes to the error handler. Express 5 does this
   itself, so controllers need no `try/catch` or `next(error)`.

## Answers

Every answer uses the same envelope (`src/utils/respond.js`):

```json
{ "success": true,  "data": { } }
{ "success": false, "message": "Text written for visitors", "errors": [{ "field": "email", "message": "..." }] }
```

`errors` appears only for a `422`. Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.

## Errors

Throw from anywhere; `middleware/errorHandler.js` decides what the client sees.

| You throw                                                                                          | Client gets                                                             | Logged by the error handler    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `notFound('No such project')`, `conflict(...)`, `badRequest(...)`, `unauthorized()`, `forbidden()` | That status and message exactly                                         | No (the request log shows it)  |
| `new ValidationError({ email: 'Enter a valid email.' })`                                           | `422` with one entry per field                                          | No                             |
| A 4xx error from Express or body-parser (bad JSON, too large, bad URL escape)                      | A fixed message for that situation; the original text is never repeated | No                             |
| Anything else (a bug, the database is down, ...)                                                   | `500` `"Something went wrong."`, always                                 | Yes, with stack and request id |

Rules this enforces: messages you write in `HttpError` are shown to visitors, so never put internal detail
in them; there is no stack trace or error detail in any response, in any environment.

## Logging

`pino` writes one JSON object per line to standard output, which is what hosting platforms collect. While
developing (`NODE_ENV=development`) the same lines are printed in a readable form.

- Level: `LOG_LEVEL` (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`). Default: `debug` while
  developing, `info` in production, `silent` in tests.
- Every request produces one line: `requestId`, `method`, `path`, `status`, `durationMs`. `info` for
  success, `warn` for 4xx, `error` for 5xx. `/healthz` is `debug` so health checks do not fill the log.
- **Never logged:** query strings, headers, cookies, request bodies, the visitor's IP address, message text.
  Contact messages and (from Phase 13) login details pass through the server and must not leak into logs.
  As a second safety net the logger also replaces fields named `password`, `token`, `secret`,
  `authorization` and `cookie` with `[redacted]`.
- Inside a request use `req.log` (it already carries the request id). Elsewhere use the injected `logger`.
  Log an error as `logger.error({ err }, 'what happened')`.

To follow one request, search the logs for its `requestId` (the value of its `X-Request-Id` header).

## Adding an endpoint (checklist)

1. **Repository** (if it touches stored data): a function in `repositories/` that is the only place with the query.
2. **Service**: the rules, as plain functions of plain values. Throw `ValidationError` / `notFound(...)`.
3. **Controller**: `async (req, res) => { const result = await service.x(req.valid.body); sendSuccess(res, result); }`.
4. **Route**: attach `validate({ body: schema })` with a zod schema whose messages are written for visitors,
   add a rate limiter (`createRateLimiter`) for anything public that writes, then the controller.
5. **Mount** it in `routes/api.js`; build its pieces in `app.js`.
6. **Test** with Supertest through `createApp` (see `tests/contact.test.js`), and the service on its own with fakes.

## Known limits

- The rate limiter counts in memory. Counts reset on restart and are not shared if several copies of the
  server run. That is fine for one small service; with several copies, move the counts into the database.
- `trust proxy` is off unless `TRUST_PROXY_HOPS` is set. Set it to the number of proxies in front of the
  server when deployed, otherwise every visitor looks like the proxy and shares one rate limit (the whole
  site could then receive only 5 messages per hour). In production the server logs a warning at start when it is 0.
- The log only goes to standard output. Keeping and searching old logs is the hosting platform's job
  (decided in Phase 21).
