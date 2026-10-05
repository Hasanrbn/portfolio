import { Writable } from 'node:stream';
import { vi } from 'vitest';
import { createLogger } from '../../src/utils/logger.js';

/** A logger whose methods are spies; `child` returns the same logger. */
export function createFakeLogger() {
  const logger = {
    fatal: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  };
  logger.child = vi.fn(() => logger);
  return logger;
}

/**
 * A real logger that keeps what it writes, so tests can read the JSON lines exactly as a
 * log collector would see them.
 */
export function createCapturingLogger({ level = 'debug' } = {}) {
  const chunks = [];
  const destination = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ NODE_ENV: 'test', LOG_LEVEL: level }, destination);

  return {
    logger,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
    raw: () => chunks.join(''),
  };
}
