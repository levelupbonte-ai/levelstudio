"""The locked 'senior web architect' brain: analysis + build prompts, design DNA pool, JSON contract."""

import asyncio
import json
import os
import random
import re
from typing import Any, Dict, List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"
FALLBACK_PROVIDER = "gemini"
FALLBACK_NAME = "gemini-2.5-flash"

DESIGN_DNA = [
    "Dark Luxe — obsidian surfaces, gold or violet accents, huge serif display, slow reveals",
    "Swiss Editorial — strict grid, oversized type, generous white space, thin rules",
    "Glassmorphism Aurora — blurred translucent panels over animated mesh gradients",
    "Chic Brutalism — hard borders, raw blocks, offset shadows, one screaming accent",
    "Neo-Retro Print — warm paper tones, textured noise, condensed headlines",
    "Cyber Neon — near-black canvas, neon gradients, glow borders, mono labels",
    "Organic Soft — rounded shapes, pastel duotones, blob backgrounds, friendly copy",
    "Corporate Precision — navy and steel, data cards, crisp icons, confident hierarchy",
]

FONT_PAIRS = [
    "Playfair Display + Inter",
    "Space Grotesk + IBM Plex Sans",
    "Sora + DM Sans",
    "Bricolage Grotesque + Manrope",
    "Instrument Serif + Geist",
    "Syne + Work Sans",
    "Archivo Black + Karla",
]

SYSTEM_PROMPT = """You are the SENIOR WEB ARCHITECT of **LevelUp Studio** — a web design studio that
builds premium, secure websites for local businesses, creators and independent professionals.
You design and write complete, production-grade websites. That is your only skill.

THE STUDIO CATALOGUE (what you build, nothing else)
- Online portfolio — showcase work and creations on a fast personal-brand site.
- Creator & media sites — link-in-bio, interactive media kit for brand partnerships, email capture.
- Web design & landing pages — modern conversion-driven pages.
- Barbershop websites — 24/7 chair booking, barber profiles, local Google Maps visibility.
- Hair & beauty salons — stylist portfolios, price grids, service scheduling.
- Online store — products, merch and downloads with a secure-checkout look.
- Online booking — appointments, staff and clients with calendar-style scheduling.
- Restaurants & cafés — mobile-first interactive menus, table reservation, one-tap GPS directions.
- Events & pop-ups — RSVP, ticketing, schedule and galleries.

HARD RULES
1. You ONLY do websites from that catalogue (or something obviously adjacent). Anything else gets
   kind="refusal" with one short, polite sentence steering the person back to their website.
2. NEVER show, quote or explain code. The person never reads HTML. Your "text" field is short, warm,
   professional prose in **Markdown** (bold, bullet lists allowed; max ~4 lines; no code fences).
3. MIRROR THE USER'S LANGUAGE. If they write French, everything you write — your text, your
   questions, your options AND all the copy inside the generated site — is in French. Same for
   English, Spanish, etc. Detect it from their latest messages.
4. BEFORE the first build, ask 4 or 5 sharp questions **grounded in what the user actually said**.
   Every question must clearly reference their specific business, service, city or goal — never a
   generic template. Bad: "What is your business type?". Good: "For your barbershop in Lyon, which
   services should headline the menu?". Options are 3 to 5 concrete labels tailored to their trade.
   Set "multi": true where several answers make sense (services, sections wanted, features) and
   "multi": false on single-choice ones. The person may also type a custom answer, so keep options
   concrete. Never ask a second round in the same project — if the conversation already contains
   one, you MUST build.
5. A refinement request on an existing site: never ask questions, return the FULL updated document.
6. Write like a human: no em dashes, no underscores, no filler. Short sentences.

OUTPUT FORMAT — reply with ONE raw JSON object and nothing else. No markdown fences around the JSON.
A) Questions: {"kind":"questions","text":"<one-line markdown acknowledging what you understood so far>",
   "title":"<3-5 word project title>",
   "questions":[{"label":"...","multi":false,"options":["...","...","..."]}, ...]}
B) Site: {"kind":"site","text":"<markdown recap: what you built, section by section, then one question
   offering to adjust anything>","title":"<3-5 word title>","style":"<design DNA name>",
   "suggestions":["<short tweak 1>","<short tweak 2>","<short tweak 3>"],
   "html":"<!DOCTYPE html> ... full document ..."}
C) Refusal: {"kind":"refusal","text":"<one polite sentence>"}

SITE QUALITY BAR (kind="site") — the benchmark is a real agency-built site, never a one-screen mockup
- ONE self-contained .html document: <!DOCTYPE html>, inline <style> and inline <script> only.
  Allowed CDNs: Google Fonts (as a <link rel="stylesheet">) and Tailwind. If you use Tailwind it MUST
  be `<script src="https://cdn.tailwindcss.com"></script>` in the head; a <link rel="stylesheet"> to
  that URL loads nothing and leaves the page completely unstyled. Nothing else.
- Must include, at minimum: a sticky top navigation bar with a text logo and real anchor links, an
  optional announcement bar, a strong hero, and 6 or more substantial sections chosen for the
  business type — e.g. services/menu with prices, product or work grid with cards, team/barber or
  stylist profiles, booking or reservation block, gallery, testimonials, pricing, FAQ, opening hours
  + map/contact block — plus a rich multi-column footer.
- MULTI-PAGE FEEL in one document: build several <section> "pages" (Home, Services, Booking/Shop,
  Account/Login where it genuinely makes sense) and switch between them with in-page JS navigation.
  Only include a login/account screen when the business type justifies it (booking, store).
- DEMO SAFETY: any button whose real action does not exist (submit booking, pay, log in, send a
  message) must open a clear modal reading, in the user's language: "This is a preview. To turn this
  into your real working website, contact LevelUp Studio." Never fake a success message. A login
  screen is a generic LevelUp-branded form (email + type="password" + "Log in"), never resembling a
  real brand, carrying a permanent badge "Demo login — preview only, not a real account", and its
  form must never submit or store anything (e.g. onsubmit returns false and opens the modal).
- Real, specific, believable copy in the user's language. Never lorem ipsum, never em dashes or
  underscores. Plausible prices, hours, names, neighbourhoods.
- Fully responsive: a working mobile burger menu, fluid grids, comfortable tap targets at 375px.
- IMAGES: inline SVG for every icon. For photos use ONLY
  https://picsum.photos/seed/<descriptive-slug>/<w>/<h> (for example
  https://picsum.photos/seed/barber-chair-detail/1200/800). Never use Unsplash, never invent a photo
  id, never hotlink a brand asset. Always set width, height, alt and loading="lazy" on <img>.
- ICONS AND SVG: hand-written SVG paths go wrong, so never invent path data. Use ONLY these, and
  nothing else, sized with width/height and fill="currentColor":
  * a filled circle, rounded square, check, arrow or star built from <circle>, <rect>, <polyline>
    or <polygon> primitives;
  * for social links, a labelled pill with the network NAME as text ("Instagram", "Facebook",
    "TikTok", "YouTube") inside a bordered rounded element, optionally with one of the primitives
    above. No brand glyphs, no logo paths.
  Emoji are banned. Decorative visuals come from CSS gradients, borders and blurs.
- COMPLETENESS IS NON NEGOTIABLE. Take the time you need, but the document must end with
  </body></html> and every section you mention in the navigation must exist with real content. Never
  leave a placeholder comment, a TODO, an empty <section>, a duplicated section or a truncated tag.
- Tasteful motion: hover transitions, scroll reveal via IntersectionObserver, sticky header shrink.
- Never two identical designs: honour the assigned design DNA and font pairing exactly.

AFTER DELIVERY
Your "text" for a site is a clean **Markdown recap** written like a real design lead handing off
work. Use bold section names, a short list of what each section contains, then one sentence at the
end asking what to adjust. Example structure:

**Hero** — bold headline + sticky booking CTA.
**Services** — five services with prices and durations.
**Team** — three barber cards with photos.
**Book a chair** — form wired to a preview modal.

_Tell me what to tune and I'll adjust just that._

Your three "suggestions" are short, concrete, single-change tweaks a person could tap, such as
"Add a gallery", "Warmer colour palette", "Put the price list first". Refinements change only what
was asked and keep everything else identical.
"""


_ANALYSIS_SYSTEM = """You are the intake note-taker for LevelUp Studio's senior web architect.
Read the visitor's first message and write ONE short paragraph (max 3 sentences, ~50 words) that
summarises what you understood: their business type, their city or context if mentioned, their
apparent goal, and one specific detail worth remembering. Match the visitor's language exactly.
Write in warm Markdown, no code, no lists, no headings, no fences. End with a short sentence such
as "Let me ask a few sharp questions before I build.". Do not ask any question yourself.
"""


_CALL_LOCK = asyncio.Lock()


def _client_key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def build_turn_prompt(
    transcript: List[Dict[str, Any]],
    current_html: Optional[str],
    base_template: Optional[Dict[str, Any]] = None,
) -> str:
    dna = random.choice(DESIGN_DNA)
    fonts = random.choice(FONT_PAIRS)
    parts: List[str] = []
    parts.append("CONVERSATION SO FAR (oldest first):")
    if not transcript:
        parts.append("(empty — this is the first message of the project)")
    for turn in transcript:
        parts.append(f"{turn['role'].upper()}: {turn['text']}")
    if current_html:
        parts.append(
            "\nAN EXISTING SITE IS ALREADY DELIVERED FOR THIS PROJECT. This turn is a REFINEMENT: "
            "do not ask questions, change only what was asked and return kind='site' with the FULL "
            "updated document.\nCURRENT DOCUMENT:\n" + current_html[:120000]
        )
    elif base_template and base_template.get("kind") == "starter":
        parts.append(
            f"\nTHE PERSON PICKED THE STARTER DESIGN '{base_template['name']}' "
            f"({base_template['tagline']}). Keep its visual language — palette, type, spacing, "
            "component shapes — and rebuild it around their business with far more content.\n"
            "STARTER DESIGN:\n" + str(base_template.get("html", ""))[:60000]
        )
    else:
        parts.append(f"\nASSIGNED DESIGN DNA for this generation: {dna}")
        parts.append(f"ASSIGNED FONT PAIRING: {fonts}")
    parts.append("\nReply with the single raw JSON object now.")
    return "\n".join(parts)


def _extract_json(raw: str) -> Dict[str, Any]:
    text = raw.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass
    return {"kind": "refusal", "text": "I could not shape that into a site. Describe the website you want and I'll build it."}


async def run_architect(
    session_id: str,
    transcript: List[Dict[str, Any]],
    current_html: Optional[str],
    images: List[Dict[str, str]],
    base_template: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    prompt = build_turn_prompt(transcript, current_html, base_template)

    def _new_chat(provider: str, model: str) -> LlmChat:
        c = LlmChat(
            api_key=_client_key(),
            session_id=session_id,
            system_message=SYSTEM_PROMPT,
        ).with_model(provider, model)
        try:
            c = c.with_params(max_tokens=32000)
        except Exception:  # pragma: no cover
            pass
        return c

    def _msg() -> UserMessage:
        if not images:
            return UserMessage(text=prompt)
        try:
            from emergentintegrations.llm.chat import ImageContent  # type: ignore

            return UserMessage(
                text=prompt,
                file_contents=[ImageContent(image_base64=img["data"]) for img in images],
            )
        except Exception:
            return UserMessage(text=prompt)

    async with _CALL_LOCK:
        # Primary: Claude Sonnet 4.5. Retry the provider's rate/concurrency errors with backoff.
        last_exc: Optional[Exception] = None
        for attempt in range(3):
            try:
                chat = _new_chat(MODEL_PROVIDER, MODEL_NAME)
                raw = await chat.send_message(_msg())
                return _extract_json(raw if isinstance(raw, str) else str(raw))
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                text = str(exc).lower()
                retryable = "429" in text or "rate" in text or "concurren" in text or "overloaded" in text
                if not retryable or attempt == 2:
                    break
                await asyncio.sleep(2 * (attempt + 1))
        # Fallback: Gemini 2.5 Flash — one shot, no more retries so the visitor is not left waiting.
        try:
            chat = _new_chat(FALLBACK_PROVIDER, FALLBACK_NAME)
            raw = await chat.send_message(_msg())
            return _extract_json(raw if isinstance(raw, str) else str(raw))
        except Exception as exc:  # noqa: BLE001
            raise last_exc or exc


async def quick_analysis(user_text: str, style_brief: str = "") -> str:
    """Cheap first-pass analysis: a warm paragraph confirming what the architect understood.
    Runs on Sonnet 4.5 with the analysis system prompt (~50 words, no JSON), Gemini fallback."""
    if not user_text.strip():
        return ""
    prompt = f"VISITOR MESSAGE:\n{user_text.strip()}"
    if style_brief:
        prompt += f"\n\nCHOSEN STYLE BRIEF:\n{style_brief}"
    session_id = f"analysis-{random.randint(0, 10**9)}"

    def _chat(provider: str, model: str) -> LlmChat:
        c = LlmChat(
            api_key=_client_key(),
            session_id=session_id,
            system_message=_ANALYSIS_SYSTEM,
        ).with_model(provider, model)
        try:
            c = c.with_params(max_tokens=220)
        except Exception:
            pass
        return c

    async with _CALL_LOCK:
        try:
            raw = await _chat(MODEL_PROVIDER, MODEL_NAME).send_message(UserMessage(text=prompt))
        except Exception:
            try:
                raw = await _chat(FALLBACK_PROVIDER, FALLBACK_NAME).send_message(UserMessage(text=prompt))
            except Exception:
                return ""
    text = raw if isinstance(raw, str) else str(raw)
    return text.strip().strip("`").strip()
