import React from "react";
import ReactDOM from "react-dom/client";
import { ArrowLeft, Home, LayoutGrid, FolderCode, Sparkles } from "lucide-react";
import "@/index.css";

function NotFoundApp() {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#0B0B14] text-white overflow-hidden selection:bg-[#7C3AED] selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 size-[350px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex h-20 items-center justify-between px-6 sm:px-12 border-b border-white/5">
        <a href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
          <img src="/favicon.svg" alt="LevelUp Logo" className="size-6 shrink-0" />
          <span className="font-heading text-lg font-bold tracking-tight text-white">
            LevelUp<span className="text-violet-400">.Studio</span>
          </span>
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Retour au Studio</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {/* Shattered Graphic container */}
        <div className="relative mb-8">
          <div className="size-28 sm:size-32 rounded-3xl bg-violet-950/40 border border-violet-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(124,58,237,0.3)] mx-auto">
            <img
              src="/favicon.svg"
              alt="LevelUp Shattered Star"
              className="size-16 sm:size-20 drop-shadow-[0_8px_24px_rgba(124,58,237,0.6)] animate-pulse"
            />
          </div>
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#161426] border border-violet-500/40 text-[11px] font-mono font-bold uppercase tracking-widest text-violet-300">
            Error 404
          </span>
        </div>

        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-xl">
          This page <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent">shattered</span>
        </h1>

        <p className="mt-4 max-w-md text-sm sm:text-base text-slate-400 leading-relaxed">
          The page you're looking for doesn't exist or has moved. Let's put things back together in the studio.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="size-4" />
            <span>Studio Principal</span>
          </a>

          <a
            href="/templates"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="size-4" />
            <span>Templates</span>
          </a>

          <a
            href="/workspace"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-[0.98]"
          >
            <FolderCode className="size-4" />
            <span>Workspace</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex h-16 items-center justify-center px-6 border-t border-white/5 text-xs text-slate-500 font-mono">
        <p>LevelUp Ecosystem • AI Web Architecture Engine</p>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <NotFoundApp />
    </React.StrictMode>
  );
}
