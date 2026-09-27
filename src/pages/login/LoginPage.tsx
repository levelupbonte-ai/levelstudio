import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, KeyRound, Loader2, Mail, ShieldCheck, Sparkles, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { loginAsGuest, loginWithEmail, loginWithGoogle, registerWithEmail, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register" | "demo">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, show account info and redirect button
  if (user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0F] px-4 text-slate-100">
        <Toaster richColors />
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
            <ShieldCheck className="size-7 text-white" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-white">Session Active</h2>
          <p className="mt-2 text-sm text-slate-400">
            Vous êtes connecté en tant que <span className="font-semibold text-violet-300">{user.name}</span> ({user.email}).
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
              className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Retourner au Studio de Création
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (tab === "login") {
        await loginWithEmail(email);
        toast.success("Connexion réussie via la base de données.");
      } else {
        await registerWithEmail(name || "Architecte Senior", email);
        toast.success("Compte architecte créé et sauvegardé en base de données.");
      }
      nav("/workspace");
    } catch (err: any) {
      setError(err?.message || "Échec de l'authentification avec la base de données.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success("Authentification Google réussie.");
      nav("/workspace");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Erreur lors de l'authentification Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginAsGuest();
      toast.success("Session Invité Pro provisionnée en base de données.");
      nav("/workspace");
    } catch (err: any) {
      setError("Impossible d'initialiser la session démo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col justify-between bg-[#0A0A0F] text-slate-100">
      <Toaster richColors />

      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(139,92,246,0.18), transparent 70%)",
        }}
      />

      {/* Top navigation */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/6 px-6 py-4">
        <button
          type="button"
          onClick={() => nav("/")}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors hover:border-violet-400/40 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Studio
        </button>

        <span className="font-heading text-[16px] font-semibold text-white">
          LevelUp<span className="text-violet-400">.Studio</span>
        </span>
      </header>

      {/* Main card */}
      <main className="relative z-10 mx-auto my-auto w-full max-w-lg px-4 py-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-8 shadow-[0_20px_80px_-20px_rgba(139,92,246,0.3)]">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            <Sparkles className="size-4" /> Espace Connexion
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Accédez à vos Projets Web
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Retrouvez tous vos sites, modifications et maquettes sauvegardés sur votre compte.
          </p>

          {/* Navigation Tabs */}
          <div className="mt-6 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === "login" ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === "register" ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Créer un Compte
            </button>
            <button
              type="button"
              onClick={() => { setTab("demo"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === "demo" ? "bg-violet-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Accès Démo
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {tab === "demo" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 text-xs text-violet-200">
                <p className="font-semibold text-violet-300">Session Démo Immédiate</p>
                <p className="mt-1 leading-relaxed text-slate-300">
                  Initialise un profil architecte provisoire directement enregistré dans la base de données avec 20 crédits quotidiens de génération.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGuestDemo}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                Démarrer la Session Immédiate
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300">Votre Nom ou Agence</label>
                  <div className="relative mt-1">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Studio Nova Architecture"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300">Adresse Email Professionnelle</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@votre-entreprise.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {tab === "login" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500">Ou via SSO</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6c1.9-5.5 7.1-9.8 13.7-9.8z"
              />
              <path
                fill="#4285F4"
                d="M46.9 24.5c0-1.6-.1-3.2-.4-4.8H24v9.1h12.9c-.6 3.1-2.3 5.7-4.9 7.5l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.7z"
              />
              <path
                fill="#FBBC05"
                d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 12-2.1 16-5.8l-7.6-5.9c-2.2 1.5-5 2.4-8.4 2.4-6.6 0-11.8-4.3-13.7-9.8l-7.8 6C6.4 42.6 14.6 48 24 48z"
              />
            </svg>
            Continuer avec Google Workspace
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/6 py-4 text-center text-xs text-slate-500">
        LevelUp Studio • AI Website Architect
      </footer>
    </div>
  );
}
