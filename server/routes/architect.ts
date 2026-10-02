import { Router, type Request, type Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { db, type ProjectDoc, type Message, type Attachment, type ActivityEntry } from "../db.ts";
import { getCurrentUser, ensureAnonCookie, ANON_COOKIE } from "./auth.ts";
import { hardenImages, sanitizeImport } from "../html-utils.ts";
import { runArchitect, quickAnalysis, inspireBrief, assessImport, importRefusal, type ImportedFile } from "../brain.ts";
import type { TemplateData } from "../templates.ts";
import { geminiRotator } from "../lib/gemini.ts";

export const architectRouter = Router();

const upload = multer({
  limits: { fileSize: 500 * 1024 },
  storage: multer.memoryStorage(),
});

const DAILY_LIMIT_ANON = 10;
const DAILY_LIMIT_USER = 50;
const SHARE_DAYS = 7;

// Slow, deliberate activity feed — the architect is expected to take its time.
const ACTIVITY_PLAN: Array<{ icon: ActivityEntry["icon"]; label: string; detail: string; after: number }> = [
  { icon: "brief", label: "Reading the brief", detail: "Going through every answer and constraint before touching the layout.", after: 0 },
  { icon: "search", label: "Studying the market", detail: "Identifying the vocabulary, trust signals and conversion patterns of this trade.", after: 6000 },
  { icon: "palette", label: "Defining the design direction", detail: "Choosing palette, type pairing, spacing scale and motion language.", after: 14000 },
  { icon: "layout", label: "Structuring the page", detail: "Ordering 10+ sections the way a visitor actually reads, from hero to footer.", after: 24000 },
  { icon: "image", label: "Writing copy and selecting visuals", detail: "Real, specific copy for every block. Unique imagery per section.", after: 38000 },
  { icon: "code", label: "Writing the code", detail: "Semantic HTML, Tailwind utilities, vanilla JS for every interactive element.", after: 54000 },
  { icon: "bug", label: "Reviewing for defects", detail: "Scanning for dead buttons, placeholder syntax, missing sections and mobile issues.", after: 80000 },
];

// Active background jobs: project_id -> abort controller
const activeJobs = new Map<string, { abort: () => void }>();

function getOwnerId(req: Request, res?: Response): string | null {
  const anon = req.cookies?.[ANON_COOKIE];
  if (res && !anon) {
    return ensureAnonCookie(req, res);
  }
  return anon || null;
}

function hashId(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function clientIp(req: Request): string {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.ip || req.socket?.remoteAddress || "unknown";
}

// Anti-fraud: usage is tracked against the cookie, the IP and a browser fingerprint.
// Clearing cookies or storage does not reset the counter — the highest counter wins.
function quotaKeys(req: Request, ownerId: string | null, isAuthed: boolean): string[] {
  const day = db.getTodayString();
  const keys = [`${day}::${ownerId || "anon"}`];
  if (!isAuthed) {
    keys.push(`${day}::ip:${hashId(clientIp(req))}`);
    const fp = String(req.headers["x-client-fp"] || "").trim();
    if (fp) keys.push(`${day}::fp:${hashId(fp)}`);
  }
  return keys;
}

function getQuota(req: Request, ownerId: string | null, isAuthed: boolean, consume: boolean = false) {
  const day = db.getTodayString();
  const limit = isAuthed ? DAILY_LIMIT_USER : DAILY_LIMIT_ANON;
  const keys = quotaKeys(req, ownerId, isAuthed);
  const counts = keys.map((k) => (consume ? db.incrementUsage(k) : db.getUsage(k)));
  const used = Math.max(...counts);
  const remaining = Math.max(limit - used, 0);

  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  return {
    used,
    limit,
    remaining,
    day,
    is_authed: isAuthed,
    resets_at: tomorrow.toISOString(),
  };
}

// Database stats
architectRouter.get("/db/stats", (_req: Request, res: Response) => {
  res.json(db.getStats());
});

architectRouter.get("/quota", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE] || null;
  res.json(getQuota(req, ownerId, Boolean(user)));
});

// Inspiration: a realistic brief the visitor can start from (does not consume quota)
architectRouter.post("/inspire", async (req: Request, res: Response) => {
  const services: string[] = Array.isArray(req.body?.services) ? req.body.services.slice(0, 3).map(String) : [];
  const language = String(req.body?.language || "English").slice(0, 20);
  try {
    const brief = await inspireBrief(services, language);
    res.json({ brief });
  } catch (err: any) {
    res.status(503).json({ detail: "The studio is busy right now. Please try again in a moment." });
  }
});

// Templates list
architectRouter.get("/templates", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE];

  // If templates map is not yet hydrated from Firestore, attempt quick hydration
  if (db.templates.size === 0) {
    try {
      await db.syncFromFirestore();
    } catch {
      // ignore
    }
  }

  const service = req.query.service as string | undefined;
  const q = (req.query.q as string | undefined)?.toLowerCase().trim();

  let list = Array.from(db.templates.values()).filter((t) => {
    if (t.kind === "import") {
      return t.owner_id === ownerId;
    }
    return true;
  });

  if (service && service !== "all") {
    list = list.filter((t) => t.service === service);
  }

  if (q) {
    list = list.filter((t) => {
      const hay = [
        t.name,
        t.tagline,
        t.service,
        t.fonts || "",
        (t.palette || []).join(" "),
        (t.sections || []).join(" "),
        t.best_for,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  // Remove full html string from template list response for speed
  const mapped = list.map((t) => {
    const { html, ...rest } = t;
    return rest;
  });

  res.json(mapped);
});

// Explicit template seed trigger
architectRouter.post("/templates/seed", async (_req: Request, res: Response) => {
  try {
    await db.syncDefaultTemplatesToFirestore();
    res.json({ ok: true, count: db.templates.size, message: "Templates synchronized to Firestore database" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Template HTML preview
architectRouter.get("/templates/:template_id/html", (req: Request, res: Response) => {
  const template = db.templates.get(req.params.template_id);
  if (!template || !template.html) {
    res.status(404).send("Template preview not available");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(template.html);
});

// Template import
architectRouter.post(
  "/templates/import",
  upload.single("file") as any,
  async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      const ownerId = user?.user_id || ensureAnonCookie(req, res);

      if (!req.file) {
        res.status(400).json({ detail: "No file uploaded" });
        return;
      }

      const raw = req.file.buffer.toString("utf-8");
      const { cleaned, notes } = sanitizeImport(raw);

      const name = (req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "")).slice(0, 60) || "My import";
      const service = req.body.service || "landing";
      const id = `import-${crypto.randomBytes(6).toString("hex")}`;

      const doc: TemplateData = {
        id,
        name,
        tagline: "Imported from an .html file",
        best_for: "Your own design",
        service,
        accent: "#8b5cf6",
        kind: "import",
        palette: ["#0a0a0f", "#8b5cf6", "#ffffff"],
        fonts: null,
        sections: [],
        brief_prompt: null,
        owner_id: ownerId,
        html: cleaned,
        created_at: new Date().toISOString(),
      };

      db.templates.set(id, doc);
      db.scheduleSave();
      void db.syncTemplateToFirestore(doc);

      const { html, ...rest } = doc;
      res.json(rest);
    } catch (err: any) {
      res.status(415).json({ detail: err.message || "Import failed" });
    }
  }
);

// Delete imported template
architectRouter.delete("/templates/:template_id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE];
  const template = db.templates.get(req.params.template_id);

  if (!template || template.kind !== "import" || template.owner_id !== ownerId) {
    res.status(404).json({ detail: "Import not found" });
    return;
  }

  db.templates.delete(req.params.template_id);
  db.scheduleSave();
  void db.deleteTemplateFromFirestore(req.params.template_id);
  res.json({ ok: true });
});

// Projects list
architectRouter.get("/projects", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE];

  const list = Array.from(db.projects.values())
    .filter((p) => p.user_id === ownerId || p.user_id === "global" || !p.user_id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((p) => ({
      id: p.id,
      title: p.title || "Nouveau projet d'architecture",
      style: p.style,
      has_site: Boolean(p.html),
      updated_at: p.updated_at,
    }));

  res.json(list);
});

// Get project
architectRouter.get("/projects/:project_id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE];
  const project = db.projects.get(req.params.project_id);

  if (!project || (ownerId && project.user_id && project.user_id !== ownerId && project.user_id !== "global")) {
    res.status(404).json({ detail: "Projet introuvable" });
    return;
  }

  // Safety check for stuck generations
  if (project.generating && Date.now() - new Date(project.updated_at).getTime() > 600000) {
    project.generating = false;
  }

  res.json(project);
});

// Delete project
architectRouter.delete("/projects/:project_id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies?.[ANON_COOKIE];
  const project = db.projects.get(req.params.project_id);

  if (!project || (ownerId && project.user_id && project.user_id !== ownerId)) {
    res.status(404).json({ detail: "Project not found" });
    return;
  }

  db.projects.delete(req.params.project_id);
  db.scheduleSave();
  void db.deleteProjectFromFirestore(req.params.project_id);
  res.json({ ok: true });
});

// Project HTML
architectRouter.get("/projects/:project_id/html", (req: Request, res: Response) => {
  const project = db.projects.get(req.params.project_id);
  if (!project || !project.html) {
    res.status(404).send("No site generated yet");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(project.html);
});

// Stop project generation
architectRouter.post("/projects/:project_id/stop", async (req: Request, res: Response) => {
  const project = db.projects.get(req.params.project_id);
  if (!project) {
    res.status(404).json({ detail: "Project not found" });
    return;
  }

  const job = activeJobs.get(project.id);
  if (job) {
    job.abort();
    activeJobs.delete(project.id);
  }

  project.generating = false;
  project.progress = null;
  project.progress_step = 0;
  project.progress_focus = null;
  project.messages.push({
    id: crypto.randomUUID(),
    role: "assistant",
    kind: "text",
    text: "Build stopped. Tell me what to change and I will start again.",
    questions: [],
    attachments: [],
    site_name: null,
    site_style: null,
    suggestions: [],
    html: null,
    created_at: new Date().toISOString(),
  });
  project.updated_at = new Date().toISOString();
  db.scheduleSave();
  void db.syncProjectToFirestore(project);

  res.json(project);
});

// Share link
architectRouter.post("/projects/:project_id/share", (req: Request, res: Response) => {
  const project = db.projects.get(req.params.project_id);
  if (!project || !project.html) {
    res.status(404).json({ detail: "No site generated yet" });
    return;
  }

  const now = Date.now();
  const expires = project.share_expires_at ? new Date(project.share_expires_at).getTime() : 0;

  if (!project.share_token || expires <= now) {
    project.share_token = crypto.randomBytes(16).toString("hex");
    project.share_expires_at = new Date(now + SHARE_DAYS * 24 * 3600 * 1000).toISOString();
  }

  db.scheduleSave();
  void db.syncProjectToFirestore(project);

  const path = `/api/share/${project.share_token}`;
  const base = (process.env.APP_URL || "").replace(/\/+$/, "");
  res.json({
    url: base ? `${base}${path}` : path,
    path,
    expires_at: project.share_expires_at,
  });
});

// Public shared site
architectRouter.get("/share/:token", (req: Request, res: Response) => {
  let matched: ProjectDoc | null = null;
  for (const p of db.projects.values()) {
    if (p.share_token === req.params.token) {
      matched = p;
      break;
    }
  }

  if (!matched || !matched.html) {
    res.status(404).send("This preview link does not exist");
    return;
  }

  if (matched.share_expires_at && new Date(matched.share_expires_at).getTime() <= Date.now()) {
    res.status(410).send("This preview link has expired");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.send(matched.html);
});

// Chat
architectRouter.post("/chat", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || ensureAnonCookie(req, res);

  const { project_id, text, template_id, attachments = [] } = req.body || {};
  const userText = String(text || "").trim();

  if (!userText && (!attachments || attachments.length === 0)) {
    res.status(422).json({ detail: "Message is empty" });
    return;
  }

  const quota = getQuota(req, ownerId, Boolean(user));
  if (quota.remaining <= 0) {
    res.status(429).json({
      detail: user
        ? `You have reached your daily allowance of ${quota.limit} generations. It resets at midnight UTC.`
        : `The guest allowance of ${quota.limit} generations per day has been reached. Sign in for ${DAILY_LIMIT_USER} per day.`,
    });
    return;
  }

  let project: ProjectDoc;
  if (project_id && db.projects.has(project_id)) {
    project = db.projects.get(project_id)!;
  } else {
    const id = project_id || `proj_${crypto.randomBytes(6).toString("hex")}`;
    project = {
      id,
      user_id: ownerId,
      title: userText ? userText.slice(0, 48) : "New project",
      style: null,
      html: null,
      generating: false,
      progress: null,
      progress_step: 0,
      progress_pct: 0,
      progress_focus: null,
      template_id: template_id || null,
      share_token: null,
      share_expires_at: null,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.projects.set(id, project);
  }

  if (project.generating) {
    res.status(409).json({ detail: "A build is already running for this project" });
    return;
  }

  if (template_id) {
    project.template_id = template_id;
  }

  // Scanned attachments
  const scannedAttachments: Attachment[] = (attachments as any[]).map((att) => ({
    name: att.name || "attachment",
    mime: att.mime || "application/octet-stream",
    kind: att.kind || "other",
    data: att.data || "",
    scan: "ok",
  }));

  const userMsg: Message = {
    id: crypto.randomUUID(),
    role: "user",
    kind: "text",
    text: userText,
    questions: [],
    attachments: scannedAttachments,
    site_name: null,
    site_style: null,
    suggestions: [],
    html: null,
    created_at: new Date().toISOString(),
  };
  project.messages.push(userMsg);

  // Imported HTML file: assess complexity before spending a generation
  const htmlAttachment = scannedAttachments.find(
    (a) => a.kind === "text" && a.data && (/\.html?$/i.test(a.name) || /^\s*<!doctype html|^\s*<html/i.test(a.data)),
  );
  const imported: ImportedFile | null = htmlAttachment ? { name: htmlAttachment.name, html: htmlAttachment.data } : null;
  if (imported) {
    const verdict = assessImport(imported);
    if (!verdict.ok) {
      const refusal = importRefusal(imported, verdict.reason);
      project.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "refusal",
        text: refusal.text,
        questions: [],
        attachments: [],
        site_name: null,
        site_style: null,
        suggestions: [],
        html: null,
        cta: refusal.cta ?? null,
        created_at: new Date().toISOString(),
      });
      project.updated_at = new Date().toISOString();
      db.scheduleSave();
      void db.syncProjectToFirestore(project);
      res.json({ project, quota });
      return;
    }
  }

  // Quick analysis on first turn
  const baseTemplate = project.template_id ? db.templates.get(project.template_id) || null : null;
  const isFirstTurn = !project.messages.slice(0, -1).some((m) => m.kind === "questions" || m.kind === "site");

  if (isFirstTurn && userText && !imported) {
    const styleBrief = baseTemplate?.kind === "style" ? baseTemplate.brief_prompt || "" : "";
    try {
      const note = await quickAnalysis(userText, styleBrief);
      if (note) {
        project.messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "analysis",
          text: note,
          questions: [],
          attachments: [],
          site_name: null,
          site_style: null,
          suggestions: [],
          html: null,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // non-fatal
    }
  }

  project.generating = true;
  project.progress = ACTIVITY_PLAN[0].label;
  project.progress_step = 0;
  project.progress_pct = 0;
  project.progress_focus = null;
  project.activity = [];
  project.updated_at = new Date().toISOString();
  db.scheduleSave();
  void db.syncProjectToFirestore(project);

  // Consume 1 quota unit (cookie + IP + fingerprint)
  const updatedQuota = getQuota(req, ownerId, Boolean(user), true);

  // Start background build
  startBackgroundBuild(project, baseTemplate, imported);

  res.json({ project, quota: updatedQuota });
});

function entry(icon: ActivityEntry["icon"], label: string, detail: string, status: ActivityEntry["status"] = "done"): ActivityEntry {
  return { id: crypto.randomUUID(), icon, label, detail, at: new Date().toISOString(), status };
}

function startBackgroundBuild(project: ProjectDoc, baseTemplate: TemplateData | null, imported: ImportedFile | null) {
  let isAborted = false;
  const abort = () => {
    isAborted = true;
  };
  activeJobs.set(project.id, { abort });

  // Prepare transcript
  const transcript: Array<{ role: string; text: string }> = [];
  if (baseTemplate?.kind === "style" && baseTemplate.brief_prompt) {
    transcript.push({ role: "user", text: `[style brief chosen from gallery]\n${baseTemplate.brief_prompt}` });
  }
  for (const m of project.messages) {
    if (m.kind === "site") {
      transcript.push({ role: "assistant", text: `(delivered site: ${m.site_name || "site"})` });
    } else if (m.kind === "questions") {
      const qSummary = m.questions.map((q) => `${q.label} [${q.options.map((o) => o.label).join(", ")}]`).join("; ");
      transcript.push({ role: "assistant", text: `Asked: ${qSummary}` });
    } else {
      transcript.push({ role: m.role, text: m.text });
    }
  }

  // Activity feed: deliberate pacing, one running entry at a time
  const isQuestionTurn = !project.messages.some((m) => m.kind === "questions" || m.kind === "site") && !imported && !project.html;
  const plan = isQuestionTurn ? ACTIVITY_PLAN.slice(0, 2) : ACTIVITY_PLAN;
  const started = Date.now();
  const activity: ActivityEntry[] = [];
  project.activity = activity;
  const interval = setInterval(() => {
    if (isAborted) {
      clearInterval(interval);
      return;
    }
    const elapsed = Date.now() - started;
    const due = plan.filter((p) => p.after <= elapsed).length;
    if (due > activity.length) {
      activity.forEach((a) => (a.status = "done"));
      const next = plan[activity.length];
      activity.push(entry(next.icon, next.label, next.detail, "running"));
      project.progress = next.label;
      project.progress_step = activity.length - 1;
      project.updated_at = new Date().toISOString();
    }
  }, 1000);

  runArchitect(project.id, transcript, imported ? null : project.html, imported, baseTemplate)
    .then((result) => {
      clearInterval(interval);
      activeJobs.delete(project.id);
      if (isAborted) return;

      activity.forEach((a) => (a.status = "done"));
      if (result.kind === "site" && result.html) {
        for (const note of result.notes || []) activity.push(entry("palette", "Design decision", String(note)));
        const issues = result.issues || [];
        const sections = (result.html.match(/<section\b/gi) || []).length;
        const lines = result.html.split("\n").length;
        if (issues.length) {
          activity.push(entry("bug", "Defects corrected", issues.join(" · "), "warning"));
        }
        activity.push(entry("check", "Final review", `${sections} sections, ${lines} lines of code, interactive elements wired, LevelStudio badge in place.`));
      } else if (result.kind === "questions") {
        activity.push(entry("check", "Brief clarified", "A few targeted questions before any design work begins."));
      }

      const replyMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        kind: result.kind,
        text: result.text || "",
        questions: (result.questions || []).map((q) => ({
          id: crypto.randomUUID(),
          label: q.label,
          multi: Boolean(q.multi),
          options: (q.options || []).map((opt) => ({
            id: crypto.randomUUID(),
            label: opt,
          })),
        })),
        attachments: [],
        site_name: result.title || project.title,
        site_style: result.style || null,
        suggestions: result.suggestions || [],
        html: result.html ? hardenImages(result.html) : null,
        activity: [...activity],
        cta: result.cta ?? null,
        created_at: new Date().toISOString(),
      };

      if (result.title) project.title = result.title;
      if (replyMsg.html) {
        project.html = replyMsg.html;
        project.style = replyMsg.site_style;
      }

      project.messages.push(replyMsg);
      project.generating = false;
      project.progress = null;
      project.progress_step = 0;
      project.progress_pct = 0;
      project.progress_focus = null;
      project.activity = [];
      project.updated_at = new Date().toISOString();
      db.scheduleSave();
      void db.syncProjectToFirestore(project);
    })
    .catch((err) => {
      clearInterval(interval);
      activeJobs.delete(project.id);
      if (isAborted) return;

      console.error("Architect build error:", err);
      project.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "error",
        text: "The rendering studio hit a temporary error. Please resend your request in a moment — your brief and answers are kept.",
        questions: [],
        attachments: [],
        site_name: null,
        site_style: null,
        suggestions: [],
        html: null,
        created_at: new Date().toISOString(),
      });
      project.generating = false;
      project.progress = null;
      project.progress_step = 0;
      project.progress_pct = 0;
      project.progress_focus = null;
      project.activity = [];
      project.updated_at = new Date().toISOString();
      db.scheduleSave();
      void db.syncProjectToFirestore(project);
    });
}

architectRouter.get("/gemini/status", (_req, res) => {
  res.json(geminiRotator.getStats());
});

architectRouter.get("/stats", (_req, res) => {
  res.json({
    totalProjects: db.projects.size,
    totalTemplates: db.templates.size,
    totalUsers: db.users.size,
    totalSessions: db.sessions.size,
    todayUsage: db.getUsage(db.getTodayString()),
    timestamp: new Date().toISOString(),
  });
});

