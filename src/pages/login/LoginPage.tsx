import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { loginWithGoogle, useAuth } from "@/lib/auth";
import LevelStudioLogo from "@/components/LevelStudioLogo";
import LevelStudioIcon from "@/components/LevelStudioIcon";

export default function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, show active session
  if (user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0F] px-4 text-slate-100 font-sans">
        <Toaster richColors />
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
            <ShieldCheck className="size-7 text-white" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white">Active Session</h2>
          <p className="mt-2 text-sm text-slate-400">
            Signed in as <span className="font-semibold text-violet-300">{user.name}</span> ({user.email}).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:bg-violet-500 active:scale-[0.98]"
            >
              Open Workspace
            </button>
            <button
              type="button"
              onClick={() => nav("/")}
              className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Back to Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success("Google sign-in successful!");
      nav("/workspace");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Error during Google authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-[#0A0A0F] text-slate-100 font-sans">
      <Toaster richColors />

      {/* Top navigation */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/6 px-6 py-4">
        <button
          type="button"
          onClick={() => nav("/")}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
          title="Back to home"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>

        <LevelStudioLogo size="sm" showSubtitle={false} onClick={() => nav("/")} />
      </header>

      {/* Main card - dedicated Google sign-in */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-md px-4 py-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-8 sm:p-10 shadow-2xl text-center">
          <div className="mx-auto mb-5 flex justify-center">
            <LevelStudioIcon className="size-12" />
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sign in to Studio
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-violet-400 font-semibold">
            LevelStudio by LevelUp Ecosystem
          </p>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Sync your projects, export single-file source code, and manage your website drafts.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {/* Primary LevelUp Ecosystem SSO */}
            <a
              href={`https://levelup-ecosystem.com/login?redirect_uri=${encodeURIComponent(window.location.origin + "/auth/callback")}&source=levelstudio`}
              className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 transition-all duration-200 hover:opacity-95 hover:shadow-violet-600/40 active:scale-[0.98]"
            >
              <LevelStudioIcon className="size-4 shrink-0" />
              <span>Se connecter via LevelUp Ecosystem</span>
            </a>

            {/* Signup redirection link */}
            <a
              href={`https://levelup-ecosystem.com/signup?redirect_uri=${encodeURIComponent(window.location.origin + "/auth/callback")}&source=levelstudio`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span>Créer un compte (Inscription LevelUp)</span>
            </a>

            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Direct Google Authentication */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin text-slate-700" />
              ) : (
                <svg className="size-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              )}
              <span>{loading ? "Connexion en cours..." : "Continuer avec Google"}</span>
            </button>
          </div>

          <p className="mt-6 text-[12px] text-slate-500 leading-relaxed">
            Your projects are securely linked to your account. No credit card or API keys required.
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/6 py-4 text-center text-xs text-slate-500">
        LevelStudio — A free tool by LevelUp Ecosystem. All rights reserved.
      </footer>
    </div>
  );
}
