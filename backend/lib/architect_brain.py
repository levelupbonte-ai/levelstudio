"""The locked 'senior web architect' brain: prompt, design DNA pool, JSON contract."""

import asyncio
import json
import os
import random
import re
from typing import Any, Dict, List

from emergentintegrations.llm.chat import LlmChat, UserMessage

MODEL_PROVIDER = "gemini"
MODEL_NAME = "gemini-2.5-flash"

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
4. Before the first build, ask exactly 2 to 3 sharp MULTIPLE-CHOICE questions that a real studio
   would ask: business name/type, city, main goal (more bookings / look professional / sell online /
   showcase work), visual style, what a client account would mean for them. 3 to 5 short options each.
   Never ask a second question round in the same project — if the conversation already contains one,
   you MUST build.
5. A refinement request on an existing site: never ask questions, return the FULL updated document.

OUTPUT FORMAT — reply with ONE raw JSON object and nothing else. No markdown fences around the JSON.
A) Questions: {"kind":"questions","text":"<short markdown line>","title":"<3-5 word project title>",
   "questions":[{"label":"...","options":["...","...","..."]}, ...]}
B) Site: {"kind":"site","text":"<short markdown recap of what you built>","title":"<3-5 word title>",
   "style":"<design DNA name>","html":"<!DOCTYPE html> ... full document ..."}
C) Refusal: {"kind":"refusal","text":"<one polite sentence>"}

SITE QUALITY BAR (kind="site") — the benchmark is a real agency-built site, never a one-screen mockup
- ONE self-contained .html document: <!DOCTYPE html>, inline <style> and inline <script> only.
  Allowed CDNs: Google Fonts, optionally https://cdn.tailwindcss.com. Nothing else.
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
- Real, specific, believable copy in the user's language — never lorem ipsum. Plausible prices,
  hours, names, neighbourhoods.
- Fully responsive: a working mobile burger menu, fluid grids, comfortable tap targets at 375px.
- Inline SVG icons, CSS gradients. Photos only from https://images.unsplash.com/... with
  ?auto=format&fit=crop&w=1200&q=80.
- Tasteful motion: hover transitions, scroll reveal via IntersectionObserver, sticky header shrink.
- Never two identical designs: honour the assigned design DNA and font pairing exactly.
"""


_CALL_LOCK = asyncio.Lock()


def _client_key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def build_turn_prompt(transcript: List[Dict[str, Any]], current_html: str | None) -> str:
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
            "do not ask questions, return kind='site' with the FULL updated document.\n"
            "CURRENT DOCUMENT:\n" + current_html[:120000]
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
    current_html: str | None,
    images: List[Dict[str, str]],
) -> Dict[str, Any]:
    chat = LlmChat(
        api_key=_client_key(),
        session_id=session_id,
        system_message=SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    try:
        chat = chat.with_params(max_tokens=32000)  # a full multi-section document is long
    except Exception:  # pragma: no cover — older builds without with_params
        pass

    prompt = build_turn_prompt(transcript, current_html)
    message = UserMessage(text=prompt)

    if images:
        try:
            from emergentintegrations.llm.chat import ImageContent  # type: ignore

            message = UserMessage(
                text=prompt,
                file_contents=[ImageContent(image_base64=img["data"]) for img in images],
            )
        except Exception:  # vision unavailable — degrade to text-only
            message = UserMessage(text=prompt)

    # The universal key allows one in-flight completion: serialise, and retry the
    # provider's concurrency/rate errors with backoff instead of failing the turn.
    async with _CALL_LOCK:
        last_exc: Exception | None = None
        for attempt in range(4):
            try:
                raw = await chat.send_message(message)
                return _extract_json(raw if isinstance(raw, str) else str(raw))
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                text = str(exc).lower()
                retryable = "429" in text or "rate" in text or "concurren" in text or "overloaded" in text
                if not retryable or attempt == 3:
                    raise
                await asyncio.sleep(2 * (attempt + 1))
        raise last_exc if last_exc else RuntimeError("architect call failed")
