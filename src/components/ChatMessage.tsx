import { ArrowUpRight } from "lucide-react";
import ActivityLog from "@/components/ActivityLog";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import Markdown from "@/components/Markdown";
import SiteDeliveryCard from "@/components/SiteDeliveryCard";
import type { Message, Project } from "@/lib/types";

interface ChatMessageProps {
  message: Message;
  project: Project;
  isLatestSite: boolean;
  isDesktop: boolean;
  onRequestChange: (prompt?: string) => void;
  onOpenPreview: (messageId: string) => void;
}

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end" data-testid="user-message">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white/[0.08] px-4 py-3 text-[14px] leading-relaxed text-slate-100">
        {text}
      </div>
    </div>
  );
}

export function AssistantThinking({ label, entries }: { label: string | null; entries: Message["activity"] }) {
  return (
    <div className="flex gap-3" data-testid="assistant-thinking">
      <LevelStudioIcon className="mt-0.5 size-5 shrink-0 animate-star-spin" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-slate-300">{label || "Reading the brief"}</p>
        <ActivityLog entries={entries ?? []} live />
      </div>
    </div>
  );
}

export default function ChatMessage({ message: m, project, isLatestSite, isDesktop, onRequestChange, onOpenPreview }: ChatMessageProps) {
  if (m.role === "user") return <UserMessage text={m.text} />;

  const tone = m.kind === "error" || m.kind === "overloaded" ? "text-amber-100" : "text-slate-200";

  return (
    <div className="flex gap-3" data-testid={`assistant-message-${m.kind}`}>
      <LevelStudioIcon className="mt-1 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className={`text-[14px] leading-relaxed ${tone}`}>
          <Markdown text={m.text} />
        </div>

        {m.cta && (
          <a
            href={m.cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-[#0B0B0D] transition-colors duration-200 hover:bg-slate-200"
            data-testid="assistant-cta-link"
          >
            {m.cta.label} <ArrowUpRight className="size-3.5" />
          </a>
        )}

        {m.kind === "site" && m.html && (
          <div className="mt-4">
            <SiteDeliveryCard
              html={m.html}
              name={m.site_name ?? project.title ?? "Site"}
              style={m.site_style}
              suggestions={m.suggestions ?? []}
              projectId={project.id}
              messageId={m.id}
              onRequestChange={onRequestChange}
              onOpenPreview={() => (isDesktop ? void 0 : onOpenPreview(m.id))}
              compact={isDesktop && isLatestSite}
            />
          </div>
        )}

        {m.activity && m.activity.length > 0 && <ActivityLog entries={m.activity} />}
      </div>
    </div>
  );
}
