import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface QuestionPanelProps {
  message: Message;
  busy: boolean;
  onSubmit: (answer: string) => void;
}

export default function QuestionPanel({ message, busy, onSubmit }: QuestionPanelProps) {
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});

  const answersFor = (q: Message["questions"][number]): string[] => {
    const base = picked[q.id] ?? [];
    const own = custom[q.id]?.trim();
    return own ? [...base, own] : base;
  };

  const toggle = (qid: string, label: string, multi: boolean) => {
    setPicked((prev) => {
      const current = prev[qid] ?? [];
      if (!multi) return { ...prev, [qid]: current[0] === label ? [] : [label] };
      return {
        ...prev,
        [qid]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label],
      };
    });
  };

  const answeredCount = message.questions.filter((q) => answersFor(q).length > 0).length;
  const ready = answeredCount === message.questions.length && message.questions.length > 0;

  const launch = () => {
    const lines = message.questions.map((q) => `${q.label}: ${answersFor(q).join(", ")}`);
    onSubmit(lines.join("\n"));
  };

  return (
    <div
      className="animate-rise-in rounded-2xl border border-white/10 bg-[#12121c]/95 shadow-[0_-10px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
      data-testid={`question-panel-${message.id}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
        <p className="text-[13px] font-medium text-white">A few questions before I build</p>
        <span className="font-mono text-[11px] text-slate-500" data-testid="question-progress">
          {answeredCount}/{message.questions.length}
        </span>
      </div>

      <div className="no-scrollbar max-h-[42vh] space-y-4 overflow-y-auto px-4 py-4">
        {message.questions.map((q, qi) => {
          const selected = picked[q.id] ?? [];
          return (
            <div key={q.id} data-testid={`question-block-${q.id}`}>
              <p className="text-[13px] text-slate-300">
                <span className="mr-2 font-mono text-[11px] text-violet-400/80">
                  {String(qi + 1).padStart(2, "0")}
                </span>
                {q.label}
                {q.multi && (
                  <span className="ml-2 rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    multiple
                  </span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const active = selected.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role={q.multi ? "checkbox" : "radio"}
                      aria-checked={active}
                      onClick={() => toggle(q.id, opt.label, q.multi)}
                      className={cn(
                        "inline-flex items-center gap-1.5 border px-3 py-1.5 text-[13px] transition-[background-color,border-color,color] duration-200",
                        q.multi ? "rounded-md" : "rounded-full",
                        active
                          ? "border-violet-400/70 bg-violet-500/15 text-white"
                          : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-violet-400/40 hover:text-slate-100",
                      )}
                      data-testid={`question-choice-${q.id}-${opt.id}`}
                    >
                      <span
                        className={cn(
                          "flex size-3.5 items-center justify-center border transition-colors duration-200",
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/12 px-3 py-1.5 text-[13px] text-slate-400 transition-colors duration-200 hover:border-violet-400/50 hover:text-white"
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
                    className="min-w-[180px] flex-1 rounded-md border border-violet-400/40 bg-white/[0.03] px-3 py-1.5 text-[13px] text-white outline-none placeholder:text-slate-500"
                    data-testid={`question-custom-input-${q.id}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/6 px-4 py-3">
        <p className="hidden text-[11px] text-slate-500 sm:block">
          Answer what matters, I will make sensible calls on the rest.
        </p>
        <button
          type="button"
          onClick={launch}
          disabled={!ready || busy}
          className={cn(
            "group inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]",
            ready && !busy
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-[0_10px_30px_-14px_rgba(139,92,246,0.9)]"
              : "cursor-not-allowed bg-white/6 text-slate-500",
          )}
          data-testid={`launch-generation-${message.id}`}
        >
          Build my site
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
