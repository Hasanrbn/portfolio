import pino from 'pino';

// Values that must never reach a log, wherever they appear (one or two levels deep).
// Requests are logged without headers or bodies, so this is a second line of defence for
// anything a future change attaches to a log line by mistake.
const REDACTED_KEYS = ['password', 'passwordHash', 'token', 'secret', 'authorization', 'cookie'];
const REDACT_PATHS = REDACTED_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]).concat([
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
]);

/**
 * Creates the application logger (pino): one JSON object per line, easy for hosting platforms
 * and log tools to search. While developing, lines are printed in a readable form instead.
 *
 * `destination` lets tests capture the output; leave it out to write to standard output.
 */
export function createLogger(env, destination) {
  const options = {
    level: env.LOG_LEVEL,
    base: { service: 'portfolio-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  };

  if (!destination && env.NODE_ENV === 'development') {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
      },
    });
  }

  return destination ? pino(options, destination) : pino(options);
}
