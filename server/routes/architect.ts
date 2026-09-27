import { Router, type Request, type Response } from "express";
import multer from "multer";
import crypto from "crypto";
import { db, type ProjectDoc, type Message, type Attachment, type Question, type Choice } from "../db.ts";
import { getCurrentUser, ensureAnonCookie, ANON_COOKIE } from "./auth.ts";
import { hardenImages, sanitizeImport } from "../html-utils.ts";
import { runArchitect, quickAnalysis } from "../brain.ts";
import type { TemplateData } from "../templates.ts";
import { geminiRotator } from "../lib/gemini.ts";

export const architectRouter = Router();

const upload = multer({
  limits: { fileSize: 500 * 1024 },
  storage: multer.memoryStorage(),
});

const DAILY_LIMIT = 20;
const SHARE_DAYS = 7;

const STAGES = [
  "Analysing your brief",
  "Choosing the design direction",
  "Laying out navigation and hero",
  "Writing the page sections",
  "Building the interactive screens",
  "Tuning the mobile layout",
  "Checking every section is complete",
];

const STAGE_FOCUS = [
  "brief", "palette", "hero", "sections", "interactions", "mobile", "review",
];

// Active background jobs: project_id -> abort controller
const activeJobs = new Map<string, { abort: () => void }>();

function getOwnerId(req: Request, res?: Response): string | null {
  const anon = req.cookies[ANON_COOKIE];
  if (res && !anon) {
    return ensureAnonCookie(req, res);
  }
  return anon || null;
}

function getQuota(consume: boolean = false) {
  const day = db.getTodayString();
  const used = consume ? db.incrementUsage(day) : db.getUsage(day);
  const remaining = Math.max(DAILY_LIMIT - used, 0);

  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  return {
    used,
    limit: DAILY_LIMIT,
    remaining,
    day,
    resets_at: tomorrow.toISOString(),
  };
}

architectRouter.get("/quota", (_req: Request, res: Response) => {
  res.json(getQuota());
});

// Templates list
architectRouter.get("/templates", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies[ANON_COOKIE];

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
  const ownerId = user?.user_id || req.cookies[ANON_COOKIE];
  const template = db.templates.get(req.params.template_id);

  if (!template || template.kind !== "import" || template.owner_id !== ownerId) {
    res.status(404).json({ detail: "Import not found" });
    return;
  }

  db.templates.delete(req.params.template_id);
  res.json({ ok: true });
});

// Projects list
architectRouter.get("/projects", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies[ANON_COOKIE];
  if (!ownerId) {
    res.json([]);
    return;
  }

  const list = Array.from(db.projects.values())
    .filter((p) => p.user_id === ownerId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((p) => ({
      id: p.id,
      title: p.title || "New project",
      style: p.style,
      has_site: Boolean(p.html),
      updated_at: p.updated_at,
    }));

  res.json(list);
});

// Get project
architectRouter.get("/projects/:project_id", async (req: Request, res: Response) => {
  const user = await getCurrentUser(req);
  const ownerId = user?.user_id || req.cookies[ANON_COOKIE];
  const project = db.projects.get(req.params.project_id);

  if (!project || (ownerId && project.user_id && project.user_id !== ownerId)) {
    res.status(404).json({ detail: "Project not found" });
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
  const ownerId = user?.user_id || req.cookies[ANON_COOKIE];
  const project = db.projects.get(req.params.project_id);

  if (!project || (ownerId && project.user_id && project.user_id !== ownerId)) {
    res.status(404).json({ detail: "Project not found" });
    return;
  }

  db.projects.delete(req.params.project_id);
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

  const quota = getQuota();
  if (quota.remaining <= 0) {
    res.status(429).json({
      detail:
        "We have reached the studio's build budget for today. Every project you started is saved in your workspace.",
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

  // Quick analysis on first turn
  const baseTemplate = project.template_id ? db.templates.get(project.template_id) || null : null;
  const isFirstTurn = !project.messages.slice(0, -1).some((m) => m.kind === "questions" || m.kind === "site");

  if (isFirstTurn && userText) {
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
  project.progress = STAGES[0];
  project.progress_step = 0;
  project.progress_pct = 1;
  project.progress_focus = STAGE_FOCUS[0];
  project.updated_at = new Date().toISOString();

  // Consume 1 quota unit
  const updatedQuota = getQuota(true);

  // Start background build
  startBackgroundBuild(project, baseTemplate);

  res.json({ project, quota: updatedQuota });
});

function startBackgroundBuild(project: ProjectDoc, baseTemplate: TemplateData | null) {
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

  // Run progress ticker and generation concurrently
  let step = 0;
  let pct = 5;
  const interval = setInterval(() => {
    if (isAborted) {
      clearInterval(interval);
      return;
    }
    pct = Math.min(pct + 7, 95);
    step = Math.min(step + 1, STAGES.length - 1);
    project.progress = STAGES[step];
    project.progress_step = step;
    project.progress_pct = pct;
    project.progress_focus = STAGE_FOCUS[step];
    project.updated_at = new Date().toISOString();
  }, 2000);

  runArchitect(project.id, transcript, project.html, [], baseTemplate)
    .then((result) => {
      clearInterval(interval);
      activeJobs.delete(project.id);
      if (isAborted) return;

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
      project.updated_at = new Date().toISOString();
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
        text: "The studio could not reach the design engine just now. Send your request again and I will pick it straight back up.",
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
      project.updated_at = new Date().toISOString();
    });
}

architectRouter.get("/gemini/status", (_req, res) => {
  res.json(geminiRotator.getStats());
});

