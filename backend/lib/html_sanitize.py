"""HTML sanitizer for user-imported templates.

Rules:
- Strip <script src="..."> unless the src is cdn.tailwindcss.com.
- Strip <iframe>, <object>, <embed> entirely.
- Strip <link> tags whose rel is stylesheet UNLESS href points to fonts.googleapis.com or
  cdn.tailwindcss.com (Tailwind CDN loaded via <link> is a rendering trap but we still allow it
  for the storage; the existing harden_images() rewrites it into a <script>).
- Neutralise remote <form action="..."> — replace with the demo modal opener attribute so the
  imported document behaves like our built sites.
- Refuse the import if the document is not HTML-shaped (no <html or <body).
- 500 KB byte limit is enforced by the caller; here we only shape the content.
"""

import re
from typing import Tuple

_MAX_BYTES = 500 * 1024

_SCRIPT_SRC = re.compile(r"<script\b[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"'][^>]*>\s*</script>", re.IGNORECASE)
_IFRAME = re.compile(r"<(iframe|object|embed)\b[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
_LONE_IFRAME = re.compile(r"<(iframe|object|embed)\b[^>]*/?\s*>", re.IGNORECASE)
_LINK_TAG = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
_FORM_TAG = re.compile(r"<form\b([^>]*)>", re.IGNORECASE)
_ACTION_ATTR = re.compile(r"\baction\s*=\s*[\"'][^\"']*[\"']", re.IGNORECASE)
_ONHANDLER = re.compile(
    r"\bon[a-z]+\s*=\s*[\"'](?:javascript:)?[^\"']*[\"']",
    re.IGNORECASE,
)  # only strip inline handlers whose payload is a URL scheme; keep normal onsubmit


def _keep_script(src: str) -> bool:
    lower = src.lower()
    return "cdn.tailwindcss.com" in lower


def _keep_link(tag: str) -> bool:
    lower = tag.lower()
    if "rel=" not in lower:
        return True
    if "stylesheet" not in lower:
        return True
    # Only keep stylesheet links that point to Google Fonts or Tailwind CDN.
    return ("fonts.googleapis.com" in lower) or ("fonts.gstatic.com" in lower) or ("cdn.tailwindcss.com" in lower)


class ImportError(ValueError):
    """Raised when an imported document cannot be accepted."""


def sanitize_import(html: str) -> Tuple[str, list[str]]:
    """Return (sanitised_html, list_of_notes). Raises ImportError on unusable input."""
    if not html or len(html) > _MAX_BYTES:
        raise ImportError("File is empty or over 500 KB")
    lowered = html.lower()
    if "<html" not in lowered or "<body" not in lowered:
        raise ImportError("Not a full HTML document (missing <html> or <body>)")

    notes: list[str] = []

    def sub_script(m: re.Match[str]) -> str:
        src = m.group(1)
        if _keep_script(src):
            return m.group(0)
        notes.append(f"removed external script: {src[:80]}")
        return ""

    cleaned = _SCRIPT_SRC.sub(sub_script, html)

    def sub_iframe(m: re.Match[str]) -> str:
        notes.append(f"removed <{m.group(1)}> block")
        return ""

    cleaned = _IFRAME.sub(sub_iframe, cleaned)
    cleaned = _LONE_IFRAME.sub(sub_iframe, cleaned)

    def sub_link(m: re.Match[str]) -> str:
        tag = m.group(0)
        if _keep_link(tag):
            return tag
        notes.append("removed external stylesheet link")
        return ""

    cleaned = _LINK_TAG.sub(sub_link, cleaned)

    def sub_form(m: re.Match[str]) -> str:
        attrs = _ACTION_ATTR.sub("", m.group(1)).strip()
        # Route the submit through the same demo modal we ship in our own templates.
        return f'<form {attrs} onsubmit="event.preventDefault();if(window.__demoNotice)window.__demoNotice();return false;">'

    cleaned = _FORM_TAG.sub(sub_form, cleaned)

    # If there is no demo modal in the imported HTML, inject a tiny one so preserved onsubmit lines
    # still open a friendly "this is a preview" panel.
    if "id=\"demo-modal\"" not in cleaned and "id='demo-modal'" not in cleaned:
        injection = (
            '<div id="demo-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);'
            'align-items:center;justify-content:center;padding:1.5rem">'
            '<div style="max-width:22rem;background:#fff;color:#0f172a;padding:1.5rem;border-radius:1rem;text-align:center;font-family:system-ui,sans-serif">'
            '<p style="font-weight:600;font-size:1.05rem">This is a preview</p>'
            '<p style="margin-top:.5rem;font-size:.85rem;color:#475569">To turn this into your real working website, contact LevelUp Studio.</p>'
            '<button onclick="document.getElementById(\'demo-modal\').style.display=\'none\'" '
            'style="margin-top:1rem;background:#0f172a;color:#fff;padding:.5rem 1.2rem;border-radius:9999px;border:0;cursor:pointer">Close</button>'
            '</div></div>'
            '<script>window.__demoNotice=function(){var m=document.getElementById("demo-modal");if(m){m.style.display="flex"}};</script>'
        )
        if "</body>" in cleaned:
            cleaned = cleaned.replace("</body>", injection + "</body>", 1)
        else:
            cleaned += injection

    return cleaned, notes
