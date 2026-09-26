import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import Markdown from "@/components/Markdown";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

interface QuestionCardProps {
  message: Message;
  locked: boolean;
  busy: boolean;
  onSubmit: (answer: string) => void;
}

export default function QuestionCard({ message, locked, busy, onSubmit }: QuestionCardProps) {
  const [picked, setPicked] = useState<Record<string, string>>({});

  const answered = message.questions.filter((q) => picked[q.id]).length;
  const ready = answered === message.questions.length && message.questions.length > 0;

  const launch = () => {
    const lines = message.questions.map((q) => `${q.label} — ${picked[q.id]}`);
    onSubmit(lines.join("\n"));
  };

  return (
    <div className="animate-rise-in" data-testid={`question-card-${message.id}`}>
      {message.text && <Markdown text={message.text} />}

      <div className="mt-4 space-y-5 border-l border-white/8 pl-5">
        {message.questions.map((q, qi) => (
          <div key={q.id} role="radiogroup" aria-label={q.label}>
            <p className="text-[13px] font-medium text-slate-300">
              <span className="mr-2 font-mono text-[11px] text-violet-400/80">
                {String(qi + 1).padStart(2, "0")}
              </span>
              {q.label}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const active = picked[q.id] === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={locked}
                    onClick={() => setPicked((p) => ({ ...p, [q.id]: opt.label }))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-[background-color,border-color,color] duration-200 disabled:opacity-60",
                      active
                        ? "border-violet-400/70 bg-violet-500/15 text-white"
                        : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-violet-400/40 hover:text-slate-100",
                    )}
                    data-testid={`question-choice-${q.id}-${opt.id}`}
                  >
                    {active && <Check className="size-3.5 text-violet-300" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!locked && (
        <button
          type="button"
          onClick={launch}
          disabled={!ready || busy}
          className={cn(
            "group mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
            ready && !busy
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-[0_10px_30px_-12px_rgba(139,92,246,0.9)]"
              : "cursor-not-allowed bg-white/6 text-slate-500",
          )}
          data-testid={`launch-generation-${message.id}`}
        >
          Build my site
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}
