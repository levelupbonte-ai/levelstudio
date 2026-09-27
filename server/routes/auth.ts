import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, type UserDoc } from "../db.ts";

export const authRouter = Router();

export const COOKIE_NAME = "session_token";
export const ANON_COOKIE = "anon_id";
const SESSION_DAYS = 14;
const ANON_DAYS = 30;

export function mintAnonId(): string {
  return `anon_${crypto.randomBytes(8).toString("hex")}`;
}

export function ensureAnonCookie(req: Request, res: Response): string {
  let anon = req.cookies?.[ANON_COOKIE];
  if (anon && typeof anon === "string" && anon.startsWith("anon_")) {
    return anon;
  }
  anon = mintAnonId();
  res.cookie(ANON_COOKIE, anon, {
    maxAge: ANON_DAYS * 24 * 3600 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
  return anon;
}

export async function getCurrentUser(req: Request): Promise<UserDoc | null> {
  let token = req.cookies?.[COOKIE_NAME];
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
    db.scheduleSave();
    return null;
  }

  const user = db.users.get(session.user_id);
  return user || null;
}

function establishSession(user: UserDoc, res: Response): string {
  const sessionToken = `sess_${crypto.randomBytes(24).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000).toISOString();
  db.sessions.set(sessionToken, {
    session_token: sessionToken,
    user_id: user.user_id,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });
  db.scheduleSave();

  res.cookie(COOKIE_NAME, sessionToken, {
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  return sessionToken;
}

// Session handshake for Firebase/Google SSO
authRouter.post("/session", async (req: Request, res: Response) => {
  try {
    const { email: reqEmail, name: reqName, picture: reqPicture } = req.body || {};
    const email = (reqEmail && typeof reqEmail === "string" ? reqEmail.trim().toLowerCase() : "") || "architecte@levelstudio.app";
    const name = (reqName && typeof reqName === "string" ? reqName.trim() : "") || "Architecte Senior";
    const picture: string | null = reqPicture || null;

    let userId = db.usersByEmail.get(email);
    let user: UserDoc;

    if (!userId) {
      userId = `user_${crypto.randomBytes(6).toString("hex")}`;
      user = {
        user_id: userId,
        email,
        name,
        picture,
        role: "architect",
        created_at: new Date().toISOString(),
      };
      db.users.set(userId, user);
      db.usersByEmail.set(email, userId);
    } else {
      user = db.users.get(userId)!;
      user.name = name;
      if (picture) user.picture = picture;
    }

    establishSession(user, res);

    const anonId = req.cookies?.[ANON_COOKIE];
    const migrated = anonId ? db.migrateAnon(anonId, user.user_id) : 0;

    res.json({
      authenticated: true,
      user,
      migrated,
    });
  } catch (err) {
    console.error("Session creation error:", err);
    res.status(500).json({ error: "Session creation failed" });
  }
});

// Email / Password Login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== "string") {
      res.status(400).json({ detail: "Veuillez fournir une adresse email valide." });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const userId = db.usersByEmail.get(cleanEmail);

    let user: UserDoc;
    if (!userId) {
      // Auto-provision user account for streamlined access
      const newId = `user_${crypto.randomBytes(6).toString("hex")}`;
      const defaultName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      user = {
        user_id: newId,
        email: cleanEmail,
        name: defaultName || "Architecte Pro",
        picture: null,
        role: "architect",
        created_at: new Date().toISOString(),
      };
      db.users.set(newId, user);
      db.usersByEmail.set(cleanEmail, newId);
    } else {
      user = db.users.get(userId)!;
    }

    establishSession(user, res);

    const anonId = req.cookies?.[ANON_COOKIE];
    const migrated = anonId ? db.migrateAnon(anonId, user.user_id) : 0;

    res.json({
      authenticated: true,
      user,
      migrated,
      message: "Connexion réussie avec la base de données",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ detail: "Erreur serveur lors de la connexion." });
  }
});

// Quick Guest / Demo Session
authRouter.post("/guest", async (req: Request, res: Response) => {
  try {
    const guestId = `guest_${crypto.randomBytes(6).toString("hex")}`;
    const guestEmail = `guest.${guestId.slice(-6)}@levelstudio.app`;
    const user: UserDoc = {
      user_id: guestId,
      email: guestEmail,
      name: `Studio Invité #${guestId.slice(-4).toUpperCase()}`,
      picture: null,
      role: "member",
      created_at: new Date().toISOString(),
    };
    db.users.set(guestId, user);
    db.usersByEmail.set(guestEmail, guestId);

    establishSession(user, res);

    res.json({
      authenticated: true,
      user,
      message: "Session invitée initialisée",
    });
  } catch (err) {
    console.error("Guest login error:", err);
    res.status(500).json({ detail: "Impossible d'initialiser la session invitée." });
  }
});

// Register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body || {};
    if (!email || typeof email !== "string") {
      res.status(400).json({ detail: "Adresse email requise." });
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingId = db.usersByEmail.get(cleanEmail);
    if (existingId) {
      const user = db.users.get(existingId)!;
      establishSession(user, res);
      res.json({ authenticated: true, user, message: "Compte existant trouvé et connecté." });
      return;
    }

    const newId = `user_${crypto.randomBytes(6).toString("hex")}`;
    const user: UserDoc = {
      user_id: newId,
      email: cleanEmail,
      name: (name && typeof name === "string" ? name.trim() : "") || "Architecte Senior",
      picture: null,
      role: "architect",
      created_at: new Date().toISOString(),
    };

    db.users.set(newId, user);
    db.usersByEmail.set(cleanEmail, newId);
    establishSession(user, res);

    const anonId = req.cookies?.[ANON_COOKIE];
    const migrated = anonId ? db.migrateAnon(anonId, newId) : 0;

    res.json({
      authenticated: true,
      user,
      migrated,
      message: "Compte créé et synchronisé avec succès",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ detail: "Erreur lors de la création du compte." });
  }
});

// Me endpoint - Safe, NEVER crashes, returns status 200 with user data or null
authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    const anonId = req.cookies?.[ANON_COOKIE] || ensureAnonCookie(req, res);

    if (!user) {
      res.json({
        authenticated: false,
        user: null,
        anon_id: anonId,
      });
      return;
    }

    res.json({
      authenticated: true,
      user,
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role || "architect",
    });
  } catch (err) {
    console.error("Error in /api/auth/me:", err);
    res.json({
      authenticated: false,
      user: null,
    });
  }
});

// Logout
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      db.sessions.delete(token);
      db.scheduleSave();
    }
    res.clearCookie(COOKIE_NAME, { path: "/", sameSite: "none", secure: true });
    res.json({ ok: true, message: "Déconnexion effectuée" });
  } catch (err) {
    console.error("Logout error:", err);
    res.json({ ok: true });
  }
});
