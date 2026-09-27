import { GoogleGenAI } from "@google/genai";
import type { TemplateData } from "./templates.ts";
import { ALL_TEMPLATES } from "./templates.ts";
import { hardenImages } from "./html-utils.ts";

export const DESIGN_DNA = [
  "Dark Luxe — obsidian surfaces, gold or violet accents, huge serif display, slow reveals",
  "Swiss Editorial — strict grid, oversized type, generous white space, thin rules",
  "Glassmorphism Aurora — blurred translucent panels over animated mesh gradients",
  "Chic Brutalism — hard borders, raw blocks, offset shadows, one screaming accent",
  "Neo-Retro Print — warm paper tones, textured noise, condensed headlines",
  "Cyber Neon — near-black canvas, neon gradients, glow borders, mono labels",
  "Organic Soft — rounded shapes, pastel duotones, blob backgrounds, friendly copy",
  "Corporate Precision — navy and steel, data cards, crisp icons, confident hierarchy",
];

export const FONT_PAIRS = [
  "Playfair Display + Inter",
  "Space Grotesk + IBM Plex Sans",
  "Sora + DM Sans",
  "Bricolage Grotesque + Manrope",
  "Instrument Serif + Geist",
  "Syne + Work Sans",
  "Archivo Black + Karla",
];

// Key Rotator for multi-key load balancing & rate-limit resilience
interface KeyEntry {
  key: string;
  cooldownUntil: number;
  totalCalls: number;
  failures: number;
}

class GeminiKeyPool {
  private keys: KeyEntry[] = [];
  private pointer: number = 0;

  constructor() {
    this.refreshKeys();
  }

  refreshKeys(): void {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    const list = rawKeys
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    // Merge new keys without losing existing stats
    for (const key of list) {
      if (!this.keys.some((entry) => entry.key === key)) {
        this.keys.push({
          key,
          cooldownUntil: 0,
          totalCalls: 0,
          failures: 0,
        });
      }
    }
  }

  getKeyCount(): number {
    this.refreshKeys();
    return this.keys.length;
  }

  getNextKey(): { key: string; markResult: (success: boolean, isRateLimit?: boolean) => void } | null {
    this.refreshKeys();
    if (this.keys.length === 0) return null;

    const now = Date.now();
    // Find next available key not in cooldown
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.pointer + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.cooldownUntil <= now) {
        this.pointer = (idx + 1) % this.keys.length;
        entry.totalCalls++;
        return {
          key: entry.key,
          markResult: (success: boolean, isRateLimit: boolean = false) => {
            if (success) {
              entry.failures = 0;
            } else {
              entry.failures++;
              const penaltyMs = isRateLimit ? 45000 : 10000;
              entry.cooldownUntil = Date.now() + penaltyMs;
            }
          },
        };
      }
    }

    // If all keys are in cooldown, pick the one with earliest cooldown expiration
    const sorted = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    const best = sorted[0];
    best.totalCalls++;
    return {
      key: best.key,
      markResult: (success: boolean, isRateLimit: boolean = false) => {
        if (!success) {
          best.failures++;
          best.cooldownUntil = Date.now() + (isRateLimit ? 45000 : 10000);
        }
      },
    };
  }
}

export const keyPool = new GeminiKeyPool();

export const SYSTEM_PROMPT = `You are the SENIOR WEB ARCHITECT of LevelUp Studio — an elite boutique web design agency.
You design and write world-class, award-winning, production-grade websites.
Every website you build looks like it was designed by a top Silicon Valley / Parisian design agency.

THE STUDIO CATALOGUE
- Online portfolio: stunning typography, editorial grid, high-impact case study cards, filterable showcase.
- Creator & media sites: dynamic link-in-bio, interactive media kit for sponsors, audio/video teasers, email capture.
- Web design & landing pages: modern high-converting pages, micro-interactions, Bento grid layouts, pricing calculators.
- Barbershop & grooming: 24/7 chair booking, master barber profiles, real service pricing with duration, Google Maps card.
- Hair & beauty salons: aesthetic stylist gallery, luxury service list, treatment booking with date/time pickers.
- Online store: stylish apparel/lifestyle drop shop, sticky quick-cart preview, product variant selector, clean checkout preview.
- Online booking: doctor/therapist/coach appointments with step-by-step scheduler and calendar UI.
- Restaurants, cafés & bistros: bilingual interactive menu with dietary tags, wine pairing list, table reservation modal, directions.
- Events & festivals: poster-grade hero, interactive lineup agenda, tiered ticketing, venue details.

AESTHETIC & ARCHITECTURAL STANDARDS
1. Visual Polish: Use rich Tailwind utility classes, modern colors, subtle borders (border-white/10), backdrop-blur, smooth pill badges, responsive grids (grid-cols-1 md:grid-cols-2 lg:grid-cols-3).
2. Typography: Clean pairings with Google Fonts (e.g. Playfair + Inter, Sora + Manrope, Space Grotesk + Inter).
3. Realism: Write compelling, authentic copy tailored directly to the user's business, city and brand tone. NO placeholder text like "Lorem ipsum" or "Title goes here".
4. Interactive Components: Add functioning dropdowns, tabs, interactive modals, filter pills, and date pickers using clean vanilla JavaScript.
5. Demo Protection: Every booking, order, or checkout button must call the interactive demo modal notice:
   "This is a preview. To turn this into your real working website, contact LevelUp Studio."
6. Image Polish: Use inline SVG for crisp icons; real photographic imagery from https://picsum.photos/seed/<descriptive-slug>/<width>/<height>.
7. Language Matching: ALWAYS mirror the visitor's language. If they talk in French, write everything in French.

CONVERSATION DISCIPLINE
- Turn 1: If brand-new project, ask 4 or 5 sharp, trade-specific questions to decide visual direction and features.
- Turn 2 or Refinement: Build the FULL updated site document. Never ask questions twice. Return kind="site".

OUTPUT FORMAT: Strict raw JSON with no markdown wrapping fences.
Format A (Questions):
{"kind":"questions","title":"<3-5 words title>","text":"<warm 1-2 sentence acknowledgement>","questions":[{"label":"...","multi":false,"options":["...","...","..."]}]}
Format B (Site):
{"kind":"site","title":"<3-5 words title>","style":"<design DNA>","text":"<warm Markdown summary of sections built>","suggestions":["<tweak 1>","<tweak 2>","<tweak 3>"],"html":"<!DOCTYPE html>...full complete code ending in </html>"}
Format C (Refusal):
{"kind":"refusal","text":"<polite sentence steering user back to web design>"}
`;

const ANALYSIS_SYSTEM = `You are the intake note-taker for LevelUp Studio's senior web architect.
Read the visitor's first message and write ONE short paragraph (max 3 sentences, ~50 words) that
summarises what you understood: their business type, their city or context if mentioned, their
apparent goal, and one specific detail worth remembering. Match the visitor's language exactly.
Write in warm Markdown, no code, no lists, no headings, no fences. End with a short sentence such
as "Let me ask a few sharp questions before I build.". Do not ask any question yourself.
`;

export interface ArchitectResult {
  kind: "questions" | "site" | "refusal" | "error";
  text: string;
  title?: string;
  style?: string;
  questions?: Array<{ label: string; multi: boolean; options: string[] }>;
  suggestions?: string[];
  html?: string;
}

function extractJson(raw: string): any {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) {
    text = fence[1].trim();
  }
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch {
        // fallback
      }
    }
  }
  return null;
}

export async function quickAnalysis(userText: string, styleBrief: string = ""): Promise<string> {
  const trimmed = userText.trim();
  if (!trimmed) return "";

  const keyCount = keyPool.getKeyCount();
  const attempts = Math.max(1, Math.min(keyCount, 3));

  for (let i = 0; i < attempts; i++) {
    const keyHandle = keyPool.getNextKey();
    if (!keyHandle) break;

    try {
      const ai = new GoogleGenAI({ apiKey: keyHandle.key });
      const prompt = `VISITOR MESSAGE:\n${trimmed}${styleBrief ? `\n\nCHOSEN STYLE BRIEF:\n${styleBrief}` : ""}`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: ANALYSIS_SYSTEM,
          maxOutputTokens: 250,
        },
      });
      const text = response.text?.trim();
      if (text) {
        keyHandle.markResult(true);
        return text.replace(/^```|```$/g, "").trim();
      }
    } catch (err: any) {
      const isRate = String(err?.message || "").includes("429") || String(err?.status) === "429";
      keyHandle.markResult(false, isRate);
    }
  }

  // Graceful rule-based fallback
  const isFrench = /[éèàùçêâôîïëœ]|bonjour|site|pour/i.test(trimmed);
  if (isFrench) {
    return `J'ai bien noté votre demande : vous souhaitez concevoir un site web sur-mesure et soigné. Je prépare les bases de votre direction visuelle. Voici quelques questions précises pour adapter la structure à vos besoins.`;
  }
  return `I have noted your project: you are looking for a tailored, high-converting website with a distinct brand identity. Let me ask a few sharp questions before I build.`;
}

export function buildTurnPrompt(
  transcript: Array<{ role: string; text: string }>,
  currentHtml: string | null,
  baseTemplate: TemplateData | null,
): string {
  const dna = DESIGN_DNA[Math.floor(Math.random() * DESIGN_DNA.length)];
  const fonts = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];
  const parts: string[] = [];

  parts.push("CONVERSATION SO FAR (oldest first):");
  if (!transcript || transcript.length === 0) {
    parts.push("(empty — this is the first message of the project)");
  } else {
    for (const turn of transcript) {
      parts.push(`${turn.role.toUpperCase()}: ${turn.text}`);
    }
  }

  if (currentHtml) {
    parts.push(
      "\nAN EXISTING SITE IS ALREADY DELIVERED FOR THIS PROJECT. This turn is a REFINEMENT: " +
      "do not ask questions, change only what was asked and return kind='site' with the FULL updated document.\n" +
      "CURRENT DOCUMENT:\n" + currentHtml.slice(0, 100000)
    );
  } else if (baseTemplate && baseTemplate.kind === "starter" && baseTemplate.html) {
    parts.push(
      `\nTHE PERSON PICKED THE STARTER DESIGN '${baseTemplate.name}' (${baseTemplate.tagline}). ` +
      "Keep its visual language — palette, type, spacing, component shapes — and rebuild it around their business with far more content.\n" +
      "STARTER DESIGN:\n" + baseTemplate.html.slice(0, 50000)
    );
  } else {
    parts.push(`\nASSIGNED DESIGN DNA for this generation: ${dna}`);
    parts.push(`\nASSIGNED FONT PAIRING: ${fonts}`);
  }

  parts.push("\nReply with the single raw JSON object now.");
  return parts.join("\n");
}

export async function runArchitect(
  _sessionId: string,
  transcript: Array<{ role: string; text: string }>,
  currentHtml: string | null,
  _images: Array<{ data: string }>,
  baseTemplate: TemplateData | null,
): Promise<ArchitectResult> {
  const prompt = buildTurnPrompt(transcript, currentHtml, baseTemplate);
  const keyCount = keyPool.getKeyCount();
  const maxTries = Math.max(1, Math.min(keyCount, 5));

  for (let attempt = 0; attempt < maxTries; attempt++) {
    const keyHandle = keyPool.getNextKey();
    if (!keyHandle) break;

    try {
      const ai = new GoogleGenAI({ apiKey: keyHandle.key });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
        },
      });

      const parsed = extractJson(response.text || "");
      if (parsed && (parsed.kind === "site" || parsed.kind === "questions" || parsed.kind === "refusal")) {
        keyHandle.markResult(true);
        return parsed as ArchitectResult;
      }
    } catch (err: any) {
      const errMsg = String(err?.message || "");
      const isRate = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");
      console.warn(`Gemini key attempt ${attempt + 1} failed (rate limit: ${isRate}):`, errMsg.slice(0, 120));
      keyHandle.markResult(false, isRate);
    }
  }

  // High-fidelity fallback
  return fallbackArchitect(transcript, currentHtml, baseTemplate);
}

function fallbackArchitect(
  transcript: Array<{ role: string; text: string }>,
  currentHtml: string | null,
  baseTemplate: TemplateData | null,
): ArchitectResult {
  const lastUserMsg = [...transcript].reverse().find((t) => t.role.toLowerCase() === "user")?.text || "";
  const isFrench = /[éèàùçêâôîïëœ]|bonjour|salon|coiffure|boutique|restaurant|réservation|site/i.test(lastUserMsg);

  const hasAskedQuestions = transcript.some((t) => t.text.includes("Asked:") || (t.role === "assistant" && t.text.includes("questions")));
  const isRefinement = Boolean(currentHtml);

  if (!hasAskedQuestions && !isRefinement) {
    if (isFrench) {
      return {
        kind: "questions",
        title: "Projet Web Studio",
        text: "Voici les décisions clés pour bâtir un site parfaitement adapté à votre activité.",
        questions: [
          {
            label: "Quel est l'objectif premier de ce nouveau site ?",
            multi: false,
            options: [
              "Réservations et prises de rendez-vous en ligne",
              "Mettre en valeur le portfolio et les créations",
              "Vendre des produits ou services en ligne",
              "Présentation institutionnelle et contact direct",
            ],
          },
          {
            label: "Quelle ambiance visuelle correspond le mieux à votre marque ?",
            multi: false,
            options: [
              "Éditorial minimaliste et chaleureux (crème & noir)",
              "Dark luxe avec contrastes affirmés (obsidienne & néon)",
              "Moderne, dynamique et coloré",
              "Sobre, corporate et épuré",
            ],
          },
          {
            label: "Quelles sections indispensables souhaitez-vous intégrer ?",
            multi: true,
            options: [
              "Menu / Grille de tarifs détaillés avec durées",
              "Présentation de l'équipe et de l'expertise",
              "Témoignages clients et avis vérifiés",
              "Module de réservation avec calendrier interactif",
            ],
          },
        ],
      };
    }

    return {
      kind: "questions",
      title: "Studio Web Project",
      text: "A few key decisions before building your custom site.",
      questions: [
        {
          label: "What is the primary action visitors should take?",
          multi: false,
          options: [
            "Book an appointment or reservation",
            "Explore portfolio and work",
            "Purchase products or packages",
            "Contact and request a quote",
          ],
        },
        {
          label: "Which aesthetic direction best fits your brand?",
          multi: false,
          options: [
            "Warm editorial and clean typography",
            "Dark luxe with glowing accents",
            "Modern, energetic and vibrant",
            "Minimalist and precise",
          ],
        },
        {
          label: "Which key sections should we headline?",
          multi: true,
          options: [
            "Transparent pricing & service breakdown",
            "Team profiles & story",
            "Client reviews and testimonials",
            "Interactive booking scheduler",
          ],
        },
      ],
    };
  }

  // Deliver site
  let html = currentHtml;
  if (!html) {
    if (baseTemplate && baseTemplate.html) {
      html = baseTemplate.html;
    } else {
      const matched = ALL_TEMPLATES.find((t) => t.kind === "starter" && t.html) || ALL_TEMPLATES[0];
      html = matched.html || "";
    }
  }

  return {
    kind: "site",
    title: baseTemplate?.name || (isFrench ? "Site Studio" : "Studio Site"),
    style: baseTemplate?.best_for || "Dark Luxe",
    text: isFrench
      ? `**Structure déployée**\n- **En-tête & navigation** : Barre fixe avec liens d'ancrage fluides.\n- **Hero** : Proposition de valeur percutante et appel à l'action.\n- **Services & Tarifs** : Grille lisible avec durées et tarifs indicatifs.\n- **Réservation** : Formulaire interactif sécurisé.\n\n_Indiquez-moi les ajustements souhaités pour affiner la maquette._`
      : `**Delivered Architecture**\n- **Navigation** : Sticky header with real anchor transitions.\n- **Hero** : High-impact headline and primary CTA.\n- **Services & Rates** : Clear service cards with transparent pricing.\n- **Booking Screen** : Interactive consultation form.\n\n_Tell me what to adjust and I will tune it._`,
    suggestions: isFrench
      ? ["Ajouter une galerie de réalisations", "Changer la palette de couleurs", "Mettre la grille de prix en premier"]
      : ["Add a photo gallery", "Switch to a lighter color palette", "Move the price list to the top"],
    html: hardenImages(html),
  };
}
