import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { loginWithGoogle, useAuth } from "@/lib/auth";

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
          <h2 className="font-heading text-2xl font-bold text-white">Session Active</h2>
          <p className="mt-2 text-sm text-slate-400">
            Connecté en tant que <span className="font-semibold text-violet-300">{user.name}</span> ({user.email}).
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:bg-violet-500 active:scale-[0.98]"
            >
              Accéder au Workspace
            </button>
            <button
              type="button"
              onClick={() => nav("/")}
              className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Retourner au Studio
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
      toast.success("Connexion Google réussie !");
      nav("/workspace");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Erreur lors de l'authentification Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-[#0A0A0F] text-slate-100 font-sans">
      <Toaster richColors />

      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(139,92,246,0.22), transparent 70%)",
        }}
      />

      {/* Top navigation - discreet back button without bubble */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/6 px-6 py-4">
        <button
          type="button"
          onClick={() => nav("/")}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
          title="Retour à l'accueil"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="LevelUp" className="size-5 shrink-0" />
          <span className="font-heading text-[16px] font-semibold text-white">
            LevelUp<span className="text-violet-400">.Studio</span>
          </span>
        </div>
      </header>

      {/* Main card - dedicated Google sign-in */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-md px-4 py-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-8 sm:p-10 shadow-[0_20px_80px_-20px_rgba(139,92,246,0.35)] text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20">
            <Sparkles className="size-6 text-white" />
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Connexion au Studio
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Synchronisez vos projets, exportez vos codes sources et retrouvez vos sites créés.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-xl transition-all duration-200 hover:bg-slate-100 hover:shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin text-slate-700" />
              ) : (
                <svg className="size-5" viewBox="0 0 24 24">
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
              <span>{loading ? "Authentification en cours..." : "Continuer avec Google"}</span>
            </button>
          </div>

          <p className="mt-6 text-[12px] text-slate-500 leading-relaxed">
            Vos projets restent sécurisés et associés à votre identifiant Google. Aucune clé sensible n'est requise.
          </p>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/6 py-4 text-center text-xs text-slate-500">
        LevelUp Studio — Tous droits réservés.
      </footer>
    </div>
  );
}
