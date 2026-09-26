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
- Assistant prose rendered as Markdown (`components/Markdown.tsx`); only user turns are bubbles.
- No quota counter anywhere. On 429 the backend returns a professional message in `detail` which is
  rendered as an assistant note (`data-testid="quota-notice"`).
- Service catalogue is a horizontal rail with arrows (`ServiceRail.tsx`), no icons. Picking a service
  **attaches a chip** to the composer instead of starting a build; the user then adds their own text.
- Questions arrive as a **step-by-step wizard above the composer** (`QuestionWizard.tsx`): one
  question per step with Back/Next, dots + n/5 counter, single or multi select (`Question.multi`),
  and a free-text "My own answer" per step. The architect's question is bold, the options and the
  user's echoed answers are regular weight so the two never read alike.
- Composer: paperclip opens a popover to choose Image or File, stop button replaces send while a
  build runs, rotating hints render inline **bold**.
- Delivery is a **file card**: thumbnail, `<slug>.html`, style, section count, size, then Live
  preview (fullscreen with Desktop/Tablet/Mobile), Open in a tab, Copy link, Request a change.
  **No download button — by design.**
- Share link: `POST /projects/{id}/share` mints a token valid 7 days, served by `GET /api/share/{token}`
  with `X-Robots-Tag: noindex` (410 once expired).
- Build progress: backend ticker writes `progress`, `progress_step` and `progress_pct` every 2s
  (`EXPECTED_SECONDS = 150`); `BuildProgress.tsx` shows the live percentage, simulation blocks,
  reassuring `STAGE_NOTES` and a stop button. `POST /projects/{id}/stop` cancels the task.
- Desktop (>=1280px) shows a **right-hand canvas** (`data-testid=site-canvas`): build progress while
  it works, then the live `PreviewFrame` with browser chrome. Below that width the canvas is off and
  the in-stream delivery card's Live preview opens full screen; the device switcher is hidden on
  mobile since only the phone view is meaningful there.
- Home offers three hand-built **starter designs** (`lib/templates.py`, stored in the `templates`
  collection, live thumbnails via `GET /api/templates/{id}/html`). A pick is sent as
  `ChatRequest.template_id`, saved on the project and handed to the architect as the base design.
- After a delivery the architect explains the site section by section, asks what to adjust, and
  returns three `suggestions` rendered as one-tap tweak chips (a refinement changes only that).
- Every generated document is retried once if it comes back truncated (`_looks_complete`), and the
  prompt bans invented SVG paths (labelled pills for social links) plus emoji.
- A demo note ("This is an AI preview. Some photos are demo visuals…") sits under the canvas, the
  delivery card and the progress panel.
- Test fixture: `python /app/backend/seed.py` creates project `seed-questions-fixture` whose last
  turn is an unanswered 5-question round (2 of them multi-select) — no AI cost.
- Generated HTML is post-processed in `lib/html_post.py`: Tailwind CDN `<link>` rewritten to the
  required `<script>` (a `<link>` leaves the page completely unstyled), Unsplash URLs rewritten to
  seeded `picsum.photos`, and an `img` error handler injected that swaps a broken image for an
  "Image not found" placeholder.
- All scrollbars hidden app-wide (`no-scrollbar` + global rules in `index.css`).

## Auth
None — the app is open, no login.
