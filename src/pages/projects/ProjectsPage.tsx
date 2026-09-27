import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Code, Database, ExternalLink, Globe, Layout, Search, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ProjectSummary } from "@/lib/types";

export default function ProjectsPage() {
  const nav = useNavigate();
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<ProjectSummary[]>("/projects"),
    refetchInterval: 10000,
  });

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filter === "live" && !p.has_site) return false;
      if (filter === "draft" && p.has_site) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return p.title.toLowerCase().includes(query) || (p.style && p.style.toLowerCase().includes(query));
      }
      return true;
    });
  }, [projects, filter, search]);

  const openProject = (id: string) => {
    try {
      window.sessionStorage.setItem("open_project", id);
    } catch {
      // ignore
    }
    nav("/");
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0F] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#0A0A0F]/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => nav("/")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-violet-400/40 hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Studio
            </button>
            <span className="font-heading text-base font-bold text-white">
              LevelUp<span className="text-violet-400">.Studio</span> Projets
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Mon Espace de Travail
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <Sparkles className="size-3.5" /> Projets & Réalisations
            </div>
            <h1 className="mt-1 font-heading text-3xl font-bold text-white">
              Tous vos Projets
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Retrouvez et prévisualisez l'ensemble des sites créés.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par titre ou style..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex gap-2 border-b border-white/6 pb-4">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === "all" ? "bg-violet-600 text-white" : "border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Tous les Projets ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("live")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === "live" ? "bg-violet-600 text-white" : "border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Sites Actifs & Compilés ({projects.filter((p) => p.has_site).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === "draft" ? "bg-violet-600 text-white" : "border border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Brouillons en Analyse ({projects.filter((p) => !p.has_site).length})
          </button>
        </div>

        {/* Project Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#12111E] p-5 shadow-lg transition-all hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-violet-500/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`grid size-8 place-items-center rounded-lg ${p.has_site ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-slate-400"}`}>
                    {p.has_site ? <Globe className="size-4" /> : <Layout className="size-4" />}
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {p.style || "Architecture sur-mesure"}
                    </p>
                  </div>
                </div>

                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  p.has_site ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {p.has_site ? "Production" : "Cahier des charges"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {new Date(p.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="flex items-center gap-1 text-violet-400 group-hover:underline">
                  Ouvrir dans l'atelier <ExternalLink className="size-3" />
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-slate-400">
              <Database className="mx-auto size-8 text-slate-600 mb-2" />
              <p className="text-sm">Aucun projet trouvé avec ces critères.</p>
              <button
                type="button"
                onClick={() => nav("/")}
                className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Initier une Nouvelle Architecture
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
