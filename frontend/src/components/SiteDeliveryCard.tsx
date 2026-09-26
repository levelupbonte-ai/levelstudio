import { useState } from "react";
import {
  Check,
  ExternalLink,
  Globe,
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
  projectId: string;
  messageId: string;
  onRequestChange: () => void;
}

export default function SiteDeliveryCard({
  html,
  name,
  style,
  projectId,
  messageId,
  onRequestChange,
}: SiteDeliveryCardProps) {
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [nonce, setNonce] = useState(0);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const active = VIEWPORTS.find((v) => v.id === viewport)!;
  const pages = Math.max(1, (html.match(/<section/g) ?? []).length);

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
      {/* Delivered as a file: a thumbnail, its details, then the actions. */}
      <div
        className="animate-rise-in my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#101019]"
        data-testid={`site-delivery-card-${messageId}`}
      >
        <div className="flex items-start gap-4 p-4">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="group relative hidden h-[92px] w-[140px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white sm:block"
            aria-label="Open the full preview"
            data-testid={`site-thumbnail-${messageId}`}
          >
            <iframe
              title={`${name} thumbnail`}
              srcDoc={html}
              /* allow-scripts only: the Tailwind CDN build needs JS to produce any styling at all,
                 and without allow-same-origin the frame stays isolated from the app. */
              sandbox="allow-scripts"
              scrolling="no"
              tabIndex={-1}
              className="pointer-events-none h-[368px] w-[560px] origin-top-left scale-[0.25] border-0"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              View
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 shrink-0 text-violet-300" />
              <p className="truncate font-heading text-[15px] font-semibold text-white">
                {slug(name)}.html
              </p>
            </div>
            <p className="mt-1 truncate text-[13px] text-slate-400">{name}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {style && <span className="text-violet-300/80">{style}</span>}
              <span>{pages} sections</span>
              <span>{Math.max(1, Math.round(html.length / 1024))} kb</span>
              <span className="text-emerald-400/80">ready</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-white/6 px-4 py-3">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            data-testid={`preview-btn-${messageId}`}
          >
            <Maximize2 className="size-3.5" /> Live preview
          </button>
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
            onClick={onRequestChange}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-1.5 text-[13px] font-medium text-white transition-transform duration-200 active:scale-[0.97]"
            data-testid={`request-change-btn-${messageId}`}
          >
            Request a change
          </button>
        </div>
        <p className="px-4 pb-3 text-[11px] text-slate-600">
          Share links stay live for 7 days and are never indexed.
        </p>
      </div>

      {full && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#07070c]/96 backdrop-blur-sm"
          data-testid={`fullscreen-overlay-${messageId}`}
        >
          <div className="flex items-center gap-3 border-b border-white/8 px-3 py-2.5">
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="size-[9px] rounded-full bg-[#FF5F57]" />
              <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
              <span className="size-[9px] rounded-full bg-[#28C840]" />
            </div>
            <span className="truncate font-heading text-[13px] text-white">{name}</span>
            <div className="ml-auto flex items-center gap-0.5">
              {VIEWPORTS.map(({ id, label, Icon }) => (
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
              <button
                type="button"
                onClick={() => setFull(false)}
                className="ml-1 rounded-full border border-white/10 px-3 py-1 text-[13px] text-slate-300 hover:text-white"
                data-testid={`fullscreen-close-${messageId}`}
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex flex-1 justify-center overflow-hidden p-2 sm:p-3">
            <iframe
              key={`${viewport}-${nonce}`}
              title={`Live preview of ${name}`}
              srcDoc={html}
              sandbox="allow-scripts allow-popups allow-forms allow-modals"
              className="h-full w-full rounded-xl border border-white/8 bg-white transition-[max-width] duration-300"
              style={{ maxWidth: active.width }}
              data-testid={`site-preview-iframe-${messageId}`}
            />
          </div>
        </div>
      )}
    </>
  );
}
