import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
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

// In production (Render), CORS_ORIGIN must be set to the frontend URL
// e.g. CORS_ORIGIN=https://clariva-idea-hub-clariva-web.vercel.app
// Without this, cross-origin session cookies will be rejected → 401 errors after login.
if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
  throw new Error(
    "CORS_ORIGIN environment variable is required in production. " +
      "Set it to your frontend URL (e.g. https://clariva-idea-hub-clariva-web.vercel.app) " +
      "in your Render service environment variables.",
  );
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const PgSession = connectPgSimple(session);
const app: Express = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // Limit each IP to 300 requests per 15 mins
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

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
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, ""))
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (curl, health checks) with no Origin header.
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(cleanOrigin)) return callback(null, true);
      // In development, allow any localhost/127.0.0.1 origin for convenience.
      if (
        !isProduction &&
        (cleanOrigin.startsWith("http://localhost") ||
          cleanOrigin.startsWith("http://127.0.0.1"))
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

// Support token-based authentication via Authorization: Bearer <signed-session-id>
// to bypass browser third-party cookie restrictions when the frontend and API
// are on different top-level domains (e.g. Vercel + Render).
app.use((req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token) {
      const sessionCookie = `connect.sid=${encodeURIComponent(token)}`;
      req.headers.cookie = req.headers.cookie
        ? `${sessionCookie}; ${req.headers.cookie}`
        : sessionCookie;
    }
  }
  next();
});

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

// Apply rate limiter to API routes
app.use("/api", apiLimiter, router);

// Setup WebSocket
setupWebSocket(app);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled server error");
  const statusCode = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  const message = isProduction ? "Internal server error" : (err.message || "Internal server error");
  res.status(statusCode).json({ error: message });
});

export default app;
