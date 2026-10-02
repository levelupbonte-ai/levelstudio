import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, PanelRightClose, PanelRightOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import ChatMessage, { AssistantThinking } from "@/components/ChatMessage";
import Composer from "@/components/Composer";
import CreditBadge from "@/components/CreditBadge";
import InteractiveCanvas from "@/components/InteractiveCanvas";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import QuestionWizard from "@/components/QuestionWizard";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Attachment, ChatResponse, Message, Project, Quota } from "@/lib/types";

function useIsDesktop() {
  const [wide, setWide] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return wide;
}

export default function StudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const isDesktop = useIsDesktop();
  const [canvasOpen, setCanvasOpen] = useState(true);
  const [mobilePreview, setMobilePreview] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quotaQuery = useQuery({ queryKey: ["quota"], queryFn: () => apiGet<Quota>("/quota") });
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiGet<Project>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
    refetchInterval: (query) => (query.state.data?.generating ? 1500 : false),
    retry: false,
  });

  const chat = useMutation({
    mutationFn: (vars: { text: string; attachments: Attachment[] }) =>
      apiPost<ChatResponse>("/chat", { project_id: projectId, text: vars.text, attachments: vars.attachments }),
    onSuccess: (res) => {
      qc.setQueryData(["project", res.project.id], res.project);
      qc.setQueryData(["quota"], res.quota);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      const detail = err instanceof ApiError && err.body && typeof err.body === "object" ? String((err.body as { detail?: unknown }).detail ?? "") : "";
      toast.error(detail || "Something went wrong. Please try again.");
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => apiPost<Project>(`/projects/${id}/stop`),
    onSuccess: (project) => qc.setQueryData(["project", project.id], project),
  });

  const project = projectQuery.data ?? null;
  const messages: Message[] = project?.messages ?? [];
  const generating = Boolean(project?.generating);
  const busy = chat.isPending || generating;
  const outOfQuota = (quotaQuery.data?.remaining ?? 1) <= 0;
  const lastMessage = messages[messages.length - 1];
  const openQuestions = !generating && lastMessage?.role === "assistant" && lastMessage.kind === "questions" ? lastMessage : null;
  const lastSite = [...messages].reverse().find((m) => m.kind === "site" && m.html) ?? null;

  const delivered = useRef<string | null>(null);
  useEffect(() => {
    if (!generating && lastMessage?.kind === "site" && delivered.current !== lastMessage.id) {
      delivered.current = lastMessage.id;
      void qc.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [generating, lastMessage, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, project?.progress, openQuestions]);

  const send = (text: string, attachments: Attachment[]) => {
    if (outOfQuota) {
      toast.error("Daily allowance reached. Your projects remain saved in the workspace.");
      return;
    }
    chat.mutate({ text, attachments });
  };

  const requestChange = (preset?: string) => {
    if (preset) send(preset, []);
    else textareaRef.current?.focus();
  };

  if (projectQuery.isError) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0B0B0D] text-slate-300" data-testid="studio-not-found">
        <div className="text-center">
          <p className="text-[15px]">This project is not available in this session.</p>
          <button type="button" onClick={() => nav("/")} className="mt-4 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0B0B0D]">
            Start a new project
          </button>
        </div>
      </div>
    );
  }

  const showCanvas = isDesktop && canvasOpen;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#0B0B0D] text-slate-100" data-testid="studio-page">
      <Toaster richColors />

      <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-white/6 px-3 sm:px-4" data-testid="studio-header">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => nav("/")} className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Back to home" data-testid="studio-back-button">
            <ArrowLeft className="size-4" />
          </button>
          <LevelStudioIcon className="size-5" />
          <span className="hidden text-[13px] font-semibold text-white sm:inline">LevelStudio</span>
          <span className="hidden text-slate-600 sm:inline">/</span>
          <span className="truncate text-[13px] text-slate-300" data-testid="studio-project-title">{project?.title || "New project"}</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditBadge />
          <button type="button" onClick={() => nav("/")} className="hidden h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] text-slate-300 transition-colors hover:border-white/25 hover:text-white sm:inline-flex" data-testid="studio-new-project">
            <Plus className="size-3.5" /> New
          </button>
          {isDesktop ? (
            <button type="button" onClick={() => setCanvasOpen((o) => !o)} className="grid size-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" title={canvasOpen ? "Hide canvas" : "Show canvas"} data-testid="studio-toggle-canvas">
              {canvasOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            </button>
          ) : (
            lastSite && (
              <button type="button" onClick={() => setMobilePreview(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-semibold text-[#0B0B0D]" data-testid="studio-mobile-preview">
                <Eye className="size-3.5" /> Preview
              </button>
            )
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className={`flex min-h-0 flex-col ${showCanvas ? "w-full lg:w-[460px] xl:w-[520px] lg:border-r lg:border-white/6" : "mx-auto w-full max-w-3xl"}`} data-testid="studio-chat">
          <div ref={scrollRef} className="flex-1 space-y-7 overflow-y-auto px-4 py-6 sm:px-6">
            {projectQuery.isLoading && (
              <div className="flex items-center gap-3 text-[14px] text-slate-400">
                <LevelStudioIcon className="size-5 animate-star-spin" /> Opening the studio
              </div>
            )}
            {project &&
              messages.map((m) => (
                <ChatMessage key={m.id} message={m} project={project} isLatestSite={m.id === lastSite?.id} isDesktop={isDesktop} onRequestChange={requestChange} onOpenPreview={() => setMobilePreview(true)} />
              ))}
            {busy && <AssistantThinking label={project?.progress ?? null} entries={project?.activity ?? []} />}
          </div>

          <div className="border-t border-white/6 p-3 sm:p-4">
            {openQuestions && (
              <div className="mb-3">
                <QuestionWizard message={openQuestions} busy={busy} onSubmit={(answer) => send(answer, [])} />
              </div>
            )}
            <Composer onSend={send} onStop={() => project && stop.mutate(project.id)} busy={busy} disabled={outOfQuota} hero={false} focusRef={textareaRef} />
            <p className="mt-2 text-center text-[11px] text-slate-600">Drafts are previews. Production builds are delivered by LevelUp Ecosystem.</p>
          </div>
        </section>

        {showCanvas && (
          <aside className="hidden min-w-0 flex-1 p-3 lg:block" data-testid="studio-canvas">
            <InteractiveCanvas
              project={project}
              html={lastSite?.html || project?.html || null}
              title={project?.title || "New project"}
              isGenerating={generating}
              progressStatus={project?.progress}
              onTitleChange={(t) => project && qc.setQueryData(["project", project.id], { ...project, title: t })}
            />
          </aside>
        )}
      </div>

      {mobilePreview && project && (lastSite?.html || project.html) && (
        <div className="fixed inset-0 z-50 bg-black p-2" data-testid="studio-mobile-preview-modal">
          <InteractiveCanvas project={project} html={lastSite?.html || project.html} title={project.title} isGenerating={false} onClose={() => setMobilePreview(false)} />
        </div>
      )}
    </div>
  );
}
