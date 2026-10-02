import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Template } from "@/lib/types";

const ROTATE_MS = 7000;

export default function TemplateShowcase() {
  const templates = useQuery({
    queryKey: ["templates", "showcase"],
    queryFn: () => apiGet<Template[]>("/templates"),
    staleTime: 5 * 60 * 1000,
  });

  const list = useMemo(() => {
    const all = (templates.data ?? []).filter((t) => t.kind === "starter");
    return all.sort(() => Math.random() - 0.5).slice(0, 6);
  }, [templates.data]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [list.length]);

  const current = list[index];
  if (!current) {
    return <div className="h-full w-full bg-[#F6F6F4]" data-testid="template-showcase-empty" />;
  }

  return (
    <div className="relative flex h-full w-full flex-col bg-[#F6F6F4] text-slate-800" data-testid="template-showcase">
      <div className="flex items-center justify-between px-6 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">LevelUp Ecosystem · Template library</p>
          <h3 className="mt-1 font-heading text-lg font-semibold text-slate-900">{current.name}</h3>
          <p className="text-[13px] text-slate-500">{current.tagline}</p>
        </div>
        <a
          href="/templates"
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3.5 py-1.5 text-[12px] font-medium text-slate-700 transition-colors duration-200 hover:border-slate-900 hover:text-slate-900"
          data-testid="showcase-browse-templates"
        >
          Browse all <ArrowUpRight className="size-3.5" />
        </a>
      </div>

      <div className="relative mx-6 mt-4 min-h-0 flex-1 overflow-hidden rounded-t-xl border border-b-0 border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <iframe
          key={current.id}
          title={current.name}
          src={`/api/templates/${current.id}/html`}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          className="animate-rise-in pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0"
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-1.5" data-testid="showcase-dots">
          {list.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Show ${t.name}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
        <p className="text-[11.5px] text-slate-500">Your draft appears here once the brief is complete.</p>
      </div>
    </div>
  );
}
