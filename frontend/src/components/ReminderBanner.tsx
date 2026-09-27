// Thin warm-amber banner shown to anonymous visitors. Session-dismissible: once closed via the X,
// it stays hidden until the browser tab is closed.
import { X } from "lucide-react";
import { useState } from "react";
import { loginWithGoogle } from "@/lib/auth";

const KEY = "levelup_signin_banner_dismissed";

export default function ReminderBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return window.sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // no-op
    }
    setHidden(true);
  };
  return (
    <div
      className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/8 px-4 py-2 text-[12.5px] text-amber-100 sm:px-6"
      data-testid="reminder-banner"
    >
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-950">
        !
      </span>
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-medium text-amber-50">Sign in to keep this build.</span>{" "}
        <span className="text-amber-100/80">
          Anonymous projects last until this browser session ends.
        </span>
      </p>
      <button
        type="button"
        onClick={() => loginWithGoogle()}
        className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[12px] font-semibold text-amber-950 hover:bg-white"
        data-testid="reminder-banner-signin"
      >
        Sign in with Google
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="shrink-0 rounded-full p-1 text-amber-200/80 hover:bg-white/10 hover:text-white"
        data-testid="reminder-banner-close"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
