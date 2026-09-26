import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, FileText, ImageIcon, Paperclip, Square, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;

// Rotating hints. **bold** is rendered inline.
const PHRASES = [
  "Describe your project and I design the **whole site**.",
  "A **barbershop** site with 24/7 chair booking.",
  "An **online store** for merch with a secure checkout.",
  "A **portfolio** that shows my work like a gallery.",
  "A **restaurant** site with menu and table reservation.",
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
}

export default function Composer({
  onSend,
  onStop,
  busy,
  disabled,
  hero,
  chips = [],
  onRemoveChip,
  focusRef,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const areaRef = focusRef ?? localRef;

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
          focused &&
            "border-violet-500/45 shadow-[0_0_0_1px_rgba(139,92,246,0.22),0_18px_50px_-24px_rgba(139,92,246,0.5)]",
          dragging && "border-violet-400",
        )}
        data-testid="composer-dropzone"
      >
        {(chips.length > 0 || files.length > 0) && (
          <div className="mb-1 mt-2 flex flex-wrap gap-2" data-testid="composer-chips">
            {chips.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-100"
                data-testid={`composer-chip-${c.id}`}
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => onRemoveChip?.(c.id)}
                  aria-label={`Remove ${c.label}`}
                  data-testid={`composer-chip-remove-${c.id}`}
                >
                  <X className="size-3 text-violet-200/70 hover:text-white" />
                </button>
              </span>
            ))}
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
                <span className="max-w-[150px] truncate">{f.name}</span>
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
            className="no-scrollbar w-full resize-none bg-transparent px-2 pt-3 text-[15px] leading-relaxed text-slate-100 outline-none disabled:opacity-50"
            data-testid="hero-prompt-textarea"
          />
          {text.length === 0 && (
            <span
              key={phraseIndex}
              className="animate-rise-in pointer-events-none absolute left-2 top-3 max-w-[94%] truncate text-[15px] text-slate-500"
              data-testid="rotating-placeholder"
            >
              {hero ? boldify(PHRASES[phraseIndex]) : "Ask for a refinement"}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
              data-testid="image-input"
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
              data-testid="file-input"
            />
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                disabled={disabled}
                aria-label="Add an image or a file"
                className="rounded-full p-2 text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-violet-200 disabled:opacity-40"
                data-testid="attach-file-button"
              >
                <Paperclip className="size-[18px]" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="top"
                className="w-56 border-white/10 bg-[#15151f] p-1.5"
                data-testid="attach-picker"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    imageRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 transition-colors duration-200 hover:bg-white/6"
                  data-testid="attach-image-option"
                >
                  <ImageIcon className="size-4 text-violet-300" />
                  <span>
                    Image
                    <span className="block text-[11px] text-slate-500">
                      I design from what I see
                    </span>
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
                  <FileText className="size-4 text-violet-300" />
                  <span>
                    File
                    <span className="block text-[11px] text-slate-500">PDF, text or code, 5 MB</span>
                  </span>
                </button>
              </PopoverContent>
            </Popover>
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
                !hasContent || busy || disabled
                  ? "bg-white/8 text-slate-500"
                  : "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-[0_6px_20px_-6px_rgba(139,92,246,0.9)]",
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
