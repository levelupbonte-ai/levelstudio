import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Database, ExternalLink, Globe, Layout, Loader2, LogIn, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useAuth, logout } from "@/lib/auth";
import type { ProjectSummary, ShareLink, Template } from "@/lib/types";

type Tab = "all" | "sites" | "drafts" | "imports";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Tous les Projets" },
  { id: "sites", label: "Sites Web" },
  { id: "drafts", label: "Brouillons" },
  { id: "imports", label: "Modèles Importés" },
];

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function WorkspacePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<ProjectSummary[]>("/projects"),
    refetchInterval: 12000,
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
      toast.success("Projet supprimé de la base de données");
    },
  });

  const removeImport = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/templates/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Gabarit supprimé");
    },
  });

  const copyShare = async (id: string) => {
    try {
      const link = await apiPost<ShareLink>(`/projects/${id}/share`);
      await navigator.clipboard.writeText(`${window.location.origin}${link.path}`);
      toast.success(`Lien de partage copié (actif jusqu'au ${new Date(link.expires_at).toLocaleDateString("fr-FR")})`);
    } catch {
      toast.error("Impossible de générer le lien de partage.");
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

  const filteredProjects = useMemo(() => {
    const list = projects.data ?? [];
    if (tab === "sites") return list.filter((p) => p.has_site);
    if (tab === "drafts") return list.filter((p) => !p.has_site);
    return list;
  }, [projects.data, tab]);

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-slate-100" data-testid="workspace-page">
      <Toaster richColors />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#0A0A0F]/85 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors hover:border-violet-400/40 hover:text-white"
              data-testid="workspace-back-button"
            >
              <ArrowLeft className="size-3.5" /> Studio
            </button>
            <span className="font-heading text-[15px] font-semibold text-white">
              LevelUp<span className="text-violet-400">.Studio</span> Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => nav("/login")}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                <LogIn className="size-3.5" /> Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Intro */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              Espace de Travail
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Vos Projets & Créations Web
            </h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-slate-400">
              Retrouvez vos projets de sites. Inspectez le code source, prévisualisez les maquettes et partagez vos sites.
            </p>
          </div>

          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-transform hover:bg-violet-500 active:scale-[0.98]"
          >
            <Plus className="size-4" /> Nouveau projet
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/6 pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                  : "border border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "imports" ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(templates.data ?? []).filter((t) => t.kind === "import").map((t) => (
              <div
                key={t.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-6 shadow-xl"
              >
                <h3 className="font-heading text-lg font-bold text-white">{t.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{t.tagline}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      window.sessionStorage.setItem("selected_template", t.id);
                      nav("/");
                    }}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                  >
                    Utiliser ce gabarit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImport.mutate(t.id)}
                    className="p-2 text-slate-500 hover:text-red-400"
                    title="Supprimer le gabarit"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-6 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      p.has_site ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}>
                      {p.has_site ? "Site Compilé Prêt" : "Analyse & Brief"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {relative(p.updated_at)}
                    </span>
                  </div>

                  <h3 className="mt-4 font-heading text-lg font-bold text-white group-hover:text-violet-200 transition-colors line-clamp-1">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {p.style || "Conception sur-mesure d'après votre cahier des charges"}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openProject(p.id)}
                      className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-violet-500"
                    >
                      Ouvrir l'Atelier
                    </button>
                    {p.has_site && (
                      <button
                        type="button"
                        onClick={() => copyShare(p.id)}
                        className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white"
                        title="Partager un lien client sécurisé"
                      >
                        <Copy className="size-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove.mutate(p.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    title="Supprimer de la base de données"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && !projects.isLoading && (
              <div className="col-span-full rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center text-slate-400">
                <Database className="mx-auto size-10 text-slate-600 mb-3" />
                <h3 className="font-heading text-base font-semibold text-white">Aucun projet dans cette catégorie</h3>
                <p className="mt-1 text-xs text-slate-400">Lancez dès maintenant une architecture web avec notre IA senior.</p>
                <button
                  type="button"
                  onClick={() => nav("/")}
                  className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
                >
                  Initier un Projet
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
