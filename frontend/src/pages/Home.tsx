import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Menu, PanelRightClose, Plus } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import BuildProgress from "@/components/BuildProgress";
import Composer, { type Chip } from "@/components/Composer";
import Markdown from "@/components/Markdown";
import QuestionWizard from "@/components/QuestionWizard";
import ServiceRail, { type Service } from "@/components/ServiceRail";
import SiteDeliveryCard, { PreviewFrame } from "@/components/SiteDeliveryCard";
import Sidebar from "@/components/Sidebar";
import TemplateGallery from "@/components/TemplateGallery";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import type { Attachment, ChatResponse, Message, Project, ProjectSummary, Quota } from "@/lib/types";

/** The side canvas is a desktop affordance: on a phone the preview opens full screen instead. */
function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 1280);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1280);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return wide;
}

export default function Home() {
  const isWide = useIsWide();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [picked, setPicked] = useState<Service[]>([]);
  const [template, setTemplate] = useState<string | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quotaQuery = useQuery({ queryKey: ["quota"], queryFn: () => apiGet<Quota>("/quota") });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<ProjectSummary[]>("/projects"),
  });

  const projectQuery = useQuery({
    queryKey: ["project", activeId],
    queryFn: () => apiGet<Project>(`/projects/${activeId}`),
    enabled: Boolean(activeId),
    refetchInterval: (query) => (query.state.data?.generating ? 2000 : false),
  });

  const chat = useMutation({
    mutationFn: (vars: { text: string; attachments: Attachment[] }) =>
      apiPost<ChatResponse>("/chat", {
        project_id: activeId,
        text: vars.text,
        template_id: template,
        attachments: vars.attachments,
      }),
    onSuccess: (res) => {
      setPicked([]);
      setActiveId(res.project.id);
      setCanvasOpen(true);
      qc.setQueryData(["project", res.project.id], res.project);
      qc.setQueryData(["quota"], res.quota);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 429) {
        const detail =
          err.body && typeof err.body === "object"
            ? String((err.body as { detail?: unknown }).detail ?? "")
            : "";
        setQuotaNotice(detail || "We have reached the studio's build budget for today.");
        return;
      }
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? String((err.body as { detail?: unknown }).detail ?? "Something went wrong")
          : "Something went wrong";
      toast.error(detail);
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => apiPost<Project>(`/projects/${id}/stop`),
    onSuccess: (project) => {
      qc.setQueryData(["project", project.id], project);
      toast.success("Build stopped");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/projects/${id}`),
    onSuccess: (_d, id) => {
      if (activeId === id) setActiveId(null);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
  });

  const quota = quotaQuery.data ?? null;
  const outOfQuota = quota ? quota.remaining <= 0 : false;
  const project = projectQuery.data ?? null;
  const messages: Message[] = project?.messages ?? [];
  const generating = Boolean(project?.generating);
  const busy = chat.isPending || generating;
  const lastMessage = messages[messages.length - 1];
  const openQuestions =
    !generating && lastMessage?.role === "assistant" && lastMessage.kind === "questions"
      ? lastMessage
      : null;
  const lastSite = [...messages].reverse().find((m) => m.kind === "site" && m.html) ?? null;
  const showCanvas = isWide && canvasOpen && (generating || Boolean(lastSite));

  const delivered = useRef<string | null>(null);
  useEffect(() => {
    if (!generating && lastMessage?.kind === "site" && delivered.current !== lastMessage.id) {
      delivered.current = lastMessage.id;
      toast.success("Your site is ready");
      void qc.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [generating, lastMessage, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, project?.progress_step, openQuestions]);

  const send = (text: string, attachments: Attachment[]) => {
    if (outOfQuota) {
      setQuotaNotice(
        "We have reached the studio's build budget for today. Your projects stay saved in the sidebar, so you can keep reviewing every preview and share link. Come back tomorrow, or contact LevelUp Studio to turn one of them into your real website right away.",
      );
      return;
    }
    const brief = picked.length
      ? `Project type: ${picked.map((p) => p.label).join(", ")}.${text ? `\n${text}` : ""}`
      : text;
    setQuotaNotice(null);
    chat.mutate({ text: brief, attachments });
  };

  const requestChange = (preset?: string) => {
    if (preset) {
      send(preset, []);
      return;
    }
    textareaRef.current?.focus();
  };

  const toggleService = (service: Service) => {
    setPicked((prev) =>
      prev.some((p) => p.id === service.id)
        ? prev.filter((p) => p.id !== service.id)
        : [...prev, service],
    );
    textareaRef.current?.focus();
  };

  const chips: Chip[] = picked.map((p) => ({ id: p.id, label: p.label }));

  const startNew = () => {
    setActiveId(null);
    setPicked([]);
    setTemplate(null);
    setQuotaNotice(null);
    setSidebarOpen(false);
  };

  const sidebar = (afterSelect?: () => void) => (
    <Sidebar
      projects={projectsQuery.data ?? []}
      loading={projectsQuery.isLoading}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        setCanvasOpen(true);
        afterSelect?.();
      }}
      onDelete={(id) => remove.mutate(id)}
      onNew={startNew}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0A0A0F] text-slate-100">
      <Toaster richColors />

      <div className="hidden w-[262px] shrink-0 lg:block">{sidebar()}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-sidebar">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <div className="absolute inset-y-0 left-0 w-[288px] max-w-[86vw] shadow-2xl">
            {sidebar(() => setSidebarOpen(false))}
          </div>
        </div>
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center justify-between gap-3 border-b border-white/6 px-3 py-3 sm:px-5"
          data-testid="app-header"
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-slate-400 hover:text-white lg:hidden"
              aria-label="Open sidebar"
              data-testid="sidebar-open-button"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-heading text-[15px] font-semibold tracking-tight text-white lg:hidden">
              LevelUp<span className="text-violet-400">Studio</span>
            </span>
            <p
              className="hidden truncate text-[13px] text-slate-400 lg:block"
              data-testid="header-project-title"
            >
              {project ? project.title : "Senior web architect"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(generating || lastSite) && (
              <button
                type="button"
                onClick={() => setCanvasOpen((v) => !v)}
                className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white xl:inline-flex"
                data-testid="toggle-canvas-button"
              >
                <PanelRightClose className="size-3.5" />
                {showCanvas ? "Hide canvas" : "Show canvas"}
              </button>
            )}
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid="header-new-project-button"
            >
              <Plus className="size-3.5" /> New
            </button>
          </div>
        </header>

        {!activeId ? (
          <div
            className="no-scrollbar relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-8 sm:px-6"
            data-testid="hero-section"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
              style={{
                background:
                  "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(124,58,237,0.16), transparent 70%)",
              }}
            />
            <div className="relative mx-auto w-full max-w-[720px]">
              <h1
                className="text-center font-heading text-[26px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[42px]"
                data-testid="hero-title"
              >
                What are we building today?
              </h1>
              <p className="mx-auto mt-3 max-w-md text-center text-[14px] leading-relaxed text-slate-400 sm:text-[15px]">
                Tell me about your business. I ask a few questions, then deliver a complete website
                you can preview and share.
              </p>

              {quotaNotice && (
                <div
                  className="mt-6 rounded-2xl border border-white/10 bg-[#12121c] p-4"
                  data-testid="quota-notice"
                >
                  <Markdown text={quotaNotice} />
                </div>
              )}

              <div className="mt-7">
                <Composer
                  onSend={send}
                  busy={busy}
                  disabled={false}
                  hero
                  chips={chips}
                  onRemoveChip={(id) => setPicked((p) => p.filter((s) => s.id !== id))}
                  focusRef={textareaRef}
                />
              </div>

              <div className="mt-5">
                <ServiceRail
                  selected={picked.map((p) => p.id)}
                  onToggle={toggleService}
                  disabled={busy}
                />
              </div>

              <div className="mt-8">
                <TemplateGallery selected={template} onSelect={setTemplate} disabled={busy} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* Conversation column */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                ref={scrollRef}
                className="no-scrollbar mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-5"
                data-testid="chat-stream"
              >
                {projectQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" /> Loading project
                  </div>
                )}

                {messages.map((m) =>
                  m.role === "user" ? (
                    <div
                      key={m.id}
                      className="mb-7 flex justify-end"
                      data-testid={`user-message-${m.id}`}
                    >
                      {/* User answers stay regular weight, unlike the architect's bold questions. */}
                      <div className="max-w-[85%] animate-rise-in whitespace-pre-wrap rounded-2xl rounded-br-md bg-white/[0.05] px-4 py-2.5 text-[14px] font-normal leading-relaxed text-slate-300">
                        {m.text}
                        {m.attachments.length > 0 && (
                          <span className="mt-1 block text-[11px] text-slate-500">
                            {m.attachments.map((a) => a.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="mb-8" data-testid={`assistant-message-${m.id}`}>
                      <Markdown text={m.text} />
                      {m.kind === "site" && m.html && (
                        <SiteDeliveryCard
                          html={m.html}
                          name={m.site_name ?? project?.title ?? "site"}
                          style={m.site_style}
                          suggestions={m.suggestions ?? []}
                          projectId={project!.id}
                          messageId={m.id}
                          onRequestChange={requestChange}
                          showPreviewButton={!showCanvas || m.id !== lastSite?.id}
                        />
                      )}
                      {m.kind === "questions" && m.id !== openQuestions?.id && (
                        <p className="mt-2 text-[12px] text-slate-500">Answers sent.</p>
                      )}
                    </div>
                  ),
                )}

                {busy && !showCanvas && (
                  <div className="mb-8" aria-live="polite">
                    <BuildProgress
                      step={project?.progress_step ?? 0}
                      pct={project?.progress_pct ?? 1}
                      onStop={() => project && stop.mutate(project.id)}
                      compact
                    />
                  </div>
                )}

                {quotaNotice && (
                  <div
                    className="mb-8 rounded-2xl border border-white/10 bg-[#12121c] p-4"
                    data-testid="quota-notice"
                  >
                    <Markdown text={quotaNotice} />
                  </div>
                )}
              </div>

              <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-5">
                {openQuestions && (
                  <div className="mb-2">
                    <QuestionWizard
                      message={openQuestions}
                      busy={busy}
                      onSubmit={(answer) => send(answer, [])}
                    />
                  </div>
                )}
                <Composer
                  onSend={send}
                  onStop={() => project && stop.mutate(project.id)}
                  busy={busy}
                  disabled={false}
                  hero={false}
                  focusRef={textareaRef}
                />
              </div>
            </div>

            {/* Canvas column: the site as it is being built, live */}
            {showCanvas && (
              <aside
                className="hidden min-h-0 w-[48%] shrink-0 flex-col border-l border-white/6 p-3 xl:flex"
                data-testid="site-canvas"
              >
                {generating || !lastSite?.html ? (
                  <BuildProgress
                    step={project?.progress_step ?? 0}
                    pct={project?.progress_pct ?? 1}
                    onStop={() => project && stop.mutate(project.id)}
                  />
                ) : (
                  <PreviewFrame
                    html={lastSite.html}
                    name={lastSite.site_name ?? project?.title ?? "site"}
                    messageId={lastSite.id}
                  />
                )}
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
