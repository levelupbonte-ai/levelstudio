// React hook exposing the current user (or null if signed out). Backed by TanStack Query so it
// hydrates once and every consumer reads from cache; `refreshAuth()` re-fetches after login/logout.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, ApiError, apiPost } from "@/lib/api";
import type { User } from "@/lib/types";
import { queryClient } from "@/lib/queryClient";

const AUTH_KEY = ["auth", "me"] as const;

async function fetchMe(): Promise<User | null> {
  try {
    return await apiGet<User>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function useAuth() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: AUTH_KEY,
    queryFn: fetchMe,
    // Auth is long-lived; a manual invalidate is the trigger, not polling.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    user: query.data ?? null,
    loading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: AUTH_KEY }),
  };
}

export async function logout(): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
    window.location.assign("/");
  }
}

export function loginWithGoogle(): void {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}
