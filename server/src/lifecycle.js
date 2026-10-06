const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Makes the process stop cleanly:
 *
 *  - SIGTERM / SIGINT (deploys, Ctrl+C): stop accepting connections, let running requests
 *    finish, then exit 0. If that takes longer than the timeout, exit 1 anyway.
 *  - An uncaught exception or unhandled rejection means the program is in an unknown state:
 *    log it, then shut down with exit code 1 so the platform restarts a healthy copy.
 *
 * `cleanup` is a list of functions (sync or async) run after the server has stopped taking
 * requests and before the process exits. A failing one is logged and the rest still run.
 *
 * `processRef` and `exit` are injectable so tests do not stop the test runner.
 */
export function installShutdownHandlers({
  server,
  logger,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
  cleanup = [],
  processRef = process,
  exit = process.exit,
}) {
  let shuttingDown = false;

  function shutdown(reason, exitCode) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ reason }, 'shutting down');

    server.close(async (error) => {
      if (error) {
        logger.error({ err: error }, 'error while closing the server');
      }
      // Release what the server was holding (for example database connections) only after
      // the last request has finished, so no running request loses its connection.
      for (const task of cleanup) {
        try {
          await task();
        } catch (err) {
          logger.error({ err }, 'error during shutdown cleanup');
        }
      }
      exit(exitCode);
    });
    // Idle keep-alive connections would otherwise hold the server open until they time out.
    server.closeIdleConnections?.();

    // Force the exit if connections do not drain in time.
    setTimeout(() => exit(1), timeoutMs).unref();
  }

  processRef.on('SIGTERM', () => shutdown('SIGTERM', 0));
  processRef.on('SIGINT', () => shutdown('SIGINT', 0));
  processRef.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    shutdown('uncaughtException', 1);
  });
  processRef.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });

  return shutdown;
}
