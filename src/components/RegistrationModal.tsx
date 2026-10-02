import { useState } from "react";
import { CheckCircle2, Loader2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { submitRegistration } from "@/lib/registrations";

interface RegistrationModalProps {
  open: boolean;
  onClose: () => void;
  source?: "official_site" | "studio" | "levelstudio";
}

export default function RegistrationModal({ open, onClose, source = "studio" }: RegistrationModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      await submitRegistration({
        email: email.trim(),
        name: name.trim() || undefined,
        message: message.trim() || undefined,
        app: source,
        source: `portal_${source}`,
      });
      setSubmitted(true);
      toast.success("Inscription enregistrée avec succès dans la base de données !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setEmail("");
    setName("");
    setMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12111E] p-6 shadow-2xl text-slate-100 sm:p-8">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full bg-violet-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-48 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-5 right-5 grid size-8 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="size-4" />
        </button>

        {submitted ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="font-heading text-xl font-bold text-white">Inscription Validée !</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Vos informations ont été transmises en toute sécurité directement dans notre base de données Firestore. L'équipe SuperAdmin LevelUp vous contactera sous peu.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-emerald-400/80 bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20">
              <ShieldCheck className="size-3.5" />
              <span>Données chiffrées & protégées par Zero-Trust</span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/25"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-400">
              <Sparkles className="size-3.5" />
              <span>Accès Membre & Inscription Officielle</span>
            </div>

            <h3 className="mt-2 font-heading text-2xl font-bold text-white tracking-tight">
              Rejoindre LevelUp
            </h3>

            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Inscrivez-vous pour accéder en avant-première au studio d'architecture web et aux projets exclusifs.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Adresse Email <span className="text-violet-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nom ou Organisation (optionnel)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Message ou Projet (optionnel)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez brièvement vos attentes ou vos besoins..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 py-1">
                <Lock className="size-3 text-violet-400" />
                <span>Écriture sécurisée write-only : aucun tiers ne peut lire vos données.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enregistrement sécurisé...</span>
                  </>
                ) : (
                  <span>Valider mon inscription</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
