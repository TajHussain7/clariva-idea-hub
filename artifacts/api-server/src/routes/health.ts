import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function handleHealthCheck(_req: any, res: any) {
  try {
    await db.execute(sql`SELECT 1`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: "error", error: "Database connection failed" });
  }
}

router.get("/health", handleHealthCheck);
router.get("/healthz", handleHealthCheck);

export default router;
