import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Laptop,
  Tablet,
  Smartphone,
  Copy,
  Download,
  Share2,
  Code2,
  Eye,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { apiGet, apiPost } from "@/lib/api";
import type { Project, ShareLink } from "@/lib/types";

type Viewport = "desktop" | "tablet" | "mobile";

export default function PreviewPage() {
  const { projectId, token } = useParams<{ projectId?: string; token?: string }>();
  const nav = useNavigate();
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  // Fetch project from database
  const projectQuery = useQuery({
    queryKey: ["project-preview", projectId],
    queryFn: () => apiGet<Project>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });

  const project = projectQuery.data ?? null;
  const html = project?.html ?? "";

  const handleCopyCode = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    toast.success("Code source HTML copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project?.title || "site").toLowerCase().replace(/[^a-z0-9]/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier HTML téléchargé avec succès");
  };

  const handleShare = async () => {
    if (!projectId) return;
    try {
      const res = await apiPost<ShareLink>(`/projects/${projectId}/share`);
      const fullUrl = `${window.location.origin}${res.path}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien de partage public copié !");
    } catch {
      toast.error("Impossible de générer le lien de partage");
    }
  };

  const viewportWidths: Record<Viewport, string> = {
    desktop: "w-full max-w-[1440px]",
    tablet: "w-[768px]",
    mobile: "w-[390px]",
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0A10] text-slate-100 overflow-hidden font-sans">
      <Toaster richColors />

      {/* Top Bar Navigation & Controls */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#100F1C]/90 px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => nav("/workspace")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] transition"
          >
            <ArrowLeft className="size-3.5" /> Workspace
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md">
              {project?.title || "Aperçu de Production"}
            </h1>
            <span className="text-[11px] text-violet-400 font-mono truncate block">
              {project?.style || "Architecture Tailwind CSS Pure"}
            </span>
          </div>
        </div>

        {/* Viewport switchers */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => { setViewport("desktop"); setActiveTab("preview"); }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${viewport === "desktop" && activeTab === "preview" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
            title="Bureau (1440px)"
          >
            <Laptop className="size-4" />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => { setViewport("tablet"); setActiveTab("preview"); }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${viewport === "tablet" && activeTab === "preview" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
            title="Tablette (768px)"
          >
            <Tablet className="size-4" />
            <span>Tablette</span>
          </button>
          <button
            onClick={() => { setViewport("mobile"); setActiveTab("preview"); }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${viewport === "mobile" && activeTab === "preview" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
            title="Mobile (390px)"
          >
            <Smartphone className="size-4" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Mode & Action buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-0.5">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${activeTab === "preview" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <Eye className="size-3.5" /> Visuel
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${activeTab === "code" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <Code2 className="size-3.5" /> Code Source
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="p-2 rounded-xl border border-white/10 bg-white/[0.02] text-slate-300 hover:text-white hover:border-violet-500/40 transition"
            title="Copier le code HTML"
          >
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl border border-white/10 bg-white/[0.02] text-slate-300 hover:text-white hover:border-violet-500/40 transition"
            title="Télécharger index.html"
          >
            <Download className="size-4" />
          </button>

          {projectId && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition"
            >
              <Share2 className="size-3.5" /> Partager
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 bg-[#07070B] relative flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {projectQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="size-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <span className="text-xs uppercase tracking-widest font-mono">Chargement du site depuis la base...</span>
          </div>
        ) : activeTab === "code" ? (
          <div className="w-full h-full max-w-5xl rounded-2xl border border-white/10 bg-[#0C0B14] p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400 font-mono">
              <span>index.html • HTML5 autonome (Tailwind CSS CDN + Google Fonts)</span>
              <span>{html.length.toLocaleString()} caractères</span>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-emerald-300 bg-black/40 rounded-xl mt-3 selection:bg-violet-600 selection:text-white">
              {html}
            </pre>
          </div>
        ) : (
          <div
            className={`h-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white ${viewportWidths[viewport]}`}
          >
            <iframe
              srcDoc={html}
              title={project?.title || "Site preview"}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
            />
          </div>
        )}
      </main>
    </div>
  );
}
