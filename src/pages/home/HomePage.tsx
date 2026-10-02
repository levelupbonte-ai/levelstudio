import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, ExternalLink, Database, FolderKanban, Globe, Layout, Loader2, LogIn, LogOut, Menu, Sparkles, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import BuildProgress from "@/components/BuildProgress";
import Composer, { type Chip } from "@/components/Composer";
import LoginGate from "@/components/LoginGate";
import Markdown from "@/components/Markdown";
import QuestionWizard from "@/components/QuestionWizard";
import ReminderBanner from "@/components/ReminderBanner";
import ServiceRail, { type Service } from "@/components/ServiceRail";
import SiteDeliveryCard from "@/components/SiteDeliveryCard";
import InteractiveCanvas from "@/components/InteractiveCanvas";
import TemplateGallery from "@/components/TemplateGallery";
import LevelStudioLogo from "@/components/LevelStudioLogo";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import { cn } from "@/lib/utils";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null);

  const toggleFooterSection = (section: string) => {
    setOpenFooterSection((prev) => (prev === section ? null : section));
  };

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
              ? "Welcome — 1 project synced to your account."
              : `Welcome — ${n} projects synced to your account.`,
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
        setLoginReason("Sign in to save this website project to your account.");
        setLoginOpen(true);
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        const detail =
          err.body && typeof err.body === "object"
            ? String((err.body as { detail?: unknown }).detail ?? "")
            : "";
        setQuotaNotice(detail || "Daily preview generation limit reached.");
        return;
      }
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? String((err.body as { detail?: unknown }).detail ?? "An unexpected error occurred")
          : "An unexpected error occurred";
      toast.error(detail);
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) => apiPost<Project>(`/projects/${id}/stop`),
    onSuccess: (project) => {
      qc.setQueryData(["project", project.id], project);
      toast.success("Generation stopped");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/projects/${id}`),
    onSuccess: (_d, id) => {
      if (activeId === id) setActiveId(null);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted from database");
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
      toast.success("Website draft generated successfully");
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
        "You have reached the daily studio quota. Your existing projects remain saved in your workspace.",
      );
      return;
    }
    const brief = picked.length
      ? `Industry category: ${picked.map((p) => p.label).join(", ")}.${text ? `\n${text}` : ""}`
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
              className="flex items-center gap-2 transition-opacity duration-200 hover:opacity-85 text-left"
              data-testid="brand-home-button"
            >
              <LevelStudioLogo size="sm" showSubtitle={true} />
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

          {/* Desktop Navigation Links */}
          <div className="hidden sm:flex shrink-0 items-center gap-2">
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

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-1.5 text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
              data-testid="mobile-hamburger-button"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col sm:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <div className="relative z-10 flex flex-col w-full max-w-[280px] ml-auto h-full bg-[#11101D] border-l border-white/10 shadow-2xl p-5 overflow-y-auto">
              {/* Drawer Top */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <LevelStudioLogo
                  size="sm"
                  showSubtitle={false}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    startNew();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="py-4 space-y-1 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    startNew();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition text-left"
                >
                  <Sparkles className="size-4 text-violet-400 shrink-0" />
                  <span>New project</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    nav("/workspace");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition text-left"
                  data-testid="mobile-menu-workspace"
                >
                  <FolderKanban className="size-4 text-violet-400 shrink-0" />
                  <span>Workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    nav("/templates");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white transition text-left"
                  data-testid="mobile-menu-templates"
                >
                  <Layout className="size-4 text-violet-400 shrink-0" />
                  <span>Templates</span>
                </button>

                <a
                  href="https://levelup-ecosystem.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full block px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition text-left"
                >
                  LevelUp Ecosystem
                </a>
              </div>

              {/* Drawer Auth & Footer */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                {authLoading ? null : user ? (
                  <>
                    <div className="flex items-center gap-3 p-2">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="size-8 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-300 hover:text-red-200 transition"
                    >
                      <LogOut className="size-3.5" />
                      <span>Sign out</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      nav("/login");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition active:scale-[0.98]"
                    data-testid="mobile-menu-signin"
                  >
                    <LogIn className="size-4" />
                    <span>Sign in</span>
                  </button>
                )}

                <p className="pt-2 text-center text-[11px] text-slate-500 leading-tight">
                  LevelStudio is a free tool by LevelUp Ecosystem.
                </p>
              </div>
            </div>
          </div>
        )}

        {!authLoading && !user && <ReminderBanner />}

        {!activeId ? (
          // ------- Hero + composer + services + gallery -------
          <div
            className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-14 pt-8 sm:px-6"
            data-testid="hero-section"
          >
            <div className="relative mx-auto flex w-full max-w-[860px] flex-col items-center">
              <h1
                className="text-center font-heading text-[32px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[48px]"
                data-testid="hero-title"
              >
                See your website before you build it
              </h1>

              <p className="mt-4 max-w-[720px] text-center text-[15px] leading-relaxed text-slate-300 sm:text-[16px]">
                LevelStudio is a free website preview tool developed and maintained by LevelUp Ecosystem. Visitors answer a short guided questionnaire about their business, target audience, and preferred aesthetic. In minutes, LevelStudio generates a complete, interactive single-file website draft with production-grade copywriting, working navigation, and real responsive styling. No account or credit card is required to generate a first preview.
              </p>

              {template && (
                <div
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/10 px-3.5 py-1 text-[12.5px] text-violet-200"
                  data-testid="hero-selected-template-badge"
                >
                  <Layout className="size-3.5 text-violet-400" />
                  <span>Modèle de départ : <strong className="text-white">{template}</strong></span>
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

              {/* How it works section */}
              <section className="mt-16 w-full border-t border-white/8 pt-12 text-left" data-testid="how-it-works-section">
                <div className="text-center max-w-xl mx-auto mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading text-white">How LevelStudio works</h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400">
                    From business brief to live working prototype in minutes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-t border-white/10 pt-4">
                    <span className="text-violet-400 font-mono font-bold text-base block mb-2">01</span>
                    <h3 className="text-[15px] font-bold text-white font-heading mb-1.5">Answer a few questions</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Describe your trade, target market, and preferred tone through our guided questionnaire or quick composer prompts.
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <span className="text-violet-400 font-mono font-bold text-base block mb-2">02</span>
                    <h3 className="text-[15px] font-bold text-white font-heading mb-1.5">See a live preview</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Explore an interactive, high-fidelity draft of your website rendered in real time with working navigation and responsive layout.
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <span className="text-violet-400 font-mono font-bold text-base block mb-2">03</span>
                    <h3 className="text-[15px] font-bold text-white font-heading mb-1.5">Request the real build</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Export your single-file source code or transition seamlessly to LevelUp Ecosystem to build, customize, and deploy your production app.
                    </p>
                  </div>
                </div>
              </section>

              {/* Templates gallery */}
              <div className="mt-16 w-full">
                <TemplateGallery
                  selected={template}
                  onSelect={setTemplate}
                  disabled={busy}
                  onSeeAll={() => nav("/templates")}
                  limit={isMobile ? 6 : 12}
                />
              </div>

              {/* Professional Multi-Column Desktop & Mobile Footer */}
              <footer className="mt-28 w-full border-t border-white/10 pt-16 pb-12 text-slate-400 text-xs" data-testid="landing-footer">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-8 pb-12 border-b border-white/10">
                  {/* Brand & mission column (2 cols on md) */}
                  <div className="md:col-span-2 space-y-4 text-left">
                    <LevelStudioLogo size="md" showSubtitle={true} />
                    <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                      LevelStudio is a free website preview tool developed and maintained by LevelUp Ecosystem. Generate instant, interactive single-file website drafts from guided business briefs.
                    </p>
                    <div className="pt-2">
                      <p className="text-xs text-slate-300 font-medium">
                        LevelStudio is a free tool by{" "}
                        <a
                          href="https://levelup-ecosystem.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors"
                        >
                          LevelUp Ecosystem
                        </a>.
                      </p>
                    </div>
                  </div>

                  {/* Product Column */}
                  <div className="border-b border-white/8 pb-3 md:border-b-0 md:pb-0 text-left">
                    <button
                      type="button"
                      onClick={() => toggleFooterSection("product")}
                      className="w-full flex items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-white md:cursor-default"
                      aria-expanded={openFooterSection === "product"}
                    >
                      <span>Product</span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-slate-400 transition-transform duration-200 md:hidden",
                          openFooterSection === "product" && "rotate-180 text-white"
                        )}
                      />
                    </button>
                    <ul
                      className={cn(
                        "space-y-2.5 text-xs text-slate-400 pt-3 md:pt-3",
                        openFooterSection === "product" ? "block" : "hidden md:block"
                      )}
                    >
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            textareaRef.current?.focus();
                            textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className="hover:text-white transition-colors"
                        >
                          Instant Generator
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => nav("/templates")}
                          className="hover:text-white transition-colors"
                        >
                          Starter Templates
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => nav("/workspace")}
                          className="hover:text-white transition-colors"
                        >
                          Workspace
                        </button>
                      </li>
                      <li>
                        <span className="text-slate-500">Interactive Canvas</span>
                      </li>
                      <li>
                        <span className="text-slate-500">Single-File Code Export</span>
                      </li>
                    </ul>
                  </div>

                  {/* Ecosystem Column */}
                  <div className="border-b border-white/8 pb-3 md:border-b-0 md:pb-0 text-left">
                    <button
                      type="button"
                      onClick={() => toggleFooterSection("ecosystem")}
                      className="w-full flex items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-white md:cursor-default"
                      aria-expanded={openFooterSection === "ecosystem"}
                    >
                      <span>Ecosystem</span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-slate-400 transition-transform duration-200 md:hidden",
                          openFooterSection === "ecosystem" && "rotate-180 text-white"
                        )}
                      />
                    </button>
                    <ul
                      className={cn(
                        "space-y-2.5 text-xs text-slate-400 pt-3 md:pt-3",
                        openFooterSection === "ecosystem" ? "block" : "hidden md:block"
                      )}
                    >
                      <li>
                        <a
                          href="https://levelup-ecosystem.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          LevelUp Ecosystem
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://levelup-ecosystem.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          Production Web Builds
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://levelup-ecosystem.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          Enterprise Solutions
                        </a>
                      </li>
                      <li>
                        <a
                          href="https://levelup-ecosystem.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          Support & Advisory
                        </a>
                      </li>
                    </ul>
                  </div>

                  {/* Architecture & Legal Column */}
                  <div className="border-b border-white/8 pb-3 md:border-b-0 md:pb-0 text-left">
                    <button
                      type="button"
                      onClick={() => toggleFooterSection("about")}
                      className="w-full flex items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-white md:cursor-default"
                      aria-expanded={openFooterSection === "about"}
                    >
                      <span>About</span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-slate-400 transition-transform duration-200 md:hidden",
                          openFooterSection === "about" && "rotate-180 text-white"
                        )}
                      />
                    </button>
                    <ul
                      className={cn(
                        "space-y-2.5 text-xs text-slate-400 pt-3 md:pt-3",
                        openFooterSection === "about" ? "block" : "hidden md:block"
                      )}
                    >
                      <li>
                        <a
                          href="/llms.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          llms.txt Specification
                        </a>
                      </li>
                      <li>
                        <a
                          href="/sitemap.xml"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          Sitemap
                        </a>
                      </li>
                      <li>
                        <span className="text-slate-500">No account required for preview</span>
                      </li>
                      <li>
                        <span className="text-slate-500">Client-ready deliverables</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>© {new Date().getFullYear()} LevelStudio.</span>
                    <span>All rights reserved.</span>
                    <span className="hidden sm:inline">·</span>
                    <span>Built and maintained by LevelUp Ecosystem.</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400">
                    <a
                      href="https://levelup-ecosystem.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-300 transition-colors"
                    >
                      levelup-ecosystem.com
                    </a>
                  </div>
                </div>
              </footer>
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
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2 px-1">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 grid place-items-center text-white shadow-sm shadow-violet-500/30">
                              <LevelStudioIcon className="size-3.5" />
                            </div>
                            <span className="text-xs font-bold text-white tracking-tight">LevelStudio</span>
                            <span className="rounded-full bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                              Lead Architecte Web
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            Certifié LevelUp
                          </span>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#12111E]/95 p-5 text-sm text-slate-200 shadow-xl backdrop-blur-sm">
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
              <div className="hidden flex-1 flex-col overflow-hidden bg-[#0A0A0F] lg:flex p-3">
                <InteractiveCanvas
                  project={project}
                  html={lastSite?.html || project.html || null}
                  title={project.title || "Interactive Canvas - My Sites & Shortcuts"}
                  isGenerating={generating}
                  progressStep={project.progress_step ?? 0}
                  progressPct={project.progress_pct ?? 1}
                  progressStatus={project.progress}
                  onTitleChange={(newTitle) => {
                    project.title = newTitle;
                    qc.setQueryData(["project", project.id], { ...project });
                  }}
                  onClose={() => setActiveId(null)}
                  onRequestChange={() => requestChange()}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Fullscreen Preview Modal */}
      {fullscreenSite && fullscreenSite.html && project && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black p-2 sm:p-4">
          <InteractiveCanvas
            project={project}
            html={fullscreenSite.html}
            title={fullscreenSite.site_name ?? project.title ?? "Interactive Canvas"}
            isGenerating={false}
            onClose={() => setMobilePreview(null)}
            onRequestChange={() => {
              setMobilePreview(null);
              requestChange();
            }}
          />
        </div>
      )}
    </div>
  );
}
