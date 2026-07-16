import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RegisterBody,
  LoginBody,
  UpdateMeBody,
  ChangePasswordBody,
  DeleteMeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SALT_ROUNDS = 12;

function getSessionToken(req: any): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  const signature = crypto
    .createHmac("sha256", secret)
    .update(req.sessionID)
    .digest("base64")
    .replace(/=+$/, "");
  return `s:${req.sessionID}.${signature}`;
}
const MAX_AVATAR_URL_LENGTH = 2.5 * 1024 * 1024;

function isAllowedAvatarValue(value: string) {
  return (
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/webp;base64,") ||
    value.startsWith("data:image/gif;base64,") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function toAuthUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    domain: user.domain,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
    language: user.language,
    notifications: user.notifications,
    createdAt: user.createdAt,
  };
}

// Limit login attempts: max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts, please try again after 15 minutes.",
  },
});

// Limit registration: max 5 accounts per hour per IP to prevent spam
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many accounts created from this IP, please try again after an hour.",
  },
});

router.post(
  "/auth/register",
  registerLimiter,
  async (req, res): Promise<void> => {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { email, password, name, domain } = parsed.data;

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()));

    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name,
        domain: domain ?? null,
      })
      .returning();

    req.session.userId = user.id;

    res.status(201).json({
      ...toAuthUser(user),
      token: getSessionToken(req),
    });
  },
);

router.post("/auth/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;

  res.json({
    ...toAuthUser(user),
    token: getSessionToken(req),
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.sendStatus(204);
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    ...toAuthUser(user),
  });
});

router.put("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, bio, avatarUrl, theme, language, notifications } =
    parsed.data;

  if (avatarUrl != null) {
    if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) {
      res.status(400).json({ error: "Avatar image is too large" });
      return;
    }

    if (!isAllowedAvatarValue(avatarUrl)) {
      res.status(400).json({ error: "Invalid avatar image format" });
      return;
    }
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      ...(theme !== undefined ? { theme } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(notifications !== undefined ? { notifications } : {}),
    })
    .where(eq(usersTable.id, req.session.userId))
    .returning();

  if (!updatedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    ...toAuthUser(updatedUser),
  });
});

router.post("/auth/me/password", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  if (newPassword.length < 8) {
    res
      .status(400)
      .json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, req.session.userId));

  res.sendStatus(204);
});

router.post("/auth/me/delete", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = DeleteMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { currentPassword } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, req.session.userId));

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.sendStatus(204);
  });
});

export default router;
