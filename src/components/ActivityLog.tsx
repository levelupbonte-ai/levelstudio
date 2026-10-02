import { useState } from "react";
import { Bug, Check, ChevronRight, Code2, FileText, Image as ImageIcon, LayoutGrid, Palette, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/types";

const ICONS: Record<ActivityEntry["icon"], typeof Code2> = {
  brief: FileText,
  search: Search,
  palette: Palette,
  layout: LayoutGrid,
  image: ImageIcon,
  code: Code2,
  bug: Bug,
  check: Check,
};

interface ActivityLogProps {
  entries: ActivityEntry[];
  live?: boolean;
  defaultOpen?: boolean;
}

export default function ActivityLog({ entries, live = false, defaultOpen = false }: ActivityLogProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!entries.length) return null;
  const running = entries.find((e) => e.status === "running");
  const summary = live && running ? running.label : `${entries.length} steps`;

  return (
    <div className="mt-2" data-testid="activity-log">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-400 transition-colors duration-200 hover:text-slate-100"
        data-testid="activity-log-toggle"
      >
        <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        <span className="underline decoration-white/15 underline-offset-4">{live ? "Working" : "How I worked"}</span>
        <span className="text-slate-500">· {summary}</span>
      </button>

      {open && (
        <ol className="mt-3 space-y-3 border-l border-white/8 pl-4" data-testid="activity-log-entries">
          {entries.map((e) => {
            const Icon = ICONS[e.icon] ?? Code2;
            return (
              <li key={e.id} className="animate-rise-in relative" data-testid={`activity-entry-${e.icon}`}>
                <span
                  className={cn(
                    "absolute -left-[23px] top-0.5 grid size-[14px] place-items-center rounded-full border bg-[#0B0B0D]",
                    e.status === "running" && "border-sky-400/60",
                    e.status === "done" && "border-white/15",
                    e.status === "warning" && "border-amber-400/60",
                  )}
                >
                  {e.status === "running" ? (
                    <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
                  ) : (
                    <span className={cn("size-1.5 rounded-full", e.status === "warning" ? "bg-amber-400" : "bg-slate-500")} />
                  )}
                </span>
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", e.status === "warning" ? "text-amber-300" : "text-slate-400")} />
                  <div className="min-w-0">
                    <p className={cn("text-[13px] font-medium", e.status === "running" ? "text-slate-100" : "text-slate-300")}>{e.label}</p>
                    <p className="text-[12px] leading-relaxed text-slate-500">{e.detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
