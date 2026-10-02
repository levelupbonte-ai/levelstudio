import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Quota } from "@/lib/types";

export default function CreditBadge({ className = "" }: { className?: string }) {
  const quota = useQuery({ queryKey: ["quota"], queryFn: () => apiGet<Quota>("/quota"), staleTime: 30_000 });
  const q = quota.data;
  if (!q) return null;
  const low = q.remaining <= 2;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] tabular-nums ${
        low ? "border-amber-400/40 text-amber-200" : "border-white/10 text-slate-300"
      } ${className}`}
      title="Daily generations remaining"
      data-testid="credit-badge"
    >
      <span className={`size-1.5 rounded-full ${low ? "bg-amber-400" : "bg-emerald-400"}`} />
      <span>
        <strong className="font-semibold text-white" data-testid="credit-remaining">{q.remaining}</strong>
        <span className="text-slate-500">/{q.limit}</span>
      </span>
      <span className="hidden text-slate-500 sm:inline">today</span>
    </span>
  );
}
