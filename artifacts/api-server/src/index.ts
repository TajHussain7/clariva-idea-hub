import "./load-env";
import app from "./app";
import { logger } from "./lib/logger";

import { pool } from "@workspace/db";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received. Closing HTTP server...");
  server.close(async () => {
    logger.info("HTTP server closed. Terminating database pool...");
    try {
      await pool.end();
      logger.info("Database pool closed successfully.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error closing database pool.");
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if connections hang
  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection detected");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught Exception thrown");
});
