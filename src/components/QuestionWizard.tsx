import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface QuestionWizardProps {
  message: Message;
  busy: boolean;
  onSubmit: (answer: string) => void;
}

/** One question at a time, so the brief never lands as a wall of options. */
export default function QuestionWizard({ message, busy, onSubmit }: QuestionWizardProps) {
  const questions = message.questions;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});

  const q = questions[index];
  const answersFor = (id: string) => {
    const base = picked[id] ?? [];
    const own = custom[id]?.trim();
    return own ? [...base, own] : base;
  };
  const answered = useMemo(
    () => questions.filter((qq) => answersFor(qq.id).length > 0).length,
    [questions, picked, custom],
  );
  const currentAnswered = q ? answersFor(q.id).length > 0 : false;
  const isLast = index === questions.length - 1;

  const toggle = (label: string) => {
    if (!q) return;
    setPicked((prev) => {
      const current = prev[q.id] ?? [];
      if (!q.multi) return { ...prev, [q.id]: current[0] === label ? [] : [label] };
      return {
        ...prev,
        [q.id]: current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label],
      };
    });
  };

  const launch = () =>
    onSubmit(questions.map((qq) => `${qq.label}: ${answersFor(qq.id).join(", ")}`).join("\n"));

  if (!q) return null;

  return (
    <div
      className="animate-rise-in overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#16141f] to-[#111019] shadow-[0_-16px_50px_-30px_rgba(139,92,246,0.55)]"
      data-testid={`question-panel-${message.id}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <Sparkles className="size-3.5 text-violet-400" />
          Step {index + 1} of {questions.length}
        </div>
        <div className="flex items-center gap-1.5" data-testid="question-progress-dots">
          {questions.map((qq, i) => (
            <span
              key={qq.id}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-violet-400" : answersFor(qq.id).length ? "w-2.5 bg-violet-400/50" : "w-2.5 bg-white/12",
              )}
            />
          ))}
          <span className="ml-2 font-mono text-[11px] text-slate-500" data-testid="question-progress">
            {answered}/{questions.length}
          </span>
        </div>
      </div>

      <div className="px-4 py-4" data-testid={`question-block-${q.id}`}>
        {/* The architect's question is bold; the answers stay regular so the two never read alike. */}
        <p className="text-[15px] font-semibold leading-snug text-white">
          {q.label}
          {q.multi && (
            <span className="ml-2 align-middle rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-violet-200">
              multiple
            </span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {q.options.map((opt) => {
            const active = (picked[q.id] ?? []).includes(opt.label);
            return (
              <button
                key={opt.id}
                type="button"
                role={q.multi ? "checkbox" : "radio"}
                aria-checked={active}
                onClick={() => toggle(opt.label)}
                className={cn(
                  "inline-flex items-center gap-2 border px-3 py-2 text-[13px] font-normal transition-[background-color,border-color,color] duration-200",
                  q.multi ? "rounded-lg" : "rounded-full",
                  active
                    ? "border-violet-400/70 bg-violet-500/15 text-white"
                    : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-violet-400/40 hover:text-slate-100",
                )}
                data-testid={`question-choice-${q.id}-${opt.id}`}
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center border transition-colors duration-200",
                    q.multi ? "rounded-[4px]" : "rounded-full",
                    active ? "border-violet-300 bg-violet-400/90" : "border-white/20",
                  )}
                >
                  {active && <Check className="size-2.5 text-[#141420]" />}
                </span>
                {opt.label}
              </button>
            );
          })}

          {!customOpen[q.id] ? (
            <button
              type="button"
              onClick={() => setCustomOpen((p) => ({ ...p, [q.id]: true }))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/12 px-3 py-2 text-[13px] text-slate-400 transition-colors duration-200 hover:border-violet-400/50 hover:text-white"
              data-testid={`question-custom-open-${q.id}`}
            >
              <Plus className="size-3" /> My own answer
            </button>
          ) : (
            <input
              autoFocus
              value={custom[q.id] ?? ""}
              onChange={(e) => setCustom((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="Type your answer"
              className="min-w-[180px] flex-1 rounded-lg border border-violet-400/40 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none placeholder:text-slate-500"
              data-testid={`question-custom-input-${q.id}`}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/6 px-4 py-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-400 transition-colors duration-200 hover:text-white disabled:opacity-30"
          data-testid="question-back"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={launch}
            disabled={answered !== questions.length || busy}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]",
              answered === questions.length && !busy
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-[0_10px_30px_-14px_rgba(139,92,246,0.9)]"
                : "cursor-not-allowed bg-white/6 text-slate-500",
            )}
            data-testid={`launch-generation-${message.id}`}
          >
            Build my site
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={!currentAnswered}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]",
              currentAnswered
                ? "bg-white/10 text-white hover:bg-white/15"
                : "cursor-not-allowed bg-white/6 text-slate-500",
            )}
            data-testid="question-next"
          >
            Next <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
