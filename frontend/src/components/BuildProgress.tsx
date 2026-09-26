// Two build-progress renderers:
// - <BuildProgress mode="desktop"> — a stylised browser viewport with an animated cursor that
//   moves between wireframe blocks in sync with the current backend stage. Feels like the AI is
//   actually laying out the site under a live cursor.
// - <BuildProgress mode="mobile"> — a compact text panel: percentage, stage label + a rotating
//   note the architect is "typing" now. No wireframe on mobile.
import { useEffect, useState } from "react";
import { Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export const STAGES = [
  "Analysing your brief",
  "Choosing the design direction",
  "Laying out navigation and hero",
  "Writing the page sections",
  "Building the interactive screens",
  "Tuning the mobile layout",
  "Checking every section is complete",
];

export const STAGE_NOTES = [
  "Reading every answer you gave, in the order you gave them.",
  "Picking a palette and type pairing that fits your trade.",
  "Structuring the pages the way visitors read them.",
  "Writing real copy, no filler text.",
  "Wiring the booking, menu and account screens.",
  "Making sure it feels right in one hand.",
  "A last pass so nothing ships half finished.",
];

// Each stage points the cursor at one wireframe zone.
type FocusKey = "brief" | "palette" | "hero" | "sections" | "interactions" | "mobile" | "review";

const FOCUS_BY_STEP: FocusKey[] = [
  "brief",
  "palette",
  "hero",
  "sections",
  "interactions",
  "mobile",
  "review",
];

// Coordinates are % of the viewport rectangle, so the cursor animates fluidly across sizes.
const CURSOR_TARGETS: Record<FocusKey, { x: number; y: number }> = {
  brief: { x: 12, y: 12 },
  palette: { x: 78, y: 18 },
  hero: { x: 42, y: 32 },
  sections: { x: 30, y: 58 },
  interactions: { x: 70, y: 62 },
  mobile: { x: 22, y: 85 },
  review: { x: 82, y: 82 },
};

interface BuildProgressProps {
  step: number;
  pct: number;
  focus?: string | null;
  onStop?: () => void;
  mode?: "desktop" | "mobile";
}

function useTypedNote(step: number) {
  const target = STAGE_NOTES[Math.min(step, STAGE_NOTES.length - 1)];
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [target]);
  return shown;
}

export default function BuildProgress({ step, pct, focus, onStop, mode = "desktop" }: BuildProgressProps) {
  const activeStep = Math.min(step, STAGES.length - 1);
  const pctClamped = Math.max(1, Math.min(pct, 99));
  const focusKey = (focus as FocusKey | undefined) ?? FOCUS_BY_STEP[activeStep] ?? "brief";
  const target = CURSOR_TARGETS[focusKey] ?? CURSOR_TARGETS.brief;
  const typed = useTypedNote(activeStep);

  if (mode === "mobile") {
    return (
      <div
        className="rounded-2xl border border-white/8 bg-[#101019] p-5"
        data-testid="build-progress-mobile"
      >
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="size-4 animate-spin text-violet-300" />
          <span className="text-[13px]">{STAGES[activeStep]}</span>
          <span className="ml-auto font-mono text-[18px] font-semibold text-white tabular-nums" data-testid="build-percent">
            {pctClamped}%
          </span>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-700"
            style={{ width: `${pctClamped}%` }}
          />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-slate-300">
          <span className="text-violet-300">•</span> {typed}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-violet-300 align-middle" />
        </p>
        <div className="mt-4 space-y-1.5">
          {STAGES.slice(0, activeStep + 1).map((label, i) => (
            <div key={label} className="flex items-center gap-2 text-[12px]">
              <span className={cn(
                "size-1.5 shrink-0 rounded-full",
                i < activeStep ? "bg-emerald-400" : "animate-star-breathe bg-violet-400",
              )} />
              <span className={i < activeStep ? "text-slate-500" : "text-slate-300"}>{label}</span>
            </div>
          ))}
        </div>
        {onStop && (
          <button
            type="button"
            onClick={onStop}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] text-slate-300 transition-colors duration-200 hover:border-red-400/50 hover:text-red-200"
            data-testid="stop-build-btn"
          >
            <Square className="size-3 fill-current" /> Stop the build
          </button>
        )}
      </div>
    );
  }

  // Desktop: browser-chrome viewport with animated cursor
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#0d0c14]"
      data-testid="build-progress"
    >
      <div className="flex items-center gap-2 border-b border-white/6 bg-[#15151f] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full bg-[#FF5F57]" />
          <span className="size-[9px] rounded-full bg-[#FEBC2E]" />
          <span className="size-[9px] rounded-full bg-[#28C840]" />
        </div>
        <span className="mx-auto flex max-w-[55%] items-center gap-2 truncate rounded-md bg-black/40 px-3 py-1 font-mono text-[11px] text-slate-400">
          <Loader2 className="size-3 animate-spin text-violet-300" />
          building.levelupstudio.site
        </span>
        <span className="ml-auto rounded-md bg-violet-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-200" data-testid="build-percent">
          {pctClamped}%
        </span>
      </div>

      {/* The mock viewport where the cursor scans between blocks. */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        {/* Skeleton page — header, hero, sections */}
        <div className="pointer-events-none absolute inset-0 p-4">
          {/* header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="h-3 w-16 rounded bg-slate-200" data-focus="brief" />
            <div className="flex gap-1.5">
              <span className="h-2 w-8 rounded bg-slate-200" />
              <span className="h-2 w-8 rounded bg-slate-200" />
              <span className="h-2 w-8 rounded bg-slate-200" />
              <span className="h-2.5 w-14 rounded bg-slate-800" data-focus="palette" />
            </div>
          </div>
          {/* hero */}
          <div className="mb-3 grid grid-cols-2 gap-3" data-focus="hero">
            <div>
              <div className="h-3 w-20 rounded bg-violet-200" />
              <div className="mt-2 h-6 w-full rounded bg-slate-200" />
              <div className="mt-1.5 h-6 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-2 w-full rounded bg-slate-100" />
              <div className="mt-1 h-2 w-2/3 rounded bg-slate-100" />
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 rounded-full bg-slate-800" />
                <div className="h-6 w-16 rounded-full border border-slate-200" />
              </div>
            </div>
            <div className="h-32 rounded-lg bg-gradient-to-br from-violet-200 to-fuchsia-200" />
          </div>
          {/* sections */}
          <div className="mb-3 grid grid-cols-3 gap-2" data-focus="sections">
            <div className="h-16 rounded-lg bg-slate-100" />
            <div className="h-16 rounded-lg bg-slate-100" />
            <div className="h-16 rounded-lg bg-slate-100" />
          </div>
          {/* interactions */}
          <div className="mb-3 h-24 rounded-lg bg-slate-50 p-2" data-focus="interactions">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-full rounded bg-slate-100" />
            <div className="mt-1 h-3 w-full rounded bg-slate-100" />
            <div className="mt-1 h-3 w-2/3 rounded bg-slate-100" />
          </div>
          {/* mobile preview + review */}
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <div className="h-16 rounded-lg bg-slate-100" data-focus="review" />
            <div className="h-16 rounded-lg border border-slate-200 bg-slate-50" data-focus="mobile" />
          </div>
        </div>

        {/* Animated cursor — CSS transitions move it toward the current focus */}
        <div
          className="pointer-events-none absolute z-10 -translate-x-1 -translate-y-1 transition-[top,left] duration-[1400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          data-testid="build-cursor"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]">
            <path d="M3 2 L3 18 L8 14 L11 20 L14 19 L11 13 L18 12 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="ml-3 -mt-2 inline-block rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg">
            {STAGES[activeStep]}
          </span>
        </div>

        {/* Highlight ring pulsing on the current focus block */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-24 -translate-x-1/2 -translate-y-1/2 animate-star-breathe rounded-2xl border-2 border-violet-400/60 bg-violet-400/10 transition-[top,left] duration-[1400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
        />
      </div>

      {/* Status bar */}
      <div className="border-t border-white/6 bg-[#0d0c14] p-4">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-700"
            style={{ width: `${pctClamped}%` }}
          />
        </div>
        <p className="text-[12px] leading-relaxed text-slate-300">
          <span className="text-violet-300">•</span> {typed}
          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-violet-300 align-middle" />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {STAGES.map((label, i) => (
            <span
              key={label}
              className={cn(
                "inline-flex items-center gap-1",
                i < activeStep ? "text-emerald-400/80" : i === activeStep ? "text-violet-200" : "text-slate-600",
              )}
            >
              <span className={cn(
                "size-1.5 rounded-full",
                i < activeStep ? "bg-emerald-400" : i === activeStep ? "animate-star-breathe bg-violet-400" : "bg-slate-700",
              )} />
              {label}
            </span>
          ))}
        </div>
        {onStop && (
          <button
            type="button"
            onClick={onStop}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-1.5 text-[12px] text-slate-300 transition-colors duration-200 hover:border-red-400/50 hover:text-red-200"
            data-testid="stop-build-btn"
          >
            <Square className="size-3 fill-current" /> Stop the build
          </button>
        )}
      </div>
    </div>
  );
}
