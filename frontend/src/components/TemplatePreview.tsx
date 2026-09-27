// Fullscreen template preview using the same browser-chrome as the studio canvas.
// Primary action is "Reproduce this design" which closes the overlay and hands the id back to the parent.
import { useEffect, useState } from "react";
import { Monitor, RefreshCw, Smartphone, Tablet, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "820px", Icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", Icon: Smartphone },
] as const;
type ViewportId = (typeof VIEWPORTS)[number]["id"];

interface Props {
  template: Template;
  onClose: () => void;
  onReproduce: (id: string) => void;
}

/** Style-card preview: palette swatches + font sample + section outline (no iframe). */
function StylePreview({ t }: { t: Template }) {
  const p = t.palette.length >= 3 ? t.palette : [...t.palette, "#0f0f17", "#8b5cf6", "#ffffff"].slice(0, 3);
  return (
    <div
      className="h-full w-full overflow-auto p-6 sm:p-10"
      style={{ background: `linear-gradient(160deg, ${p[0]} 0%, ${p[0]} 55%, ${p[1]} 100%)`, color: p[2] ?? "#fff" }}
    >
      <div className="mx-auto max-w-4xl">
        <span
          className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ background: `${p[1]}22`, color: p[2] ?? "#fff" }}
        >
          {t.service} · style card
        </span>
        <h1 className="mt-5 text-4xl font-bold sm:text-6xl">{t.name}</h1>
        <p className="mt-3 text-lg opacity-70">{t.tagline}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 p-5">
            <p className="text-xs uppercase tracking-widest opacity-60">Palette</p>
            <div className="mt-4 flex gap-3">
              {t.palette.map((c) => (
                <div key={c} className="flex flex-col items-center gap-1.5">
                  <span className="size-12 rounded-xl border border-white/20 shadow-lg" style={{ backgroundColor: c }} />
                  <span className="font-mono text-[10px] opacity-75">{c}</span>
                </div>
              ))}
            </div>
          </div>
          {t.fonts && (
            <div className="rounded-2xl border border-white/15 p-5">
              <p className="text-xs uppercase tracking-widest opacity-60">Typography</p>
              <p className="mt-4 text-2xl">{t.fonts}</p>
              <p className="mt-2 text-sm opacity-70">Display headline + body pairing.</p>
            </div>
          )}
        </div>

        {t.sections.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/15 p-5">
            <p className="text-xs uppercase tracking-widest opacity-60">Sections</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {t.sections.map((s) => (
                <span key={s} className="rounded-full border border-white/20 px-3 py-1 text-[12px] capitalize">
                  {s.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {t.brief_prompt && (
          <div className="mt-6 rounded-2xl border border-white/15 p-5">
            <p className="text-xs uppercase tracking-widest opacity-60">Brief handed to the architect</p>
            <p className="mt-3 leading-relaxed opacity-80">{t.brief_prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatePreview({ template, onClose, onReproduce }: Props) {
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [nonce, setNonce] = useState(0);
  const active = VIEWPORTS.find((v) => v.id === viewport)!;
  const isStyle = template.kind === "style";

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#07070c]/98 p-2 backdrop-blur-md sm:p-4"
      data-testid="template-preview-overlay"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c14]">
        <div className="flex items-center gap-2 border-b border-white/6 bg-[#15151f] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-[9px] rounded-full bg-[#FF5F57]" />
            <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
            <span className="size-[9px] rounded-full bg-[#28C840]" />
          </div>
          <div className="mx-auto hidden max-w-[55%] items-center gap-2 truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-slate-400 sm:flex">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {template.id}.levelupstudio.site
          </div>
          <div className="ml-auto flex items-center gap-1">
            {!isStyle &&
              VIEWPORTS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewport(id)}
                  aria-label={label}
                  className={cn(
                    "rounded-md p-1.5 transition-colors duration-200",
                    viewport === id ? "bg-violet-500/20 text-violet-200" : "text-slate-500 hover:text-slate-200",
                  )}
                  data-testid={`template-preview-viewport-${id}`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            {!isStyle && (
              <button
                type="button"
                onClick={() => setNonce((n) => n + 1)}
                aria-label="Reload"
                className="rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:text-slate-200"
                data-testid="template-preview-reload"
              >
                <RefreshCw className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onReproduce(template.id)}
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3.5 py-1 text-[12.5px] font-medium text-white transition-transform duration-200 active:scale-[0.97]"
              data-testid="template-preview-reproduce"
            >
              <Wand2 className="size-3.5" /> Reproduce this design
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="ml-1 rounded-full border border-white/10 p-1.5 text-slate-300 hover:text-white"
              data-testid="template-preview-close"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 justify-center bg-[#0a0a11] p-2">
          {isStyle ? (
            <div className="h-full w-full overflow-hidden rounded-xl border border-white/8">
              <StylePreview t={template} />
            </div>
          ) : (
            <iframe
              key={`${viewport}-${nonce}`}
              title={`Preview of ${template.name}`}
              src={`/api/templates/${template.id}/html`}
              sandbox="allow-scripts allow-popups allow-same-origin allow-forms"
              className="h-full w-full rounded-xl border border-white/8 bg-white transition-[max-width] duration-300"
              style={{ maxWidth: active.width }}
              data-testid="template-preview-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
}
