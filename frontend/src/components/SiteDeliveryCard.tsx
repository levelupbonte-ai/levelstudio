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
  messageId: string;
  onClose?: () => void;
  embedded?: boolean;
}

/** The canvas: browser chrome plus the sandboxed site. Device switching is desktop only. */
export function PreviewFrame({ html, name, messageId, onClose, embedded }: PreviewFrameProps) {
  const isMobile = useIsMobile();
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [nonce, setNonce] = useState(0);
  const active = VIEWPORTS.find((v) => v.id === viewport)!;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0c14]",
        embedded ? "h-full" : "h-full",
      )}
      data-testid={`preview-frame-${messageId}`}
    >
      <div className="flex items-center gap-2 border-b border-white/6 bg-[#15151f] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full bg-[#FF5F57]" />
          <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
          <span className="size-[9px] rounded-full bg-[#28C840]" />
        </div>
        <span className="mx-auto hidden max-w-[55%] truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-slate-400 sm:block">
          {slugOf(name)}.levelupstudio.site
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          {!isMobile &&
            VIEWPORTS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewport(id)}
                aria-label={label}
                className={cn(
                  "rounded-md p-1.5 transition-colors duration-200",
                  viewport === id
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-slate-500 hover:text-slate-200",
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
  showPreviewButton?: boolean;
}

export default function SiteDeliveryCard({
  html,
  name,
  style,
  suggestions,
  projectId,
  messageId,
  onRequestChange,
  showPreviewButton = true,
}: SiteDeliveryCardProps) {
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const sections = Math.max(1, (html.match(/<section/g) ?? []).length);

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
    <>
      <div
        className="animate-rise-in my-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#16141f] via-[#121120] to-[#0f0e17] shadow-[0_20px_60px_-40px_rgba(139,92,246,0.7)]"
        data-testid={`site-delivery-card-${messageId}`}
      >
        <div className="flex items-start gap-4 p-4">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="group relative hidden h-[86px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white sm:block"
            aria-label="Open the full preview"
            data-testid={`site-thumbnail-${messageId}`}
          >
            <iframe
              title={`${name} thumbnail`}
              srcDoc={html}
              sandbox="allow-scripts"
              scrolling="no"
              tabIndex={-1}
              className="pointer-events-none h-[430px] w-[660px] origin-top-left scale-[0.2] border-0"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              View
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-violet-500/20 text-[10px] font-bold text-violet-200">
                H
              </span>
              <p className="truncate font-heading text-[15px] font-semibold text-white">
                {slugOf(name)}.html
              </p>
              <span className="ml-auto shrink-0 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                ready
              </span>
            </div>
            <p className="mt-1 truncate text-[13px] text-slate-400">{name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {style && (
                <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-violet-300/90">
                  {style}
                </span>
              )}
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5">{sections} sections</span>
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5">
                {Math.max(1, Math.round(html.length / 1024))} kb
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/6 px-4 py-3">
          {showPreviewButton && (
            <button
              type="button"
              onClick={() => setFull(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid={`preview-btn-${messageId}`}
            >
              <Maximize2 className="size-3.5" /> Live preview
            </button>
          )}
          <button
            type="button"
            onClick={openTab}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            data-testid={`open-site-btn-${messageId}`}
          >
            <ExternalLink className="size-3.5" /> Open in a tab
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            data-testid={`copy-link-btn-${messageId}`}
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <LinkIcon className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => onRequestChange()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-1.5 text-[13px] font-medium text-white transition-transform duration-200 active:scale-[0.97]"
            data-testid={`request-change-btn-${messageId}`}
          >
            Request a change
          </button>
        </div>

        {suggestions.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 border-t border-white/6 px-4 py-3"
            data-testid={`suggestions-${messageId}`}
          >
            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Quick tweaks
            </span>
            {suggestions.map((s, i) => (
              <button
                key={`${s}-${i}`}
                type="button"
                onClick={() => onRequestChange(s)}
                className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-[12px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
                data-testid={`suggestion-${messageId}-${i}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <p className="px-4 pb-3 pt-1 text-[11px] leading-relaxed text-slate-600">
          {DEMO_NOTE} Share links stay live for 7 days and are never indexed.
        </p>
      </div>

      {full && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#07070c]/96 p-2 backdrop-blur-sm sm:p-4"
          data-testid={`fullscreen-overlay-${messageId}`}
        >
          <PreviewFrame
            html={html}
            name={name}
            messageId={messageId}
            onClose={() => setFull(false)}
          />
        </div>
      )}
    </>
  );
}
