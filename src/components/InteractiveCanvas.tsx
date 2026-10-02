import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Link2, Maximize2, Minimize2, Monitor, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import TemplateShowcase from "@/components/TemplateShowcase";
import type { Project, ShareLink } from "@/lib/types";

interface InteractiveCanvasProps {
  project: Project | null;
  html: string | null;
  title: string;
  isGenerating: boolean;
  progressStatus?: string | null;
  onTitleChange?: (newTitle: string) => void;
  onClose?: () => void;
}

export default function InteractiveCanvas({ project, html, title, isGenerating, progressStatus, onTitleChange, onClose }: InteractiveCanvasProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [canvasTitle, setCanvasTitle] = useState(title);

  useEffect(() => {
    if (title) setCanvasTitle(title);
  }, [title]);

  const submitTitle = () => {
    const next = canvasTitle.trim();
    if (next && next !== title && onTitleChange) onTitleChange(next);
  };

  const openNewTab = () => {
    if (project?.id && html) {
      window.open(`/api/projects/${project.id}/html`, "_blank", "noopener");
    }
  };

  const share = async () => {
    if (!project?.id || !html) return;
    try {
      const res = await apiPost<ShareLink>(`/projects/${project.id}/share`);
      setShareUrl(`${window.location.origin}${res.path}`);
    } catch {
      toast.error("Could not create a share link");
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShareUrl(null);
    }, 1400);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  const toolBtn = "grid size-8 place-items-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-slate-800 shadow-2xl" data-testid="interactive-canvas">
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LevelStudioIcon className="size-4 shrink-0" />
          <input
            type="text"
            value={canvasTitle}
            onChange={(e) => setCanvasTitle(e.target.value)}
            onBlur={submitTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-full truncate rounded-md bg-transparent px-2 py-1 text-[13.5px] font-medium text-slate-800 outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
            data-testid="canvas-title-input"
          />
        </div>

        <div className="flex items-center gap-1">
          <div className="mr-1 hidden items-center rounded-md border border-slate-200 p-0.5 sm:flex">
            <button type="button" onClick={() => setDevice("desktop")} className={`grid size-7 place-items-center rounded ${device === "desktop" ? "bg-slate-900 text-white" : "text-slate-500"}`} title="Desktop" data-testid="canvas-device-desktop">
              <Monitor className="size-3.5" />
            </button>
            <button type="button" onClick={() => setDevice("mobile")} className={`grid size-7 place-items-center rounded ${device === "mobile" ? "bg-slate-900 text-white" : "text-slate-500"}`} title="Mobile" data-testid="canvas-device-mobile">
              <Smartphone className="size-3.5" />
            </button>
          </div>
          <button type="button" onClick={openNewTab} disabled={!html} className={toolBtn} title="Open in new tab" data-testid="canvas-open-tab">
            <ArrowUpRight className="size-4" />
          </button>
          <button type="button" onClick={() => void share()} disabled={!html} className={toolBtn} title="Share link" data-testid="canvas-share">
            <Link2 className="size-4" />
          </button>
          <button type="button" onClick={toggleFullscreen} className={`${toolBtn} hidden sm:grid`} title="Fullscreen" data-testid="canvas-fullscreen">
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className={toolBtn} title="Close" data-testid="canvas-close">
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden bg-[#F6F6F4]">
        {html ? (
          <div className={`mx-auto h-full transition-[max-width] duration-300 ${device === "mobile" ? "max-w-[400px] border-x border-slate-200 bg-white" : "max-w-none"}`}>
            <iframe title={`Preview ${title}`} srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-modals" className="h-full w-full border-0 bg-white" data-testid="canvas-iframe" />
          </div>
        ) : (
          <TemplateShowcase />
        )}

        {isGenerating && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center" data-testid="generation-indicator">
            <div className="animate-rise-in flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-[13px] text-slate-700 shadow-lg backdrop-blur">
              <LevelStudioIcon className="size-4 animate-star-spin" />
              <span className="font-medium">{progressStatus || "Working on your brief"}</span>
            </div>
          </div>
        )}
      </main>

      {shareUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShareUrl(null)} data-testid="share-modal">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900">Share this preview</h3>
              <button type="button" onClick={() => setShareUrl(null)} className="text-slate-400 hover:text-slate-800" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500">Anyone with the link can view the interactive draft for 7 days.</p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
              <input readOnly value={shareUrl} className="w-full select-all bg-transparent px-2 font-mono text-[12px] text-slate-700 outline-none" data-testid="share-link-input" />
              <button type="button" onClick={() => void copy()} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-700" data-testid="share-copy-btn">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
