// Import-a-template modal: drop or pick a single .html file (max 500 KB), POST to
// /api/templates/import as multipart, add the new import to the gallery cache.
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (t: Template) => void;
}

const SERVICES = [
  "landing", "portfolio", "barbershop", "salon", "restaurant",
  "store", "booking", "creator", "events",
] as const;

async function uploadImport(file: File, service: string, name: string): Promise<Template> {
  const form = new FormData();
  form.append("file", file);
  const query = new URLSearchParams({ service, name });
  const res = await fetch(`/api/templates/import?${query.toString()}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as Template;
}

export default function ImportTemplate({ open, onClose, onImported }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [service, setService] = useState<string>("landing");
  const [name, setName] = useState<string>("");
  const [dragging, setDragging] = useState(false);

  const mutation = useMutation({
    mutationFn: () => uploadImport(file!, service, name || (file?.name ?? "My import").replace(/\.html?$/i, "")),
    onSuccess: (t) => {
      toast.success(`Imported "${t.name}"`);
      void qc.invalidateQueries({ queryKey: ["templates"] });
      onImported(t);
      onClose();
      setFile(null);
      setName("");
    },
    onError: (err) => {
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? String((err.body as { detail?: unknown }).detail ?? "Import failed")
          : "Import failed";
      toast.error(detail);
    },
  });

  if (!open) return null;

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 500 * 1024) {
      toast.error("Template is over 500 KB");
      return;
    }
    if (!/\.html?$/i.test(f.name)) {
      toast.error("Only .html files are accepted");
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.html?$/i, ""));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      data-testid="import-template-modal"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#161422] to-[#0f0d18] p-7 shadow-[0_30px_120px_-30px_rgba(139,92,246,0.5)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
          aria-label="Close"
          data-testid="import-template-close"
        >
          <X className="size-4" />
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-violet-200">
          Import
        </span>
        <h2 className="mt-4 font-heading text-[22px] font-semibold text-white">
          Upload your own .html template
        </h2>
        <p className="mt-1 text-[13px] text-slate-400">
          Single-file HTML, max 500 KB. External scripts and iframes are stripped for safety; Tailwind CDN and Google Fonts stay.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".html,text/html"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          data-testid="import-file-input"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-5 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200",
            dragging ? "border-violet-400 bg-violet-500/10" : "border-white/10 hover:border-violet-400/50",
          )}
          data-testid="import-dropzone"
        >
          {file ? (
            <>
              <p className="text-[14px] font-medium text-white">{file.name}</p>
              <p className="mt-1 text-[11.5px] text-slate-500">
                {Math.round(file.size / 1024)} KB — click or drop another file to replace
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto size-6 text-violet-300" />
              <p className="mt-2 text-[14px] font-medium text-white">Drop your .html file here</p>
              <p className="mt-1 text-[11.5px] text-slate-500">or click to pick one</p>
            </>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">
              Display name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="My homepage draft"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13.5px] text-white outline-none focus:border-violet-400/50"
              data-testid="import-name-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-slate-500">
              Service
            </span>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13.5px] text-white outline-none focus:border-violet-400/50"
              data-testid="import-service-select"
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={!file || mutation.isPending}
          onClick={() => mutation.mutate()}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-semibold transition-transform duration-200 active:scale-[0.98]",
            !file || mutation.isPending
              ? "bg-white/6 text-slate-500"
              : "bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg",
          )}
          data-testid="import-submit"
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {mutation.isPending ? "Uploading" : "Import template"}
        </button>
      </div>
    </div>
  );
}
