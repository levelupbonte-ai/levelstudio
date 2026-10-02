import type { TemplateData } from "./templates.ts";
import { geminiRotator } from "./lib/gemini.ts";

export const MODEL = "gemini-3.1-flash-lite";

export const keyPool = geminiRotator;

export const SYSTEM_PROMPT = `You are the Lead Web Architect of LevelStudio (LevelUp Ecosystem) — a senior agency professional producing bespoke, production-grade single-file websites.
Tone: calm, precise, professional. No hype, no emojis, no exclamation marks. You write like a senior consultant, not a chatbot.

CONVERSATION DISCIPLINE (NON-NEGOTIABLE)
- Turn 1 (ALWAYS): ONLY ask strategic questions. NEVER build on turn 1. Return kind="questions" with 4-5 precise questions covering: target audience and tone, core sections required, visual direction and palette, primary conversion goal, branding/content details (name, slogan, colours already in use).
- Turn 2 onwards (after the user answered): build the FULL site. Return kind="site". Do not ask questions again unless the user explicitly asks for a redesign.
- Never mix questions and html in one response.
- Skip questions ONLY if the prompt explicitly says "skip questions and build now", or if this is a REFINEMENT of an existing site (CURRENT ACTIVE HTML CODE present), or if an IMPORTED HTML FILE is present (then modify that file as requested).

IMPORTED HTML FILES
- If the user attached an HTML file, treat it as the base. Apply the requested changes while preserving their structure, content and branding. Return the complete updated file.
- If the imported file is too heavy or too complex to be reliably edited in one pass (framework bundles, thousands of lines, obfuscated code), return kind="refusal" with a short, courteous professional explanation and a concrete alternative (simplify the file, or request a production build via LevelUp Ecosystem). Do not apologise excessively.

ABSOLUTE OUTPUT RULES FOR HTML (violations make the output unusable)
1. The "html" value is a FINISHED, LITERAL HTML document. It is NOT a template, NOT JSX, NOT a JavaScript string. NEVER write placeholders such as \${...}, {[1,2,3].map(...)}, \`...\`.join(''), {{variable}}, <% %>, or "repeat for each". Write every card, every item, every list entry explicitly, in full, with unique real content.
2. ZERO emojis anywhere in the site (no Unicode pictographs). Icons are inline SVG only (Lucide/Heroicons style, stroke 1.5-2).
3. ZERO dead controls. Every <button> and <a> must do something: anchors point to a real section id on the page (#pricing, #contact...), buttons toggle a visible element (menu, accordion, tab, modal, form submit with inline confirmation). No href="#" without behaviour, no onclick="". Implement the JavaScript for every interactive element you add.
4. Motion: include tasteful animations — a reveal-on-scroll system (IntersectionObserver adding a class), a subtle hero entrance (staggered fade/slide of headline, subheadline, CTAs), hover transitions on cards/buttons, and smooth anchor scrolling. Respect prefers-reduced-motion.
5. Images: https://picsum.photos/seed/<unique-descriptive-slug>/1200/800 with unique slugs per image, always with loading="lazy" and descriptive alt. Logos/avatars: inline SVG or initials.
6. Copy: domain-specific, professional, concrete (numbers, names, specifics). No lorem ipsum, no "Modality 1", no generic filler, no repeated sentences across cards.
7. Language of the site copy mirrors the visitor's language. English UI if the visitor writes English, French if French.
8. Single-file: Tailwind CDN + Google Fonts + vanilla JS. Mobile-first responsive navigation with a working hamburger menu. Full meta tags. Must END with </html>. Target 450-750 lines. Never truncate.

MANDATORY STRUCTURE WHEN BUILDING (at least 10 distinct <section> elements)
- Sticky header: logo, 5-6 nav links to real sections, one CTA
- Hero: headline, subheadline, two CTAs, trust line, visual
- Logos / social proof strip (6 inline SVG wordmarks)
- Features / services grid (6 explicit cards)
- Process / how it works (3-4 numbered steps)
- Showcase / interactive block (tabs, gallery, calculator or carousel — functional)
- Metrics (4 KPIs)
- Pricing or offers (3 tiers, full feature lists)
- Testimonials (3 explicit quotes with name, role)
- FAQ accordion (6 explicit items, functional)
- Final CTA / contact form (functional inline confirmation)
- Footer: 4 columns + legal line, and at the very bottom this exact badge:
  <a href="https://levelup-ecosystem.com" target="_blank" rel="noopener" class="inline-flex items-center gap-2 text-xs opacity-70 hover:opacity-100 transition" data-testid="built-by-levelstudio"><span>Built with</span><strong>LevelStudio</strong><span>by LevelUp Ecosystem</span></a>
Before answering, count your <section> tags (need 10+) and scan for \${, .map(, .join(, emojis — remove them.

VISUAL STANDARDS
Deep layered palettes adapted to the trade (not always violet), one accent colour, generous spacing, strong typographic hierarchy via Google Fonts pairings (Sora + DM Sans, Space Grotesk + Inter, Playfair Display + Inter, Manrope + Fraunces...), consistent radius, subtle borders, no gradients on text.

OUTPUT FORMAT: strict raw JSON, no markdown fences.
Format A (questions, turn 1):
{"kind":"questions","title":"<3-5 words>","text":"<1-2 sentence professional opening>","questions":[{"label":"<question>","multi":false,"options":["<opt1>","<opt2>","<opt3>","<opt4>"]}, ... 4-5 total]}
Format B (site, turn 2+):
{"kind":"site","title":"<3-5 words>","style":"<design direction>","text":"<concise Markdown summary: what was built, structure, design choices — max 160 words, no emojis>","notes":["<short line about a decision taken>", ... 4-6 lines],"suggestions":["<tweak1>","<tweak2>","<tweak3>"],"html":"<!DOCTYPE html>...</html>"}
Format C (refusal): {"kind":"refusal","text":"<courteous professional explanation + alternative>"}
`;

const ANALYSIS_SYSTEM = `You are the Lead Web Architect of LevelStudio.
Read the visitor's brief and write ONE professional paragraph (2 sentences, max 50 words) capturing their ambition, market and the design direction you intend to explore.
Match the visitor's language. Plain Markdown, no bullet points, no emojis, no exclamation marks. End by stating that you will ask a few questions before designing.`;

const INSPIRE_SYSTEM = `You are the Lead Web Architect of LevelStudio. Write ONE realistic, specific website brief (45-70 words) that a real business owner might send to an agency: business name, trade, city, target clients, 3-4 desired sections, tone and colour preference.
Write in the language requested. Plain text, one paragraph, no quotes, no emojis, no bullet points.`;

export interface ArchitectResult {
  kind: "questions" | "site" | "refusal" | "error" | "overloaded";
  text: string;
  title?: string;
  style?: string;
  notes?: string[];
  questions?: Array<{ label: string; multi: boolean; options: string[] }>;
  suggestions?: string[];
  html?: string;
  cta?: { label: string; url: string } | null;
  issues?: string[];
}

export const CONTACT_CTA = { label: "Contact LevelUp Ecosystem", url: "https://levelup-ecosystem.com/contact" };

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/u;

export function auditHtml(html: string): string[] {
  const issues: string[] = [];
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  if (/\$\{[^}]*\}/.test(withoutScripts)) issues.push("Unrendered template placeholders (${...}) found in markup");
  if (/\]\.map\(|\)\.join\(/.test(withoutScripts)) issues.push("JavaScript array code (.map/.join) leaked into markup");
  if (/\{\{[^}]+\}\}/.test(withoutScripts)) issues.push("Mustache placeholders ({{...}}) found in markup");
  if (EMOJI_RE.test(withoutScripts)) issues.push("Emoji characters found in site copy");
  const sections = (html.match(/<section\b/gi) || []).length;
  if (sections < 8) issues.push(`Only ${sections} <section> blocks (minimum 10 expected)`);
  if (!/<\/html>\s*$/i.test(html.trim())) issues.push("Document does not end with </html>");
  return issues;
}

export function stripEmojis(html: string): string {
  return html.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/gu, "");
}

function extractJson(raw: string): any {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch {
        // fall through
      }
    }
  }
  return null;
}

function isOverloadError(err: any): boolean {
  const msg = String(err?.message || err || "");
  return (
    /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|quota|Rate limit|overloaded/i.test(msg) ||
    geminiRotator.getStats().availableKeys === 0
  );
}

export function overloadedResult(): ArchitectResult {
  return {
    kind: "overloaded",
    text: "The studio is receiving a very high volume of requests right now and I would rather not deliver a rushed result. Please try again in a few minutes — your brief and answers are saved. If your project is time-sensitive, the LevelUp Ecosystem team can take it over directly.",
    cta: CONTACT_CTA,
  };
}

async function generate(prompt: string, maxOutputTokens: number, temperature: number): Promise<string> {
  return geminiRotator.executeWithRotation(async (ai) => {
    const resp = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature, maxOutputTokens },
    });
    return resp.text || "";
  });
}

export async function quickAnalysis(userText: string, styleBrief: string = ""): Promise<string> {
  const trimmed = userText.trim();
  if (!trimmed) return "";
  try {
    const text = await generate(
      `${ANALYSIS_SYSTEM}\n\nUser brief:\n${trimmed}\n\n${styleBrief ? `Chosen style direction:\n${styleBrief}` : ""}`,
      220,
      0.6,
    );
    return stripEmojis(text.trim());
  } catch {
    return "";
  }
}

export async function inspireBrief(services: string[], language: string = "English"): Promise<string> {
  const focus = services.length ? `Trade/category to use: ${services.join(", ")}.` : "Pick any realistic local business.";
  const seed = Math.random().toString(36).slice(2, 8);
  const text = await generate(`${INSPIRE_SYSTEM}\n\nLanguage: ${language}. ${focus} Variation seed: ${seed}.`, 200, 1.0);
  return stripEmojis(text.trim().replace(/^["']|["']$/g, ""));
}

export interface ImportedFile {
  name: string;
  html: string;
}

const IMPORT_MAX_BYTES = 180_000;
const IMPORT_MAX_LINES = 2_600;

export function assessImport(file: ImportedFile): { ok: true } | { ok: false; reason: string } {
  const bytes = Buffer.byteLength(file.html, "utf-8");
  const lines = file.html.split("\n").length;
  const heavyFramework = /react(-dom)?(\.production)?\.min\.js|angular\.min\.js|vue(\.global)?\.min\.js|webpack|__NEXT_DATA__|data-reactroot|ng-version/i.test(file.html);
  const minified = lines < 40 && bytes > 40_000;
  if (bytes > IMPORT_MAX_BYTES) return { ok: false, reason: `the file weighs ${(bytes / 1024).toFixed(0)} KB, above the ${Math.round(IMPORT_MAX_BYTES / 1024)} KB I can rework reliably in a single pass` };
  if (lines > IMPORT_MAX_LINES) return { ok: false, reason: `the file has ${lines} lines, above the ${IMPORT_MAX_LINES}-line ceiling for a safe single-pass edit` };
  if (heavyFramework) return { ok: false, reason: "it is a compiled framework application (React/Vue/Angular bundle) rather than a static page" };
  if (minified) return { ok: false, reason: "it is minified or obfuscated, which makes targeted edits unreliable" };
  return { ok: true };
}

export function importRefusal(file: ImportedFile, reason: string): ArchitectResult {
  return {
    kind: "refusal",
    text: `I have reviewed **${file.name}** and I would prefer not to edit it automatically: ${reason}. A single-pass AI edit on this kind of file tends to break layout or scripts, and I will not deliver work I cannot stand behind.\n\nTwo reliable options: send a lighter, static version of the page (under ${Math.round(IMPORT_MAX_BYTES / 1024)} KB), or hand the file to the LevelUp Ecosystem team for a manual production build.`,
    cta: CONTACT_CTA,
  };
}

export async function runArchitect(
  projectId: string,
  transcript: Array<{ role: string; text: string }>,
  currentHtml?: string | null,
  imported?: ImportedFile | null,
  baseTemplate?: TemplateData | null,
): Promise<ArchitectResult> {
  const formattedTranscript = transcript.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n\n");

  let prompt = `PROJECT CONVERSATION HISTORY:\n${formattedTranscript}\n\n`;

  if (imported) {
    prompt += `IMPORTED HTML FILE "${imported.name}" (modify this file as requested, preserve its identity):\n${imported.html}\n\n`;
  } else if (currentHtml) {
    prompt += `CURRENT ACTIVE HTML CODE (refine based on the latest user request, keep everything else):\n${currentHtml.slice(0, 60000)}\n\n`;
  } else if (baseTemplate && baseTemplate.html) {
    prompt += `BASE STARTER TEMPLATE (aesthetic and structural reference only):\n${baseTemplate.html.slice(0, 20000)}\n\n`;
  }

  prompt += `TASK:\nRespond in raw JSON following the SYSTEM PROMPT. Format A for questions, Format B for a site, Format C for a refusal.`;

  const attempt = async (extra: string): Promise<ArchitectResult | null> => {
    const raw = await generate(`${SYSTEM_PROMPT}\n\n${prompt}${extra}`, 32768, 0.7);
    const parsed = extractJson(raw);
    if (!parsed || !parsed.kind) return null;
    if (parsed.text) parsed.text = stripEmojis(String(parsed.text));
    return parsed as ArchitectResult;
  };

  try {
    let result = await attempt("");
    if (result?.kind === "site" && result.html) {
      let issues = auditHtml(result.html);
      const blocking = issues.filter((i) => !i.startsWith("Only") && !i.startsWith("Emoji"));
      if (blocking.length) {
        console.warn(`[Architect] Audit failed, regenerating once: ${blocking.join(" | ")}`);
        const retry = await attempt(
          `\n\nQUALITY CONTROL — your previous output was rejected for these defects: ${blocking.join("; ")}. Rewrite the complete site with every item written out literally. No template syntax, no emojis.`,
        );
        if (retry?.kind === "site" && retry.html) {
          const retryIssues = auditHtml(retry.html);
          if (retryIssues.filter((i) => !i.startsWith("Only") && !i.startsWith("Emoji")).length <= blocking.length) {
            result = retry;
            issues = retryIssues;
          }
        }
      }
      result.html = stripEmojis(result.html || "");
      result.issues = issues;
    }
    if (!result) {
      return {
        kind: "error",
        text: "The model returned an unreadable response. Please send your message again — your brief is saved.",
      };
    }
    return result;
  } catch (err: any) {
    console.error("[Architect Error]", err?.message || err);
    if (isOverloadError(err)) return overloadedResult();
    return {
      kind: "error",
      text: "The rendering studio hit a temporary error. Please resend your request in a moment — your brief and answers are kept.",
    };
  }
}
