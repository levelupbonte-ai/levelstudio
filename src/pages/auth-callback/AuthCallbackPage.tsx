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
      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const sessionId = params.get("session_id");

      if (!sessionId) {
        toast.error("Échec de la validation de session");
        nav("/", { replace: true });
        return;
      }

      try {
        const res = await apiPost<HandshakeResult>("/auth/session", {
          session_id: sessionId,
        });

        queryClient.setQueryData(["auth", "me"], res.user);
        void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        void queryClient.invalidateQueries({ queryKey: ["projects"] });

        toast.success(`Welcome, ${res.user.name}`);
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
