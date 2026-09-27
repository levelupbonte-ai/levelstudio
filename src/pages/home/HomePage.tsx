import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Database, FolderKanban, Globe, Layout, Loader2, LogIn, LogOut, Sparkles, Wand2, X } from "lucide-react";
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

export default function HomePage() {
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
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);

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
              ? "Bienvenue — 1 projet synchronisé avec votre compte."
              : `Bienvenue — ${n} projets synchronisés avec votre compte.`,
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
    refetchInterval: 10000,
  });

  const projectQuery = useQuery({
    queryKey: ["project", activeId],
    queryFn: () => apiGet<Project>(`/projects/${activeId}`),
    enabled: Boolean(activeId),
    refetchInterval: (query) => (query.state.data?.generating ? 1500 : false),
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
      void qc.invalidateQueries({ queryKey: ["db-stats"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setLoginReason("Authentifiez-vous pour sauvegarder cette architecture dans votre compte.");
        setLoginOpen(true);
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const detail =
          err.body && typeof err.body === "object"
            ? String((err.body as { detail?: unknown }).detail ?? "")
            : "";
        setQuotaNotice(detail || "Limite quotidienne de compilation atteinte.");
        return;
      }
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? String((err.body as { detail?: unknown }).detail ?? "Une erreur est survenue")
          : "Une erreur est survenue";
      toast.error(detail);
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => apiPost<Project>(`/projects/${id}/stop`),
    onSuccess: (project) => {
      qc.setQueryData(["project", project.id], project);
      toast.success("Génération interrompue");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/projects/${id}`),
    onSuccess: (_d, id) => {
      if (activeId === id) setActiveId(null);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projet supprimé de la base de données");
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
      toast.success("Architecture finalisée avec succès");
      void qc.invalidateQueries({ queryKey: ["projects"] });
      void qc.invalidateQueries({ queryKey: ["db-stats"] });
    }
  }, [generating, lastMessage, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, project?.progress_step, openQuestions]);

  const send = (text: string, attachments: Attachment[]) => {
    if (outOfQuota) {
      setQuotaNotice(
        "Vous avez atteint le quota quotidien du studio. Vos projets restent sauvegardés dans votre espace de travail.",
      );
      return;
    }
    const brief = picked.length
      ? `Secteur d'activité : ${picked.map((p) => p.label).join(", ")}.${text ? `\n${text}` : ""}`
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
        {/* Top Header */}
        <header
          className="flex shrink-0 items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-6"
          data-testid="app-header"
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={startNew}
              className="font-heading text-[16px] font-bold tracking-tight text-white transition-opacity duration-200 hover:opacity-85"
              data-testid="brand-home-button"
            >
              LevelUp<span className="text-violet-400">.Studio</span>
            </button>

            {project && (
              <span
                className="hidden truncate rounded-full border border-white/10 px-3 py-1 text-[12px] text-slate-300 sm:inline-block"
                data-testid="header-project-title"
              >
                {project.title}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => nav("/templates")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            >
              Templates
            </button>

            <button
              type="button"
              onClick={() => nav("/workspace")}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[12.5px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
              data-testid="header-workspace-link"
            >
              <FolderKanban className="size-3.5 text-violet-400" /> Workspace
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
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="size-8 rounded-full border border-white/10 object-cover"
                    data-testid="user-avatar"
                  />
                ) : (
                  <span
                    className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[12px] font-semibold text-white shadow"
                    data-testid="user-avatar"
                  >
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sign out"
                  className="rounded-full p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
                  data-testid="logout-button"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => nav("/login")}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow transition-all hover:bg-violet-500 active:scale-[0.98]"
                data-testid="header-signin-button"
              >
                <LogIn className="size-3.5" /> Sign in
              </button>
            )}
          </div>
        </header>

        {!authLoading && !user && <ReminderBanner />}

        {!activeId ? (
          // ------- Hero + composer + services + gallery -------
          <div
            className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-14 pt-8 sm:px-6"
            data-testid="hero-section"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
              style={{
                background:
                  "radial-gradient(ellipse 65% 100% at 50% 0%, rgba(139,92,246,0.18), transparent 70%)",
              }}
            />
            <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center">
              <h1
                className="text-center font-heading text-[32px] font-bold leading-[1.12] tracking-tight text-white sm:text-[48px]"
                data-testid="hero-title"
              >
                What are we building today?
              </h1>

              <p className="mt-3 max-w-[620px] text-center text-[15px] leading-relaxed text-slate-400 sm:text-[16px]">
                Describe your business or project. Our senior web architect designs, writes, and builds a complete single-file site with real copy and working interactions.
              </p>

              {template && (
                <div
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/10 px-3.5 py-1 text-[12.5px] text-violet-200"
                  data-testid="hero-selected-template-badge"
                >
                  <Sparkles className="size-3.5 text-violet-400" />
                  <span>Starting from: <strong className="text-white">{template}</strong></span>
                  <button
                    type="button"
                    onClick={() => setTemplate(null)}
                    className="ml-1 text-violet-300 hover:text-white"
                    aria-label="Remove template"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {/* Central Composer */}
              <div className="mt-8 w-full">
                <Composer
                  onSend={send}
                  busy={busy}
                  disabled={outOfQuota}
                  hero={true}
                  chips={chips}
                  onRemoveChip={(id) => setPicked((p) => p.filter((x) => x.id !== id))}
                  focusRef={textareaRef}
                />
              </div>

              {/* Service categories */}
              <div className="mt-8 w-full max-w-full">
                <ServiceRail
                  selected={picked.map((p) => p.id)}
                  onToggle={toggleService}
                  disabled={busy}
                />
              </div>

              {/* Quota / budget warning */}
              {quotaNotice && (
                <div
                  className="mt-6 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-200"
                  data-testid="quota-notice"
                >
                  {quotaNotice}
                </div>
              )}

              {/* Templates gallery */}
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
          // ------- Workspace Split Canvas: Chat / Live preview -------
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Chat column */}
            <div
              className={`flex flex-col border-r border-white/6 ${
                canvasVisible ? "w-full lg:w-[480px] xl:w-[540px]" : "w-full max-w-4xl mx-auto"
              }`}
            >
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {messages.map((m) => (
                  <div key={m.id} className="space-y-3">
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl bg-violet-600 px-4 py-3 text-sm text-white shadow-md">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
                          <Sparkles className="size-3.5" /> Architecte Web LevelUp
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#12111E] p-4 text-sm text-slate-200 shadow-md">
                          <Markdown text={m.text} />

                          {m.kind === "site" && m.html && project && (
                            <div className="mt-4 border-t border-white/10 pt-4">
                              <SiteDeliveryCard
                                html={m.html}
                                name={m.site_name ?? project.title ?? "Site"}
                                style={m.site_style}
                                suggestions={m.suggestions ?? []}
                                projectId={project.id}
                                messageId={m.id}
                                onRequestChange={requestChange}
                                onOpenPreview={() => (isDesktop ? void 0 : setMobilePreview(m.id))}
                                compact={isDesktop && m.id === lastSite?.id}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {generating && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4">
                    <BuildProgress
                      step={project?.progress_step ?? 0}
                      pct={project?.progress_pct ?? 1}
                      focus={project?.progress_focus}
                      onStop={() => project && stop.mutate(project.id)}
                      mode="mobile"
                    />
                  </div>
                )}
              </div>

              {/* Bottom input */}
              <div className="border-t border-white/6 p-4">
                {openQuestions && (
                  <div className="mb-3">
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
                  disabled={outOfQuota}
                  hero={false}
                  focusRef={textareaRef}
                />
              </div>
            </div>

            {/* Desktop Live Canvas */}
            {canvasVisible && project && (
              <div className="hidden flex-1 flex-col overflow-hidden bg-black lg:flex p-3">
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
                    name={lastSite.site_name ?? project.title ?? "Site"}
                    projectId={project.id}
                    messageId={lastSite.id}
                    onRequestChange={() => requestChange()}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Fullscreen Preview Modal */}
      {fullscreenSite && fullscreenSite.html && project && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-semibold text-white">Aperçu mobile du site compilé</span>
            <button
              type="button"
              onClick={() => setMobilePreview(null)}
              className="rounded-full p-1 text-slate-400 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="flex-1">
            <PreviewFrame
              html={fullscreenSite.html}
              name={fullscreenSite.site_name ?? project.title ?? "Site"}
              projectId={project.id}
              messageId={fullscreenSite.id}
              onClose={() => setMobilePreview(null)}
              onRequestChange={() => {
                setMobilePreview(null);
                requestChange();
              }}
              fullscreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
