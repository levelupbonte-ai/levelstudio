import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, type UserDoc } from "../db.ts";

export const authRouter = Router();

export const COOKIE_NAME = "session_token";
export const ANON_COOKIE = "anon_id";
const SESSION_DAYS = 7;
const ANON_DAYS = 30;

export function mintAnonId(): string {
  return `anon_${crypto.randomBytes(8).toString("hex")}`;
}

export function ensureAnonCookie(req: Request, res: Response): string {
  let anon = req.cookies[ANON_COOKIE];
  if (anon && typeof anon === "string" && anon.startsWith("anon_")) {
    return anon;
  }
  anon = mintAnonId();
  res.cookie(ANON_COOKIE, anon, {
    maxAge: ANON_DAYS * 24 * 3600 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    path: "/",
  });
  return anon;
}

export async function getCurrentUser(req: Request): Promise<UserDoc | null> {
  let token = req.cookies[COOKIE_NAME];
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.split(" ")[1]?.trim();
    }
  }
  if (!token) return null;

  const session = db.sessions.get(token);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.sessions.delete(token);
    return null;
  }

  const user = db.users.get(session.user_id);
  return user || null;
}

authRouter.post("/session", async (req: Request, res: Response) => {
  try {
    const { session_id, email: reqEmail, name: reqName, picture: reqPicture } = req.body || {};
    let email = (reqEmail && typeof reqEmail === "string" ? reqEmail.trim().toLowerCase() : "") || "creator@levelstudio.app";
    let name = (reqName && typeof reqName === "string" ? reqName.trim() : "") || "Studio Creator";
    let picture: string | null = reqPicture || null;
    let sessionToken = crypto.randomBytes(16).toString("hex");

    let userId = db.usersByEmail.get(email);
    if (!userId) {
      userId = `user_${crypto.randomBytes(6).toString("hex")}`;
      const newUser: UserDoc = {
        user_id: userId,
        email,
        name,
        picture,
        created_at: new Date().toISOString(),
      };
      db.users.set(userId, newUser);
      db.usersByEmail.set(email, userId);
    } else {
      const existing = db.users.get(userId);
      if (existing) {
        existing.name = name;
        if (picture) existing.picture = picture;
      }
    }

    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
    db.sessions.set(sessionToken, {
      session_token: sessionToken,
      user_id: userId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    res.cookie(COOKIE_NAME, sessionToken, {
      maxAge: SESSION_DAYS * 24 * 3600 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
    });

    const anonId = req.cookies[ANON_COOKIE];
    const migrated = anonId ? db.migrateAnon(anonId, userId) : 0;

    const user = db.users.get(userId);
    res.json({ user, migrated });
  } catch (err) {
    console.error("Session error:", err);
    res.status(500).json({ error: "Session creation failed" });
  }
});

authRouter.get("/me", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ detail: "Not signed in" });
    return;
  }
  res.json(user);
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    db.sessions.delete(token);
  }
  res.clearCookie(COOKIE_NAME, { path: "/", sameSite: "none", secure: true });
  res.json({ ok: true });
});
