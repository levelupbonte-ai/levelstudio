import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, FolderKanban, Layers, LogIn, LogOut, Menu, Search, Sparkles, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { logout, useAuth } from "@/lib/auth";
import TemplatePreview from "@/components/TemplatePreview";
import LevelStudioLogo from "@/components/LevelStudioLogo";
import type { Template } from "@/lib/types";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "landing", label: "Landing" },
  { id: "portfolio", label: "Portfolio" },
  { id: "barbershop", label: "Barbershop" },
  { id: "salon", label: "Hair & beauty" },
  { id: "restaurant", label: "Restaurant" },
  { id: "store", label: "Online store" },
  { id: "booking", label: "Booking" },
  { id: "creator", label: "Creator" },
  { id: "events", label: "Events" },
];

function StyleCard({ t }: { t: Template }) {
  const p = t.palette && t.palette.length >= 3 ? t.palette : [...(t.palette ?? []), "#0f0f17", "#8b5cf6", "#ffffff"].slice(0, 3);
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${p[0]} 0%, ${p[0]} 55%, ${p[1]} 100%)` }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{ background: `radial-gradient(circle at 80% 20%, ${p[1]}, transparent 55%)` }}
      />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{ backgroundColor: `${p[1]}22`, color: p[2] ?? "#fff" }}
          >
            {t.service}
          </span>
          <div className="flex gap-1">
            {p.slice(0, 3).map((c) => (
              <span key={c} className="size-2 rounded-full border border-white/30" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: p[2] ?? "#fff" }}>{t.name}</p>
          <p className="mt-0.5 text-[10.5px] leading-relaxed" style={{ color: `${p[2] ?? "#fff"}b0` }}>{t.tagline}</p>
        </div>
      </div>
    </div>
  );
}

function StarterCard({ t }: { t: Template }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <iframe
        title={`${t.name} thumbnail`}
        src={`/api/templates/${t.id}/html`}
        scrolling="no"
        tabIndex={-1}
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 h-[900px] w-[1400px] origin-top-left scale-[0.18] border-0 bg-white sm:scale-[0.22]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
        <p className="text-[12.5px] font-semibold text-white">{t.name}</p>
        <p className="text-[10.5px] text-white/70 line-clamp-1">{t.tagline}</p>
      </div>
      {t.kind === "import" && (
        <span className="absolute left-2 top-2 rounded-full bg-violet-500/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white shadow">
          import
        </span>
      )}
    </div>
  );
}

function matches(t: Template, q: string): boolean {
  if (!q) return true;
  const hay = [
    t.name,
    t.tagline,
    t.service,
    t.best_for,
    ...(t.palette ?? []),
    ...(t.sections ?? []),
    t.fonts ?? "",
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((token) => hay.includes(token));
}

export default function TemplatesPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { templateId } = useParams<{ templateId?: string }>();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", "all"],
    queryFn: () => apiGet<Template[]>("/templates"),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const match = templates.find((t) => t.id === templateId);
      if (match) {
        setPreview(match);
      }
    } else if (!templateId) {
      setPreview(null);
    }
  }, [templateId, templates]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? templates : templates.filter((t) => t.service === filter);
    if (q.trim()) list = list.filter((t) => matches(t, q.trim()));
    return list;
  }, [templates, filter, q]);

  const pick = (id: string) => {
    try {
      window.sessionStorage.setItem("selected_template", id);
    } catch {
      // ignore
    }
    nav("/");
  };

  return (
    <div className="min-h-dvh w-full bg-[#0A0A0F] text-slate-100 font-sans" data-testid="templates-page">
      {/* Top Header matching Studio */}
      <header
        className="sticky top-0 z-30 border-b border-white/6 bg-[#0A0A0F]/85 px-4 py-3 backdrop-blur sm:px-6"
        data-testid="templates-header"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/")}
              className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-85 text-left"
              data-testid="brand-home-button"
            >
              <LevelStudioLogo size="sm" showSubtitle={true} />
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => nav("/")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            >
              Studio
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/50 bg-violet-600/15 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors duration-200"
            >
              Templates
            </button>

            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid="header-workspace-link"
            >
              <FolderKanban className="size-3.5 text-violet-400" /> Workspace
            </button>

            {authLoading ? null : user ? (
              <div className="flex items-center gap-2 ml-1">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="size-8 rounded-full border border-white/10 object-cover"
                    data-testid="user-avatar"
                  />
                ) : (
                  <span
                    className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[12px] font-semibold text-white shadow"
                    data-testid="user-avatar"
                  >
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  className="rounded-full p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
                  data-testid="logout-button"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => nav("/login")}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow transition-all hover:bg-violet-500 active:scale-[0.98] ml-1"
                data-testid="header-signin-button"
              >
                <LogIn className="size-3.5" /> Sign in
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-1.5 text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
              data-testid="mobile-hamburger-button"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative z-10 flex flex-col w-full max-w-[280px] ml-auto h-full bg-[#11101D] border-l border-white/10 shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <LevelStudioLogo size="sm" showSubtitle={false} onClick={() => { setMobileMenuOpen(false); nav("/"); }} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white transition"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="py-4 space-y-1 flex-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  nav("/");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition text-left"
              >
                <Sparkles className="size-4 text-violet-400 shrink-0" />
                <span>Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-white bg-violet-600/20 rounded-xl transition text-left"
              >
                <Layers className="size-4 text-violet-400 shrink-0" />
                <span>Templates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  nav("/workspace");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition text-left"
              >
                <FolderKanban className="size-4 text-violet-400 shrink-0" />
                <span>Workspace</span>
              </button>

              <a
                href="https://levelup-ecosystem.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full block px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition text-left"
              >
                LevelUp Ecosystem
              </a>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              {authLoading ? null : user ? (
                <>
                  <div className="flex items-center gap-3 p-2">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="size-8 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                        {user.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-300 hover:text-red-200 transition"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    nav("/login");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition active:scale-[0.98]"
                >
                  <LogIn className="size-4" />
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Layers className="size-3.5 text-violet-400" />
              Template Library
            </div>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              50+ starters, tuned for your trade
            </h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-slate-400">
              Pick a design to start with. Each starter includes tailored color palettes, typography pairings, and ready-to-use responsive sections.
            </p>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-colors focus:border-violet-500"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto border-b border-white/6 pb-4">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Visual Cards Grid */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12111E] shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-xl hover:shadow-violet-500/10"
            >
              {/* Thumbnail click to preview */}
              <button
                type="button"
                onClick={() => nav(`/templates/${t.id}`)}
                className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 text-left cursor-pointer"
                title="Click to preview fullscreen"
              >
                {t.kind === "style" ? <StyleCard t={t} /> : <StarterCard t={t} />}
                <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 shadow backdrop-blur">
                    <ExternalLink className="size-3.5" /> Preview
                  </span>
                </div>
              </button>

              {/* Card footer details */}
              <div className="flex flex-1 flex-col justify-between p-3.5">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-heading text-sm font-semibold text-white group-hover:text-violet-200 transition-colors truncate">
                      {t.name}
                    </h3>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400">
                      {t.service}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                    {t.tagline}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => pick(t.id)}
                    className="flex-1 rounded-xl bg-violet-600 py-1.5 text-xs font-semibold text-white shadow transition-all hover:bg-violet-500 active:scale-[0.98]"
                  >
                    Use template
                  </button>
                  <button
                    type="button"
                    onClick={() => nav(`/templates/${t.id}`)}
                    className="rounded-xl border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                    title="Fullscreen preview"
                  >
                    <ExternalLink className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-slate-400">
              <Search className="mx-auto size-8 text-slate-600 mb-2" />
              <p className="text-sm">No templates match your search.</p>
              <button
                type="button"
                onClick={() => { setFilter("all"); setQ(""); }}
                className="mt-3 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      {preview && (
        <TemplatePreview
          template={preview}
          onClose={() => nav("/templates")}
          onReproduce={(id) => {
            nav("/templates");
            pick(id);
          }}
        />
      )}

      {importOpen && (
        <ImportTemplate
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={(t) => {
            setImportOpen(false);
            pick(t.id);
          }}
        />
      )}
    </div>
  );
}
