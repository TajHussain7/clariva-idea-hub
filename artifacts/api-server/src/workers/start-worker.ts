import "../load-env.js";
import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { runWorkerCycle, getWorkerStats } from "./challenge-worker.js";
import { logger } from "../lib/logger.js";
import {
  WORKER_SCHEDULE_CONFIG,
  getMonitoringIntervalMs,
  validateCronSchedule,
} from "../config/worker-schedule.js";

const WORKER_NAME = "challenge-automation-worker";

// Get configuration
const CHALLENGE_CREATION_SCHEDULE =
  WORKER_SCHEDULE_CONFIG.challengeCreationSchedule;
const MONITORING_INTERVAL_MS = getMonitoringIntervalMs();
const TIMEZONE = WORKER_SCHEDULE_CONFIG.timezone;
const SCHEDULE_DESCRIPTION = WORKER_SCHEDULE_CONFIG.scheduleDescription;

let cronTask: ScheduledTask | null = null;
let monitoringIntervalId: NodeJS.Timeout | null = null;
let isShuttingDown = false;

/**
 * Start the challenge automation worker with cron scheduling
 */
async function startWorker(): Promise<void> {
  // Validate cron schedule before starting
  if (!validateCronSchedule(CHALLENGE_CREATION_SCHEDULE)) {
    logger.error(
      { schedule: CHALLENGE_CREATION_SCHEDULE },
      "Invalid cron schedule format. Please check worker-schedule.ts configuration.",
    );
    throw new Error(`Invalid cron schedule: ${CHALLENGE_CREATION_SCHEDULE}`);
  }

  logger.info(
    {
      workerName: WORKER_NAME,
      challengeSchedule: CHALLENGE_CREATION_SCHEDULE,
      scheduleDescription: SCHEDULE_DESCRIPTION,
      timezone: TIMEZONE,
      monitoringIntervalHours: MONITORING_INTERVAL_MS / (60 * 60 * 1000),
    },
    "Starting challenge automation worker with cron scheduling",
  );

  // Run immediately on startup to handle any pending tasks
  logger.info("Running initial worker cycle on startup");
  await runWorkerCycle().catch((error) => {
    logger.error({ error }, "Initial worker cycle failed");
  });

  // Schedule weekly challenge creation based on configuration
  cronTask = cron.schedule(
    CHALLENGE_CREATION_SCHEDULE,
    async () => {
      if (isShuttingDown) {
        logger.info(
          "Worker is shutting down, skipping scheduled challenge creation",
        );
        return;
      }

      logger.info(
        {
          schedule: CHALLENGE_CREATION_SCHEDULE,
          description: SCHEDULE_DESCRIPTION,
          timezone: TIMEZONE,
        },
        "🎯 Scheduled challenge creation triggered",
      );

      try {
        await runWorkerCycle();
        const stats = getWorkerStats();
        logger.info({ stats }, "✅ Scheduled challenge creation completed");
      } catch (error) {
        logger.error({ error }, "❌ Scheduled challenge creation failed");
      }
    },
    {
      timezone: TIMEZONE,
    },
  );

  logger.info(
    {
      schedule: CHALLENGE_CREATION_SCHEDULE,
      description: SCHEDULE_DESCRIPTION,
      timezone: TIMEZONE,
    },
    "✅ Cron job scheduled for weekly challenge creation",
  );

  // Also run monitoring checks periodically for:
  // - Challenge extensions (if no submissions within 24h of end)
  // - Winner calculations (when challenge expires)
  monitoringIntervalId = setInterval(async () => {
    if (isShuttingDown) {
      logger.info("Worker is shutting down, skipping monitoring cycle");
      return;
    }

    const stats = getWorkerStats();
    logger.info({ stats }, "🔍 Periodic monitoring check triggered");

    try {
      await runWorkerCycle();
    } catch (error) {
      logger.error({ error }, "Monitoring cycle failed");
      // Continue running despite errors
    }
  }, MONITORING_INTERVAL_MS);

  logger.info(
    {
      workerName: WORKER_NAME,
      challengeSchedule: `${SCHEDULE_DESCRIPTION} (${TIMEZONE})`,
      monitoringInterval: `Every ${MONITORING_INTERVAL_MS / (60 * 60 * 1000)} hour(s)`,
    },
    "🚀 Worker started successfully with dual scheduling (cron + interval monitoring)",
  );
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

  // Stop cron job
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info("Cron job stopped");
  }

  // Stop monitoring interval
  if (monitoringIntervalId) {
    clearInterval(monitoringIntervalId);
    monitoringIntervalId = null;
    logger.info("Monitoring interval stopped");
  }

  const stats = getWorkerStats();
  logger.info({ stats, workerName: WORKER_NAME }, "Worker stopped gracefully");

  process.exit(0);
}

/**
 * Error handler for uncaught errors
 */
function handleUncaughtError(error: Error, origin: string): void {
  logger.error(
    { error, origin, workerName: WORKER_NAME },
    "Uncaught error in worker process",
  );
  // Don't exit - let worker continue
}

// Register signal handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Register error handlers
process.on("uncaughtException", (error) =>
  handleUncaughtError(error, "uncaughtException"),
);
process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  handleUncaughtError(error, "unhandledRejection");
});

// Start the worker
startWorker().catch((error) => {
  logger.error({ error, workerName: WORKER_NAME }, "Failed to start worker");
  process.exit(1);
});
