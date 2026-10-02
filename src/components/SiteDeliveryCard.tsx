import { useEffect, useState } from "react";
import { ArrowUpRight, Globe } from "lucide-react";

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
}

const DEFAULT_SUGGESTIONS = [
  "Add a contact form with inline confirmation",
  "Add a client testimonials section",
  "Switch to a lighter, editorial palette",
  "Tighten the mobile navigation",
];

export function SiteDeliveryCard({ name, style, suggestions = [], projectId, messageId, onRequestChange, onOpenPreview }: SiteDeliveryCardProps) {
  const isMobile = useIsMobile();
  const list = suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;

  return (
    <div className="space-y-3" data-testid={`site-delivery-card-${messageId}`}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200">
            <Globe className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-white">{name}</p>
            <p className="truncate text-[11.5px] text-slate-500">{style || "Interactive website draft"}</p>
          </div>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#0B0B0D] hover:bg-slate-200"
            data-testid="open-preview-btn"
          >
            Open preview <ArrowUpRight className="size-3.5" />
          </button>
        ) : (
          <a
            href={`/api/projects/${projectId}/html`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] font-medium text-slate-200 hover:border-white/30 hover:text-white"
            data-testid="open-new-tab-btn"
          >
            New tab <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5" data-testid="site-suggestions">
        {list.slice(0, 4).map((sug, idx) => (
          <button
            key={`${sug}-${idx}`}
            type="button"
            onClick={() => onRequestChange(sug)}
            className="rounded-full border border-white/10 px-3 py-1 text-left text-[12px] text-slate-400 transition-colors duration-150 hover:border-white/25 hover:text-white"
          >
            {sug}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SiteDeliveryCard;
