import { Loader2, PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSummary } from "@/lib/types";

interface SidebarProps {
  projects: ProjectSummary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Sidebar({
  projects,
  loading,
  activeId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}: SidebarProps) {
  return (
    <aside
      className="flex h-full w-full flex-col border-r border-white/6 bg-[#0C0C13]"
      data-testid="history-sidebar"
    >
      <div className="flex items-center justify-between px-4 py-4">
        <span className="font-heading text-[15px] font-semibold tracking-tight text-white">
          LevelUp<span className="text-violet-400">Studio</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-500 transition-colors duration-200 hover:text-slate-200 lg:hidden"
          aria-label="Collapse sidebar"
          data-testid="sidebar-collapse-button"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[13px] font-medium text-slate-200 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
          data-testid="new-project-button"
        >
          <Plus className="size-4 text-violet-300" /> New project
        </button>
      </div>

      <p className="px-4 pb-1 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Recent
      </p>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-6">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && projects.length === 0 && (
          <p
            className="px-3 py-4 text-[13px] leading-relaxed text-slate-500"
            data-testid="sidebar-empty-state"
          >
            Your projects will appear here once your first site is built.
          </p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className={cn(
              "group relative mb-0.5 rounded-lg px-3 py-2 transition-colors duration-200",
              activeId === p.id ? "bg-white/[0.06]" : "hover:bg-white/[0.035]",
            )}
          >
            <button
              type="button"
              className="w-full pr-6 text-left"
              onClick={() => onSelect(p.id)}
              data-testid={`sidebar-history-item-${p.id}`}
            >
              <span
                className={cn(
                  "block truncate text-[13px]",
                  activeId === p.id ? "text-white" : "text-slate-300",
                )}
              >
                {p.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                {p.has_site ? p.style || "Site ready" : "Draft"} · {relative(p.updated_at)}
              </span>
            </button>
            <button
              type="button"
              className="absolute right-2 top-2.5 rounded-md p-1 text-slate-500 opacity-0 transition-opacity duration-200 hover:text-red-400 group-hover:opacity-100"
              onClick={() => onDelete(p.id)}
              aria-label={`Delete ${p.title}`}
              data-testid={`sidebar-delete-${p.id}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-white/6 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Secure websites, AI-assisted, human-reviewed before anything ships.
        </p>
      </div>
    </aside>
  );
}
