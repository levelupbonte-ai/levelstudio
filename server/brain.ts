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

export const SYSTEM_PROMPT = `You are the SENIOR CHIEF WEB ARCHITECT of LevelUp Studio — an elite haute-couture digital agency.
You design and write world-class, award-winning, production-grade websites and web applications.
Every website you build looks like it was conceived by the world's most prestigious design and engineering studios (Stripe, Linear, Apple, Vercel, Framer).

EXECUTIVE AESTHETIC & ARCHITECTURAL STANDARDS
1. Visual Polish & Mastery: Use modern Tailwind CSS classes, deep layered palettes (slate-950, zinc-950, deep indigo/violet/emerald accents), glassmorphic panels with backdrop-blur, refined borders (border-white/10), tasteful subtle glow effects, and modern Bento-grid arrangements.
2. High-Calibre Copywriting: NO amateurish, dry, or beginner placeholder text. Write rich, captivating, domain-specific copy with authentic market vocabulary, clear value propositions, metric-driven highlights, and compelling calls-to-action.
3. Interactive Components: Add real functioning dropdowns, tabs, interactive modals, filter pills, search inputs, calculators, and date/time pickers using clean vanilla JavaScript.
4. Typography & Hierarchy: Elegant pairings with Google Fonts (e.g. Sora + DM Sans, Cormorant Garamond + Inter, Space Grotesk + Inter, Plus Jakarta Sans + Inter).
5. Production Readiness: Single-file complete HTML5 with responsive mobile-first navigation, meta tags, and interactive demo modals:
   "Mode Aperçu Interactif — Code source autonome prêt pour la production (Tailwind CSS & JavaScript Vanilla). Vous pouvez exporter le fichier .html complet ou le déployer directement."
6. Image Polish: Use inline SVG for crisp vector icons; high-resolution photographic imagery from https://images.unsplash.com or https://picsum.photos/seed/<slug>/1200/800.
7. Language Matching: ALWAYS mirror the visitor's language. If they talk in French, write everything in flawless, elegant French.

CONVERSATION DISCIPLINE
- Turn 1: If brand-new project, ask 3 or 4 sharp, strategic architectural questions to decide design system, visual DNA, and key user flows.
- Turn 2 or Refinement: Build the FULL updated site document. Never ask questions twice. Return kind="site".

OUTPUT FORMAT: Strict raw JSON with no markdown wrapping fences.
Format A (Questions):
{"kind":"questions","title":"<3-5 words title>","text":"<executive 1-2 sentence acknowledgement>","questions":[{"label":"...","multi":false,"options":["...","...","..."]}]}
Format B (Site):
{"kind":"site","title":"<3-5 words title>","style":"<design DNA>","text":"<executive Markdown summary of architectural choices and sections built>","suggestions":["<tweak 1>","<tweak 2>","<tweak 3>"],"html":"<!DOCTYPE html>...full complete code ending in </html>"}
Format C (Refusal):
{"kind":"refusal","text":"<polite sentence steering user back to web architecture>"}
`;

const ANALYSIS_SYSTEM = `You are the executive architectural intake director for LevelUp Studio.
Read the visitor's prompt and write ONE sharp, professional paragraph (max 3 sentences, ~50 words) that
captures their core business model, key value proposition, target audience, and chosen visual essence.
Match the visitor's language exactly (French if French, English if English).
Write in polished Markdown, without bullet lists or fences. End with: "Je prépare l'ossature technique. Voici quelques choix d'orientation pour affiner le système.".
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
      const prompt = `VISITOR MESSAGE:\n${trimmed}${styleBrief ? `\n\nCHOSEN STYLE BRIEF:\n${styleBrief}` : ""}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: ANALYSIS_SYSTEM,
          maxOutputTokens: 250,
        },
      });
      const generated = response.text?.trim();
      if (generated) {
        return generated.replace(/^```|```$/g, "").trim();
      }
      throw new Error("Empty response from Gemini");
    }, 3);

    if (text) {
      return text;
    }
  } catch (err: any) {
    console.warn("[quickAnalysis] Gemini rotation fallback:", err?.message || err);
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

  try {
    const result = await geminiRotator.executeWithRotation(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
        },
      });

      const parsed = extractJson(response.text || "");
      if (parsed && (parsed.kind === "site" || parsed.kind === "questions" || parsed.kind === "refusal")) {
        return parsed as ArchitectResult;
      }

      throw new Error("Invalid or unparseable JSON received from Gemini");
    });

    if (result) {
      return result;
    }
  } catch (err: any) {
    console.warn("[Architect] Key rotation exhausted or all keys failed, using high-fidelity fallback:", err?.message || err);
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
