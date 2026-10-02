import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, FileCode2, FileText, ImageIcon, Lightbulb, Loader2, Plus, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;

const PHRASES = [
  "Describe your **project**",
  "A **barbershop** with online booking",
  "An **online store** for my merch",
  "A **portfolio** for my work",
  "A **restaurant** with a live menu",
];

function boldify(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-300">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function classify(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("text/") || /\.(txt|md|json|js|ts|tsx|css|html?|py|csv)$/i.test(file.name)) return "text";
  return "other";
}

async function toAttachment(file: File): Promise<Attachment> {
  const kind = classify(file);
  if (kind === "text") {
    return { name: file.name, mime: file.type || "text/plain", kind, data: await file.text(), scan: "ok" };
  }
  if (kind === "image") {
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
    return { name: file.name, mime: file.type, kind, data, scan: "ok" };
  }
  return { name: file.name, mime: file.type || "application/octet-stream", kind, data: "", scan: "ok" };
}

export interface Chip {
  id: string;
  label: string;
}

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  busy: boolean;
  disabled: boolean;
  hero: boolean;
  chips?: Chip[];
  onRemoveChip?: (id: string) => void;
  focusRef?: React.RefObject<HTMLTextAreaElement | null>;
  initialValue?: string;
}

export default function Composer({ onSend, onStop, busy, disabled, hero, chips = [], onRemoveChip, focusRef, initialValue }: ComposerProps) {
  const [text, setText] = useState(initialValue || "");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inspiring, setInspiring] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = focusRef ?? localRef;

  useEffect(() => {
    if (initialValue) setText(initialValue);
  }, [initialValue]);

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

  const hasContent = Boolean(text.trim()) || files.length > 0 || chips.length > 0;

  const submit = () => {
    if (busy || disabled || !hasContent) return;
    onSend(text.trim(), files);
    setText("");
    setFiles([]);
  };

  const inspire = async () => {
    if (inspiring || disabled) return;
    setInspiring(true);
    try {
      const res = await apiPost<{ brief: string }>("/inspire", { services: chips.map((c) => c.label), language: "English" });
      setText(res.brief);
      areaRef.current?.focus();
    } catch {
      toast.error("The studio is busy right now. Try again in a moment.");
    } finally {
      setInspiring(false);
    }
  };

  const iconFor = (f: Attachment) => {
    if (f.kind === "image") return <ImageIcon className="size-3 text-slate-400" />;
    if (/\.html?$/i.test(f.name)) return <FileCode2 className="size-3 text-slate-400" />;
    return <FileText className="size-3 text-slate-400" />;
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
          "rounded-2xl border border-white/10 bg-[#141416] px-3 pb-2 pt-1 transition-[border-color,box-shadow] duration-300",
          focused && "border-white/25 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]",
          dragging && "border-sky-400/60",
        )}
        data-testid="composer-dropzone"
      >
        {(chips.length > 0 || files.length > 0) && (
          <div className="mb-1 mt-2 flex flex-wrap gap-2" data-testid="composer-chips">
            {chips.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.05] px-2.5 py-1 text-xs text-slate-200"
                data-testid={`composer-chip-${c.id}`}
              >
                {c.label}
                <button type="button" onClick={() => onRemoveChip?.(c.id)} aria-label={`Remove ${c.label}`} data-testid={`composer-chip-remove-${c.id}`}>
                  <X className="size-3 text-slate-400 hover:text-white" />
                </button>
              </span>
            ))}
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200"
                data-testid={`attachment-chip-${i}`}
              >
                {f.kind === "image" && f.data ? (
                  <img src={`data:${f.mime};base64,${f.data}`} alt="" className="size-5 rounded object-cover" />
                ) : (
                  iconFor(f)
                )}
                <span className="max-w-[150px] truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} data-testid={`attachment-remove-${i}`}>
                  <X className="size-3 text-slate-400 hover:text-red-300" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={areaRef}
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
            className="no-scrollbar w-full resize-none bg-transparent px-2 pt-3 text-[16px] leading-relaxed text-slate-100 outline-none disabled:opacity-50 sm:text-[15px]"
            data-testid="hero-prompt-textarea"
          />
          {text.length === 0 && (
            <span
              key={phraseIndex}
              className="animate-rise-in pointer-events-none absolute left-2 top-3 max-w-[94%] truncate text-[16px] text-slate-500 sm:text-[15px]"
              data-testid="rotating-placeholder"
            >
              {hero ? boldify(PHRASES[phraseIndex]) : "Ask for a change, or attach an HTML file to rework"}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} data-testid="image-input" />
            <input ref={fileRef} type="file" accept=".html,.htm,.txt,.md,.css,.js,.json,.pdf,text/*" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} data-testid="file-input" />
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                disabled={disabled}
                aria-label="Add an image or a file"
                className="grid size-8 place-items-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                data-testid="attach-file-button"
              >
                <Plus className="size-[18px]" />
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-60 border-white/10 bg-[#141416] p-1.5" data-testid="attach-picker">
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    imageRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 transition-colors duration-200 hover:bg-white/6"
                  data-testid="attach-image-option"
                >
                  <ImageIcon className="size-4 text-slate-400" />
                  <span>
                    Image
                    <span className="block text-[11px] text-slate-500">Reference or brand visual</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    fileRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 transition-colors duration-200 hover:bg-white/6"
                  data-testid="attach-document-option"
                >
                  <FileCode2 className="size-4 text-slate-400" />
                  <span>
                    HTML or document
                    <span className="block text-[11px] text-slate-500">Your own page to rework, 5 MB max</span>
                  </span>
                </button>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={() => void inspire()}
              disabled={disabled || inspiring}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
              title="Let the architect suggest a brief"
              data-testid="inspire-button"
            >
              {inspiring ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
              <span className="hidden sm:inline">Inspire me</span>
            </button>
          </div>

          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop the build"
              className="flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-slate-200 transition-colors duration-200 hover:border-red-400/50 hover:text-red-200"
              data-testid="stop-generation-btn"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy || disabled || !hasContent}
              aria-label="Send"
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
                !hasContent || busy || disabled ? "bg-white/8 text-slate-500" : "bg-white text-[#0B0B0D] hover:bg-slate-200",
              )}
              data-testid="generate-btn"
            >
              <ArrowUp className="size-[18px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
