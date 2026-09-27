// Workspace — grid of every project owned by the signed-in user, with live iframe thumbnails,
// last-edited timestamp, and inline Open / Copy link / Delete actions.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { loginWithGoogle, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { ProjectSummary, ShareLink, Template } from "@/lib/types";

type Tab = "all" | "sites" | "drafts" | "imports";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sites", label: "With a live site" },
  { id: "drafts", label: "Drafts" },
  { id: "imports", label: "My imports" },
];

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Workspace() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<ProjectSummary[]>("/projects"),
  });
  const templates = useQuery({
    queryKey: ["templates", "workspace-imports"],
    queryFn: () => apiGet<Template[]>("/templates"),
    enabled: tab === "imports",
    staleTime: 30 * 1000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/projects/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
  });
  const removeImport = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Import deleted");
    },
  });

  const copyShare = async (id: string) => {
    try {
      const link = await apiPost<ShareLink>(`/projects/${id}/share`);
      await navigator.clipboard.writeText(`${window.location.origin}${link.path}`);
      toast.success(`Link copied, valid until ${new Date(link.expires_at).toLocaleDateString()}`);
    } catch {
      toast.error("Could not create the share link");
    }
  };

  const openProject = (id: string) => {
    try {
      window.sessionStorage.setItem("open_project", id);
    } catch {
      // ignore
    }
    nav("/");
  };

  const reproduceImport = (id: string) => {
    try {
      window.sessionStorage.setItem("selected_template", id);
    } catch {
      // ignore
    }
    nav("/");
  };

  const filteredProjects = useMemo(() => {
    const list = projects.data ?? [];
    if (tab === "sites") return list.filter((p) => p.has_site);
    if (tab === "drafts") return list.filter((p) => !p.has_site);
    return list;
  }, [projects.data, tab]);

  const imports = (templates.data ?? []).filter((t) => t.kind === "import");

  return (
    <div className="min-h-dvh w-full bg-[#0A0A0F] text-slate-100" data-testid="workspace-page">
      <Toaster richColors />
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#0A0A0F]/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 hover:border-violet-400/40 hover:text-white"
            data-testid="workspace-back-button"
          >
            <ArrowLeft className="size-3.5" /> Back to studio
          </button>
          <span className="font-heading text-[15px] font-semibold text-white">
            My<span className="text-violet-400"> Workspace</span>
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[11px] uppercase tracking-[0.25em] text-violet-300">Your projects</p>
        <h1 className="mt-2 font-heading text-[28px] font-semibold text-white sm:text-[38px]">
          {user ? user.name.split(" ")[0] + "'s workspace" : "Workspace"}
        </h1>
        <p className="mt-2 text-[14px] text-slate-400">
          Every site you have built, in one place. Open one to keep refining it.
        </p>

        {!authLoading && !user && (
          <div
            className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center"
            data-testid="workspace-locked"
          >
            <p className="text-[15px] font-semibold text-white">
              Workspace unlocks when you sign in
            </p>
            <p className="mt-2 text-[13px] text-slate-400">
              Sign in and every project you have built under this browser moves to your account automatically.
            </p>
            <button
              type="button"
              onClick={() => {
                loginWithGoogle().catch(() => {});
              }}
              className="mt-5 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-slate-900 cursor-pointer"
              data-testid="workspace-signin"
            >
              Sign in with Google
            </button>
          </div>
        )}

        {user && (
          <>
            <div className="no-scrollbar mt-8 flex gap-1.5 overflow-x-auto pb-1" data-testid="workspace-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition-[background-color,color] duration-200",
                    tab === t.id
                      ? "bg-white text-slate-900"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                  data-testid={`workspace-tab-${t.id}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "imports" ? (
              <>
                {templates.isLoading ? (
                  <div className="mt-10 flex items-center gap-2 text-slate-500">
                    <Loader2 className="size-4 animate-spin" /> Loading imports
                  </div>
                ) : imports.length === 0 ? (
                  <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-slate-400">
                    No imported templates yet. Import one from the studio to see it here.
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {imports.map((t) => (
                      <div
                        key={t.id}
                        className="group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition-transform duration-200 hover:-translate-y-1 hover:border-violet-400/40"
                        data-testid={`workspace-import-${t.id}`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-white">
                          <iframe
                            title={t.name}
                            src={`/api/templates/${t.id}/html`}
                            scrolling="no"
                            tabIndex={-1}
                            sandbox="allow-scripts allow-same-origin"
                            className="pointer-events-none absolute left-0 top-0 h-[900px] w-[1400px] origin-top-left scale-[0.2] border-0"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-white">{t.name}</p>
                            <p className="text-[11.5px] text-slate-500">Imported · {t.service}</p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              onClick={() => reproduceImport(t.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-1 text-[11.5px] font-medium text-white"
                              data-testid={`workspace-import-open-${t.id}`}
                            >
                              <Wand2 className="size-3" /> Reproduce
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImport.mutate(t.id)}
                              className="rounded-full border border-white/10 p-1.5 text-slate-500 hover:border-red-400/40 hover:text-red-300"
                              aria-label="Delete import"
                              data-testid={`workspace-import-delete-${t.id}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : projects.isLoading ? (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]"
                  >
                    <div className="aspect-[4/3] bg-white/[0.03]" />
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
                      <div className="h-3 w-1/3 rounded bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
                <p className="text-[14px] text-slate-400">Nothing here yet.</p>
                <button
                  type="button"
                  onClick={() => nav("/")}
                  className="mt-4 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2 text-[13px] font-semibold text-white"
                  data-testid="workspace-empty-cta"
                >
                  Start a project
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    className="group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition-transform duration-200 hover:-translate-y-1 hover:border-violet-400/40"
                    data-testid={`workspace-project-${p.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => openProject(p.id)}
                      className="relative block aspect-[4/3] w-full overflow-hidden bg-white"
                      aria-label={`Open ${p.title}`}
                    >
                      {p.has_site ? (
                        <iframe
                          title={p.title}
                          src={`/api/projects/${p.id}/html`}
                          scrolling="no"
                          tabIndex={-1}
                          sandbox="allow-scripts allow-same-origin"
                          className="pointer-events-none absolute left-0 top-0 h-[900px] w-[1400px] origin-top-left scale-[0.2] border-0"
                        />
                      ) : (
                        <div className="grid h-full place-items-center bg-gradient-to-br from-[#1a1830] to-[#0f0e17] text-[13px] text-slate-500">
                          Draft — no site yet
                        </div>
                      )}
                    </button>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-white">{p.title}</p>
                          <p className="text-[11.5px] text-slate-500">
                            {p.style ? p.style + " · " : ""}
                            {relative(p.updated_at)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openProject(p.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-3 py-1 text-[11.5px] font-medium text-white"
                          data-testid={`workspace-open-${p.id}`}
                        >
                          Open
                        </button>
                        {p.has_site && (
                          <button
                            type="button"
                            onClick={() => void copyShare(p.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11.5px] text-slate-300 hover:border-violet-400/40 hover:text-white"
                            data-testid={`workspace-copy-${p.id}`}
                          >
                            <Copy className="size-3" /> Copy link
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove.mutate(p.id)}
                          className="ml-auto rounded-full border border-white/10 p-1.5 text-slate-500 hover:border-red-400/40 hover:text-red-300"
                          aria-label="Delete project"
                          data-testid={`workspace-delete-${p.id}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
