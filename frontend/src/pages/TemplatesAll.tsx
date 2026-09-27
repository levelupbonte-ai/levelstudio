// Full-page template browser — live search + service pills + fullscreen preview + import.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import ImportTemplate from "@/components/ImportTemplate";
import TemplatePreview from "@/components/TemplatePreview";
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

function matches(t: Template, q: string): boolean {
  if (!q) return true;
  const hay = [
    t.name, t.tagline, t.service, t.best_for,
    ...(t.palette ?? []), ...(t.sections ?? []), t.fonts ?? "",
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((token) => hay.includes(token));
}

export default function TemplatesAll() {
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", "all"],
    queryFn: () => apiGet<Template[]>("/templates"),
    staleTime: 60 * 1000,
  });
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
    <div className="min-h-dvh w-full bg-[#0A0A0F] text-slate-100" data-testid="templates-page">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#0A0A0F]/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 hover:border-violet-400/40 hover:text-white"
            data-testid="templates-back-button"
          >
            <ArrowLeft className="size-3.5" /> Back to studio
          </button>
          <span className="font-heading text-[15px] font-semibold text-white">
            LevelUp<span className="text-violet-400">Studio</span>
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[11px] uppercase tracking-[0.25em] text-violet-300">Template catalogue</p>
        <h1 className="mt-2 font-heading text-[28px] font-semibold text-white sm:text-[38px]">
          Every starter, every service.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-slate-400">
          Pick a starter or a style card and I will rebuild it around your business with real copy,
          images and interactions. Or drop your own .html.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try &quot;warm gold&quot;, &quot;italic serif&quot;, &quot;pink neon barber&quot;…"
              className="w-full rounded-full border border-white/10 bg-white/[0.03] px-10 py-2.5 text-[13.5px] text-white outline-none transition-shadow duration-200 placeholder:text-slate-500 focus:border-violet-400/50 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.14)]"
              data-testid="templates-search-input"
            />
          </div>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            data-testid="templates-import-open"
          >
            <Upload className="size-3.5" /> Import a template
          </button>
        </div>

        <div className="no-scrollbar mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilter(s.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-[background-color,color] duration-200",
                filter === s.id ? "bg-white text-slate-900" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
              data-testid={`all-filter-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading templates
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-slate-400">
            No templates match your search.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreview(t)}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/8 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_20px_60px_-30px_rgba(139,92,246,0.6)]"
                data-testid={`all-template-${t.id}`}
              >
                {t.kind === "style" ? (
                  <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${t.palette[0]} 0%, ${t.palette[0]} 55%, ${t.palette[1] ?? "#8b5cf6"} 100%)` }}>
                    <div className="flex h-full flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-white/25 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/90">{t.service}</span>
                        <div className="flex gap-1">
                          {t.palette.slice(0, 3).map((c) => <span key={c} className="size-2 rounded-full border border-white/30" style={{ backgroundColor: c }} />)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-white">{t.name}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/70">{t.tagline}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <iframe
                      title={`${t.name} thumbnail`}
                      src={`/api/templates/${t.id}/html`}
                      scrolling="no"
                      tabIndex={-1}
                      sandbox="allow-scripts allow-same-origin"
                      className="pointer-events-none absolute left-0 top-0 h-[900px] w-[1400px] origin-top-left scale-[0.18] border-0 bg-white"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-3 pt-10">
                      <p className="text-[13px] font-semibold text-white">{t.name}</p>
                      <p className="text-[11px] text-white/60">{t.tagline}</p>
                    </div>
                    {t.kind === "import" && (
                      <span className="absolute left-2 top-2 rounded-full bg-violet-500/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white">
                        import
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {preview && (
        <TemplatePreview
          template={preview}
          onClose={() => setPreview(null)}
          onReproduce={pick}
        />
      )}
      <ImportTemplate
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(t) => pick(t.id)}
      />
    </div>
  );
}
