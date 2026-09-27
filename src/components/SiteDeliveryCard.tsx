import { useEffect, useState } from "react";
import { ExternalLink, Globe, Sparkles, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

interface SiteDeliveryCardProps {
  html: string;
  name: string;
  style?: string | null;
  suggestions?: string[];
  projectId: string;
  messageId: string;
  onRequestChange: (prompt: string) => void;
  onOpenPreview: () => void;
  compact?: boolean;
  isCanvasVisible?: boolean;
  onOpenCanvas?: () => void;
}

export function SiteDeliveryCard({
  name,
  style,
  suggestions = [],
  messageId,
  onRequestChange,
  onOpenPreview,
  isCanvasVisible = true,
  onOpenCanvas,
}: SiteDeliveryCardProps) {
  const isMobile = useIsMobile();

  const defaultSuggestions = [
    "✨ Add an interactive FAQ & Answers section",
    "💬 Add a responsive Contact Form",
    "⭐ Add Client Testimonials & Social Proof",
    "🎨 Switch to high-contrast Dark Mode",
    "🚀 Add smooth entrance animations",
    "📱 Optimize navigation bar for mobile",
  ];

  const activeSuggestions = suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  const handleOpen = () => {
    if (isMobile) {
      onOpenPreview();
    } else {
      if (onOpenCanvas) {
        onOpenCanvas();
      }
      toast.success("Site active in Canvas");
    }
  };

  return (
    <div
      className="mt-3.5 space-y-3"
      data-testid={`site-delivery-card-${messageId}`}
    >
      {/* Sleek Site Link & Access Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-[#151324] to-violet-900/20 shadow-lg shadow-violet-950/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 shadow-sm">
            <Globe className="size-5 text-violet-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <p className="truncate text-sm font-semibold text-white font-heading">
                {name}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {style || "Interactive generated website draft"}
            </p>
          </div>
        </div>

        {/* Link / Button */}
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition-all duration-200 active:scale-[0.98]"
        >
          <span>
            {isMobile
              ? "Open Canvas"
              : isCanvasVisible
              ? "Active in Canvas"
              : "Open in Canvas"}
          </span>
          <ExternalLink className="size-3.5" />
        </button>
      </div>

      {/* Suggested Evolutions Under the Link */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Sparkles className="size-3 text-violet-400" />
          <span>Suggestions to refine this site:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activeSuggestions.map((sug, idx) => (
            <button
              key={`${sug}-${idx}`}
              type="button"
              onClick={() => onRequestChange(sug)}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:border-violet-500/50 hover:bg-violet-600/15 transition-all duration-150 active:scale-95 text-left"
            >
              <span>{sug}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SiteDeliveryCard;
