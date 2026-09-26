"""Post-processing of a generated document: dependable images, never a broken <img>."""

import hashlib
import re

# Hallucinated Unsplash photo ids 404 and leave a blank hole in the page. picsum.photos always
# resolves for any seed, so every remote photo URL is rewritten to a stable seeded one.
_UNSPLASH = re.compile(r"https://(?:images\.)?unsplash\.com/[^\s\"')]+", re.IGNORECASE)
_SOURCE_UNSPLASH = re.compile(r"https://source\.unsplash\.com/[^\s\"')]+", re.IGNORECASE)

_FALLBACK_SCRIPT = """
<script>
(function () {
  var LABEL = document.documentElement.lang && document.documentElement.lang.indexOf('fr') === 0
    ? 'Image indisponible' : 'Image not found';
  function placeholder(w, h) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
      '<rect width="100%" height="100%" fill="#eceaf3"/>' +
      '<text x="50%" y="50%" fill="#9a97ad" font-family="system-ui,sans-serif" font-size="' +
      Math.max(14, Math.round(w / 26)) + '" text-anchor="middle" dominant-baseline="middle">' +
      LABEL + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (!el || el.tagName !== 'IMG' || el.dataset.fallbackApplied) return;
    el.dataset.fallbackApplied = '1';
    el.removeAttribute('srcset');
    var w = el.naturalWidth || el.width || el.clientWidth || 800;
    var h = el.naturalHeight || el.height || el.clientHeight || Math.round(w * 0.66);
    el.src = placeholder(w, h);
    el.style.objectFit = 'cover';
  }, true);
})();
</script>
"""


def _seeded(url: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", url.lower())[-40:].strip("-") or "photo"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    width, height = 1200, 800
    size = re.search(r"w=(\d{2,4})", url)
    if size:
        width = min(int(size.group(1)), 1600)
        height = round(width * 0.66)
    return f"https://picsum.photos/seed/{slug}-{digest}/{width}/{height}"


_TW_LINK = re.compile(
    r"<link[^>]*cdn\.tailwindcss\.com[^>]*>", re.IGNORECASE
)
_TW_SCRIPT = '<script src="https://cdn.tailwindcss.com"></script>'
# Utility classes that only exist if Tailwind is actually loaded.
_TW_MARKERS = re.compile(
    r"class=\"[^\"]*(?:\b(?:sm|md|lg|xl):[a-z-]|\bflex\b|\bgrid\b|\bmx-auto\b|\bpx-\d|\btext-(?:xl|2xl|3xl|4xl)\b)",
    re.IGNORECASE,
)


def _fix_tailwind(html: str) -> str:
    """Tailwind's CDN build is a SCRIPT. Loaded as a stylesheet it silently does nothing and the
    whole page renders unstyled, so strip the bad <link> and make sure the script is present
    whenever the document relies on utility classes."""
    had_link = bool(_TW_LINK.search(html))
    if had_link:
        html = _TW_LINK.sub("", html)

    if "cdn.tailwindcss.com" in html:  # already a proper script tag
        return html

    needs_tailwind = had_link or len(_TW_MARKERS.findall(html)) >= 5
    if not needs_tailwind:
        return html

    if "</head>" in html:
        return html.replace("</head>", f"  {_TW_SCRIPT}\n</head>", 1)
    return _TW_SCRIPT + html


def harden_images(html: str) -> str:
    html = _fix_tailwind(html)
    html = _UNSPLASH.sub(lambda m: _seeded(m.group(0)), html)
    html = _SOURCE_UNSPLASH.sub(lambda m: _seeded(m.group(0)), html)
    if "fallbackApplied" not in html:
        if "</body>" in html:
            html = html.replace("</body>", _FALLBACK_SCRIPT + "</body>", 1)
        else:
            html += _FALLBACK_SCRIPT
    return html
