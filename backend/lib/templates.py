"""Templates catalogue — 10 hand-built starter designs + 40 style cards.

- **Starters** (kind='starter') ship a full HTML document that is stored in Mongo and handed to the
  architect as the base design when the visitor picks one, so a choice on the home page really
  drives the generated site.
- **Style cards** (kind='style') carry no HTML: they are a design brief (palette, fonts, sections)
  the architect uses to compose an original site in that direction. They render as styled cards on
  the home gallery, not as iframes.
"""

from typing import Any, Dict, List

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
    head = _HEAD.format(title="Aurora — SaaS landing", font="Manrope", font_q="Manrope:wght@400;600;700", display="Sora")
    return f"""{head}
<body class="bg-[#08080e] text-slate-200">
<header class="sticky top-0 z-40 border-b border-white/10 bg-[#08080e]/80 backdrop-blur-xl">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-bold text-white">Aurora</span>
    <nav class="hidden gap-8 text-sm md:flex"><a href="#features" class="hover:text-white">Features</a><a href="#pricing" class="hover:text-white">Pricing</a><a href="#faq" class="hover:text-white">FAQ</a></nav>
    <button data-demo class="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white">Start free</button>
  </div>
</header>
<section class="relative overflow-hidden px-5 py-24">
  <div class="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(99,102,241,.35),transparent)]"></div>
  <div class="relative mx-auto max-w-3xl text-center">
    <p class="text-xs uppercase tracking-[0.25em] text-indigo-300">Revenue intelligence</p>
    <h1 class="mt-4 text-4xl font-bold text-white sm:text-6xl">Every metric your team argues about, settled.</h1>
    <p class="mx-auto mt-5 max-w-xl text-slate-400">Aurora reads your billing data and turns it into one number everyone trusts, updated every hour.</p>
    <div class="mt-8 flex justify-center gap-3"><button data-demo class="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900">Book a demo</button><a href="#features" class="rounded-full border border-white/15 px-6 py-3 text-sm">See how it works</a></div>
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
<section id="faq" class="mx-auto max-w-3xl px-5 py-20"><h2 class="text-3xl font-bold text-white">Questions</h2><div class="mt-6 divide-y divide-white/10 text-sm"><p class="py-4">How long is setup? About twenty minutes.</p><p class="py-4">Where does data live? Your region, encrypted at rest.</p><p class="py-4">Can we cancel? Any time, no call required.</p></div></section>
<footer class="border-t border-white/10 px-5 py-10 text-sm text-slate-500"><div class="mx-auto flex max-w-6xl flex-wrap justify-between gap-4"><span>© Aurora</span><span>hello@aurora.io</span></div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


def _atelier() -> str:
    head = _HEAD.format(title="Atelier — editorial portfolio", font="Inter", font_q="Inter:wght@400;500&family=Playfair+Display:wght@500;700", display="Playfair Display")
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
    head = _HEAD.format(title="Midnight — booking", font="Manrope", font_q="Manrope:wght@400;600;800", display="Manrope")
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


def _bistro() -> str:
    head = _HEAD.format(title="Bistro Lumière — French café", font="Inter", font_q="Inter:wght@400;500&family=Cormorant+Garamond:wght@500;700", display="Cormorant Garamond")
    return f"""{head}
<body class="bg-[#fbf7ee] text-[#1c1710]">
<header class="sticky top-0 z-40 border-b border-black/10 bg-[#fbf7ee]/90 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-xl italic">Bistro Lumière</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#menu">Menu</a><a href="#reserver">Reserve</a><a href="#trouver">Find us</a></nav>
    <button data-demo class="rounded-full bg-[#8a1c1c] px-4 py-2 text-sm text-white">Reserve a table</button>
  </div>
</header>
<section class="mx-auto grid max-w-6xl gap-8 px-5 py-20 md:grid-cols-2 md:items-center">
  <div>
    <p class="text-xs uppercase tracking-[0.35em] text-[#8a1c1c]">Since 1998, Lyon</p>
    <h1 class="mt-4 text-5xl leading-tight sm:text-6xl">A neighbourhood table for slow lunches and long evenings.</h1>
    <p class="mt-5 max-w-md text-[15px] text-black/60">Seasonal French cooking, natural wines, and a terrace open until midnight.</p>
    <div class="mt-7 flex gap-3"><a href="#menu" class="rounded-full bg-[#1c1710] px-6 py-3 text-sm text-white">See the menu</a><button data-demo class="rounded-full border border-black/20 px-6 py-3 text-sm">Reserve</button></div>
  </div>
  <img class="reveal h-96 w-full rounded-2xl object-cover" src="https://picsum.photos/seed/bistro-lumiere-table/900/1100" alt="Table setting" loading="lazy">
</section>
<section id="menu" class="border-y border-black/10 bg-[#f2ecdc] px-5 py-20">
  <div class="mx-auto max-w-4xl"><h2 class="text-4xl">Menu of the week</h2>
    <div class="mt-8 grid gap-5 md:grid-cols-2">
      <div class="reveal rounded-lg bg-white p-5"><p class="text-lg">Beetroot tartare, hazelnut</p><p class="mt-1 text-sm text-black/55">Cold starter · 14</p></div>
      <div class="reveal rounded-lg bg-white p-5"><p class="text-lg">Duck confit, sarladaise potatoes</p><p class="mt-1 text-sm text-black/55">Main · 26</p></div>
      <div class="reveal rounded-lg bg-white p-5"><p class="text-lg">Line-caught sea bream, fennel</p><p class="mt-1 text-sm text-black/55">Main · 28</p></div>
      <div class="reveal rounded-lg bg-white p-5"><p class="text-lg">Praline choux, brown butter</p><p class="mt-1 text-sm text-black/55">Dessert · 9</p></div>
    </div></div>
</section>
<section id="reserver" class="mx-auto max-w-3xl px-5 py-20"><h2 class="text-4xl">Reserve your table</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-7 grid gap-3">
    <div class="grid gap-3 sm:grid-cols-2"><input type="date" class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm"><input type="time" class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm"></div>
    <input placeholder="Guests" class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm">
    <input placeholder="Your name" class="rounded-lg border border-black/15 bg-white px-4 py-3 text-sm">
    <button class="rounded-full bg-[#8a1c1c] px-6 py-3 text-sm text-white">Reserve</button>
  </form>
</section>
<section id="trouver" class="border-t border-black/10 bg-[#1c1710] px-5 py-16 text-[#fbf7ee]"><div class="mx-auto grid max-w-6xl gap-10 md:grid-cols-3"><div><p class="text-xs uppercase tracking-[0.35em] text-[#c9a15b]">Find us</p><p class="mt-3">18 Rue de la Tour, Lyon</p></div><div><p class="text-xs uppercase tracking-[0.35em] text-[#c9a15b]">Hours</p><p class="mt-3">Tue–Sat, 12h — midnight</p></div><div><p class="text-xs uppercase tracking-[0.35em] text-[#c9a15b]">Contact</p><p class="mt-3">hello@bistrolumiere.fr</p></div></div></section>
{_MODAL}
{_REVEAL}
</body></html>"""


def _bloom() -> str:
    head = _HEAD.format(title="Bloom — hair & beauty", font="Inter", font_q="Inter:wght@400;500&family=Fraunces:wght@500;700", display="Fraunces")
    return f"""{head}
<body class="bg-[#fdf5f2] text-[#2b1f1f]">
<header class="sticky top-0 z-40 border-b border-[#2b1f1f]/10 bg-[#fdf5f2]/90 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-xl">Bloom<span class="text-[#c76464]">.</span></span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#services">Services</a><a href="#stylistes">Stylists</a><a href="#book">Book</a></nav>
    <button data-demo class="rounded-full bg-[#c76464] px-4 py-2 text-sm text-white">Book</button>
  </div>
</header>
<section class="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center">
  <div><p class="text-xs uppercase tracking-[0.35em] text-[#c76464]">Hair & beauty studio</p>
    <h1 class="mt-4 text-5xl leading-tight sm:text-6xl">A room where you leave lighter than you came in.</h1>
    <p class="mt-5 max-w-md text-[15px] text-black/60">Cuts, colour, balayage and skincare — chosen for how you actually live.</p>
    <button data-demo class="mt-7 rounded-full bg-[#2b1f1f] px-6 py-3 text-sm text-white">See availability</button>
  </div>
  <img class="reveal h-96 w-full rounded-3xl object-cover" src="https://picsum.photos/seed/bloom-salon-interior/1000/1000" alt="Salon interior" loading="lazy">
</section>
<section id="services" class="border-y border-black/10 bg-white px-5 py-20"><div class="mx-auto max-w-4xl"><h2 class="text-4xl">Services</h2>
  <div class="mt-8 grid gap-4 md:grid-cols-2">
    <div class="reveal rounded-xl bg-[#fdf5f2] p-5"><div class="flex items-baseline justify-between"><p class="text-lg">Signature cut</p><p class="text-[#c76464]">45</p></div><p class="mt-1 text-sm text-black/55">Wash, cut, blow-dry, 60 min</p></div>
    <div class="reveal rounded-xl bg-[#fdf5f2] p-5"><div class="flex items-baseline justify-between"><p class="text-lg">Balayage</p><p class="text-[#c76464]">180</p></div><p class="mt-1 text-sm text-black/55">Freehand highlights, 2h30</p></div>
    <div class="reveal rounded-xl bg-[#fdf5f2] p-5"><div class="flex items-baseline justify-between"><p class="text-lg">Deep facial</p><p class="text-[#c76464]">85</p></div><p class="mt-1 text-sm text-black/55">Steam, extraction, mask, 75 min</p></div>
    <div class="reveal rounded-xl bg-[#fdf5f2] p-5"><div class="flex items-baseline justify-between"><p class="text-lg">Bridal package</p><p class="text-[#c76464]">240</p></div><p class="mt-1 text-sm text-black/55">Trial + day of, hair & makeup</p></div>
  </div></div></section>
<section id="stylistes" class="mx-auto max-w-6xl px-5 py-20"><h2 class="text-4xl">Stylists</h2>
  <div class="mt-8 grid gap-5 sm:grid-cols-3"><div class="reveal rounded-2xl bg-white p-6"><p class="text-lg">Amina</p><p class="text-sm text-black/55">Colour, curly hair specialist</p></div><div class="reveal rounded-2xl bg-white p-6"><p class="text-lg">Chloé</p><p class="text-sm text-black/55">Cuts and blowouts</p></div><div class="reveal rounded-2xl bg-white p-6"><p class="text-lg">Maëlys</p><p class="text-sm text-black/55">Facials and lashes</p></div></div>
</section>
<section id="book" class="border-t border-black/10 bg-[#2b1f1f] px-5 py-16 text-[#fdf5f2]"><div class="mx-auto max-w-3xl"><h2 class="text-3xl">Book your visit</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-6 grid gap-3">
    <select class="rounded-lg border border-white/15 bg-[#3a2b2b] px-4 py-3 text-sm"><option>Signature cut</option><option>Balayage</option><option>Facial</option></select>
    <input type="date" class="rounded-lg border border-white/15 bg-[#3a2b2b] px-4 py-3 text-sm">
    <input placeholder="Your name" class="rounded-lg border border-white/15 bg-[#3a2b2b] px-4 py-3 text-sm">
    <button class="rounded-full bg-[#c76464] px-6 py-3 text-sm text-white">Confirm</button>
  </form></div></section>
{_MODAL}
{_REVEAL}
</body></html>"""


def _emberstore() -> str:
    head = _HEAD.format(title="Ember — apparel store", font="Inter", font_q="Inter:wght@400;500;700&family=Space+Grotesk:wght@600;700", display="Space Grotesk")
    return f"""{head}
<body class="bg-white text-slate-900">
<header class="sticky top-0 z-40 border-b border-black/8 bg-white/95 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-bold tracking-tight">EMBER</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#shop">Shop</a><a href="#story">Story</a><a href="#cart" data-demo>Cart (2)</a></nav>
    <button data-demo class="rounded-md bg-[#ff5a1f] px-4 py-2 text-sm font-semibold text-white">Shop drop</button>
  </div>
</header>
<section class="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.1fr_1fr] md:items-center">
  <div><span class="rounded-full bg-[#ff5a1f]/12 px-3 py-1 text-xs font-semibold text-[#ff5a1f]">Autumn drop 06</span>
    <h1 class="mt-4 text-5xl font-bold leading-tight sm:text-6xl">Heavy weight essentials, built to outlast the season.</h1>
    <p class="mt-5 max-w-md text-slate-600">Ten pieces this drop. Numbered, made in Portugal, gone when they are gone.</p>
    <div class="mt-7 flex gap-3"><a href="#shop" class="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white">Shop the drop</a><a href="#story" class="rounded-md border border-black/15 px-6 py-3 text-sm">The story</a></div>
  </div>
  <img class="reveal h-96 w-full rounded-3xl object-cover" src="https://picsum.photos/seed/ember-jacket-hero/900/1100" alt="Signature jacket" loading="lazy">
</section>
<section id="shop" class="mx-auto max-w-6xl px-5 pb-20"><h2 class="text-3xl font-bold">Drop 06</h2>
  <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-tee-01/700/700" alt="Heavy tee" loading="lazy"><p class="mt-3 text-sm font-semibold">Heavy tee — Bone</p><p class="text-sm text-slate-500">€65</p></div>
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-jacket-01/700/700" alt="Chore jacket" loading="lazy"><p class="mt-3 text-sm font-semibold">Chore jacket — Ink</p><p class="text-sm text-slate-500">€185</p></div>
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-trouser-01/700/700" alt="Pleat trouser" loading="lazy"><p class="mt-3 text-sm font-semibold">Pleat trouser — Sand</p><p class="text-sm text-slate-500">€145</p></div>
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-cap-01/700/700" alt="Corduroy cap" loading="lazy"><p class="mt-3 text-sm font-semibold">Corduroy cap — Rust</p><p class="text-sm text-slate-500">€48</p></div>
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-belt-01/700/700" alt="Leather belt" loading="lazy"><p class="mt-3 text-sm font-semibold">Leather belt — Noir</p><p class="text-sm text-slate-500">€95</p></div>
    <div class="reveal group cursor-pointer"><img class="h-72 w-full rounded-xl object-cover" src="https://picsum.photos/seed/ember-scarf-01/700/700" alt="Wool scarf" loading="lazy"><p class="mt-3 text-sm font-semibold">Wool scarf — Ochre</p><p class="text-sm text-slate-500">€72</p></div>
  </div></section>
<section id="story" class="border-y border-black/8 bg-[#fef9f5] px-5 py-20"><div class="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center"><h2 class="text-4xl font-bold">Ten pieces, twice a year.</h2><p class="text-slate-600">Ember is an antidote to noisy shelves. We make one small drop each half, keep the run tiny, and take the pieces off when they sell out. That is the whole system.</p></div></section>
<section id="account" class="mx-auto max-w-md px-5 py-20"><div class="rounded-2xl border border-black/10 p-7"><span class="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">Demo login — preview only, not a real account</span><h2 class="mt-3 text-2xl font-bold">Log in</h2><form onsubmit="event.preventDefault();demoNotice();return false;" class="mt-5 grid gap-3"><input placeholder="Email" class="rounded-lg border border-black/15 px-4 py-3 text-sm"><input type="password" placeholder="Password" class="rounded-lg border border-black/15 px-4 py-3 text-sm"><button class="rounded-lg bg-slate-900 py-3 text-sm text-white">Log in</button></form></div></section>
<footer class="border-t border-black/10 px-5 py-10 text-sm text-slate-500"><div class="mx-auto max-w-6xl flex flex-wrap justify-between gap-3"><span>© Ember Apparel</span><span>Porto · Made in Portugal</span></div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


def _linktree() -> str:
    head = _HEAD.format(title="Nova — creator link in bio", font="Inter", font_q="Inter:wght@400;600&family=Space+Grotesk:wght@700", display="Space Grotesk")
    return f"""{head}
<body class="min-h-screen bg-gradient-to-br from-[#0a0a1f] via-[#1a0a2e] to-[#0a0a1f] text-white">
<div class="mx-auto flex max-w-md flex-col items-center px-5 py-14">
  <img class="size-28 rounded-full border-2 border-white/20 object-cover shadow-2xl" src="https://picsum.photos/seed/nova-creator-portrait/300/300" alt="Nova">
  <h1 class="mt-5 text-3xl font-bold">Nova</h1>
  <p class="mt-1 text-sm text-white/60">Music producer · Berlin</p>
  <div class="mt-4 flex gap-2 text-xs">
    <span class="rounded-full border border-white/15 px-2 py-1">Instagram</span>
    <span class="rounded-full border border-white/15 px-2 py-1">YouTube</span>
    <span class="rounded-full border border-white/15 px-2 py-1">TikTok</span>
    <span class="rounded-full border border-white/15 px-2 py-1">Spotify</span>
  </div>
  <div class="mt-8 grid w-full gap-3">
    <button data-demo class="reveal rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm backdrop-blur transition-transform hover:scale-[1.02]"><p class="font-semibold">Latest release: Solstice EP</p><p class="mt-0.5 text-xs text-white/55">Stream on all platforms</p></button>
    <button data-demo class="reveal rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm backdrop-blur transition-transform hover:scale-[1.02]"><p class="font-semibold">Book a live set</p><p class="mt-0.5 text-xs text-white/55">Available for shows Sep–Dec</p></button>
    <button data-demo class="reveal rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm backdrop-blur transition-transform hover:scale-[1.02]"><p class="font-semibold">Sample pack — free</p><p class="mt-0.5 text-xs text-white/55">Drop your email, get 30 loops</p></button>
    <button data-demo class="reveal rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm backdrop-blur transition-transform hover:scale-[1.02]"><p class="font-semibold">Media kit</p><p class="mt-0.5 text-xs text-white/55">For labels and press</p></button>
    <button data-demo class="reveal rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm backdrop-blur transition-transform hover:scale-[1.02]"><p class="font-semibold">Newsletter</p><p class="mt-0.5 text-xs text-white/55">One studio email per month</p></button>
  </div>
  <p class="mt-10 text-xs text-white/40">© 2025 Nova · Made with LevelUp Studio</p>
</div>
{_MODAL}
{_REVEAL}
</body></html>"""


def _clinic() -> str:
    head = _HEAD.format(title="Nord Clinic — booking", font="Inter", font_q="Inter:wght@400;500;700&family=DM+Serif+Display:wght@400", display="DM Serif Display")
    return f"""{head}
<body class="bg-[#f0f5f7] text-[#0f1e2b]">
<header class="sticky top-0 z-40 border-b border-[#0f1e2b]/8 bg-[#f0f5f7]/95 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-bold">Nord<span class="text-[#0ea5c8]">.</span> Clinic</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#care">Care</a><a href="#team">Team</a><a href="#book">Book</a></nav>
    <button data-demo class="rounded-lg bg-[#0ea5c8] px-4 py-2 text-sm font-semibold text-white">Book an appointment</button>
  </div>
</header>
<section class="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center">
  <div>
    <p class="text-xs uppercase tracking-[0.3em] text-[#0ea5c8]">Modern medicine, human pace</p>
    <h1 class="mt-4 text-5xl leading-tight">Care worth the appointment.</h1>
    <p class="mt-5 max-w-md text-[15px] text-[#0f1e2b]/65">Same-week bookings, encrypted records, thirty-minute consultations that actually feel like thirty minutes.</p>
    <div class="mt-7 flex gap-3"><button data-demo class="rounded-lg bg-[#0f1e2b] px-6 py-3 text-sm text-white">Book online</button><a href="#care" class="rounded-lg border border-[#0f1e2b]/15 px-6 py-3 text-sm">Our care</a></div>
  </div>
  <img class="reveal h-96 w-full rounded-3xl object-cover" src="https://picsum.photos/seed/nord-clinic-room/1000/1000" alt="Clinic room" loading="lazy">
</section>
<section id="care" class="border-y border-[#0f1e2b]/8 bg-white px-5 py-20"><div class="mx-auto max-w-6xl"><h2 class="text-3xl font-bold">Care we offer</h2>
  <div class="mt-8 grid gap-5 md:grid-cols-3">
    <div class="reveal rounded-2xl bg-[#f0f5f7] p-6"><p class="text-lg font-semibold">General medicine</p><p class="mt-2 text-sm text-[#0f1e2b]/60">Adult and paediatric consultations, same-week slots.</p></div>
    <div class="reveal rounded-2xl bg-[#f0f5f7] p-6"><p class="text-lg font-semibold">Dermatology</p><p class="mt-2 text-sm text-[#0f1e2b]/60">Skin exams, mole mapping, evening slots on Thursdays.</p></div>
    <div class="reveal rounded-2xl bg-[#f0f5f7] p-6"><p class="text-lg font-semibold">Nutrition</p><p class="mt-2 text-sm text-[#0f1e2b]/60">Long-form appointments with a registered dietitian.</p></div>
  </div></div></section>
<section id="team" class="mx-auto max-w-6xl px-5 py-20"><h2 class="text-3xl font-bold">Our team</h2>
  <div class="mt-8 grid gap-5 sm:grid-cols-3">
    <div class="reveal rounded-2xl bg-white p-6"><p class="text-lg font-semibold">Dr. Elin Hoffmann</p><p class="mt-1 text-sm text-[#0f1e2b]/55">General practitioner, 12 yrs</p></div>
    <div class="reveal rounded-2xl bg-white p-6"><p class="text-lg font-semibold">Dr. Jonas Reyer</p><p class="mt-1 text-sm text-[#0f1e2b]/55">Dermatology, cosmetic and medical</p></div>
    <div class="reveal rounded-2xl bg-white p-6"><p class="text-lg font-semibold">Marie Lund</p><p class="mt-1 text-sm text-[#0f1e2b]/55">Registered dietitian</p></div>
  </div></section>
<section id="book" class="border-t border-[#0f1e2b]/8 bg-[#0f1e2b] px-5 py-20 text-white"><div class="mx-auto max-w-2xl"><h2 class="text-3xl">Book an appointment</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-6 grid gap-3">
    <select class="rounded-lg border border-white/15 bg-[#1a2f42] px-4 py-3 text-sm"><option>General medicine</option><option>Dermatology</option><option>Nutrition</option></select>
    <input type="date" class="rounded-lg border border-white/15 bg-[#1a2f42] px-4 py-3 text-sm">
    <input placeholder="Full name" class="rounded-lg border border-white/15 bg-[#1a2f42] px-4 py-3 text-sm">
    <input placeholder="Email" type="email" class="rounded-lg border border-white/15 bg-[#1a2f42] px-4 py-3 text-sm">
    <button class="rounded-lg bg-[#0ea5c8] py-3 text-sm font-semibold">Book</button>
  </form></div></section>
{_MODAL}
{_REVEAL}
</body></html>"""


def _festival() -> str:
    head = _HEAD.format(title="Solstice — festival landing", font="Inter", font_q="Inter:wght@400;500;700&family=Archivo+Black:wght@400", display="Archivo Black")
    return f"""{head}
<body class="bg-[#0a0a10] text-white">
<header class="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a10]/85 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-bold uppercase tracking-widest">Solstice ‘26</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#lineup">Lineup</a><a href="#tickets">Tickets</a><a href="#info">Info</a></nav>
    <button data-demo class="rounded-full bg-[#ffe45b] px-4 py-2 text-sm font-semibold text-black">Get tickets</button>
  </div>
</header>
<section class="relative overflow-hidden px-5 py-24">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_30%,rgba(255,228,91,0.18),transparent)]"></div>
  <div class="relative mx-auto max-w-4xl text-center">
    <p class="text-xs uppercase tracking-[0.4em] text-[#ffe45b]">21–23 June 2026 · Porto</p>
    <h1 class="mt-4 text-6xl font-bold uppercase leading-none sm:text-8xl">Three days<br/>of long light.</h1>
    <p class="mx-auto mt-6 max-w-lg text-white/60">Two open-air stages by the river, one indoor stage carved into an old warehouse, and forty acts you have never seen in a festival crowd before.</p>
    <div class="mt-8 flex justify-center gap-3"><button data-demo class="rounded-full bg-[#ffe45b] px-6 py-3 text-sm font-semibold text-black">Tickets from €89</button><a href="#lineup" class="rounded-full border border-white/20 px-6 py-3 text-sm">Full lineup</a></div>
  </div>
</section>
<section id="lineup" class="border-y border-white/10 bg-white/[0.02] px-5 py-20">
  <div class="mx-auto max-w-5xl"><h2 class="text-4xl font-bold uppercase">Lineup</h2>
    <div class="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 md:grid-cols-4">
      <p>Ela Minus</p><p>DJ Python</p><p>Overmono</p><p>Kelela</p>
      <p>Skee Mask</p><p>Nicola Cruz</p><p>Nala Sinephro</p><p>Yaeji</p>
      <p>Toro y Moi</p><p>Objekt</p><p>Sudan Archives</p><p>Slauson Malone</p>
      <p>Loraine James</p><p>Priya Ragu</p><p>Jamila Woods</p><p>Chico Blanco</p>
    </div></div></section>
<section id="tickets" class="mx-auto max-w-4xl px-5 py-20"><h2 class="text-4xl font-bold uppercase">Tickets</h2>
  <div class="mt-8 grid gap-4 md:grid-cols-3">
    <div class="reveal rounded-2xl border border-white/10 p-6"><p class="text-sm text-[#ffe45b]">Day pass</p><p class="mt-2 text-4xl font-bold">€89</p><button data-demo class="mt-5 w-full rounded-full border border-white/15 py-2.5 text-sm">Choose</button></div>
    <div class="reveal rounded-2xl border border-[#ffe45b]/60 bg-[#ffe45b]/8 p-6"><p class="text-sm text-[#ffe45b]">Weekend</p><p class="mt-2 text-4xl font-bold">€185</p><button data-demo class="mt-5 w-full rounded-full bg-[#ffe45b] py-2.5 text-sm font-semibold text-black">Choose</button></div>
    <div class="reveal rounded-2xl border border-white/10 p-6"><p class="text-sm text-[#ffe45b]">VIP</p><p class="mt-2 text-4xl font-bold">€320</p><button data-demo class="mt-5 w-full rounded-full border border-white/15 py-2.5 text-sm">Choose</button></div>
  </div></section>
<section id="info" class="border-t border-white/10 px-5 py-16"><div class="mx-auto grid max-w-6xl gap-8 md:grid-cols-3"><div><p class="text-xs uppercase tracking-[0.35em] text-[#ffe45b]">Site</p><p class="mt-3">Docas do Porto, Portugal</p></div><div><p class="text-xs uppercase tracking-[0.35em] text-[#ffe45b]">Hours</p><p class="mt-3">Gates 17h · Music until 04h</p></div><div><p class="text-xs uppercase tracking-[0.35em] text-[#ffe45b]">Contact</p><p class="mt-3">hello@solstice.pt</p></div></div></section>
{_MODAL}
{_REVEAL}
</body></html>"""


def _agency() -> str:
    head = _HEAD.format(title="Lumen Studio — design agency", font="Inter", font_q="Inter:wght@400;500;700&family=Instrument+Serif:wght@400;500", display="Instrument Serif")
    return f"""{head}
<body class="bg-white text-[#101014]">
<header class="sticky top-0 z-40 border-b border-black/6 bg-white/95 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg font-semibold">Lumen<span class="italic text-[#5b6cff]"> Studio</span></span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#work">Work</a><a href="#practice">Practice</a><a href="#contact">Contact</a></nav>
    <button data-demo class="rounded-full bg-[#101014] px-4 py-2 text-sm text-white">Start a project</button>
  </div>
</header>
<section class="mx-auto max-w-5xl px-5 py-24">
  <p class="text-xs uppercase tracking-[0.35em] text-[#5b6cff]">Brand & product design</p>
  <h1 class="mt-4 text-6xl leading-[1.02] sm:text-8xl">Design is <span class="italic">the argument</span>, not the decoration.</h1>
  <p class="mt-8 max-w-xl text-lg text-black/60">We are a five-person design studio in Amsterdam. We build brands and products for founders who care about the details users can feel.</p>
</section>
<section id="work" class="mx-auto max-w-6xl px-5 pb-24">
  <div class="grid gap-5 md:grid-cols-2">
    <div class="reveal group cursor-pointer overflow-hidden rounded-2xl bg-[#f5f5f4]"><img class="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://picsum.photos/seed/lumen-brand-01/900/700" alt="Case 1" loading="lazy"><div class="p-5"><p class="text-lg">Muse — dating app rebrand</p><p class="mt-1 text-sm text-black/50">Brand system, product, motion</p></div></div>
    <div class="reveal group cursor-pointer overflow-hidden rounded-2xl bg-[#101014] text-white"><img class="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://picsum.photos/seed/lumen-brand-02/900/700" alt="Case 2" loading="lazy"><div class="p-5"><p class="text-lg">Osmose — sleep hardware</p><p class="mt-1 text-sm text-white/50">Identity, packaging, launch</p></div></div>
    <div class="reveal group cursor-pointer overflow-hidden rounded-2xl bg-[#eef0ff]"><img class="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://picsum.photos/seed/lumen-brand-03/900/700" alt="Case 3" loading="lazy"><div class="p-5"><p class="text-lg">Halo — banking for freelancers</p><p class="mt-1 text-sm text-black/50">Product, design system</p></div></div>
    <div class="reveal group cursor-pointer overflow-hidden rounded-2xl bg-[#fff3ea]"><img class="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-105" src="https://picsum.photos/seed/lumen-brand-04/900/700" alt="Case 4" loading="lazy"><div class="p-5"><p class="text-lg">Perch — bakery chain</p><p class="mt-1 text-sm text-black/50">Brand, packaging, signage</p></div></div>
  </div>
</section>
<section id="practice" class="border-y border-black/6 bg-[#f5f5f4] px-5 py-20"><div class="mx-auto grid max-w-5xl gap-10 md:grid-cols-2"><h2 class="text-4xl">A studio built like a design team.</h2><div><p class="text-black/65">We keep the team tiny on purpose: five people, one project each. Every engagement runs six to twelve weeks, and the founders you meet are the people who do the work.</p><ul class="mt-5 space-y-2 text-sm text-black/70"><li>· Brand identity and systems</li><li>· Product and interface design</li><li>· Motion and video</li><li>· Design engineering</li></ul></div></div></section>
<section id="contact" class="mx-auto max-w-4xl px-5 py-20"><h2 class="text-4xl">Start a project</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-8 grid gap-3">
    <input placeholder="Your name" class="rounded-lg border border-black/15 px-4 py-3 text-sm">
    <input placeholder="Company or role" class="rounded-lg border border-black/15 px-4 py-3 text-sm">
    <textarea rows="4" placeholder="Tell us about the project" class="rounded-lg border border-black/15 px-4 py-3 text-sm"></textarea>
    <button class="rounded-full bg-[#101014] px-6 py-3 text-sm text-white">Send</button>
  </form>
</section>
{_MODAL}
{_REVEAL}
</body></html>"""


def _photostudio() -> str:
    head = _HEAD.format(title="Aperture — photography portfolio", font="Inter", font_q="Inter:wght@400;500;700&family=Playfair+Display:wght@400;700", display="Playfair Display")
    return f"""{head}
<body class="bg-black text-white">
<header class="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
  <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
    <span class="text-lg italic tracking-tight">Aperture</span>
    <nav class="hidden gap-7 text-sm md:flex"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
  </div>
</header>
<section class="relative">
  <img class="h-[70vh] w-full object-cover" src="https://picsum.photos/seed/aperture-hero-bw/1600/900" alt="Hero" loading="lazy">
  <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent px-5 pb-12">
    <div class="mx-auto max-w-6xl w-full">
      <p class="text-xs uppercase tracking-[0.4em] text-white/60">Documentary photography</p>
      <h1 class="mt-3 text-5xl italic sm:text-7xl">A quiet lens on louder rooms.</h1>
    </div>
  </div>
</section>
<section id="work" class="mx-auto grid max-w-6xl gap-1 px-5 py-16 sm:grid-cols-3">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-01/800/800" alt="Frame 1" loading="lazy">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-02/800/800" alt="Frame 2" loading="lazy">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-03/800/800" alt="Frame 3" loading="lazy">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-04/800/800" alt="Frame 4" loading="lazy">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-05/800/800" alt="Frame 5" loading="lazy">
  <img class="reveal aspect-square w-full object-cover" src="https://picsum.photos/seed/aperture-06/800/800" alt="Frame 6" loading="lazy">
</section>
<section id="about" class="border-y border-white/10 bg-white/[0.02] px-5 py-20"><div class="mx-auto grid max-w-4xl gap-10 md:grid-cols-2"><h2 class="text-4xl italic">Kim Reyes, based in Tokyo.</h2><p class="text-white/60">Editorial and commissioned work for Aesop, Dior, Mubi and the New Yorker. Represented by Studio Ren.</p></div></section>
<section id="contact" class="mx-auto max-w-3xl px-5 py-20"><h2 class="text-4xl italic">Get in touch</h2>
  <form onsubmit="event.preventDefault();demoNotice();" class="mt-6 grid gap-3">
    <input placeholder="Your name" class="rounded border border-white/20 bg-transparent px-4 py-3 text-sm">
    <input placeholder="Email" type="email" class="rounded border border-white/20 bg-transparent px-4 py-3 text-sm">
    <textarea rows="4" placeholder="Project brief" class="rounded border border-white/20 bg-transparent px-4 py-3 text-sm"></textarea>
    <button class="rounded-full bg-white px-6 py-3 text-sm text-black">Send</button>
  </form>
</section>
<footer class="border-t border-white/10 px-5 py-10 text-xs text-white/40"><div class="mx-auto max-w-6xl">© Aperture · Tokyo</div></footer>
{_MODAL}
{_REVEAL}
</body></html>"""


# 10 hand-built starter designs
_STARTERS: List[Dict[str, Any]] = [
    {"id": "aurora-saas", "name": "Aurora", "tagline": "Dark SaaS landing with an aurora glow",
     "best_for": "Landing pages, apps, agencies", "service": "landing", "accent": "#6366F1",
     "html": _aurora(), "palette": ["#08080e", "#6366F1", "#c084fc"], "fonts": "Sora + Manrope",
     "sections": ["hero", "features", "pricing", "faq"]},
    {"id": "atelier-editorial", "name": "Atelier", "tagline": "Warm editorial grid for visual work",
     "best_for": "Portfolios, studios, photographers", "service": "portfolio", "accent": "#B4552B",
     "html": _atelier(), "palette": ["#f7f5f1", "#b4552b", "#191712"], "fonts": "Playfair Display + Inter",
     "sections": ["hero", "work", "about", "contact"]},
    {"id": "midnight-booking", "name": "Midnight", "tagline": "Gold on black, built around booking",
     "best_for": "Barbershops, salons, restaurants", "service": "barbershop", "accent": "#E4B363",
     "html": _midnight(), "palette": ["#0d0b12", "#e4b363", "#ffffff"], "fonts": "Manrope",
     "sections": ["hero", "services", "team", "book"]},
    {"id": "bistro-lumiere", "name": "Bistro Lumière", "tagline": "Warm cream, French bistro elegance",
     "best_for": "Restaurants, cafés, wine bars", "service": "restaurant", "accent": "#8a1c1c",
     "html": _bistro(), "palette": ["#fbf7ee", "#8a1c1c", "#1c1710"], "fonts": "Cormorant Garamond + Inter",
     "sections": ["hero", "menu", "reserve", "find"]},
    {"id": "bloom-salon", "name": "Bloom", "tagline": "Soft rose calm for a modern salon",
     "best_for": "Hair, beauty, wellness", "service": "salon", "accent": "#c76464",
     "html": _bloom(), "palette": ["#fdf5f2", "#c76464", "#2b1f1f"], "fonts": "Fraunces + Inter",
     "sections": ["hero", "services", "stylists", "book"]},
    {"id": "ember-store", "name": "Ember", "tagline": "Clean drop shop for a small apparel brand",
     "best_for": "Fashion, merch, small-batch stores", "service": "store", "accent": "#ff5a1f",
     "html": _emberstore(), "palette": ["#ffffff", "#ff5a1f", "#0f172a"], "fonts": "Space Grotesk + Inter",
     "sections": ["hero", "shop", "story", "account"]},
    {"id": "nova-linkbio", "name": "Nova", "tagline": "Dreamy link-in-bio with soft glass cards",
     "best_for": "Creators, artists, musicians", "service": "creator", "accent": "#a855f7",
     "html": _linktree(), "palette": ["#0a0a1f", "#a855f7", "#ffffff"], "fonts": "Space Grotesk + Inter",
     "sections": ["hero", "links"]},
    {"id": "nord-clinic", "name": "Nord Clinic", "tagline": "Calm nordic blue for booking-driven services",
     "best_for": "Clinics, therapists, coaches", "service": "booking", "accent": "#0ea5c8",
     "html": _clinic(), "palette": ["#f0f5f7", "#0ea5c8", "#0f1e2b"], "fonts": "DM Serif Display + Inter",
     "sections": ["hero", "care", "team", "book"]},
    {"id": "solstice-festival", "name": "Solstice", "tagline": "Bold yellow poster energy for a lineup",
     "best_for": "Festivals, concerts, pop-ups", "service": "events", "accent": "#ffe45b",
     "html": _festival(), "palette": ["#0a0a10", "#ffe45b", "#ffffff"], "fonts": "Archivo Black + Inter",
     "sections": ["hero", "lineup", "tickets", "info"]},
    {"id": "lumen-agency", "name": "Lumen Studio", "tagline": "Editorial white, italic serif accents",
     "best_for": "Agencies, studios, consultants", "service": "landing", "accent": "#5b6cff",
     "html": _agency(), "palette": ["#ffffff", "#5b6cff", "#101014"], "fonts": "Instrument Serif + Inter",
     "sections": ["hero", "work", "practice", "contact"]},
    {"id": "aperture-portfolio", "name": "Aperture", "tagline": "Full-bleed black portfolio for photographers",
     "best_for": "Photographers, cinematographers", "service": "portfolio", "accent": "#ffffff",
     "html": _photostudio(), "palette": ["#000000", "#ffffff", "#6b7280"], "fonts": "Playfair Display + Inter",
     "sections": ["hero", "grid", "about", "contact"]},
]


# 40 style cards — no HTML, just a design brief the architect uses to build in that direction.
# Structure: id, service, name, tagline, palette, accent, fonts, sections, brief_prompt
def _style(id: str, service: str, name: str, tagline: str, accent: str, palette: List[str],
           fonts: str, sections: List[str], brief_prompt: str) -> Dict[str, Any]:
    return {"id": id, "service": service, "name": name, "tagline": tagline,
            "best_for": f"{service.capitalize()} — {tagline.lower()}",
            "kind": "style", "accent": accent, "palette": palette, "fonts": fonts,
            "sections": sections, "brief_prompt": brief_prompt}


_STYLES: List[Dict[str, Any]] = [
    # Barbershop (5)
    _style("style-barber-neon", "barbershop", "Neon Blade", "Neon pink on obsidian",
           "#ff2d95", ["#0a0a0f", "#ff2d95", "#ffffff"], "Sora + Manrope",
           ["hero", "services", "barbers", "gallery", "book"],
           "Barbershop site with a hot-pink neon accent on near-black, brutalist type, sharp price grid, booking as the hero CTA."),
    _style("style-barber-classic", "barbershop", "Classic Blade", "Old barber-pole classic",
           "#c9a15b", ["#1a1610", "#c9a15b", "#f5efdd"], "Playfair Display + Inter",
           ["hero", "signature-services", "team", "reviews", "book"],
           "Timeless barbershop — dark walnut palette, gold accents, editorial hero, real-price service list, six barber cards."),
    _style("style-barber-street", "barbershop", "Street Fade", "Streetwear energy",
           "#facc15", ["#ffffff", "#facc15", "#111827"], "Space Grotesk + Inter",
           ["hero", "cuts", "crew", "book", "shop"],
           "Street-style barbershop, yellow tape accent, bold uppercase display, gallery of cuts, a small merch section, and booking."),
    _style("style-barber-minimal", "barbershop", "Line & Cut", "Ultra-minimal editorial",
           "#0f172a", ["#f7f5f1", "#0f172a", "#94a3b8"], "Instrument Serif + Manrope",
           ["hero", "services", "team", "book"],
           "Minimal barbershop, off-white background, serif hero, thin dividers, quiet luxury feel, focus on booking flow."),
    _style("style-barber-loft", "barbershop", "Loft 09", "Industrial loft styling",
           "#a3a3a3", ["#171717", "#a3a3a3", "#fca5a5"], "Archivo Black + Inter",
           ["hero", "services", "team", "story", "book"],
           "Industrial loft barbershop, concrete tones, one warm accent, wide photography, booking with barber picker."),
    # Salon / Hair & beauty (5)
    _style("style-salon-nude", "salon", "Nude Petal", "Soft nude tones, feminine",
           "#e7bfa5", ["#fdf6f0", "#e7bfa5", "#3f2a2a"], "Fraunces + Inter",
           ["hero", "menu", "stylists", "gift", "book"],
           "Hair & beauty salon with warm nude palette, big serif hero, gift-card section, four stylists, booking modal."),
    _style("style-salon-monochrome", "salon", "Noir Salon", "Editorial monochrome",
           "#111111", ["#f7f7f7", "#111111", "#a3a3a3"], "Playfair Display + Inter",
           ["hero", "services", "stylists", "book", "shop"],
           "High-fashion salon site, monochrome, editorial layout, giant hero image, price list with subtle animation."),
    _style("style-salon-emerald", "salon", "Emerald Care", "Botanical calm",
           "#059669", ["#f0fdf4", "#059669", "#052e16"], "DM Serif Display + Inter",
           ["hero", "care", "team", "products", "book"],
           "Botanical salon, emerald green accents, curved shapes, product carousel, ritual descriptions, booking form."),
    _style("style-salon-sunset", "salon", "Sunset Stylist", "Warm gradient stylist portfolio",
           "#f97316", ["#fff7ed", "#f97316", "#7c2d12"], "Sora + Inter",
           ["hero", "portfolio", "services", "team", "book"],
           "Stylist portfolio salon with a sunset gradient, before/after grid, testimonial rail, appointment booking."),
    _style("style-salon-boutique", "salon", "Boutique Balayage", "Balayage specialist boutique",
           "#b45309", ["#faf7f2", "#b45309", "#1c1917"], "Cormorant Garamond + Inter",
           ["hero", "signature", "gallery", "stylists", "book"],
           "Balayage-focused salon boutique, caramel palette, signature service comparison, big gallery, deposit-required booking."),
    # Restaurant (5)
    _style("style-resto-trattoria", "restaurant", "Trattoria Sole", "Sun-drenched Italian",
           "#dc2626", ["#fef3c7", "#dc2626", "#1f2937"], "Bodoni Moda + Inter",
           ["hero", "menu", "wine", "reserve", "find"],
           "Italian trattoria, warm yellow walls, red accent, hand-drawn menu list, wine section, reservation."),
    _style("style-resto-omakase", "restaurant", "Omakase Ashi", "Minimal Japanese omakase",
           "#171717", ["#fafaf9", "#171717", "#a3a3a3"], "Noto Serif JP + Inter",
           ["hero", "menu", "chef", "seatings", "reserve"],
           "Omakase restaurant, quiet minimalism, chef-focused hero, seating calendar, prepaid reservations."),
    _style("style-resto-brunch", "restaurant", "Slow Brunch", "Cheerful all-day brunch",
           "#ea580c", ["#fff7ed", "#ea580c", "#3f2f1c"], "Fraunces + Inter",
           ["hero", "menu", "specials", "gallery", "reserve"],
           "All-day brunch café, warm ochre, playful serif, big menu, specials section, family-friendly reservation form."),
    _style("style-resto-fine", "restaurant", "Table Neuf", "Discreet fine dining",
           "#1c1917", ["#f5f5f4", "#1c1917", "#b45309"], "Playfair Display + Inter",
           ["hero", "tasting", "wine", "story", "reserve"],
           "Contemporary fine dining, sober typography, a single tasting menu, wine pairing, restrained reservation flow."),
    _style("style-resto-taco", "restaurant", "Barrio Taco", "Vibrant taqueria",
           "#16a34a", ["#fff1f2", "#16a34a", "#7f1d1d"], "Space Grotesk + Inter",
           ["hero", "menu", "orders", "story", "find"],
           "Modern taqueria, vibrant green and hot pink, illustrated dividers, delivery + pickup toggle, story section."),
    # Online store (5)
    _style("style-store-minimal", "store", "Blanc Studio", "Ultra-minimal apparel",
           "#111111", ["#ffffff", "#111111", "#94a3b8"], "Neue Haas Grotesk + Inter",
           ["hero", "shop", "essentials", "story", "account"],
           "Minimal apparel store, gallery grid, sparse type, sticky cart, real product cards with variants."),
    _style("style-store-jewelry", "store", "Sable & Or", "Fine jewellery boutique",
           "#b45309", ["#faf7f2", "#b45309", "#1c1917"], "Cormorant Garamond + Inter",
           ["hero", "collection", "featured", "care", "account"],
           "Fine jewellery boutique, deep charcoal + gold, product cards with lifestyle photos, care & concierge sections."),
    _style("style-store-outdoor", "store", "Ridge Co.", "Outdoor gear shop",
           "#065f46", ["#f5f5f4", "#065f46", "#1c1917"], "Space Grotesk + Inter",
           ["hero", "shop", "field-tested", "story", "account"],
           "Outdoor gear store, sage-forest palette, field-tested product cards, expedition story, gear guide."),
    _style("style-store-beauty", "store", "Lume", "Clean beauty & skincare",
           "#f472b6", ["#fdf2f8", "#f472b6", "#3b0764"], "Fraunces + Inter",
           ["hero", "shop", "routine", "ingredients", "account"],
           "Clean beauty store, soft pink, routine builder, ingredient transparency, subscription option."),
    _style("style-store-vinyl", "store", "Rotation", "Vinyl records shop",
           "#eab308", ["#0a0a0a", "#eab308", "#f5f5f4"], "Archivo Black + Inter",
           ["hero", "new-arrivals", "genres", "events", "account"],
           "Independent record store, ink-black + mustard, new-arrivals rail, genre grid, in-store events."),
    # Online booking (5)
    _style("style-book-wellness", "booking", "Aura Wellness", "Spa & wellness booking",
           "#0d9488", ["#ecfeff", "#0d9488", "#134e4a"], "DM Serif Display + Inter",
           ["hero", "treatments", "team", "packages", "book"],
           "Spa & wellness centre, teal ocean palette, treatment grid with durations, packages, deposit booking."),
    _style("style-book-yoga", "booking", "Prana Studio", "Yoga class scheduler",
           "#84cc16", ["#f7fee7", "#84cc16", "#1a2e05"], "Space Grotesk + Inter",
           ["hero", "classes", "teachers", "memberships", "book"],
           "Yoga studio, olive-lime palette, weekly class grid, teacher bios, drop-in vs membership plans."),
    _style("style-book-legal", "booking", "Meridian Law", "Legal consultation booking",
           "#1e3a8a", ["#f8fafc", "#1e3a8a", "#0f172a"], "Playfair Display + Inter",
           ["hero", "practice", "team", "articles", "book"],
           "Law firm consultation booking, deep navy, serif hero, practice areas grid, article previews, calendar booking."),
    _style("style-book-fitness", "booking", "Iron Loft", "Strength coaching studio",
           "#dc2626", ["#0a0a0a", "#dc2626", "#f5f5f4"], "Archivo Black + Inter",
           ["hero", "programs", "coaches", "results", "book"],
           "Strength coaching studio, ink-black + red, before/after results rail, program cards, booking with intake form."),
    _style("style-book-photo", "booking", "Frame Session", "Photo session booking",
           "#f59e0b", ["#fef3c7", "#f59e0b", "#292524"], "Fraunces + Inter",
           ["hero", "sessions", "gallery", "process", "book"],
           "Photographer session booking, cream + amber, session-type cards, portfolio gallery, deposit-based booking."),
    # Portfolio (4)
    _style("style-portfolio-editorial", "portfolio", "Folio Serif", "Editorial serif portfolio",
           "#1c1917", ["#faf7f2", "#1c1917", "#a3a3a3"], "Playfair Display + Inter",
           ["hero", "work", "about", "press", "contact"],
           "Editorial designer portfolio, warm cream, oversized serif hero, case-study cards, press logos, contact."),
    _style("style-portfolio-tech", "portfolio", "Signal", "Tech maker portfolio",
           "#22d3ee", ["#0a0a10", "#22d3ee", "#f8fafc"], "Space Grotesk + Inter",
           ["hero", "projects", "writing", "talks", "contact"],
           "Software maker portfolio, ink-black + cyan, projects with screenshots, writing list, talks list."),
    _style("style-portfolio-illust", "portfolio", "Bright Line", "Illustrator portfolio",
           "#f472b6", ["#fffbeb", "#f472b6", "#1c1917"], "DM Serif Display + Inter",
           ["hero", "work", "shop", "commissions", "contact"],
           "Illustrator portfolio, cream + hot-pink, gallery grid, print shop, commissions info."),
    _style("style-portfolio-cine", "portfolio", "Reel", "Cinematographer portfolio",
           "#facc15", ["#000000", "#facc15", "#f5f5f5"], "Archivo Black + Inter",
           ["hero", "reel", "projects", "clients", "contact"],
           "Cinematographer portfolio, black + yellow, big reel-style hero, project posters, client logos."),
    # Creator / link in bio (4)
    _style("style-creator-podcast", "creator", "On Air", "Podcast host page",
           "#f97316", ["#fff7ed", "#f97316", "#431407"], "Fraunces + Inter",
           ["hero", "episodes", "guests", "subscribe", "contact"],
           "Podcast host site, warm orange, episode cards with duration, guest list, subscribe on all platforms."),
    _style("style-creator-youtube", "creator", "Studio Vlog", "YouTube creator page",
           "#ef4444", ["#0a0a0a", "#ef4444", "#f5f5f5"], "Space Grotesk + Inter",
           ["hero", "latest", "series", "sponsors", "media"],
           "YouTube creator hub, dark palette + red accent, latest videos, series list, sponsor rate card, media kit."),
    _style("style-creator-writer", "creator", "Long Form", "Writer & essayist",
           "#0f172a", ["#f7f5f1", "#0f172a", "#b45309"], "Instrument Serif + Inter",
           ["hero", "essays", "books", "newsletter", "contact"],
           "Writer's site, warm cream + amber, list of essays with dates, book grid, newsletter signup, contact."),
    _style("style-creator-music", "creator", "Waveform", "Musician release page",
           "#a855f7", ["#0a0a1f", "#a855f7", "#f8fafc"], "Space Grotesk + Inter",
           ["hero", "releases", "shows", "shop", "contact"],
           "Musician's release page, purple neon, latest release hero, upcoming shows, merch mini-shop, booking contact."),
    # Landing (4)
    _style("style-landing-b2b", "landing", "Metric", "B2B SaaS landing",
           "#0ea5e9", ["#f8fafc", "#0ea5e9", "#0f172a"], "Sora + Inter",
           ["hero", "how", "features", "pricing", "faq"],
           "B2B analytics SaaS landing, clean white + sky-blue, how-it-works, feature grid, pricing table, FAQ."),
    _style("style-landing-mobile", "landing", "Pocket", "Mobile app landing",
           "#7c3aed", ["#faf5ff", "#7c3aed", "#1e1b4b"], "Space Grotesk + Inter",
           ["hero", "screens", "features", "testimonials", "download"],
           "Mobile app landing, lilac gradient, phone-mockup hero, feature carousel, testimonials, app store buttons."),
    _style("style-landing-dark", "landing", "Obsidian", "Dark developer tool landing",
           "#22c55e", ["#0a0a0a", "#22c55e", "#f5f5f5"], "JetBrains Mono + Inter",
           ["hero", "code", "features", "integrations", "cta"],
           "Developer-tool landing, obsidian black + terminal green, code block hero, integrations logos, CTA."),
    _style("style-landing-agency", "landing", "Practice", "Agency portfolio landing",
           "#f43f5e", ["#fef2f2", "#f43f5e", "#450a0a"], "Fraunces + Inter",
           ["hero", "work", "services", "team", "contact"],
           "Agency portfolio landing, coral palette, case-study grid, services list, team, contact form."),
    # Events (3)
    _style("style-events-wedding", "events", "Two Names", "Wedding invitation",
           "#a78bfa", ["#f5f3ff", "#a78bfa", "#3f2a52"], "Cormorant Garamond + Inter",
           ["hero", "story", "schedule", "rsvp", "details"],
           "Wedding invitation site, lavender + cream, couple story timeline, day schedule, RSVP form, travel info."),
    _style("style-events-conf", "events", "Signals", "Tech conference landing",
           "#f97316", ["#0a0a0f", "#f97316", "#f5f5f5"], "Space Grotesk + Inter",
           ["hero", "speakers", "agenda", "sponsors", "tickets"],
           "Tech conference landing, dark + orange, speaker cards, day-by-day agenda, sponsor grid, ticket tiers."),
    _style("style-events-popup", "events", "One Night", "Pop-up event page",
           "#ec4899", ["#1e1b4b", "#ec4899", "#f8fafc"], "Archivo Black + Inter",
           ["hero", "lineup", "info", "tickets"],
           "Pop-up event, dark purple + neon pink, poster-style hero with date, lineup list, info block, tickets."),
]


TEMPLATES: List[Dict[str, Any]] = _STARTERS + _STYLES
