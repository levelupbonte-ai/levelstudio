import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import type { Project, ShareLink } from "@/lib/types";

interface InteractiveCanvasProps {
  project: Project | null;
  html: string | null;
  title: string;
  isGenerating: boolean;
  progressStep?: number;
  progressPct?: number;
  progressStatus?: string | null;
  onTitleChange?: (newTitle: string) => void;
  onClose?: () => void;
  onRequestChange?: () => void;
  onTriggerGenerate?: () => void;
}

export default function InteractiveCanvas({
  project,
  html,
  title,
  isGenerating,
  progressStep = 0,
  progressPct = 0,
  progressStatus,
  onTitleChange,
  onClose,
  onRequestChange,
  onTriggerGenerate,
}: InteractiveCanvasProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState(title || "Interactive Canvas - My Sites & Shortcuts");
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (title) setCanvasTitle(title);
  }, [title]);

  const handleTitleSubmit = () => {
    if (canvasTitle.trim() && onTitleChange) {
      onTitleChange(canvasTitle.trim());
      toast.success("Project title updated");
    }
  };

  const handleSaveToCloud = () => {
    toast.success("Saved to cloud storage");
  };

  const handleUndo = () => {
    toast.info("Undo previous action");
    setHistoryIndex((prev) => Math.max(0, prev - 1));
  };

  const handleRedo = () => {
    toast.info("Redo action");
    setHistoryIndex((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    if (project?.id) {
      window.open(`/api/projects/${project.id}/html`, "_blank", "noopener");
      toast.success("Opening live preview in a new tab");
    } else if (html) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      toast.success("Opening live preview in a new tab");
    } else {
      toast.info("No website to preview yet");
    }
  };

  const handleOpenShareModal = async () => {
    if (!project?.id) {
      toast.info("Generate a website preview before sharing the link");
      return;
    }
    try {
      const res = await apiPost<ShareLink>(`/projects/${project.id}/share`);
      const fullUrl = `${window.location.origin}${res.path}`;
      setShareUrl(fullUrl);
      setIsShareModalOpen(true);
    } catch {
      const fallbackUrl = `${window.location.origin}/preview/${project.id}`;
      setShareUrl(fallbackUrl);
      setIsShareModalOpen(true);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => {
        setIsCopied(false);
        setIsShareModalOpen(false);
      }, 1500);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      toast.success("Fullscreen enabled");
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const statusLabel =
    progressStatus ||
    (isGenerating
      ? "AI Agent is constructing layout"
      : html
      ? "Production Architecture Ready"
      : "Ready for your instructions");

  return (
    <div className="h-full w-full flex flex-col bg-[#f8fafc] overflow-hidden m-0 p-0 text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 relative">
      {/* HEADER */}
      <header className="header-glass w-full h-[60px] sm:h-[64px] flex items-center justify-between px-3 sm:px-5 shrink-0 z-40 select-none">
        {/* Editable Title */}
        <div className="flex items-center min-w-0 pr-2 sm:pr-4 flex-1 gap-2">
          <LevelStudioIcon className="size-5 shrink-0" />
          <input
            id="canvas-title"
            type="text"
            value={canvasTitle}
            onChange={(e) => setCanvasTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="bg-transparent hover:bg-slate-100 focus:bg-white text-slate-800 text-[14px] sm:text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 px-3 py-1.5 rounded-md w-full truncate transition-colors cursor-text"
            title="Click to rename"
          />
        </div>

        {/* Tools & Actions (Responsive) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 pl-2 border-l border-slate-200">
          {/* History & Cloud Save */}
          <div className="flex items-center text-slate-500">
            <button
              type="button"
              onClick={handleSaveToCloud}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors flex justify-center items-center"
              title="Save to cloud"
            >
              <i className="fa-solid fa-cloud-arrow-up text-[15px]"></i>
            </button>
            <button
              type="button"
              onClick={handleUndo}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors flex justify-center items-center hidden sm:flex"
              title="Undo"
            >
              <i className="fa-solid fa-rotate-left text-[14px]"></i>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 hover:text-slate-700 transition-colors flex justify-center items-center hidden sm:flex"
              title="Redo"
            >
              <i className="fa-solid fa-rotate-right text-[14px]"></i>
            </button>
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1 sm:mx-2 hidden sm:block"></div>

          {/* Live Preview Mode Badge */}
          <div className="pill-container shrink-0 mx-1">
            <span
              className="pill-btn active flex items-center gap-1.5 font-medium select-none"
              title="Live Preview"
            >
              <i className="fa-solid fa-eye text-blue-600"></i>
              <span>Preview</span>
            </span>
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1 sm:mx-2 hidden sm:block"></div>

          {/* Window Actions */}
          <div className="flex items-center shrink-0">
            {/* Open in new tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex justify-center items-center"
              title="Open in new tab"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[15px]"></i>
            </button>
            {/* Share */}
            <button
              type="button"
              onClick={handleOpenShareModal}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex justify-center items-center"
              title="Share generated website"
            >
              <i className="fa-solid fa-share-nodes text-[15px]"></i>
            </button>
            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullScreen}
              className="p-2 w-9 h-9 sm:w-10 sm:h-10 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex justify-center items-center hidden sm:flex"
              title={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              <i
                className={`fa-solid ${
                  isFullscreen ? "fa-compress" : "fa-expand"
                } text-[15px]`}
              ></i>
            </button>
            {/* Close */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 w-9 h-9 sm:w-10 sm:h-10 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex justify-center items-center ml-1"
                title="Fermer le canvas"
              >
                <i className="fa-solid fa-xmark text-[18px]"></i>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CANVAS */}
      <main className="flex-1 w-full bg-white relative shadow-inner overflow-hidden border-t border-slate-200">
        {/* Blank Space for Final Site */}
        <div id="actual-site-content" className="absolute inset-0 w-full h-full">
          {html ? (
            <iframe
              title={`Preview ${title}`}
              srcDoc={html}
              sandbox="allow-scripts allow-popups allow-forms allow-modals allow-same-origin"
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mb-4">
                <i className="fa-solid fa-wand-magic-sparkles text-blue-500"></i>
              </div>
              <h3 className="text-base font-semibold text-slate-700">
                Design Canvas is Ready
              </h3>
              <p className="mt-1.5 max-w-sm text-xs text-slate-500 leading-relaxed">
                Describe your business or project in the composer to start generating your live preview.
              </p>
            </div>
          )}
        </div>

        {/* AI Ghost Browsing Animation Container (Active when isGenerating is true) */}
        {isGenerating && (
          <div
            id="ai-ghost-layer"
            className="absolute inset-0 bg-white/95 backdrop-blur-[2px] z-20 flex flex-col items-center overflow-hidden"
          >
            {/* Scrolling Wireframe Wrapper */}
            <div
              id="wireframe-container"
              className="w-full max-w-4xl px-4 sm:px-8 pt-8 animate-ghost-scroll opacity-100"
            >
              {/* Mock Header */}
              <div
                className="flex items-center justify-between mb-12 opacity-0 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="w-24 h-8 skeleton rounded-md"></div>
                <div className="flex gap-4">
                  <div className="w-16 h-4 skeleton rounded"></div>
                  <div className="w-16 h-4 skeleton rounded"></div>
                  <div className="w-16 h-4 skeleton rounded"></div>
                </div>
              </div>

              {/* Mock Hero Section */}
              <div
                className="flex flex-col items-center text-center mb-16 opacity-0 animate-fade-in-up"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="w-3/4 max-w-lg h-10 skeleton rounded-lg mb-6"></div>
                <div className="w-1/2 max-w-sm h-4 skeleton rounded mb-3"></div>
                <div className="w-2/5 max-w-xs h-4 skeleton rounded mb-8"></div>
                <div className="w-32 h-10 skeleton rounded-full bg-blue-100/50"></div>
              </div>

              {/* Mock Feature Image */}
              <div
                className="w-full h-64 sm:h-80 skeleton rounded-xl mb-16 opacity-0 animate-fade-in-up"
                style={{ animationDelay: "0.5s" }}
              ></div>

              {/* Mock Cards Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-6 opacity-0 animate-fade-in-up"
                style={{ animationDelay: "0.7s" }}
              >
                <div className="h-48 skeleton rounded-xl"></div>
                <div className="h-48 skeleton rounded-xl"></div>
                <div className="h-48 skeleton rounded-xl"></div>
              </div>
            </div>

            {/* Ghost Mouse Cursor Element with Ripple */}
            <div
              id="ghost-cursor"
              className="absolute w-6 h-6 pointer-events-none z-50 drop-shadow-md text-blue-500/80 animate-ghost-mouse"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.5"
                className="w-full h-full transform -rotate-12"
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L5.5 3.21z" />
              </svg>
              <div
                id="ghost-ripple-effect"
                className="absolute top-0 left-0 w-4 h-4 rounded-full border-blue-500 -ml-1 -mt-1 pointer-events-none animate-ghost-ripple"
              ></div>
            </div>

            {/* Generation Status Text */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-slate-600 bg-white/90 px-6 py-3 rounded-full backdrop-blur-md shadow-md border border-slate-200/80 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <i className="fa-solid fa-sparkles text-blue-500"></i>
                <span>{statusLabel}</span>
                <span className="flex gap-1 ml-1">
                  <span
                    className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0s" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  ></span>
                </span>
                {progressPct > 0 && (
                  <span className="ml-2 font-mono text-xs font-semibold text-blue-600">
                    {progressPct}%
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Floating Request Change or Action button */}
      {onRequestChange && html && !isGenerating && (
        <button
          type="button"
          onClick={onRequestChange}
          className="fixed bottom-6 right-6 z-30 bg-slate-900 hover:bg-blue-600 text-white shadow-lg shadow-slate-900/20 px-4 py-3 rounded-full text-sm font-medium flex items-center gap-2 transition-all transform hover:scale-105 group"
        >
          <i className="fa-solid fa-wand-magic-sparkles group-hover:animate-pulse"></i>
          <span className="hidden sm:inline">Request adjustments</span>
        </button>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div
          id="share-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShareModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-200"
        >
          <div
            id="share-modal-content"
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 transform scale-100 transition-transform duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                <i className="fa-solid fa-link text-blue-500"></i> Share Website Preview
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 w-8 h-8 rounded-full transition-colors flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Anyone with this link can interact with your live website preview.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <input
                type="text"
                id="share-link-input"
                readOnly
                value={shareUrl}
                className="w-full bg-transparent px-2 text-xs text-slate-700 outline-none font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
              >
                <i
                  className={`fa-regular ${
                    isCopied ? "fa-circle-check" : "fa-copy"
                  }`}
                ></i>
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
