# LevelUp Studio — AI Senior Web Architect

Chat workspace where a visitor describes their business, receives an analysis note, answers 4-5
context-grounded questions, and gets a complete, production-grade single-file website shown as a
live preview inside a Chrome-like canvas. The user never sees or downloads code — it is a
lead-generation preview tool. **Auth-gated**: users sign in with Google (Emergent-managed) before
sending a build.

## Stack
farm-ts — FastAPI + motor (`/app/backend`), Vite + React 19 + Tailwind v4 (`/app/frontend`).
LLM: **Gemini 2.5 Flash** via `emergentintegrations` + `EMERGENT_LLM_KEY` (backend/.env).
Auth: **Emergent-managed Google Auth** — httpOnly `session_token` cookie set by
`POST /api/auth/session`, read by `GET /api/auth/me`, cleared by `POST /api/auth/logout`.

## Data model (Mongo)
- `users`: `{ user_id, email, name, picture, created_at }` — Emergent-managed identity.
- `user_sessions`: `{ user_id, session_token, expires_at (TTL), created_at }` — 7-day cookie
  session. TTL index on `expires_at` reaps expired rows.
- `projects`: `{ id, user_id, title, style, html, generating, progress, progress_step,
  progress_pct, progress_focus, template_id, share_token, share_expires_at, messages[],
  created_at, updated_at }`
  - `messages[]`: `{ id, role, kind: text|questions|site|refusal|error|analysis, text,
    questions[], attachments[], site_name, site_style, suggestions[], html, created_at }`
  - `progress_focus` ∈ {brief, palette, hero, sections, interactions, mobile, review} — drives the
    desktop cursor animation to the matching wireframe block.
- `templates`: 51 rows (10 hand-crafted `kind='starter'` with full HTML + 41 `kind='style'` design
  briefs). Seeded from `backend/lib/templates.py` on first `GET /api/templates`.
- `usage`: `{ day: "YYYY-MM-DD", used }` — silent daily cap, `DAILY_LIMIT = 20`.

## API (all on `api_router`, prefix `/api`)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/session` | `{session_id}` → sets `session_token` httpOnly cookie, upserts user |
| GET | `/auth/me` | 200 User \| 401 |
| POST | `/auth/logout` | Clears cookie + session row |
| GET | `/templates?service=<id>` | Filter by service (portfolio, barbershop, salon, restaurant, store, booking, creator, events, landing, or omit=all). Auto-migrates the collection when the schema changes. |
| GET | `/templates/{id}/html` | Full HTML of a `starter` template; 404 on `style` cards |
| GET | `/quota` | `{used, limit, remaining, day, resets_at}` |
| GET | `/projects` | **Own projects only** (filtered by `user_id`); returns [] when anonymous |
| GET | `/projects/{id}` | Full project; `generating` drives client polling |
| GET | `/projects/{id}/html` | Raw HTML of the latest build |
| DELETE | `/projects/{id}` | Own only, 404 otherwise |
| POST | `/projects/{id}/stop` | Cancels the running task |
| POST | `/projects/{id}/share` | Mints/refreshes a 7-day share token; `X-Robots-Tag: noindex` |
| GET | `/share/{token}` | Public preview, 410 once expired |
| POST | `/chat` | **Auth required (401 anonymous)**. `{project_id?, text, template_id?, attachments[]}` → `{project, quota}` in <1 s; 429 quota, 409 build in flight |

## Auth-gate & anonymous behaviour
- Anonymous users can browse `/`, `/templates`, load quota + templates.
- `POST /chat` is 401 for anonymous; the frontend opens `LoginGate` (Continue with Google) on any
  401 or before the request (`requireAuth` in Home.tsx). AuthCallback exchanges `#session_id` from
  the URL fragment via `POST /api/auth/session` and reloads to `/`.
- Own projects are the only ones surfaced; the `owner_updated` compound index backs the list.

## Attachments (composer `+` button)
`+` icon opens a popover with **Image** and **File**. Client and server both scan:
- Client: 5 MB cap, base64 for images, text extract for text files.
- Server (`_scan_attachments`): allowed mimes = `image/*`, `text/*`, `application/pdf|json|xml`;
  otherwise sets `att.scan="unsupported"` and strips the payload. `too_large`, `empty` also flagged.

## Architect brain (`backend/lib/architect_brain.py`)
- **Two-stage flow** on the first turn:
  1. `quick_analysis()` — one short Markdown paragraph confirming what the architect understood
     (business type, city, goal, specific detail). Stored as a `kind='analysis'` message.
  2. `run_architect()` — the full architect: questions (round 1 only) or a full HTML build.
- Questions are grounded — the system prompt explicitly forbids generic templates and demands each
  question reference the visitor's specific business, city or service.
- Locked catalogue (portfolio / creator / landing / barbershop / salon / store / booking / restaurant / events).
- Mirrors the user's language.
- Post-delivery `text` is a structured Markdown recap (bold section names + one-line
  descriptions + a closing "tell me what to tune" italic line).
- `max_tokens=32000`, retry with backoff on rate/concurrency errors, serialised with an asyncio
  lock, one automatic retry when the document looks truncated.

## Templates — 51 rows split across services
- **Hand-crafted starters (10)**: Aurora (SaaS landing), Atelier (portfolio), Midnight (barber),
  Bistro Lumière (restaurant), Bloom (salon), Ember (store), Nova (link-in-bio), Nord Clinic
  (booking), Solstice (events), Lumen Studio (agency landing), Aperture (portfolio) — 11 actually.
- **Style cards (40)**: metadata-only (name, service, palette, fonts, sections, brief_prompt).
  Picking one hands the `brief_prompt` to the architect as the design brief, and the site is
  generated in that direction.
- Home gallery filters by service pill; **"See all"** opens `/templates` full page.

## Background jobs — 60 s HTTP timeout
A full document takes 90-150 s; `POST /chat` saves the user turn, sets `generating=true`, returns
immediately, and spawns the build task. Frontend polls `GET /projects/{id}` every 2.5 s via
TanStack Query `refetchInterval`. A build orphaned by a restart is cleared after 10 min on read.

## UI decisions
- Wordmark `LevelUpStudio` (no logo icon).
- **No sidebar on desktop** — projects are surfaced via a compact dropdown in the header.
- Assistant prose rendered as Markdown (`components/Markdown.tsx`).
- **Service rail**: clean chevron arrows on either side (no bubbled buttons). Picking a service
  attaches a chip to the composer; the user then adds their own text.
- **Composer**: `+` icon (Plus) opens a popover with Image / File; rotating hint uses **bold**;
  stop button replaces send during a build.
- **Questions**: `QuestionWizard` — step-by-step above the composer, one question per step, single
  or multi select, "My own answer" free-text at every step.
- **Canvas** (`data-testid=site-canvas`, desktop ≥1024 px): a browser-chrome frame with three
  window-control dots, a URL pill (`<slug>.levelupstudio.site`), viewport switcher (Desktop /
  Tablet / Mobile), Reload, Close, and an action row with Open in a tab / Copy link / Request a
  change buttons. **The chat bubble carries no buttons** — everything lives in the canvas chrome.
- **Delivery card in stream**: just a slim ribbon (name, style, section count, KB) + quick-tweak
  chips. Below 1024 px, tapping the card opens the browser-canvas fullscreen.
- **Build progress**:
  - Desktop: a mock browser viewport with an animated **mouse cursor** that moves through the
    skeleton (header → hero → sections → interactions → mobile preview → review), synced to the
    backend `progress_focus`. Ring-highlight pulses on the current block, stage label bubble near
    the cursor.
  - Mobile: text-only — spinner, stage, animated typed note, checklist.
  - `EXPECTED_SECONDS=150`, ticker updates every 2 s.
- **Delivery**: `POST /projects/{id}/share` mints a 7-day token; `GET /api/share/{token}` serves
  it with `X-Robots-Tag: noindex`. Copy-link button lives in the canvas action row.
- **Home hero**: pro badge "SENIOR WEB ARCHITECT", oversized centered title
  **"What are we building today?"**, one-line description, composer, service rail, then the
  filterable template gallery. Fully centered on mobile.
- **Auth**: `LoginGate` modal opens on any 401 or when an anonymous visitor tries to send.
- Every generated document goes through `harden_images()` — Tailwind CDN `<link>` rewritten to the
  required `<script>`, Unsplash URLs rewritten to seeded `picsum.photos`, `img` error handler
  injected for a graceful "Image not found" placeholder.
- All scrollbars hidden (`no-scrollbar` in `index.css`).
