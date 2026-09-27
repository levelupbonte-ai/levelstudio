import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiGet } from "@/lib/api";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import type { Project } from "@/lib/types";

export default function PreviewPage() {
  const { projectId, token } = useParams<{ projectId?: string; token?: string }>();
  const nav = useNavigate();

  // Fetch project from database
  const projectQuery = useQuery({
    queryKey: ["project-preview", projectId],
    queryFn: () => apiGet<Project>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });

  // Fetch public share if token is present
  const tokenQuery = useQuery({
    queryKey: ["share-preview", token],
    queryFn: async () => {
      const res = await fetch(`/api/share/${token}`);
      if (!res.ok) throw new Error("Share link not found or expired");
      return await res.text();
    },
    enabled: Boolean(token),
  });

  const project = projectQuery.data ?? null;
  const html = project?.html ?? tokenQuery.data ?? "";
  const isLoading = (projectId && projectQuery.isLoading) || (token && tokenQuery.isLoading);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white select-none">
      {/* Floating discreet back button */}
      <button
        type="button"
        onClick={() => nav("/")}
        className="fixed top-4 left-4 z-50 flex items-center justify-center size-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur shadow-lg transition-transform hover:scale-105"
        title="Back to Studio"
        aria-label="Back to Studio"
      >
        <ArrowLeft className="size-4" />
      </button>

      {isLoading ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#0B0B10] text-slate-400">
          <LevelStudioIcon className="size-14 mb-4" pulsing={true} />
          <p className="text-sm font-medium font-sans text-slate-300">Loading your LevelStudio preview...</p>
        </div>
      ) : html ? (
        <iframe
          srcDoc={html}
          title={project?.title || "Site preview"}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-forms allow-same-origin allow-modals allow-popups"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#0B0B10] text-slate-400 p-6 text-center">
          <p className="text-base text-slate-300 font-semibold mb-2">No website draft available for this preview</p>
          <button
            type="button"
            onClick={() => nav("/")}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
          >
            Back to Studio
          </button>
        </div>
      )}
    </div>
  );
}
