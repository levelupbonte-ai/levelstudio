import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types";

interface TemplateGalleryProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

/** Hand-built starter designs. Picking one is passed to the architect as the base design. */
export default function TemplateGallery({ selected, onSelect, disabled }: TemplateGalleryProps) {
  const { data } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiGet<Template[]>("/templates"),
    staleTime: 10 * 60 * 1000,
  });

  const templates = data ?? [];
  if (templates.length === 0) return null;

  return (
    <div data-testid="template-gallery">
      <p className="mb-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
        Or start from a studio design
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {templates.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(active ? null : t.id)}
              className={cn(
                "group overflow-hidden rounded-xl border text-left transition-[border-color,transform,box-shadow] duration-200 disabled:opacity-40",
                active
                  ? "border-violet-400/70 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
                  : "border-white/8 hover:-translate-y-0.5 hover:border-violet-400/40",
              )}
              data-testid={`template-${t.id}`}
            >
              <span className="relative block h-24 overflow-hidden bg-white">
                <iframe
                  title={`${t.name} preview`}
                  src={`/api/templates/${t.id}/html`}
                  sandbox="allow-scripts"
                  scrolling="no"
                  tabIndex={-1}
                  className="pointer-events-none h-[480px] w-[1200px] origin-top-left scale-[0.2] border-0"
                />
                {active && (
                  <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-violet-500 text-white">
                    <Check className="size-3" />
                  </span>
                )}
              </span>
              <span className="block px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: t.accent }}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] font-medium text-white">{t.name}</span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {t.tagline}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
