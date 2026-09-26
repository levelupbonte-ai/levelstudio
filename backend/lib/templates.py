"""Hand-built starter designs. Their code lives in Mongo and is handed to the architect as the base
design when a visitor picks one, so a choice on the home page really drives the generated site."""

from typing import Dict, List

_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family={font_q}&display=swap" rel="stylesheet">
<style>
body {{ font-family: '{font}', system-ui, sans-serif; }}
h1,h2,h3 {{ font-family: '{display}', serif; }}
.reveal {{ opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s cubic-bezier(.16,1,.3,1); }}
.reveal.in {{ opacity: 1; transform: none; }}
</style>
</head>"""

_REVEAL = """<script>
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: .12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
function demoNotice(){ document.getElementById('demo-modal').classList.remove('hidden'); }
document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); demoNotice(); }));
</script>"""

_MODAL = """<div id="demo-modal" class="hidden fixed inset-0 z-50 grid place-items-center bg-black/70 p-6">
  <div class="max-w-sm rounded-2xl bg-white p-6 text-center text-slate-900 shadow-2xl">
    <p class="text-lg font-semibold">This is a preview</p>
    <p class="mt-2 text-sm text-slate-600">To turn this into your real working website, contact LevelUp Studio.</p>
    <button onclick="document.getElementById('demo-modal').classList.add('hidden')" class="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm text-white">Close</button>
  </div>
</div>"""


def _aurora() -> str:
    head = _HEAD.format(
        title="Aurora — SaaS landing", font="Manrope", font_q="Manrope:wght@400;600;700",
        display="Sora",
    )
    return f"""{head}
<body class="bg-[#08080e] text-slate-200">
<header class="sticky top-0 z-40 border-b border-white/10 bg-[#08080e]/80 backdrop-blur-xl">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-bold text-white">Aurora</span>
    <nav class="hidden gap-8 text-sm md:flex">
      <a href="#features" class="hover:text-white">Features</a>
      <a href="#pricing" class="hover:text-white">Pricing</a>
      <a href="#faq" class="hover:text-white">FAQ</a>
    </nav>
    <button data-demo class="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white">Start free</button>
  </div>
</header>
<section class="relative overflow-hidden px-5 py-24">
  <div class="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(99,102,241,.35),transparent)]"></div>
  <div class="relative mx-auto max-w-3xl text-center">
    <p class="text-xs uppercase tracking-[0.25em] text-indigo-300">Revenue intelligence</p>
    <h1 class="mt-4 text-4xl font-bold text-white sm:text-6xl">Every metric your team argues about, settled.</h1>
    <p class="mx-auto mt-5 max-w-xl text-slate-400">Aurora reads your billing data and turns it into one number everyone trusts, updated every hour.</p>
    <div class="mt-8 flex justify-center gap-3">
      <button data-demo class="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900">Book a demo</button>
      <a href="#features" class="rounded-full border border-white/15 px-6 py-3 text-sm">See how it works</a>
    </div>
  </div>
</section>
<section id="features" class="mx-auto grid max-w-6xl gap-5 px-5 pb-20 md:grid-cols-3">
  <div class="reveal rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p class="text-3xl">01</p><h3 class="mt-3 text-lg font-semibold text-white">Live cohorts</h3><p class="mt-2 text-sm text-slate-400">Retention curves that refresh while you watch.</p></div>
  <div class="reveal rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p class="text-3xl">02</p><h3 class="mt-3 text-lg font-semibold text-white">Forecasts</h3><p class="mt-2 text-sm text-slate-400">Board-ready projections with the maths shown.</p></div>
  <div class="reveal rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p class="text-3xl">03</p><h3 class="mt-3 text-lg font-semibold text-white">Alerts</h3><p class="mt-2 text-sm text-slate-400">A quiet ping the day a plan starts leaking.</p></div>
</section>
<section id="pricing" class="border-y border-white/10 bg-white/[0.02] px-5 py-20">
  <div class="mx-auto max-w-4xl text-center"><h2 class="text-3xl font-bold text-white">Simple pricing</h2></div>
  <div class="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
    <div class="rounded-2xl border border-white/10 p-7"><p class="text-sm text-slate-400">Team</p><p class="mt-2 text-4xl font-bold text-white">$49<span class="text-base text-slate-500">/mo</span></p><button data-demo class="mt-6 w-full rounded-full border border-white/15 py-2.5 text-sm">Choose Team</button></div>
    <div class="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 p-7"><p class="text-sm text-indigo-200">Scale</p><p class="mt-2 text-4xl font-bold text-white">$149<span class="text-base text-slate-400">/mo</span></p><button data-demo class="mt-6 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-slate-900">Choose Scale</button></div>
  </div>
</section>
<section id="faq" class="mx-auto max-w-3xl px-5 py-20"><h2 class="text-3xl font-bold text-white">Questions</h2>
  <div class="mt-6 divide-y divide-white/10 text-sm"><p class="py-4">How long is setup? About twenty minutes.</p><p class="py-4">Where does data live? Your region, encrypted at rest.</p><p class="py-4">Can we cancel? Any time, no call required.</p></div>
</section>
<footer class="border-t border-white/10 px-5 py-10 text-sm text-slate-500"><div class="mx-auto flex max-w-6xl flex-wrap justify-between gap-4"><span>© Aurora</span><span>hello@aurora.io</span></div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


def _atelier() -> str:
    head = _HEAD.format(
        title="Atelier — editorial portfolio", font="Inter", font_q="Inter:wght@400;500&family=Playfair+Display:wght@500;700",
        display="Playfair Display",
    )
    return f"""{head}
<body class="bg-[#f7f5f1] text-[#191712]">
<header class="sticky top-0 z-40 border-b border-black/10 bg-[#f7f5f1]/90 backdrop-blur">
  <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
    <span class="text-xl tracking-tight">Atelier<span class="text-[#b4552b]">.</span></span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
  </div>
</header>
<section class="mx-auto max-w-5xl px-5 py-20">
  <p class="text-xs uppercase tracking-[0.3em] text-[#b4552b]">Photography since 2011</p>
  <h1 class="mt-5 max-w-2xl text-5xl leading-[1.05] sm:text-7xl">Light, patience, and the room as it really is.</h1>
  <p class="mt-6 max-w-lg text-[15px] text-black/60">Interiors and portraits for architects, hotels and independent makers.</p>
</section>
<section id="work" class="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2">
  <img class="reveal h-72 w-full rounded-lg object-cover sm:h-96" src="https://picsum.photos/seed/atelier-interior-warm/900/1100" alt="Interior study" loading="lazy">
  <div class="reveal flex flex-col justify-end rounded-lg bg-[#ece7df] p-7"><p class="text-3xl">Maison Verne</p><p class="mt-2 text-sm text-black/60">Nine rooms, one afternoon of northern light.</p></div>
  <div class="reveal flex flex-col justify-end rounded-lg bg-[#191712] p-7 text-[#f7f5f1]"><p class="text-3xl">Studio Ren</p><p class="mt-2 text-sm text-white/60">Portraits for a ceramics house.</p></div>
  <img class="reveal h-72 w-full rounded-lg object-cover sm:h-96" src="https://picsum.photos/seed/atelier-portrait-ceramics/900/1100" alt="Portrait study" loading="lazy">
</section>
<section id="about" class="border-y border-black/10 px-5 py-20"><div class="mx-auto grid max-w-5xl gap-10 md:grid-cols-2"><h2 class="text-4xl">A slow practice in a fast industry.</h2><p class="text-[15px] text-black/65">Two cameras, natural light, and a habit of arriving early. Work published in Kinfolk, AD and Monocle.</p></div></section>
<section id="contact" class="mx-auto max-w-5xl px-5 py-20"><h2 class="text-4xl">Let us talk about your space</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-7 grid max-w-xl gap-3">
    <input class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm" placeholder="Your name">
    <input class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm" placeholder="Email" type="email">
    <button class="rounded-full bg-[#191712] px-6 py-3 text-sm text-white">Send enquiry</button>
  </form>
</section>
<footer class="border-t border-black/10 px-5 py-10 text-sm text-black/50"><div class="mx-auto max-w-5xl">© Atelier, Lisbon</div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


def _midnight() -> str:
    head = _HEAD.format(
        title="Midnight — booking", font="Manrope", font_q="Manrope:wght@400;600;800",
        display="Manrope",
    )
    return f"""{head}
<body class="bg-[#0d0b12] text-slate-200">
<header class="sticky top-0 z-40 border-b border-white/10 bg-[#0d0b12]/85 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-extrabold uppercase tracking-[0.2em] text-white">Midnight</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#services">Services</a><a href="#team">Team</a><a href="#book">Book</a></nav>
    <button data-demo class="rounded-md bg-[#e4b363] px-4 py-2 text-sm font-semibold text-[#1a1410]">Book a chair</button>
  </div>
</header>
<section class="relative px-5 py-24">
  <div class="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
    <div>
      <p class="text-xs uppercase tracking-[0.3em] text-[#e4b363]">Open 7 days, 9am to 9pm</p>
      <h1 class="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">A sharper cut, booked in forty seconds.</h1>
      <p class="mt-5 max-w-md text-slate-400">Six chairs, no waiting room queue. Pick your barber, pick your slot, turn up.</p>
      <div class="mt-8 flex gap-3"><button data-demo class="rounded-md bg-[#e4b363] px-6 py-3 text-sm font-semibold text-[#1a1410]">Book now</button><a href="#services" class="rounded-md border border-white/15 px-6 py-3 text-sm">See prices</a></div>
    </div>
    <img class="reveal h-80 w-full rounded-xl object-cover" src="https://picsum.photos/seed/midnight-barber-chair/1000/800" alt="Barber chair" loading="lazy">
  </div>
</section>
<section id="services" class="border-y border-white/10 bg-white/[0.02] px-5 py-20">
  <div class="mx-auto max-w-4xl"><h2 class="text-3xl font-bold text-white">Services</h2>
    <div class="mt-7 divide-y divide-white/10">
      <div class="flex justify-between py-4"><span>Signature cut</span><span class="text-[#e4b363]">28</span></div>
      <div class="flex justify-between py-4"><span>Beard sculpt</span><span class="text-[#e4b363]">18</span></div>
      <div class="flex justify-between py-4"><span>Hot towel shave</span><span class="text-[#e4b363]">32</span></div>
      <div class="flex justify-between py-4"><span>Cut and beard</span><span class="text-[#e4b363]">42</span></div>
    </div>
  </div>
</section>
<section id="team" class="mx-auto grid max-w-6xl gap-5 px-5 py-20 sm:grid-cols-3">
  <div class="reveal rounded-xl border border-white/10 p-6"><p class="text-lg font-semibold text-white">Samir</p><p class="mt-1 text-sm text-slate-400">Fades and line-ups</p></div>
  <div class="reveal rounded-xl border border-white/10 p-6"><p class="text-lg font-semibold text-white">Tom</p><p class="mt-1 text-sm text-slate-400">Scissor work, classic</p></div>
  <div class="reveal rounded-xl border border-white/10 p-6"><p class="text-lg font-semibold text-white">Lea</p><p class="mt-1 text-sm text-slate-400">Beards and colour</p></div>
</section>
<section id="book" class="px-5 pb-24"><div class="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-7">
  <h2 class="text-2xl font-bold text-white">Book a chair</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-5 grid gap-3">
    <select class="rounded-md border border-white/12 bg-[#14121b] px-4 py-3 text-sm"><option>Signature cut</option><option>Beard sculpt</option></select>
    <input type="date" class="rounded-md border border-white/12 bg-[#14121b] px-4 py-3 text-sm">
    <input placeholder="Your name" class="rounded-md border border-white/12 bg-[#14121b] px-4 py-3 text-sm">
    <button class="rounded-md bg-[#e4b363] py-3 text-sm font-semibold text-[#1a1410]">Confirm booking</button>
  </form>
</div></section>
<footer class="border-t border-white/10 px-5 py-10 text-sm text-slate-500"><div class="mx-auto max-w-6xl flex flex-wrap justify-between gap-3"><span>© Midnight Barbers</span><span>12 Dock Street</span></div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


TEMPLATES: List[Dict[str, str]] = [
    {
        "id": "aurora-saas",
        "name": "Aurora",
        "tagline": "Dark SaaS landing with an aurora glow",
        "best_for": "Landing pages, apps, agencies",
        "accent": "#6366F1",
        "html": _aurora(),
    },
    {
        "id": "atelier-editorial",
        "name": "Atelier",
        "tagline": "Warm editorial grid for visual work",
        "best_for": "Portfolios, studios, photographers",
        "accent": "#B4552B",
        "html": _atelier(),
    },
    {
        "id": "midnight-booking",
        "name": "Midnight",
        "tagline": "Gold on black, built around booking",
        "best_for": "Barbershops, salons, restaurants",
        "accent": "#E4B363",
        "html": _midnight(),
    },
]
