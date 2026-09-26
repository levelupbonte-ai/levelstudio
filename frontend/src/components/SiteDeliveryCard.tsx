// The generated site is presented as a Chrome-like browser inside the canvas. The URL bar and
// every action (open in tab, copy share link, request change, viewport switcher, refresh, close)
// live in the top chrome — the chat bubble is left free of buttons per spec.
import { useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  Link as LinkIcon,
  Maximize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ShareLink } from "@/lib/types";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet", width: "820px", Icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", Icon: Smartphone },
] as const;

type ViewportId = (typeof VIEWPORTS)[number]["id"];

export function slugOf(name: string): string {
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

export const DEMO_NOTE =
  "This is an AI preview. Some photos are demo visuals and may not match your real products.";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

interface PreviewFrameProps {
  html: string;
  name: string;
  projectId: string;
  messageId: string;
  onClose?: () => void;
  onRequestChange?: () => void;
  fullscreen?: boolean;
}

/** Browser-chrome canvas. All actions live in the top bar. Copy-link uses /projects/{id}/share. */
export function PreviewFrame({
  html,
  name,
  projectId,
  messageId,
  onClose,
  onRequestChange,
  fullscreen,
}: PreviewFrameProps) {
  const isMobile = useIsMobile();
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [nonce, setNonce] = useState(0);
  const [copied, setCopied] = useState(false);
  const active = VIEWPORTS.find((v) => v.id === viewport)!;

  const openTab = () => {
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  };

  const copyLink = async () => {
    try {
      const link = await apiPost<ShareLink>(`/projects/${projectId}/share`);
      const absolute = `${window.location.origin}${link.path}`;
      try {
        await navigator.clipboard.writeText(absolute);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = absolute;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success(`Link copied, valid until ${new Date(link.expires_at).toLocaleDateString()}`);
    } catch {
      toast.error("Could not create the share link");
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0c14]",
        fullscreen ? "h-full" : "h-full",
      )}
      data-testid={`preview-frame-${messageId}`}
    >
      {/* Chrome — top row: window controls + URL + close */}
      <div className="flex items-center gap-2 border-b border-white/6 bg-[#15151f] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full bg-[#FF5F57]" />
          <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
          <span className="size-[9px] rounded-full bg-[#28C840]" />
        </div>
        <div className="mx-auto hidden max-w-[55%] items-center gap-2 truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-slate-400 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {slugOf(name)}.levelupstudio.site
        </div>
        <div className="ml-auto flex items-center gap-1">
          {!isMobile &&
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
                data-testid={`viewport-${id}-btn`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            aria-label="Reload preview"
            className="rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:text-slate-200"
            data-testid={`reload-preview-${messageId}`}
          >
            <RefreshCw className="size-4" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-300 hover:text-white"
              data-testid={`fullscreen-close-${messageId}`}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Chrome — action row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/6 bg-[#0f0e17] px-3 py-2">
        <button
          type="button"
          onClick={openTab}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
          data-testid={`open-site-btn-${messageId}`}
        >
          <ExternalLink className="size-3.5" /> Open in a tab
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
          data-testid={`copy-link-btn-${messageId}`}
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <LinkIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {onRequestChange && (
          <button
            type="button"
            onClick={onRequestChange}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3.5 py-1 text-[12px] font-medium text-white transition-transform duration-200 active:scale-[0.97]"
            data-testid={`request-change-btn-${messageId}`}
          >
            <Wand2 className="size-3.5" /> Request a change
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 justify-center bg-[#0a0a11] p-2">
        <iframe
          key={`${viewport}-${nonce}`}
          title={`Live preview of ${name}`}
          srcDoc={html}
          sandbox="allow-scripts allow-popups allow-forms allow-modals"
          className="h-full w-full rounded-xl border border-white/8 bg-white transition-[max-width] duration-300"
          style={{ maxWidth: isMobile ? "100%" : active.width }}
          data-testid={`site-preview-iframe-${messageId}`}
        />
      </div>
      <p className="border-t border-white/6 px-3 py-2 text-[11px] text-slate-600">{DEMO_NOTE}</p>
    </div>
  );
}

interface SiteDeliveryCardProps {
  html: string;
  name: string;
  style: string | null;
  suggestions: string[];
  projectId: string;
  messageId: string;
  onRequestChange: (preset?: string) => void;
  onOpenPreview: () => void;
  compact?: boolean;
}

/** In-stream delivery ribbon: a slim card that lives in the chat with just recap + Open preview.
 * On desktop, the canvas holds everything so we render a very small "Open preview" hint here. */
export default function SiteDeliveryCard({
  html,
  name,
  style,
  suggestions,
  messageId,
  onRequestChange,
  onOpenPreview,
  compact,
}: SiteDeliveryCardProps) {
  const sections = Math.max(1, (html.match(/<section/g) ?? []).length);

  return (
    <div
      className="animate-rise-in my-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
      data-testid={`site-delivery-card-${messageId}`}
    >
      <button
        type="button"
        onClick={onOpenPreview}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors duration-200 hover:bg-white/[0.04]"
        data-testid={`site-thumbnail-${messageId}`}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
          <Maximize2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-heading text-[14px] font-semibold text-white">
              {slugOf(name)}.html
            </p>
            <span className="shrink-0 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
              ready
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {style && <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-violet-300/90">{style}</span>}
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5">{sections} sections</span>
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5">
              {Math.max(1, Math.round(html.length / 1024))} kb
            </span>
          </div>
        </div>
        <span className="hidden shrink-0 self-center text-[12px] text-slate-400 sm:inline-block">
          {compact ? "Open in canvas" : "Open preview"}
        </span>
      </button>
      {suggestions.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-t border-white/6 px-3 py-2"
          data-testid={`suggestions-${messageId}`}
        >
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Quick tweaks</span>
          {suggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              type="button"
              onClick={() => onRequestChange(s)}
              className="rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1 text-[11.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid={`suggestion-${messageId}-${i}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
