import crypto from "crypto";

const UNSPLASH = /https:\/\/(?:images\.)?unsplash\.com\/[^\s"')]+/gi;
const SOURCE_UNSPLASH = /https:\/\/source\.unsplash\.com\/[^\s"')]+/gi;

const FALLBACK_SCRIPT = `
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
`;

function seeded(url: string): string {
  const slug = url.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(-40).replace(/^-|-$/g, "") || "photo";
  const digest = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  let width = 1200;
  let height = 800;
  const match = url.match(/w=(\d{2,4})/);
  if (match) {
    width = Math.min(parseInt(match[1], 10), 1600);
    height = Math.round(width * 0.66);
  }
  return `https://picsum.photos/seed/${slug}-${digest}/${width}/${height}`;
}

const TW_LINK = /<link[^>]*cdn\.tailwindcss\.com[^>]*>/gi;
const TW_SCRIPT = '<script src="https://cdn.tailwindcss.com"></script>';
const TW_MARKERS = /class="[^"]*(?:\b(?:sm|md|lg|xl):[a-z-]|\bflex\b|\bgrid\b|\bmx-auto\b|\bpx-\d|\btext-(?:xl|2xl|3xl|4xl)\b)/gi;

export function fixTailwind(html: string): string {
  const hadLink = TW_LINK.test(html);
  let res = html.replace(TW_LINK, "");

  if (res.includes("cdn.tailwindcss.com")) {
    return res;
  }

  const markers = res.match(TW_MARKERS);
  const needsTailwind = hadLink || (markers && markers.length >= 5);
  if (!needsTailwind) return res;

  if (res.includes("</head>")) {
    return res.replace("</head>", `  ${TW_SCRIPT}\n</head>`);
  }
  return TW_SCRIPT + res;
}

export function hardenImages(html: string): string {
  let res = fixTailwind(html);
  res = res.replace(UNSPLASH, (m) => seeded(m));
  res = res.replace(SOURCE_UNSPLASH, (m) => seeded(m));
  if (!res.includes("fallbackApplied")) {
    if (res.includes("</body>")) {
      res = res.replace("</body>", FALLBACK_SCRIPT + "</body>");
    } else {
      res += FALLBACK_SCRIPT;
    }
  }
  return res;
}

export function sanitizeImport(html: string): { cleaned: string; notes: string[] } {
  const MAX_BYTES = 500 * 1024;
  if (!html || Buffer.byteLength(html, "utf-8") > MAX_BYTES) {
    throw new Error("File is empty or over 500 KB");
  }
  const lowered = html.toLowerCase();
  if (!lowered.includes("<html") || !lowered.includes("<body")) {
    throw new Error("Not a full HTML document (missing <html> or <body>)");
  }

  const notes: string[] = [];

  // Remove scripts except cdn.tailwindcss.com
  let cleaned = html.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (m, src) => {
    if (src.toLowerCase().includes("cdn.tailwindcss.com")) return m;
    notes.push(`removed external script: ${src.slice(0, 80)}`);
    return "";
  });

  // Remove iframes / objects / embeds
  cleaned = cleaned.replace(/<(iframe|object|embed)\b[^>]*>.*?<\/\1>/gis, (m, tag) => {
    notes.push(`removed <${tag}> block`);
    return "";
  });
  cleaned = cleaned.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, () => "");

  // Remove external stylesheets except Google Fonts and Tailwind CDN
  cleaned = cleaned.replace(/<link\b[^>]*>/gi, (m) => {
    const l = m.toLowerCase();
    if (!l.includes("rel=") || !l.includes("stylesheet")) return m;
    if (l.includes("fonts.googleapis.com") || l.includes("fonts.gstatic.com") || l.includes("cdn.tailwindcss.com")) {
      return m;
    }
    notes.push("removed external stylesheet link");
    return "";
  });

  // Disarm form actions
  cleaned = cleaned.replace(/<form\b([^>]*)>/gi, (_, attrs) => {
    const safeAttrs = attrs.replace(/\baction\s*=\s*["'][^"']*["']/gi, "").trim();
    return `<form ${safeAttrs} onsubmit="event.preventDefault();if(window.__demoNotice)window.__demoNotice();return false;">`;
  });

  // Inject preview demo modal if not already present
  if (!cleaned.includes('id="demo-modal"') && !cleaned.includes("id='demo-modal'")) {
    const injection =
      '<div id="demo-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);' +
      'align-items:center;justify-content:center;padding:1.5rem">' +
      '<div style="max-width:22rem;background:#fff;color:#0f172a;padding:1.5rem;border-radius:1rem;text-align:center;font-family:system-ui,sans-serif">' +
      '<p style="font-weight:600;font-size:1.05rem">This is a preview</p>' +
      '<p style="margin-top:.5rem;font-size:.85rem;color:#475569">To turn this into your real working website, contact LevelUp Studio.</p>' +
      '<button onclick="document.getElementById(\'demo-modal\').style.display=\'none\'" ' +
      'style="margin-top:1rem;background:#0f172a;color:#fff;padding:.5rem 1.2rem;border-radius:9999px;border:0;cursor:pointer">Close</button>' +
      '</div></div>' +
      '<script>window.__demoNotice=function(){var m=document.getElementById("demo-modal");if(m){m.style.display="flex"}};</script>';
    if (cleaned.includes("</body>")) {
      cleaned = cleaned.replace("</body>", injection + "</body>");
    } else {
      cleaned += injection;
    }
  }

  return { cleaned, notes };
}
