import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Loader2, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import BuildProgress from "@/components/BuildProgress";
import Composer, { type Chip } from "@/components/Composer";
import LoginGate from "@/components/LoginGate";
import Markdown from "@/components/Markdown";
import QuestionWizard from "@/components/QuestionWizard";
import ReminderBanner from "@/components/ReminderBanner";
import ServiceRail, { type Service } from "@/components/ServiceRail";
import SiteDeliveryCard, { PreviewFrame } from "@/components/SiteDeliveryCard";
import TemplateGallery from "@/components/TemplateGallery";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import { logout, useAuth } from "@/lib/auth";
import type {
  Attachment,
  ChatResponse,
  Message,
  Project,
  ProjectSummary,
  Quota,
} from "@/lib/types";

function useIsDesktop() {
  const [wide, setWide] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return wide;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

export default function Home() {
  const nav = useNavigate();
  const isDesktop = useIsDesktop();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Service[]>([]);
  const [template, setTemplate] = useState<string | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginReason, setLoginReason] = useState<string | undefined>(undefined);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null); // messageId of site to fullscreen on mobile

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore a template picked from /templates
  useEffect(() => {
    try {
      const t = window.sessionStorage.getItem("selected_template");
      if (t) {
        setTemplate(t);
        window.sessionStorage.removeItem("selected_template");
      }
      const openId = window.sessionStorage.getItem("open_project");
      if (openId) {
        setActiveId(openId);
        window.sessionStorage.removeItem("open_project");
      }
      const migrated = window.sessionStorage.getItem("levelup_migrated");
      if (migrated) {
        const n = parseInt(migrated, 10);
        if (n > 0) {
          toast.success(
            n === 1
              ? "Welcome back — 1 project moved to your account."
              : `Welcome back — ${n} projects moved to your account.`,
          );
        }
        window.sessionStorage.removeItem("levelup_migrated");
      }
    } catch {
      // ignore
    }
  }, []);

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
      qc.setQueryData(["project", res.project.id], res.project);
      qc.setQueryData(["quota"], res.quota);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setLoginReason("Sign in to save this build and share it later.");
        setLoginOpen(true);
        return;
      }
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
  const canvasVisible = isDesktop && (generating || Boolean(lastSite));
  const fullscreenSite =
    mobilePreview && messages.find((m) => m.id === mobilePreview && m.kind === "site" && m.html);

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
        "We have reached the studio's build budget for today. Your projects stay saved in your workspace, so you can keep reviewing every preview and share link. Come back tomorrow, or contact LevelUp Studio to turn one of them into your real website right away.",
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
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0A0A0F] text-slate-100">
      <Toaster richColors />
      <LoginGate open={loginOpen} onClose={() => setLoginOpen(false)} reason={loginReason} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Slim top bar — no sidebar on PC per spec, brand + auth on the right. */}
        <header
          className="flex shrink-0 items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-6"
          data-testid="app-header"
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={startNew}
              className="font-heading text-[16px] font-semibold tracking-tight text-white transition-opacity duration-200 hover:opacity-80"
              data-testid="brand-home-button"
            >
              LevelUp<span className="text-violet-400">Studio</span>
            </button>
            {project && (
              <span
                className="hidden truncate rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-400 sm:inline-block"
                data-testid="header-project-title"
              >
                {project.title}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid="header-workspace-link"
            >
              <FolderKanban className="size-3.5" /> Workspace
            </button>
            {activeId && (
              <button
                type="button"
                onClick={startNew}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
                data-testid="header-new-project-button"
              >
                + New
              </button>
            )}
            {authLoading ? null : user ? (
              <div className="flex items-center gap-2">
                {projectsQuery.data && projectsQuery.data.length > 0 && !activeId && (
                  <select
                    className="hidden max-w-[180px] truncate rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-[12.5px] text-slate-300 sm:inline-block"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setActiveId(e.target.value);
                    }}
                    data-testid="header-projects-dropdown"
                  >
                    <option value="">My projects</option>
                    {projectsQuery.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                )}
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="size-8 rounded-full border border-white/10 object-cover"
                    data-testid="user-avatar"
                  />
                ) : (
                  <span
                    className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-[12px] font-semibold text-white"
                    data-testid="user-avatar"
                  >
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  className="rounded-full p-1.5 text-slate-500 hover:text-slate-200"
                  data-testid="logout-button"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="rounded-full bg-white px-4 py-1.5 text-[12.5px] font-semibold text-slate-900 transition-transform duration-200 active:scale-[0.98]"
                data-testid="header-signin-button"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        {!authLoading && !user && <ReminderBanner />}

        {!activeId ? (
          // ------- Hero + composer + services + gallery -------
          <div
            className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-14 pt-10 sm:px-6"
            data-testid="hero-section"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
              style={{
                background:
                  "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(124,58,237,0.16), transparent 70%)",
              }}
            />
            <div className="relative mx-auto flex w-full max-w-[820px] flex-col items-center">
              <h1
                className="mt-2 text-center font-heading text-[30px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[46px]"
                data-testid="hero-title"
              >
                What are we building today?
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-center text-[14.5px] leading-relaxed text-slate-400 sm:text-[15.5px]">
                Tell me about your business. I analyse your brief, ask a few sharp questions, then
                deliver a complete website you can preview and share.
              </p>

              {quotaNotice && (
                <div
                  className="mt-6 w-full rounded-2xl border border-white/10 bg-[#12121c] p-4"
                  data-testid="quota-notice"
                >
                  <Markdown text={quotaNotice} />
                </div>
              )}

              <div className="mt-8 w-full">
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

              <div className="mt-5 w-full">
                <ServiceRail
                  selected={picked.map((p) => p.id)}
                  onToggle={toggleService}
                  disabled={busy}
                />
              </div>

              <div className="mt-14 w-full">
                <TemplateGallery
                  selected={template}
                  onSelect={setTemplate}
                  disabled={busy}
                  onSeeAll={() => nav("/templates")}
                  limit={isMobile ? 6 : 12}
                />
              </div>
            </div>
          </div>
        ) : (
          // ------- Active project: chat column (+ canvas on desktop) -------
          <div className="flex min-h-0 flex-1">
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
                    <div
                      key={m.id}
                      className="mb-8"
                      data-testid={`assistant-message-${m.id}`}
                    >
                      {m.kind === "analysis" && (
                        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-violet-300">
                          <span className="size-1.5 rounded-full bg-violet-400" />
                          Understanding your brief
                        </div>
                      )}
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
                          onOpenPreview={() =>
                            isDesktop ? void 0 : setMobilePreview(m.id)
                          }
                          compact={isDesktop && m.id === lastSite?.id}
                        />
                      )}
                      {m.kind === "questions" && m.id !== openQuestions?.id && (
                        <p className="mt-2 text-[12px] text-slate-500">Answers sent.</p>
                      )}
                    </div>
                  ),
                )}

                {busy && !canvasVisible && (
                  <div className="mb-8" aria-live="polite">
                    <BuildProgress
                      step={project?.progress_step ?? 0}
                      pct={project?.progress_pct ?? 1}
                      focus={project?.progress_focus}
                      onStop={() => project && stop.mutate(project.id)}
                      mode="mobile"
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

            {canvasVisible && project && (
              <aside
                className="hidden min-h-0 w-[52%] shrink-0 flex-col border-l border-white/6 p-3 lg:flex"
                data-testid="site-canvas"
              >
                {generating || !lastSite?.html ? (
                  <BuildProgress
                    step={project.progress_step ?? 0}
                    pct={project.progress_pct ?? 1}
                    focus={project.progress_focus}
                    onStop={() => stop.mutate(project.id)}
                    mode="desktop"
                  />
                ) : (
                  <PreviewFrame
                    html={lastSite.html}
                    name={lastSite.site_name ?? project.title ?? "site"}
                    projectId={project.id}
                    messageId={lastSite.id}
                    onRequestChange={() => requestChange()}
                  />
                )}
              </aside>
            )}

            {activeId && !generating && !isDesktop && lastSite && !mobilePreview && (
              <button
                type="button"
                onClick={() => remove.mutate(project!.id)}
                aria-label="Delete project"
                className="fixed bottom-24 right-4 z-30 hidden rounded-full border border-white/10 bg-[#12121c] p-2 text-slate-500 shadow-lg hover:text-red-300 sm:block"
                data-testid="delete-project-button"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
      </main>

      {/* Mobile / non-desktop fullscreen preview */}
      {fullscreenSite && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#07070c] p-2 sm:p-4"
          data-testid="mobile-preview-overlay"
        >
          <PreviewFrame
            html={fullscreenSite.html!}
            name={fullscreenSite.site_name ?? project?.title ?? "site"}
            projectId={project!.id}
            messageId={fullscreenSite.id}
            onClose={() => setMobilePreview(null)}
            onRequestChange={() => {
              setMobilePreview(null);
              requestChange();
            }}
            fullscreen
          />
        </div>
      )}
    </div>
  );
}
