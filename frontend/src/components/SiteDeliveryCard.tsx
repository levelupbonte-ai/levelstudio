import { useMemo, useState } from "react";
import { ExternalLink, Lock, Maximize2, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", Icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", Icon: Smartphone },
] as const;

type ViewportId = (typeof VIEWPORTS)[number]["id"];

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

interface SiteDeliveryCardProps {
  html: string;
  name: string;
  style: string | null;
  messageId: string;
  onRequestChange: () => void;
}

export default function SiteDeliveryCard({
  html,
  name,
  style,
  messageId,
  onRequestChange,
}: SiteDeliveryCardProps) {
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [nonce, setNonce] = useState(0);
  const [full, setFull] = useState(false);
  const active = useMemo(() => VIEWPORTS.find((v) => v.id === viewport)!, [viewport]);

  const openTab = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  };

  const frame = (heightClass: string) => (
    <iframe
      key={`${viewport}-${nonce}-${heightClass}`}
      title={`Live preview of ${name}`}
      srcDoc={html}
      sandbox="allow-scripts allow-popups allow-forms allow-modals"
      className={cn(
        "w-full rounded-xl border border-white/8 bg-white transition-[max-width] duration-300",
        heightClass,
      )}
      style={{ maxWidth: active.width }}
      data-testid={`site-preview-iframe-${messageId}`}
    />
  );

  return (
    <>
      <div
        className="animate-rise-in my-4 w-full overflow-hidden rounded-2xl border border-white/8 bg-[#101019] shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]"
        data-testid={`site-delivery-card-${messageId}`}
      >
        <div className="flex items-center gap-3 border-b border-white/6 bg-[#15151f] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-[9px] rounded-full bg-[#FF5F57]" />
            <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
            <span className="size-[9px] rounded-full bg-[#28C840]" />
          </div>
          <div className="mx-auto flex max-w-[60%] items-center gap-1.5 truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-slate-400">
            <Lock className="size-3 shrink-0 text-emerald-400/80" />
            <span className="truncate">{slug(name)}.levelupstudio.site</span>
          </div>
          <div className="flex items-center gap-0.5">
            {VIEWPORTS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                title={label}
                aria-label={label}
                className={cn(
                  "rounded-md p-1.5 transition-colors duration-200",
                  viewport === id
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-500 hover:text-slate-200",
                )}
                data-testid={`viewport-${id}-btn`}
              >
                <Icon className="size-[15px]" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              aria-label="Reload preview"
              className="rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:text-slate-200"
              data-testid={`reload-preview-${messageId}`}
            >
              <RefreshCw className="size-[15px]" />
            </button>
          </div>
        </div>

        <div className="flex justify-center bg-[#0a0a11] p-3">{frame("h-[420px] sm:h-[560px]")}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-white">{name}</p>
            {style && (
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300/80">
                {style}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFull(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid={`fullscreen-btn-${messageId}`}
            >
              <Maximize2 className="size-3.5" /> Fullscreen
            </button>
            <button
              type="button"
              onClick={openTab}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid={`open-site-btn-${messageId}`}
            >
              <ExternalLink className="size-3.5" /> Open preview
            </button>
            <button
              type="button"
              onClick={onRequestChange}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-1.5 text-[13px] font-medium text-white transition-transform duration-200 active:scale-[0.97]"
              data-testid={`request-change-btn-${messageId}`}
            >
              Request a change
            </button>
          </div>
        </div>
      </div>

      {full && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#07070c]/95 backdrop-blur-sm"
          data-testid={`fullscreen-overlay-${messageId}`}
        >
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
            <span className="font-heading text-sm text-white">{name}</span>
            <div className="flex items-center gap-2">
              {VIEWPORTS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewport(id)}
                  aria-label={label}
                  className={cn(
                    "rounded-md p-1.5 transition-colors duration-200",
                    viewport === id ? "bg-violet-500/20 text-violet-200" : "text-slate-500",
                  )}
                  data-testid={`fullscreen-viewport-${id}-${messageId}`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFull(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-[13px] text-slate-300 hover:text-white"
                data-testid={`fullscreen-close-${messageId}`}
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex flex-1 justify-center overflow-hidden p-3">{frame("h-full")}</div>
        </div>
      )}
    </>
  );
}
