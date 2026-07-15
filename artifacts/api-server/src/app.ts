import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index.js";
import setupWebSocket from "./routes/ws.js";
import { logger } from "./lib/logger.js";
import { pool } from "@workspace/db";

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required. " +
      "Set it in your .env file (e.g. SESSION_SECRET=your_random_secret_here).",
  );
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const PgSession = connectPgSimple(session);
const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Trust the first proxy hop when deployed behind Render/Vercel infrastructure.
// Required so that secure cookies are correctly set when running behind HTTPS.
app.set("trust proxy", 1);

// CORS: in production only allow origins listed in CORS_ORIGIN; in development
// permit localhost origins without explicit configuration.
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (curl, health checks) with no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, allow any localhost/127.0.0.1 origin for convenience.
      if (
        !isProduction &&
        (origin.startsWith("http://localhost") ||
          origin.startsWith("http://127.0.0.1"))
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// Raised from the default 100kb so base64-encoded avatar uploads (stored as
// data URLs, capped at 3MB client-side) fit in the request body.
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      // Auto-remove expired sessions every hour.
      pruneSessionInterval: 60 * 60,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.use("/api", router);

// Setup WebSocket
setupWebSocket(app);

export default app;
