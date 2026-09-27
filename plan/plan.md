# LevelUp Studio — Pro Overhaul v2

An AI web-architect studio where a visitor describes their business and receives a real, previewable
website inside a browser-style canvas. This pass removes the sign-in wall from creation, upgrades
the design engine to Claude Sonnet 4.5, and adds a proper workspace, template search, import and a
richer build animation.

## Who it's for

- Local businesses and independent creators who need a website but want to see one before commissioning it — barbers, restaurants, salons, portfolios, creators, small stores, event organisers.
- Studios and agencies using LevelUp as a lead-generation preview tool.

## Core features and experience

### 1. Build first, sign in to save

- Anyone can compose a brief, answer the questions, watch the build, and open the preview **without a sign-in wall**.
- A slim persistent banner sits at the top of the studio while the visitor is not signed in: *"Sign in with Google to keep this build — otherwise it disappears when this browser session ends."* The banner is dismissible for the session but never lies.
- Every anonymous build is stored server-side under an anonymous owner tied to a cookie, so the same visitor can refresh, share preview links, and keep working across pages without losing anything mid-session.
- When the visitor signs in, every project sitting under their anonymous cookie is transferred to their real account in one atomic pass, with a toast confirming ("3 projects moved to your workspace").
- The daily build budget stays shared across the whole studio (anonymous and signed-in together), so signing out is never a way to reset the quota.

### 2. Sonnet 4.5 as the design engine

- The default architect brain moves from Gemini 2.5 Flash to **Claude Sonnet 4.5**, called through the same Emergent Universal LLM key that already ships with the app — no new subscription, no extra key.
- Sonnet produces more complete, better-structured single-file HTML documents and follows the "grounded questions" instruction more reliably.
- If Sonnet hits a rate limit or errors, the same request retries once on Gemini 2.5 Flash automatically, so the studio never stalls waiting for a model that is busy.
- Later, if you top up a personal Gemini or DeepSeek key, we can add a "use my own key" setting; for the MVP the covered Emergent key is enough.

### 3. Cleaner home & composer

- The **"SENIOR WEB ARCHITECT"** badge above the hero is removed. The centered title "What are we building today?" stands alone.
- The composer's `+` attach button loses its bordered pill on desktop; it becomes a plain icon that reacts only on hover, aligned with the rest of the composer.
- The template gallery on the home gets the same clean left/right chevron arrows the service rail uses, so a visitor can slide horizontally through templates without opening the full page.

### 4. Template gallery: click, preview, reproduce

- Clicking any template card on the home or `/templates` opens a **fullscreen preview** using the same browser-canvas chrome the studio already renders — window controls, URL pill, viewport switcher (desktop / tablet / mobile), refresh, close.
- The preview's primary action is a large **"Reproduce this design"** button in the top-right of the chrome. Clicking it closes the preview and pre-selects that template in the composer so the next brief the visitor types is handed to the architect with that template as the base design.
- Style cards (design briefs without HTML) open a stylised preview page showing palette swatches, the type pairing sample and the section outline; their "Reproduce" button hands the design brief to the architect instead of an HTML seed.

### 5. Search on the "See all" page

- A **live search box** sits at the top of `/templates`, styled like a soft spotlight command bar.
- Matches against template name, tagline, service tag, palette colours, typography and section list. Typing "warm gold" surfaces Midnight; "italic serif" surfaces Atelier; "pink neon barber" surfaces Neon Blade.
- Search composes with the service filter pills — pick a service, then search inside it.

### 6. Import your own template

- A **"Import a template"** button appears next to "See all" on the home and inside `/templates`.
- The user drops or selects a single `.html` file (max 500 KB). The backend scans it: it must be a self-contained document, external scripts other than Tailwind and Google Fonts are stripped, iframes and remote form actions are blocked.
- The imported file is stored in full in the database — visible, inspectable, editable there — and appears as a fresh card in the visitor's gallery under a "My imports" tag.
- Clicking the imported card opens the same fullscreen preview + Reproduce flow. When the architect builds from it, it receives the full imported HTML as the starter, so it truly *knows the code*.
- Imports stay tied to the visitor (anonymous or signed-in) and follow the same migration path when they sign in.

### 7. My Workspace

- The header's small project dropdown is retired.
- A new **Workspace** entry in the header, visible while signed in, opens `/workspace`: a grid of every project the user owns, with:
  - a **live iframe thumbnail** rendered from the actual HTML, scaled down;
  - the title, the design DNA and section count;
  - a human "last edited" timestamp;
  - three inline actions — **Open** (returns to the studio with that project active), **Copy share link**, **Delete**;
  - a filter row: All / With a live site / Drafts / My imported templates.
- Empty state offers a single CTA back to the studio. Loading state renders skeleton cards so the page never flashes empty.

### 8. Live cursor trail on the desktop build animation

- The animated cursor now leaves a soft violet **light trail** behind it as it moves between wireframe blocks (fades over ~600 ms).
- On landing at a new focus block, it emits a small **ripple** and a subtle "tick" pulse, reading more like a real designer clicking through a layout.
- Motion is pure CSS/SVG — no perf cost. Visitors with `prefers-reduced-motion` see the previous static cursor and no ripple.

## User flow

1. Visitor lands on `/`. Hero centered, no sidebar, no sign-in wall. Above the hero, a slim reminder banner: *"Sign in to keep this build."*
2. They type a brief, optionally tapping a service pill, picking a template (fullscreen preview → Reproduce), or importing their own `.html`.
3. Composer sends. AI writes a short "here's what I understood" analysis note, then 4-5 questions grounded in what the visitor actually said.
4. Visitor answers the wizard. Build starts. On desktop, the canvas shows the cursor exploring the skeleton with its violet trail and ripple; on mobile, a text-only progress panel with a typing note.
5. Site delivered inside the canvas — browser chrome carries Open in tab, Copy link, Request a change, viewport switcher, refresh, close. Chat bubble stays a slim recap ribbon.
6. Visitor clicks "Sign in with Google" in the header or on the reminder banner.
7. On return, a toast: *"3 projects moved to your workspace."* Header now shows the avatar and a **Workspace** link.
8. From `/workspace`, they scan every project by thumbnail, tap Open on any of them, copy share links, delete throwaways, or jump into their imports tab.

## UI/UX feel

- Dark studio palette kept: obsidian `#0A0A0F` canvas, violet–fuchsia accent, editorial serif for the hero title.
- Reminder banner is thin, warm-amber tinted, dismissible per session — never modal, never blocks the studio.
- Fullscreen preview inherits the exact same canvas chrome the studio already renders, so nothing feels bolted on.
- Workspace grid: three cards across on desktop, one column on mobile, thumbnail-first, 12 px radius, generous 24 px gaps, hover lift.
- Search bar: pill shape, soft violet glow on focus, results filter as the user types.
- Cursor trail: 40 px violet radial glow, blurred, 0.4 opacity, trailing at ~600 ms. Ripple is a single expanding ring, one-shot per landing.
- Import button: outline pill with a soft upload icon, tucked next to "See all"; drag-and-drop area appears when clicked.
- Toasts stay corner-based (sonner), quiet greens for success, warm reds for failure.

## Implementation phases

### Phase 1 — MVP (built now)

Everything above, in one coherent pass:

1. Anonymous cookie ownership, reminder banner, sign-in migration.
2. Architect default → Claude Sonnet 4.5 via the Emergent Universal LLM key, Gemini fallback.
3. Template gallery chevrons + fullscreen preview + "Reproduce this design".
4. Search bar on `/templates` (name, tagline, palette, typography, service, sections).
5. Import-a-template upload flow, database storage visible for inspection, gallery + workspace surfacing.
6. `/workspace` page with live thumbnails, last-edited, filter tabs, imports tab.
7. Cursor trail + ripple on desktop build progress; reduced-motion respected.
8. Remove "SENIOR WEB ARCHITECT" badge; strip the `+` bordered pill on desktop.

### Phase 2 — signal & polish

- Per-user quota (small budget per account) replacing the shared daily cap.
- Export the site as a downloadable `.zip` from the workspace (signed-in).
- ⌘K command palette over the studio (jump to any project or template).
- Email the share link to yourself directly from the workspace (Resend).

### Phase 3 — collaboration & light billing

- Team workspaces with invited collaborators.
- Optional paid tier for a bigger daily budget, custom domains, an editor mode over the delivered HTML.
- Payments via Stripe (test key already provisioned in the pod).

## Assumptions

- The Emergent Universal LLM key covers Claude Sonnet 4.5 at the same conditions it covers Gemini today, so switching the default costs nothing extra. If Sonnet is unavailable at request time, the request falls back to Gemini 2.5 Flash automatically.
- Anonymous projects last as long as the anonymous cookie: session-length by default, so clearing cookies or opening a private window loses unlinked builds — the reminder banner says so plainly.
- The shared daily build budget stays global across anonymous and signed-in visitors so signing out never becomes a reset trick.
- Imported HTML documents must be single-file, self-contained pages (inline CSS/JS + Tailwind CDN + Google Fonts are allowed). Anything else — remote iframes, external scripts on foreign domains, remote form actions — is stripped or refused at import time.
- Every imported HTML is stored in full in the database on the server, retrievable via the same Mongo view used for seeded templates. Nothing lives only in the browser.
- The fullscreen preview uses the exact browser-canvas chrome the studio already ships; "Reproduce this design" is the only primary action on the preview.
- "Reproduce this design" for a style card hands the architect the design brief prompt; for a starter or an imported HTML it hands the full document. Both paths already exist in the architect brain.
- Removing the "SENIOR WEB ARCHITECT" badge is definitive — no replacement pill or counter is added in its place.
- The `/workspace` page is signed-in only; anonymous visitors see the reminder banner and a small "Workspace unlocks when you sign in" empty state if they try to navigate there.
- Template gallery chevrons match the service rail exactly — thin outline chevrons, no pill background, fade to invisible at each end.
- Cursor trail and ripple respect `prefers-reduced-motion`; nothing animates for visitors who opted out.
