import "../load-env.js";
import { runWorkerCycle, getWorkerStats } from "./challenge-worker.js";
import { logger } from "../lib/logger.js";

const WORKER_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const WORKER_NAME = "challenge-automation-worker";

let intervalId: NodeJS.Timeout | null = null;
let isShuttingDown = false;

/**
 * Start the challenge automation worker
 */
async function startWorker(): Promise<void> {
  logger.info(
    {
      workerName: WORKER_NAME,
      intervalMs: WORKER_INTERVAL_MS,
      intervalHours: WORKER_INTERVAL_MS / (60 * 60 * 1000),
    },
    "Starting challenge automation worker"
  );

  // Run immediately on startup
  logger.info("Running initial worker cycle");
  await runWorkerCycle().catch((error) => {
    logger.error({ error }, "Initial worker cycle failed");
  });

  // Then run on interval
  intervalId = setInterval(async () => {
    if (isShuttingDown) {
      logger.info("Worker is shutting down, skipping cycle");
      return;
    }

    const stats = getWorkerStats();
    logger.info({ stats }, "Worker interval triggered");

    try {
      await runWorkerCycle();
    } catch (error) {
      logger.error({ error }, "Worker cycle failed");
      // Continue running despite errors
    }
  }, WORKER_INTERVAL_MS);

  logger.info({ workerName: WORKER_NAME }, "Worker started successfully");
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Received shutdown signal, stopping worker");

  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const stats = getWorkerStats();
  logger.info(
    { stats, workerName: WORKER_NAME },
    "Worker stopped gracefully"
  );

  process.exit(0);
}

/**
 * Error handler for uncaught errors
 */
function handleUncaughtError(error: Error, origin: string): void {
  logger.error(
    { error, origin, workerName: WORKER_NAME },
    "Uncaught error in worker process"
  );
  // Don't exit - let worker continue
}

// Register signal handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Register error handlers
process.on("uncaughtException", (error) =>
  handleUncaughtError(error, "uncaughtException")
);
process.on("unhandledRejection", (reason) => {
  const error =
    reason instanceof Error ? reason : new Error(String(reason));
  handleUncaughtError(error, "unhandledRejection");
});

// Start the worker
startWorker().catch((error) => {
  logger.error({ error, workerName: WORKER_NAME }, "Failed to start worker");
  process.exit(1);
});
