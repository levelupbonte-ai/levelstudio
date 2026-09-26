// Gallery of templates rendered on the home page. Filterable by service pill; starters render as
// live iframe thumbnails via /api/templates/{id}/html, style cards render as gradient cards using
// their palette. A "See all" button opens a full-page browser.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Layers } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types";

const SERVICE_FILTERS: { id: string; label: string }[] = [
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

interface TemplateGalleryProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  onSeeAll?: () => void;
  limit?: number;
}

function StyleCard({ t, active }: { t: Template; active: boolean }) {
  const p = t.palette.length >= 3 ? t.palette : [...t.palette, "#0f0f17", "#8b5cf6", "#ffffff"].slice(0, 3);
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${p[0]} 0%, ${p[0]} 55%, ${p[1]} 100%)` }}
    >
      <div className="absolute inset-0 opacity-25" style={{ background: `radial-gradient(circle at 80% 20%, ${p[1]}, transparent 55%)` }} />
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
          <p className="mt-0.5 text-[10.5px] leading-relaxed" style={{ color: `${p[2] ?? "#fff"}b0` }}>
            {t.tagline}
          </p>
        </div>
      </div>
      {active && (
        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-slate-900 shadow-lg">
          <Check className="size-3.5" />
        </span>
      )}
    </div>
  );
}

function StarterCard({ t, active }: { t: Template; active: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <iframe
        title={`${t.name} thumbnail`}
        src={`/api/templates/${t.id}/html`}
        scrolling="no"
        tabIndex={-1}
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-none absolute left-0 top-0 h-[900px] w-[1400px] origin-top-left scale-[0.16] border-0 bg-white"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
        <p className="text-[12.5px] font-semibold text-white">{t.name}</p>
        <p className="text-[10.5px] text-white/60">{t.tagline}</p>
      </div>
      {active && (
        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-slate-900 shadow-lg">
          <Check className="size-3.5" />
        </span>
      )}
    </div>
  );
}

export default function TemplateGallery({
  selected,
  onSelect,
  disabled,
  onSeeAll,
  limit = 12,
}: TemplateGalleryProps) {
  const [filter, setFilter] = useState<string>("all");
  const { data: templates = [] } = useQuery({
    queryKey: ["templates", "all"],
    queryFn: () => apiGet<Template[]>("/templates"),
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(
    () => (filter === "all" ? templates : templates.filter((t) => t.service === filter)),
    [templates, filter],
  );
  const visible = filtered.slice(0, limit);

  return (
    <section className="w-full" data-testid="template-gallery">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <Layers className="size-3" />
            Start from a design
          </div>
          <h3 className="mt-1 font-heading text-[18px] font-semibold text-white sm:text-[20px]">
            50+ starters, tuned for your trade
          </h3>
        </div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="hidden items-center gap-1 rounded-full border border-white/10 px-3.5 py-1.5 text-[12px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white sm:inline-flex"
            data-testid="templates-see-all"
          >
            See all <ArrowRight className="size-3" />
          </button>
        )}
      </div>

      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1" data-testid="template-filters">
        {SERVICE_FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilter(s.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-[background-color,color] duration-200",
              filter === s.id
                ? "bg-white text-slate-900"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
            data-testid={`template-filter-${s.id}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(active ? null : t.id)}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-xl border transition-[border-color,transform,box-shadow] duration-300",
                active
                  ? "border-violet-400/70 shadow-[0_10px_35px_-15px_rgba(139,92,246,0.7)]"
                  : "border-white/8 hover:-translate-y-0.5 hover:border-white/25",
                disabled && "opacity-50",
              )}
              data-testid={`template-card-${t.id}`}
            >
              {t.kind === "starter" ? <StarterCard t={t} active={active} /> : <StyleCard t={t} active={active} />}
            </button>
          );
        })}
      </div>

      {filtered.length > limit && onSeeAll && (
        <div className="mt-4 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={onSeeAll}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-[12px] text-slate-300 hover:text-white"
          >
            See all {filtered.length} templates <ArrowRight className="size-3" />
          </button>
        </div>
      )}
    </section>
  );
}
