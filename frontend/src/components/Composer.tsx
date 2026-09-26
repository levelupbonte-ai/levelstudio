import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;

const PHRASES = [
  "Describe your project — I design and build the whole site.",
  "A barbershop site with 24/7 chair booking and barber profiles.",
  "An online store for merch, with a secure checkout experience.",
  "A portfolio that makes my work look like a gallery show.",
  "A restaurant site with an interactive menu and table reservation.",
];

function classify(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("text/") || /\.(txt|md|json|js|ts|tsx|css|html|py|csv)$/i.test(file.name))
    return "text";
  return "other";
}

async function toAttachment(file: File): Promise<Attachment> {
  const kind = classify(file);
  if (kind === "text") {
    return { name: file.name, mime: file.type || "text/plain", kind, data: await file.text() };
  }
  if (kind === "image") {
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
    return { name: file.name, mime: file.type, kind, data };
  }
  return { name: file.name, mime: file.type || "application/octet-stream", kind, data: "" };
}

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  busy: boolean;
  disabled: boolean;
  hero: boolean;
  placeholderOverride?: string;
}

export default function Composer({
  onSend,
  busy,
  disabled,
  hero,
  placeholderOverride,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hero) return;
    const t = setInterval(() => setPhraseIndex((i) => (i + 1) % PHRASES.length), 4200);
    return () => clearInterval(t);
  }, [hero]);

  const addFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const accepted: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 5 MB`);
        continue;
      }
      accepted.push(await toAttachment(file));
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted].slice(0, 5));
  }, []);

  const submit = () => {
    if (busy || disabled) return;
    if (!text.trim() && files.length === 0) return;
    onSend(text.trim(), files);
    setText("");
    setFiles([]);
  };

  return (
    <div className="w-full" data-testid="composer">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-[22px] border border-white/8 bg-[#141420]/90 px-3 pb-2 pt-1 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
          focused && "border-violet-500/45 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_18px_50px_-24px_rgba(139,92,246,0.55)]",
          dragging && "border-violet-400 shadow-[0_0_0_1px_rgba(167,139,250,0.6)]",
        )}
        data-testid="composer-dropzone"
      >
        {files.length > 0 && (
          <div className="mb-1 mt-2 flex flex-wrap gap-2" data-testid="attachment-chips">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200"
                data-testid={`attachment-chip-${i}`}
              >
                {f.kind === "image" ? (
                  <ImageIcon className="size-3 text-violet-300" />
                ) : (
                  <FileText className="size-3 text-violet-300" />
                )}
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                  data-testid={`attachment-remove-${i}`}
                >
                  <X className="size-3 text-slate-400 hover:text-red-300" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={hero ? 3 : 2}
            disabled={disabled}
            placeholder=""
            className="w-full resize-none bg-transparent px-2 pt-3 text-[15px] leading-relaxed text-slate-100 outline-none disabled:opacity-50"
            data-testid="hero-prompt-textarea"
          />
          {text.length === 0 && (
            <span
              key={phraseIndex}
              className="pointer-events-none absolute left-2 top-3 max-w-[94%] truncate text-[15px] text-slate-500 animate-rise-in"
              data-testid="rotating-placeholder"
            >
              {placeholderOverride ?? (hero ? PHRASES[phraseIndex] : "Ask for a refinement…")}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
              data-testid="file-input"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              aria-label="Attach a file"
              className="rounded-full p-2 text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-violet-200 disabled:opacity-40"
              data-testid="attach-file-button"
            >
              <Paperclip className="size-[18px]" />
            </button>
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              Images, PDF, text & code — 5 MB
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={busy || disabled || (!text.trim() && files.length === 0)}
            aria-label="Send"
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
              busy || disabled || (!text.trim() && files.length === 0)
                ? "bg-white/8 text-slate-500"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_6px_20px_-6px_rgba(139,92,246,0.9)]",
            )}
            data-testid="generate-btn"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-[18px]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
