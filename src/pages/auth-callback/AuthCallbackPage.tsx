import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface HandshakeResult {
  authenticated: boolean;
  user: {
    user_id: string;
    email: string;
    name: string;
    picture: string | null;
  };
  migrated?: number;
}

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function finish() {
      // 1. Support both search query params and hash params
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);

      const sessionId = searchParams.get("session_id") || hashParams.get("session_id");
      const email = searchParams.get("email") || hashParams.get("email");
      const name = searchParams.get("name") || hashParams.get("name");
      const picture = searchParams.get("picture") || hashParams.get("picture");

      if (!sessionId && !email) {
        toast.error("Échec de la validation de session");
        nav("/", { replace: true });
        return;
      }

      try {
        const payload: Record<string, string> = {};
        if (sessionId) payload.session_id = sessionId;
        if (email) payload.email = email;
        if (name) payload.name = name;
        if (picture) payload.picture = picture;

        const res = await apiPost<HandshakeResult>("/auth/session", payload);

        queryClient.setQueryData(["auth", "me"], res.user);
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        void queryClient.invalidateQueries({ queryKey: ["projects"] });

        // Broadcast cross-tab session
        try {
          localStorage.setItem("levelup_shared_session", JSON.stringify(res.user));
          if ("BroadcastChannel" in window) {
            const channel = new BroadcastChannel("levelup_ecosystem_sync");
            channel.postMessage({ type: "LEVELUP_AUTH", user: res.user });
            channel.close();
          }
        } catch {
          // ignore
        }

        toast.success(`Bienvenue, ${res.user.name}`);
        nav("/workspace", { replace: true });
      } catch (err) {
        console.error("Auth callback failed:", err);
        toast.error("Unable to complete authentication");
        nav("/", { replace: true });
      }
    }

    void finish();
  }, [nav]);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-[#0A0A0F] text-slate-100">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
        <p className="font-heading text-lg font-semibold text-white">
          Syncing your session...
        </p>
        <p className="text-xs text-slate-400">
          Secured LevelStudio connection.
        </p>
      </div>
    </div>
  );
}
