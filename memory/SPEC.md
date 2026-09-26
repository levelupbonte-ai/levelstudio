# LevelUp Studio — AI Senior Web Architect

Chat workspace where a visitor describes their business, answers 2–3 multiple-choice questions, and
receives a complete, production-grade single-file website shown as a live preview. The user never
sees or downloads code — it is a lead-generation preview tool.

## Stack
farm-ts — FastAPI + motor (`/app/backend`), Vite + React 19 + Tailwind v4 (`/app/frontend`).
LLM: **Gemini 2.5 Flash** via `emergentintegrations` + `EMERGENT_LLM_KEY` (backend/.env).

## Data model (Mongo)
- `projects`: `{ id, title, style, html, generating, messages[], created_at, updated_at }`
  - `messages[]`: `{ id, role, kind: text|questions|site|refusal|error, text, questions[], attachments[], site_name, site_style, html, created_at }`
- `usage`: `{ day: "YYYY-MM-DD", used }` — silent daily cap, `DAILY_LIMIT = 20` in `backend/routers/architect.py`.
  Never surfaced as a counter in the UI; only a polite modal on 429.

## API (all on `api_router`, prefix `/api`)
| Method | Path | Notes |
|---|---|---|
| GET | `/quota` | `{used, limit, remaining, day, resets_at}` (internal, not displayed) |
| GET | `/projects` | history summaries, newest first |
| GET | `/projects/{id}` | full project; `generating` drives client polling |
| GET | `/projects/{id}/html` | raw HTML of the latest build |
| DELETE | `/projects/{id}` | 404 if missing |
| POST | `/chat` | `{project_id?, text, attachments[]}` → `{project, quota}` in <1 s; 429 quota, 409 build in flight |

## Why builds are background jobs
A full multi-section document takes 90–150 s while the public ingress cuts HTTP at 60 s. `POST /chat`
saves the user turn, sets `generating=true`, returns immediately and spawns an asyncio task
(`_generate`); the frontend polls `GET /projects/{id}` every 2.5 s via TanStack Query
`refetchInterval`. A build orphaned by a restart is cleared after 10 minutes on read.

## The architect brain (`backend/lib/architect_brain.py`)
- Locked to the LevelUp catalogue: portfolio, creator/link-in-bio, landing page, barbershop, hair &
  beauty, online store, online booking, restaurant/café, events. Anything else → `kind="refusal"`.
- Mirrors the user's language in its prose, its questions, its options and all site copy.
- Asks exactly one round of 2–3 multiple-choice questions, then builds; refinements never re-ask.
- Quality bar: sticky nav, 6+ substantial sections, multi-"page" in-document navigation, mobile
  burger menu, demo login (generic, `type="password"`, never submits, permanent demo badge), and a
  "this is a preview — contact LevelUp Studio" modal for any action that isn't real. No fake success.
- Random design DNA + font pairing per generation, `max_tokens=32000`, retry with backoff on
  provider rate/concurrency errors, serialised with an asyncio lock.

## Key UI decisions
- Wordmark `LevelUpStudio` (no logo icon, no animated star).
- Assistant prose rendered as Markdown (`components/Markdown.tsx`), no chat bubbles; only user turns
  are bubbles.
- No quota counter anywhere.
- Delivery card: fake macOS browser chrome, sandboxed iframe, Desktop/Tablet/Mobile, reload,
  Fullscreen, Open preview (blob tab), Request a change. **No download button — by design.**
- Hero: "What are we building today?", rotating placeholders, service catalogue chips, drag & drop
  (images → vision, text/code inlined, ≤5 MB).

## Auth
None — the app is open, no login.
