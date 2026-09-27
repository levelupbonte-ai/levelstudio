import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LayoutGrid, FolderCode } from "lucide-react";
import LevelStudioLogo from "@/components/LevelStudioLogo";
import LevelStudioIcon from "@/components/LevelStudioIcon";

export default function NotFoundPage() {
  const nav = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#0B0B14] text-white overflow-hidden selection:bg-[#7C3AED] selection:text-white">
      {/* Header */}
      <header className="relative z-10 flex h-20 items-center justify-between px-6 sm:px-12 border-b border-white/5">
        <LevelStudioLogo size="sm" showSubtitle={false} onClick={() => nav("/")} />
        <button
          type="button"
          onClick={() => nav("/")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Studio</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex justify-center">
          <LevelStudioIcon className="size-16" />
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-xl">
          This page <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">does not exist</span>
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base text-slate-400 leading-relaxed">
          The page you're looking for doesn't exist or has moved. Let's get you back into the studio.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="size-4" />
            <span>Studio Principal</span>
          </button>

          <button
            type="button"
            onClick={() => nav("/templates")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="size-4" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => nav("/workspace")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <FolderCode className="size-4" />
            <span>Workspace</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex h-16 items-center justify-center px-6 border-t border-white/5 text-xs text-slate-500 font-mono">
        <p>LevelUp Ecosystem • AI Web Architecture Engine</p>
      </footer>
    </div>
  );
}
