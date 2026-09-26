// LoginGate — the polished sign-in modal we show when an anonymous visitor tries to send a build.
// Mounted inline over the Home hero; never a full-page redirect out of the studio.
import { useEffect } from "react";
import { X } from "lucide-react";
import { loginWithGoogle } from "@/lib/auth";

interface LoginGateProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export default function LoginGate({ open, onClose, reason }: LoginGateProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      data-testid="login-gate"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#161422] to-[#0f0d18] p-8 shadow-[0_30px_120px_-30px_rgba(139,92,246,0.5)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
          aria-label="Close"
          data-testid="login-gate-close"
        >
          <X className="size-4" />
        </button>

        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-violet-200">
          Sign in
        </span>
        <h2 className="mt-4 font-heading text-2xl font-semibold text-white sm:text-[26px]">
          Save the sites you build with LevelUp Studio
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">
          {reason ??
            "Sign in once so every site you generate, every share link and every refinement stays in your workspace."}
        </p>

        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 text-[14px] font-semibold text-slate-900 shadow-lg transition-transform duration-200 active:scale-[0.98]"
          data-testid="google-login-btn"
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
              d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.2-8.3 2.2-6.6 0-12.1-4.3-14-10.2l-7.8 6C6.4 42.6 14.6 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-slate-500">
          By continuing you accept our preview terms. Sites shown are AI previews of what LevelUp
          Studio can build for you.
        </p>
      </div>
    </div>
  );
}
