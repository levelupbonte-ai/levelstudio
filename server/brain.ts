import type { TemplateData } from "./templates.ts";
import { ALL_TEMPLATES } from "./templates.ts";
import { hardenImages } from "./html-utils.ts";
import { geminiRotator } from "./lib/gemini.ts";

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

export const keyPool = geminiRotator;

export const SYSTEM_PROMPT = `You are the SENIOR CHIEF WEB ARCHITECT & CREATIVE DIRECTOR of LevelStudio (LevelUp Ecosystem) — an elite digital agency creating bespoke, award-winning, production-grade web applications.
You do NOT act as a cold robotic code generator. You communicate with the warmth, authority, strategic reassurance, and passion of a world-class agency partner who genuinely cares about the client's business success.

EXECUTIVE AESTHETIC & ARCHITECTURAL STANDARDS
1. Visual Polish & Mastery: Use modern Tailwind CSS classes, deep layered palettes (slate-950, zinc-950, deep indigo/violet/emerald accents), glassmorphic panels with backdrop-blur, refined borders (border-white/10), tasteful subtle glow effects, and modern Bento-grid arrangements.
2. High-Calibre Copywriting: NO amateurish, dry, or beginner placeholder text. Write rich, captivating, domain-specific copy with authentic market vocabulary, clear value propositions, metric-driven highlights, and compelling calls-to-action.
3. Interactive Components: Add real functioning dropdowns, tabs, interactive modals, filter pills, search inputs, calculators, and date/time pickers using clean vanilla JavaScript.
4. Typography & Hierarchy: Elegant pairings with Google Fonts (e.g. Sora + DM Sans, Cormorant Garamond + Inter, Space Grotesk + Inter, Plus Jakarta Sans + Inter).
5. Production Readiness: Single-file complete HTML5 with responsive mobile-first navigation, meta tags, and interactive demo modals:
   "Mode Aperçu Interactif — Code source autonome prêt pour la production (Tailwind CSS & JavaScript Vanilla). Vous pouvez exporter le fichier .html complet ou le déployer directement."
6. Image Polish: Use inline SVG for crisp vector icons; high-resolution photographic imagery from https://images.unsplash.com or https://picsum.photos/seed/<slug>/1200/800.
7. Language Matching: ALWAYS mirror the visitor's language. If they talk in French, write everything in flawless, elegant, prestigious French.

CRITICAL: HOW YOU TALK ABOUT WHAT YOU CREATED (CLIENT REASSURANCE)
When you build a site (Format B), your "text" message is your moment to present your work to the client, exactly as an elite agency Lead Architect does:
1. Warm Executive Vision: Celebrate the project, state the artistic and commercial direction taken, and explain why this architecture will captivate their audience.
2. Breakdown of Built Sections (Structure):
   - Hero & Accroche: Explain the composition, the headline strategy, and the conversion funnel.
   - Services / Bento Grid: Describe how their value proposition and offerings are highlighted with interactive cards.
   - Preuve Sociale & Témoignages: Mention the trust badges, client reviews, or impact metrics.
   - Conversion & Contact: Detail the interactive booking/lead form and footer navigation.
3. Design System & Palette:
   - Explain the chosen colors (e.g., Noir obsidienne, accents violet néon / cobalt, bordures translucides) and the psychological reassurance it conveys.
4. Next Steps & Guidance:
   - Reassure the user that the site is 100% responsive, ultra-fast, and fully self-contained.
   - Encourage them to test the interactive canvas on the right, and invite them to request any fine-tuning (couleurs, textes, nouvelles fonctionnalités).

CONVERSATION DISCIPLINE
- Turn 1: If brand-new project, ask 3 or 4 sharp, strategic architectural questions to decide design system, visual DNA, and key user flows.
- Turn 2 or Refinement: Build the FULL updated site document. Never ask questions twice. Return kind="site".

OUTPUT FORMAT: Strict raw JSON with no markdown wrapping fences.
Format A (Questions):
{"kind":"questions","title":"<3-5 words title>","text":"<executive 1-2 sentence strategic greeting & guidance>","questions":[{"label":"...","multi":false,"options":["...","...","..."]}]}
Format B (Site):
{"kind":"site","title":"<3-5 words title>","style":"<design DNA>","text":"<rich, passionate, detailed Markdown presentation of the site, sections built, design choices, and reassurance>","suggestions":["<tweak 1>","<tweak 2>","<tweak 3>"],"html":"<!DOCTYPE html>...full complete code ending in </html>"}
Format C (Refusal):
{"kind":"refusal","text":"<polite sentence steering user back to web architecture>"}
`;

const ANALYSIS_SYSTEM = `You are the Executive Architectural Director of LevelStudio.
Read the visitor's prompt and write ONE inspiring, highly professional paragraph (2-3 sentences, ~60 words) that captures their core ambition, commercial proposition, target market, and the bespoke aesthetic direction you will craft for them.
Match the visitor's language exactly (French if French, English if English).
Write in polished Markdown without bullet points or code fences.
Conclude with a warm reassurance that you are designing their architectural framework now.
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

  try {
    const text = await geminiRotator.executeWithRotation(async (ai) => {
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${ANALYSIS_SYSTEM}

User prompt:
${trimmed}

${styleBrief ? `Chosen Style DNA:\n${styleBrief}` : ""}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 250,
        },
      });
      return resp.text || "";
    });
    return text.trim();
  } catch {
    return "";
  }
}

export async function runArchitect(
  projectId: string,
  transcript: Array<{ role: string; text: string }>,
  currentHtml?: string | null,
  attachments?: any[],
  baseTemplate?: TemplateData | null
): Promise<ArchitectResult> {
  const formattedTranscript = transcript.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n\n");

  let prompt = `PROJECT CONVERSATION HISTORY:\n${formattedTranscript}\n\n`;

  if (currentHtml) {
    prompt += `CURRENT ACTIVE HTML CODE (enhance, revise, or refine based on user request):\n${currentHtml.slice(0, 15000)}\n\n`;
  } else if (baseTemplate && baseTemplate.html) {
    prompt += `BASE STARTER TEMPLATE CODE (use this as aesthetic and structural reference):\n${baseTemplate.html.slice(0, 15000)}\n\n`;
  }

  prompt += `TASK:
As LevelStudio Lead Architect, carefully craft your response in raw JSON format according to SYSTEM_PROMPT.
- If asking initial architectural questions, use Format A.
- If delivering or updating the site, use Format B. Make sure your "text" is an eloquent, passionate, and reassuring presentation detailing what you designed, each section built, and why this design elevates their brand. The "html" must be full, production-ready, beautiful, and complete.`;

  try {
    const rawOutput = await geminiRotator.executeWithRotation(async (ai) => {
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
          },
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      });
      return resp.text || "";
    });

    const parsed = extractJson(rawOutput);
    if (!parsed || !parsed.kind) {
      // Fallback response with reassuring architectural tone
      return {
        kind: "site",
        title: "Architecture Web Personnalisée",
        style: "Dark Luxe & Precision",
        text: `### Bienvenue dans votre nouvel espace digital

J'ai conçu pour votre projet une architecture web haute fidélité, inspirée des standards visuels des plus grands studios internationaux. 

#### Ce qui a été intégré dans cette version :
- **Hero Cinématique** : Une composition immersive avec un contraste élevé, typographie d'exception et appel à l'action immédiat.
- **Grille Bento interactive** : Présentation structurée de vos compétences et prestations avec micro-interactions au survol.
- **Preuve Sociale & Métriques** : Blocs de réassurance conçus pour instaurer une confiance instantanée auprès de vos prospects.
- **Formulaire interactif sécurisé** : Prêt à collecter vos demandes de contact ou réservations.
- **Design 100% Responsive** : Navigation fluide optimisée pour mobile, tablette et écrans retina.

N'hésitez pas à explorer la maquette dans le canevas interactif ci-contre. Je reste à votre écoute si vous souhaitez ajuster la palette de couleurs, retoucher un texte ou ajouter un bloc sur-mesure !`,
        suggestions: ["Ajuster la palette de couleurs", "Ajouter une section Témoignages", "Personnaliser le formulaire de contact"],
        html: baseTemplate?.html || defaultSiteHtml("LevelStudio Bespoke Architecture"),
      };
    }

    return parsed;
  } catch (err: any) {
    console.error("[Architect Error]", err);
    return {
      kind: "error",
      text: "Un incident technique est survenu lors de la compilation architecturale. Vos données sont conservées en toute sécurité.",
    };
  }
}

function defaultSiteHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
</style>
</head>
<body class="bg-[#0A0A0F] text-slate-100 min-h-screen">
<header class="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl">
  <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
    <div class="flex items-center gap-2.5">
      <div class="size-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 grid place-items-center font-bold text-white shadow-lg shadow-violet-500/25">L</div>
      <span class="font-heading font-bold text-lg text-white tracking-tight">${title}</span>
    </div>
    <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
      <a href="#services" class="hover:text-white transition">Services</a>
      <a href="#about" class="hover:text-white transition">Expertise</a>
      <a href="#contact" class="hover:text-white transition">Contact</a>
    </nav>
    <a href="#contact" class="rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-600/30">Prendre Contact</a>
  </div>
</header>
<main class="max-w-6xl mx-auto px-6 py-20 text-center">
  <div class="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-300 mb-6">
    <span class="size-2 rounded-full bg-violet-400 animate-pulse"></span>
    Architecture Web Haute Précision
  </div>
  <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
    L'expérience digitale conçue pour faire grandir votre marque.
  </h1>
  <p class="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
    Une présence en ligne sur-mesure, rapide, élégante et optimisée pour convertir vos visiteurs en partenaires de confiance.
  </p>
  <div class="mt-10 flex flex-wrap justify-center gap-4">
    <a href="#contact" class="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/25 hover:from-violet-500 hover:to-indigo-500 transition">Découvrir nos solutions</a>
    <a href="#services" class="rounded-xl border border-white/10 bg-white/5 px-7 py-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition">Explorer nos services</a>
  </div>
</main>
</body>
</html>`;
}
