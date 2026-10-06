import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installShutdownHandlers } from '../src/lifecycle.js';
import { createFakeLogger } from './helpers/logger.js';

function setup(cleanup = []) {
  const processRef = new EventEmitter();
  const exit = vi.fn();
  const logger = createFakeLogger();
  let onClosed;
  const server = {
    close: vi.fn((callback) => {
      onClosed = callback;
    }),
    closeIdleConnections: vi.fn(),
  };
  installShutdownHandlers({ server, logger, processRef, exit, timeoutMs: 5000, cleanup });
  return { processRef, exit, logger, server, finishClosing: (error) => onClosed(error) };
}

describe('shutdown handlers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each(['SIGTERM', 'SIGINT'])(
    'stops accepting connections on %s and exits 0 once closed',
    (signal) => {
      const { processRef, server, exit, finishClosing } = setup();

      processRef.emit(signal);

      expect(server.close).toHaveBeenCalledTimes(1);
      expect(server.closeIdleConnections).toHaveBeenCalledTimes(1);
      expect(exit).not.toHaveBeenCalled();

      finishClosing();
      expect(exit).toHaveBeenCalledWith(0);
    },
  );

  it('runs cleanup (such as closing the database pool) only after the server has closed', async () => {
    const order = [];
    const pool = vi.fn(async () => order.push('pool closed'));
    const { processRef, exit, finishClosing } = setup([pool]);
    exit.mockImplementation(() => order.push('exit'));

    processRef.emit('SIGTERM');
    expect(pool).not.toHaveBeenCalled();

    await finishClosing();

    expect(order).toEqual(['pool closed', 'exit']);
  });

  it('logs a failing cleanup task, still runs the others and still exits', async () => {
    const second = vi.fn();
    const { processRef, exit, logger, finishClosing } = setup([
      async () => {
        throw new Error('pool is stuck');
      },
      second,
    ]);

    processRef.emit('SIGTERM');
    await finishClosing();

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'error during shutdown cleanup',
    );
    expect(second).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('forces exit 1 when connections do not drain in time', () => {
    const { processRef, exit } = setup();

    processRef.emit('SIGTERM');
    vi.advanceTimersByTime(4999);
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('shuts down only once however many signals arrive', () => {
    const { processRef, server } = setup();

    processRef.emit('SIGTERM');
    processRef.emit('SIGINT');
    processRef.emit('SIGTERM');

    expect(server.close).toHaveBeenCalledTimes(1);
  });

  it('logs an uncaught exception and an unhandled rejection as fatal, then exits 1', () => {
    for (const [event, payload] of [
      ['uncaughtException', new Error('crash')],
      ['unhandledRejection', new Error('rejected')],
    ]) {
      const { processRef, logger, exit, finishClosing } = setup();

      processRef.emit(event, payload);
      finishClosing();

      expect(logger.fatal).toHaveBeenCalledWith({ err: payload }, expect.any(String));
      expect(exit).toHaveBeenCalledWith(1);
    }
  });

  it('logs a failure to close and still exits', () => {
    const { processRef, logger, exit, finishClosing } = setup();

    processRef.emit('SIGTERM');
    finishClosing(new Error('not running'));

    expect(logger.error).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(0);
  });
});
