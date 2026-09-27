// AuthCallback: consumes #session_id from the URL fragment, exchanges it for the httpOnly session
// cookie, then redirects to /. Mounted from main.tsx when the fragment is present.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface SessionResponse {
  migrated?: number;
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const match = /session_id=([^&]+)/.exec(hash);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    if (!sessionId) {
      window.location.replace("/");
      return;
    }
    apiPost<SessionResponse>("/auth/session", { session_id: sessionId })
      .then((res) => {
        // Persist the migrated count so Home can surface a toast after the redirect completes.
        try {
          if (res.migrated && res.migrated > 0) {
            window.sessionStorage.setItem("levelup_migrated", String(res.migrated));
          }
        } catch {
          // ignore storage failures
        }
        queryClient.clear();
        window.history.replaceState(null, "", "/");
        window.location.replace("/");
      })
      .catch(() => setError("We could not finish signing you in. Please try again."));
  }, []);

  return (
    <div
      className="grid min-h-dvh place-items-center bg-[#0A0A0F] text-slate-200"
      data-testid="auth-callback"
    >
      <div className="max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        {error ? (
          <>
            <p className="text-lg font-semibold text-white">Sign-in failed</p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <a
              href="/"
              className="mt-5 inline-block rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2 text-sm font-medium text-white"
            >
              Back
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-violet-300" />
            <p className="mt-4 text-sm text-slate-300">Finishing sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}
