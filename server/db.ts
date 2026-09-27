import fs from "node:fs";
import path from "node:path";
import { ALL_TEMPLATES, type TemplateData } from "./templates.ts";

export interface UserDoc {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  role?: "architect" | "member" | "admin";
  passwordHash?: string;
  created_at: string;
}

export interface UserSessionDoc {
  session_token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface Attachment {
  name: string;
  mime: string;
  kind: "image" | "text" | "pdf" | "other";
  data: string;
  scan: "ok" | "unsupported" | "too_large" | "empty";
}

export interface Choice {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  label: string;
  options: Choice[];
  multi: boolean;
  allow_custom?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "questions" | "site" | "refusal" | "error" | "analysis";
  text: string;
  questions: Question[];
  attachments: Attachment[];
  site_name: string | null;
  site_style: string | null;
  suggestions: string[];
  html: string | null;
  created_at: string;
}

export interface ProjectDoc {
  id: string;
  user_id: string | null;
  title: string;
  style: string | null;
  html: string | null;
  generating: boolean;
  progress: string | null;
  progress_step: number;
  progress_pct: number;
  progress_focus: string | null;
  template_id: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.resolve(process.cwd(), "server", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

// High-fidelity pre-seeded sites for instant discovery
const SEED_PROJECTS: ProjectDoc[] = [
  {
    id: "proj_apex_saas",
    user_id: "global",
    title: "Apex Intelligence — Plateforme Financière B2B",
    style: "Obsidian Tech & Dark Mode",
    html: null,
    generating: false,
    progress: null,
    progress_step: 0,
    progress_pct: 0,
    progress_focus: null,
    template_id: "starter-aurora",
    share_token: "apex-demo-2026",
    share_expires_at: "2030-01-01T00:00:00.000Z",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    messages: [
      {
        id: "msg_seed_1",
        role: "user",
        kind: "text",
        text: "Je veux une plateforme SaaS d'analyse financière prédictive pour directeurs financiers et fonds d'investissement. Palette sombre épurée, indicateurs en temps réel, calcul de valorisation et section de tarification transparente.",
        questions: [],
        attachments: [],
        site_name: null,
        site_style: null,
        suggestions: [],
        html: null,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        id: "msg_seed_2",
        role: "assistant",
        kind: "site",
        text: "Architecture finalisée avec succès. J'ai conçu une interface haut de gamme digne des meilleurs standards SaaS B2B : typographie Sora & DM Sans, dashboard dynamique avec calculs interactifs, grille tarifaire à trois niveaux et animations CSS fluides.",
        questions: [],
        attachments: [],
        site_name: "Apex Intelligence",
        site_style: "Obsidian Tech & Dark Violet",
        suggestions: [
          "Ajouter un simulateur de ROI interactif",
          "Intégrer une section témoignages avec logos d'entreprises",
          "Passer en thème bicolore titane et émeraude"
        ],
        html: `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Apex Intelligence — Décision Financière Prédictive</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>
body { font-family: 'DM Sans', sans-serif; }
h1,h2,h3,h4 { font-family: 'Sora', sans-serif; }
.glass-panel { background: rgba(19, 18, 31, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); }
</style>
</head>
<body class="bg-[#0B0B10] text-slate-200 antialiased selection:bg-violet-600 selection:text-white">
<header class="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B10]/85 backdrop-blur-md">
  <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="size-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-600/30">A</div>
      <span class="text-xl font-bold tracking-tight text-white font-heading">Apex<span class="text-violet-400">.ai</span></span>
    </div>
    <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
      <a href="#plateforme" class="hover:text-white transition">Plateforme</a>
      <a href="#modeles" class="hover:text-white transition">Modèles Prédictifs</a>
      <a href="#tarifs" class="hover:text-white transition">Tarification</a>
      <a href="#securite" class="hover:text-white transition">Sécurité SOC-2</a>
    </nav>
    <div class="flex items-center gap-4">
      <button class="text-sm font-medium text-slate-300 hover:text-white">Connexion</button>
      <button class="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition shadow-md shadow-violet-600/30">Démarrer l'essai</button>
    </div>
  </div>
</header>

<main>
  <!-- Hero Section -->
  <section class="relative pt-24 pb-20 overflow-hidden">
    <div class="absolute inset-0 pointer-events-none flex justify-center">
      <div class="w-[800px] h-[500px] bg-violet-600/15 rounded-full blur-[140px] -top-20"></div>
    </div>
    <div class="max-w-7xl mx-auto px-6 relative z-10 text-center">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold tracking-wide uppercase mb-6">
        <span class="size-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Nouveau : Moteur de trésorerie autonome v4.2
      </div>
      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.08]">
        L'intelligence financière qui devance votre marché.
      </h1>
      <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Synchronisez vos flux bancaires, ERP et CRM. Apex calcule vos pistes d'arbitrage en temps réel avec un taux de précision audité de 99.4%.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button class="w-full sm:w-auto px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-base transition shadow-xl shadow-violet-600/25">
          Programmer un audit personnalisé
        </button>
        <button class="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-base transition">
          Explorer la sandbox en direct →
        </button>
      </div>

      <!-- Live Interactive Financial Widget -->
      <div class="mt-16 max-w-5xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 text-left shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold">Simulateur de Valeur Ajoutée Apex</span>
            <h3 class="text-xl font-bold text-white mt-1">Impact sur la trésorerie disponible (EBITDA)</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              +28.4% Détection anomalies
            </span>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div class="bg-black/30 p-5 rounded-2xl border border-white/5">
            <span class="text-xs text-slate-400 font-medium">ARR Analysé</span>
            <div class="text-3xl font-extrabold text-white mt-2">14.8M €</div>
            <span class="text-xs text-emerald-400 mt-1 inline-block">↑ +12.3% YoY</span>
          </div>
          <div class="bg-black/30 p-5 rounded-2xl border border-white/5">
            <span class="text-xs text-slate-400 font-medium">DSO (Délai Recouvrement)</span>
            <div class="text-3xl font-extrabold text-white mt-2">32 jours</div>
            <span class="text-xs text-violet-400 mt-1 inline-block">↓ -18 jours vs industrie</span>
          </div>
          <div class="bg-black/30 p-5 rounded-2xl border border-white/5">
            <span class="text-xs text-slate-400 font-medium">Économies Arbitrage IA</span>
            <div class="text-3xl font-extrabold text-violet-400 mt-2">412,000 €</div>
            <span class="text-xs text-slate-400 mt-1 inline-block">Audit validé KPMG</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="plateforme" class="py-24 border-t border-white/10 bg-[#0E0D17]">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl sm:text-4xl font-bold text-white tracking-tight">Une suite architecturée pour les directions exigeantes</h2>
        <p class="mt-4 text-slate-400 text-base">Fini les tableurs statiques. Obtenez une vision prospective claire de votre rentabilité à 3, 6 et 18 mois.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="glass-panel p-8 rounded-2xl hover:border-violet-500/40 transition">
          <div class="size-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-xl mb-6">⚡</div>
          <h3 class="text-xl font-bold text-white mb-3">Rapprochement bancaire 0-clic</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Catégorisation instantanée avec réconciliation automatique des écritures complexes et filiales internationales.</p>
        </div>
        <div class="glass-panel p-8 rounded-2xl hover:border-violet-500/40 transition">
          <div class="size-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xl mb-6">📊</div>
          <h3 class="text-xl font-bold text-white mb-3">Modélisation Monte-Carlo</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Simulez 10 000 scénarios de marché en moins de 3 secondes pour anticiper vos besoins en fonds de roulement.</p>
        </div>
        <div class="glass-panel p-8 rounded-2xl hover:border-violet-500/40 transition">
          <div class="size-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xl mb-6">🛡️</div>
          <h3 class="text-xl font-bold text-white mb-3">Chiffrement Bancaire de Bout en Bout</h3>
          <p class="text-slate-400 text-sm leading-relaxed">Infrastructure certifiée SOC-2 Type II, ISO 27001 et hébergement des données strictement souverain en Europe.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section id="tarifs" class="py-24 max-w-7xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16">
      <h2 class="text-3xl sm:text-4xl font-bold text-white">Tarifs clairs, rentabilité immédiate</h2>
      <p class="mt-3 text-slate-400">Aucun frais caché. Annulable à tout moment avec exportation intégrale de vos modèles.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="glass-panel p-8 rounded-3xl flex flex-col justify-between">
        <div>
          <h4 class="text-lg font-bold text-white">Scale</h4>
          <p class="text-xs text-slate-400 mt-1">Pour entreprises de 2 à 10M€ de CA</p>
          <div class="mt-6 text-4xl font-extrabold text-white">490 € <span class="text-sm font-normal text-slate-400">/mois</span></div>
          <ul class="mt-8 space-y-3 text-sm text-slate-300">
            <li>✓ Jusqu'à 5 banques & 3 ERP</li>
            <li>✓ Prédictions à 6 mois</li>
            <li>✓ Export PDF pour investisseurs</li>
          </ul>
        </div>
        <button class="mt-8 w-full py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition">Choisir Scale</button>
      </div>

      <div class="glass-panel p-8 rounded-3xl border-violet-500/60 bg-gradient-to-b from-violet-950/40 to-[#13121F] flex flex-col justify-between relative shadow-xl shadow-violet-900/30">
        <span class="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-bold uppercase tracking-wider">Recommandé</span>
        <div>
          <h4 class="text-lg font-bold text-white">Enterprise</h4>
          <p class="text-xs text-slate-400 mt-1">Fonds, groupes & ETI multi-entités</p>
          <div class="mt-6 text-4xl font-extrabold text-white">1 290 € <span class="text-sm font-normal text-slate-400">/mois</span></div>
          <ul class="mt-8 space-y-3 text-sm text-slate-200">
            <li>✓ Entités et devises illimitées</li>
            <li>✓ Scénarios Monte Carlo illimités</li>
            <li>✓ Architecte financier dédié & SLA 1h</li>
            <li>✓ API REST & Webhooks temps réel</li>
          </ul>
        </div>
        <button class="mt-8 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition shadow-lg shadow-violet-600/30">Activer l'essai Enterprise</button>
      </div>

      <div class="glass-panel p-8 rounded-3xl flex flex-col justify-between">
        <div>
          <h4 class="text-lg font-bold text-white">Custom Private</h4>
          <p class="text-xs text-slate-400 mt-1">Grands comptes & banques d'affaires</p>
          <div class="mt-6 text-4xl font-extrabold text-white">Sur Mesure</div>
          <ul class="mt-8 space-y-3 text-sm text-slate-300">
            <li>✓ Déploiement On-Premise ou VPC</li>
            <li>✓ Fine-tuning sur vos données historiques</li>
            <li>✓ Garantie de conformité personnalisée</li>
          </ul>
        </div>
        <button class="mt-8 w-full py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition">Contacter l'équipe VIP</button>
      </div>
    </div>
  </section>
</main>

<footer class="border-t border-white/10 py-12 bg-[#08080c] text-slate-500 text-sm">
  <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
    <p>© 2026 Apex Intelligence SAS. Tous droits réservés.</p>
    <div class="flex gap-6">
      <a href="#" class="hover:text-slate-300">Confidentialité</a>
      <a href="#" class="hover:text-slate-300">Sécurité</a>
      <a href="#" class="hover:text-slate-300">Statut Système</a>
    </div>
  </div>
</footer>
</body>
</html>`,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      }
    ]
  },
  {
    id: "proj_vaneau_design",
    user_id: "global",
    title: "Maison Vaneau — Studio d'Architecture & Intérieurs",
    style: "Éditorial Minimaliste & Haute Facture",
    html: null,
    generating: false,
    progress: null,
    progress_step: 0,
    progress_pct: 0,
    progress_focus: null,
    template_id: "style-portfolio-minimal",
    share_token: "vaneau-demo-2026",
    share_expires_at: "2030-01-01T00:00:00.000Z",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    messages: [
      {
        id: "msg_vaneau_1",
        role: "user",
        kind: "text",
        text: "Créer un site pour un cabinet d'architecture d'intérieur parisien haut de gamme. Typographie élégante, grands visuels de projets, approche sur-mesure et prise de rendez-vous pour étude de projet.",
        questions: [],
        attachments: [],
        site_name: null,
        site_style: null,
        suggestions: [],
        html: null,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
      {
        id: "msg_vaneau_2",
        role: "assistant",
        kind: "site",
        text: "Création d'une vitrine éditoriale et sculpturale pour Maison Vaneau. Utilisation de Cormorant Garamond pour la prestance, disposition en galerie aérée et formulaire de consultation d'exception.",
        questions: [],
        attachments: [],
        site_name: "Maison Vaneau",
        site_style: "Cormorant & Noir d'Encre",
        suggestions: ["Ajouter une visite virtuelle 3D", "Inclure le catalogue de mobilier sur mesure"],
        html: `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maison Vaneau — Architecture d'Intérieur & Scénographie</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
body { font-family: 'Inter', sans-serif; }
h1,h2,h3,.serif { font-family: 'Cormorant Garamond', serif; }
</style>
</head>
<body class="bg-[#0D0D11] text-[#E4E4EB] antialiased">
<header class="py-8 px-8 sm:px-16 flex items-center justify-between border-b border-white/5">
  <div class="text-2xl font-light tracking-[0.2em] uppercase text-white serif">Maison Vaneau</div>
  <nav class="hidden sm:flex gap-10 text-xs tracking-[0.25em] uppercase text-stone-400">
    <a href="#projets" class="hover:text-white transition">Réalisations</a>
    <a href="#philosophie" class="hover:text-white transition">Philosophie</a>
    <a href="#contact" class="hover:text-white transition">Privé</a>
  </nav>
  <button class="px-5 py-2 border border-white/20 text-xs uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition">Étude de Projet</button>
</header>

<section class="py-28 px-8 sm:px-16 max-w-6xl mx-auto text-center">
  <span class="text-xs uppercase tracking-[0.3em] text-amber-200/70 block mb-6">Paris VII • Genève • New York</span>
  <h1 class="text-4xl sm:text-7xl font-light text-white leading-tight serif">
    L'espace comme œuvre vivante, la matière comme signature.
  </h1>
  <p class="mt-8 text-stone-400 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed">
    Depuis 2014, Maison Vaneau conçoit des résidences privées d'exception, alliant rigueur structurelle, marbres rares et lumière naturelle maîtrisée.
  </p>
</section>

<section id="projets" class="px-8 sm:px-16 pb-28 max-w-7xl mx-auto">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
    <div class="group cursor-pointer">
      <div class="aspect-[4/3] bg-stone-900 overflow-hidden relative border border-white/5">
        <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80" alt="Appartement Quai d'Orsay" class="w-full h-full object-cover group-hover:scale-105 transition duration-700">
      </div>
      <div class="mt-5 flex justify-between items-baseline">
        <h3 class="text-2xl serif text-white">Appartement Quai d'Orsay</h3>
        <span class="text-xs text-stone-500 uppercase tracking-widest">Paris • 380 m²</span>
      </div>
    </div>
    <div class="group cursor-pointer">
      <div class="aspect-[4/3] bg-stone-900 overflow-hidden relative border border-white/5">
        <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80" alt="Villa Cap d'Antibes" class="w-full h-full object-cover group-hover:scale-105 transition duration-700">
      </div>
      <div class="mt-5 flex justify-between items-baseline">
        <h3 class="text-2xl serif text-white">Villa Mirasol</h3>
        <span class="text-xs text-stone-500 uppercase tracking-widest">Cap d'Antibes • 620 m²</span>
      </div>
    </div>
  </div>
</section>
</body>
</html>`,
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      }
    ]
  }
];

class PersistentDb {
  projects = new Map<string, ProjectDoc>();
  users = new Map<string, UserDoc>();
  usersByEmail = new Map<string, string>();
  sessions = new Map<string, UserSessionDoc>();
  templates = new Map<string, TemplateData>();
  usage = new Map<string, number>();

  private saveTimer: NodeJS.Timeout | null = null;
  public initialized = false;

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
    this.seedTemplates();
    this.seedDefaultUsersAndProjects();
    this.initialized = true;
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.error("Failed to create data dir:", e);
    }
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      if (!raw) return;
      const data = JSON.parse(raw);

      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          this.users.set(u.user_id, u);
          if (u.email) this.usersByEmail.set(u.email.toLowerCase(), u.user_id);
        }
      }
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          if (new Date(s.expires_at).getTime() > Date.now()) {
            this.sessions.set(s.session_token, s);
          }
        }
      }
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          this.projects.set(p.id, p);
        }
      }
      if (Array.isArray(data.customTemplates)) {
        for (const t of data.customTemplates) {
          this.templates.set(t.id, t);
        }
      }
      if (data.usage && typeof data.usage === "object") {
        for (const [k, v] of Object.entries(data.usage)) {
          if (typeof v === "number") this.usage.set(k, v);
        }
      }
      console.log(`[Database] Loaded ${this.projects.size} projects and ${this.users.size} users from persistent storage`);
    } catch (err) {
      console.warn("[Database] Could not load stored data, initializing default seed:", err);
    }
  }

  public scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.flushToDisk();
    }, 400);
  }

  public flushToDisk() {
    try {
      this.ensureDataDir();
      const customTemplates = Array.from(this.templates.values()).filter(t => t.kind === "import");
      const payload = {
        users: Array.from(this.users.values()),
        sessions: Array.from(this.sessions.values()),
        projects: Array.from(this.projects.values()),
        customTemplates,
        usage: Object.fromEntries(this.usage.entries()),
        updated_at: new Date().toISOString(),
      };
      fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.error("[Database] Error flushing store to disk:", err);
    }
  }

  seedTemplates() {
    for (const t of ALL_TEMPLATES) {
      this.templates.set(t.id, { ...t });
    }
  }

  seedDefaultUsersAndProjects() {
    // Default master creator account
    const masterEmail = "creator@levelstudio.app";
    if (!this.usersByEmail.has(masterEmail)) {
      const defaultUser: UserDoc = {
        user_id: "user_master_architect",
        email: masterEmail,
        name: "Architecte Senior Studio",
        picture: null,
        role: "architect",
        created_at: new Date().toISOString(),
      };
      this.users.set(defaultUser.user_id, defaultUser);
      this.usersByEmail.set(masterEmail, defaultUser.user_id);
    }

    // Seed exemplary showcases if database has no projects
    for (const p of SEED_PROJECTS) {
      if (!this.projects.has(p.id)) {
        this.projects.set(p.id, { ...p });
      }
    }
  }

  getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  getUsage(day: string = this.getTodayString()): number {
    return this.usage.get(day) ?? 0;
  }

  incrementUsage(day: string = this.getTodayString()): number {
    const current = this.getUsage(day);
    const updated = current + 1;
    this.usage.set(day, updated);
    this.scheduleSave();
    return updated;
  }

  migrateAnon(anonId: string, userId: string): number {
    if (!anonId || !userId) return 0;
    let count = 0;
    for (const project of this.projects.values()) {
      if (project.user_id === anonId || project.user_id === "global") {
        project.user_id = userId;
        project.updated_at = new Date().toISOString();
        count++;
      }
    }
    for (const template of this.templates.values()) {
      if (template.owner_id === anonId) {
        template.owner_id = userId;
        count++;
      }
    }
    if (count > 0) this.scheduleSave();
    return count;
  }

  getStats() {
    const totalProjects = this.projects.size;
    const completedSites = Array.from(this.projects.values()).filter(p => Boolean(p.html)).length;
    const totalTemplates = this.templates.size;
    const totalUsers = this.users.size;
    return {
      status: "connected",
      storage: "persistent_json_engine",
      totalProjects,
      completedSites,
      totalTemplates,
      totalUsers,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

export const db = new PersistentDb();
