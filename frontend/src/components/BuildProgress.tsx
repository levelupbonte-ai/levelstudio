import { Check, Square } from "lucide-react";
import { cn } from "@/lib/utils";

// Mirrors STAGES / STAGE_NOTES in backend/routers/architect.py
export const STAGES = [
  "Reading your brief",
  "Choosing the design direction",
  "Laying out the navigation and hero",
  "Writing the page sections",
  "Building the interactive screens",
  "Tuning the mobile layout",
  "Checking every section is complete",
];

export const STAGE_NOTES = [
  "Taking in every answer you gave me.",
  "Picking a palette and type pairing that fits your trade.",
  "Structuring the pages the way visitors read them.",
  "Writing real copy, no filler text.",
  "Wiring the booking, menu and account screens.",
  "Making sure it feels right in one hand.",
  "A last pass so nothing ships half finished.",
];

interface BuildProgressProps {
  step: number;
  pct: number;
  onStop?: () => void;
  compact?: boolean;
}

/** Skeleton blocks that fill in as the build advances, plus the live percentage. */
export default function BuildProgress({ step, pct, onStop, compact }: BuildProgressProps) {
  const blocks = 12;
  const filled = Math.round((pct / 100) * blocks);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/8 bg-[#101019] p-4",
        compact ? "" : "h-full flex flex-col",
      )}
      data-testid="build-progress"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] text-slate-300">{STAGES[Math.min(step, STAGES.length - 1)]}</p>
        <p
          className="font-mono text-[22px] font-semibold text-white tabular-nums"
          data-testid="build-percent"
        >
          {Math.max(1, Math.min(pct, 99))}%
        </p>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        {STAGE_NOTES[Math.min(step, STAGE_NOTES.length - 1)]}
      </p>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-700"
          style={{ width: `${Math.max(2, Math.min(pct, 99))}%` }}
        />
      </div>

      {/* Simulation blocks: the page taking shape */}
      <div className="mt-4 grid grid-cols-4 gap-2" aria-hidden="true">
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-8 rounded-md transition-colors duration-500",
              i === 0 && "col-span-4 h-12",
              i < filled ? "bg-violet-500/25" : "bg-white/[0.04]",
              i === filled && "animate-star-breathe bg-white/[0.08]",
            )}
          />
        ))}
      </div>

      <div className={cn("mt-4 space-y-1.5", compact && "hidden sm:block")}>
        {STAGES.slice(0, Math.min(step + 1, STAGES.length)).map((label, i) => (
          <div key={label} className="flex items-center gap-2 text-[12px]">
            {i < step ? (
              <Check className="size-3 shrink-0 text-emerald-400" />
            ) : (
              <span className="size-1.5 shrink-0 animate-star-breathe rounded-full bg-violet-400" />
            )}
            <span className={i < step ? "text-slate-500" : "text-slate-300"}>{label}</span>
          </div>
        ))}
      </div>

      {onStop && (
        <button
          type="button"
          onClick={onStop}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] text-slate-300 transition-colors duration-200 hover:border-red-400/50 hover:text-red-200"
          data-testid="stop-build-btn"
        >
          <Square className="size-3 fill-current" /> Stop the build
        </button>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
        This is an AI preview. Some photos are demo visuals and may not match your real products.
      </p>
    </div>
  );
}
