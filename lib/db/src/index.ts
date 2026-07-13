import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In production (Supabase/Render) enforce SSL.
  // rejectUnauthorized: false is required for Supabase's RDS-backed certificates.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Cap pool size to avoid connection exhaustion on serverless/hobby plans.
  max: 10,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
