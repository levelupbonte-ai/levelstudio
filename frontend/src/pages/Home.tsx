import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarCheck,
  Camera,
  Clock,
  Link2,
  Loader2,
  Menu,
  Plus,
  Scissors,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Composer from "@/components/Composer";
import Markdown from "@/components/Markdown";
import QuestionCard from "@/components/QuestionCard";
import SiteDeliveryCard from "@/components/SiteDeliveryCard";
import Sidebar from "@/components/Sidebar";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import type { Attachment, ChatResponse, Message, Project, ProjectSummary, Quota } from "@/lib/types";

const SERVICES = [
  {
    id: "barbershop",
    label: "Barbershop",
    Icon: Scissors,
    prompt:
      "A barbershop website with 24/7 chair booking, barber profiles, price list and local Google Maps visibility.",
  },
  {
    id: "salon",
    label: "Hair & beauty",
    Icon: Sparkles,
    prompt:
      "A hair and beauty salon website with stylist portfolios, a clear price grid and service scheduling.",
  },
  {
    id: "store",
    label: "Online store",
    Icon: ShoppingBag,
    prompt:
      "An online store to sell products and merch, with categories, best sellers and a secure checkout experience.",
  },
  {
    id: "booking",
    label: "Online booking",
    Icon: CalendarCheck,
    prompt:
      "An online booking site to manage appointments, staff and clients with a calendar-style scheduler.",
  },
  {
    id: "restaurant",
    label: "Restaurant & café",
    Icon: UtensilsCrossed,
    prompt:
      "A restaurant website with an interactive mobile menu, table reservation and one-tap GPS directions.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    Icon: Camera,
    prompt:
      "An ultra-fast online portfolio to showcase my work and creations on my own personal brand.",
  },
  {
    id: "creator",
    label: "Creator & media",
    Icon: Link2,
    prompt:
      "A creator site with an independent link-in-bio page, an interactive media kit for brand partnerships and email capture.",
  },
  {
    id: "landing",
    label: "Landing page",
    Icon: Wand2,
    prompt: "A modern, high-converting landing page built to turn visitors into leads.",
  },
  {
    id: "events",
    label: "Events & pop-ups",
    Icon: Clock,
    prompt:
      "An event website with RSVP, ticketing, full schedule and galleries for a pop-up launch weekend.",
  },
];

export default function Home() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const quotaQuery = useQuery({ queryKey: ["quota"], queryFn: () => apiGet<Quota>("/quota") });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiGet<ProjectSummary[]>("/projects"),
  });

  const projectQuery = useQuery({
    queryKey: ["project", activeId],
    queryFn: () => apiGet<Project>(`/projects/${activeId}`),
    enabled: Boolean(activeId),
    // The build runs server-side and outlives any single request: poll while it works.
    refetchInterval: (query) => (query.state.data?.generating ? 2500 : false),
  });

  const chat = useMutation({
    mutationFn: (vars: { text: string; attachments: Attachment[] }) =>
      apiPost<ChatResponse>("/chat", {
        project_id: activeId,
        text: vars.text,
        attachments: vars.attachments,
      }),
    onSuccess: (res) => {
      setPending(null);
      setActiveId(res.project.id);
      qc.setQueryData(["project", res.project.id], res.project);
      qc.setQueryData(["quota"], res.quota);
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      setPending(null);
      if (err instanceof ApiError && err.status === 429) {
        setQuotaOpen(true);
        return;
      }
      const detail =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? String((err.body as { detail?: unknown }).detail ?? "Something went wrong")
          : "Something went wrong";
      toast.error(detail);
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

  // Announce the delivery once, when the background build lands.
  const lastDelivered = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!generating && last?.kind === "site" && lastDelivered.current !== last.id) {
      lastDelivered.current = last.id;
      toast.success("Your site is ready");
      void qc.invalidateQueries({ queryKey: ["projects"] });
    }
  }, [generating, messages, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, busy]);

  const send = (text: string, attachments: Attachment[]) => {
    if (outOfQuota) {
      setQuotaOpen(true);
      return;
    }
    setPending(text || "(attachment)");
    chat.mutate({ text, attachments });
  };

  const startNew = () => {
    setActiveId(null);
    setPending(null);
    setSidebarOpen(false);
  };

  const lastQuestionId = [...messages].reverse().find((m) => m.kind === "questions")?.id ?? null;

  const sidebar = (onSelectExtra?: () => void) => (
    <Sidebar
      projects={projectsQuery.data ?? []}
      loading={projectsQuery.isLoading}
      activeId={activeId}
      onSelect={(id) => {
        setActiveId(id);
        onSelectExtra?.();
      }}
      onDelete={(id) => remove.mutate(id)}
      onNew={startNew}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#0A0A0F] text-slate-100">
      <Toaster richColors />

      <div className="hidden w-[268px] shrink-0 lg:block">{sidebar()}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-sidebar">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] shadow-2xl">
            {sidebar(() => setSidebarOpen(false))}
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b border-white/6 px-4 py-3 lg:px-6"
          data-testid="app-header"
        >
          <div className="flex min-w-0 items-center gap-3">
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
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-slate-300 transition-colors duration-200 hover:border-violet-400/40 hover:text-white"
            data-testid="header-new-project-button"
          >
            <Plus className="size-3.5" /> New
          </button>
        </header>

        {!activeId ? (
          <div
            className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto scroll-slim px-5 py-10"
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
            <div className="relative w-full max-w-[720px] animate-rise-in">
              <h1
                className="text-center font-heading text-[30px] font-semibold leading-[1.15] tracking-tight text-white sm:text-[44px]"
                data-testid="hero-title"
              >
                What are we building today?
              </h1>
              <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-slate-400">
                Tell me about your business. I ask a few sharp questions, then deliver a complete,
                secure, production-ready website — live in your browser.
              </p>

              <div className="mt-8">
                <Composer onSend={send} busy={busy} disabled={outOfQuota} hero />
              </div>

              <div
                className="mt-6 flex flex-wrap justify-center gap-2"
                data-testid="service-catalogue"
              >
                {SERVICES.map(({ id, label, Icon, prompt }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => send(prompt, [])}
                    disabled={busy || outOfQuota}
                    className="group inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[13px] text-slate-400 transition-[border-color,color,transform] duration-200 hover:-translate-y-0.5 hover:border-violet-400/40 hover:text-white disabled:opacity-40"
                    data-testid={`service-${id}`}
                  >
                    <Icon className="size-3.5 text-violet-400/80 transition-colors duration-200 group-hover:text-violet-300" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto scroll-slim px-5 py-8"
              data-testid="chat-stream"
            >
              {projectQuery.isLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" /> Loading project…
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div
                    key={m.id}
                    className="mb-7 flex justify-end"
                    data-testid={`user-message-${m.id}`}
                  >
                    <div className="max-w-[80%] animate-rise-in whitespace-pre-wrap rounded-2xl rounded-br-md bg-white/[0.06] px-4 py-2.5 text-[15px] leading-relaxed text-slate-100">
                      {m.text}
                      {m.attachments.length > 0 && (
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {m.attachments.map((a) => a.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="mb-8" data-testid={`assistant-message-${m.id}`}>
                    {m.kind === "questions" ? (
                      <QuestionCard
                        message={m}
                        locked={m.id !== lastQuestionId}
                        busy={busy}
                        onSubmit={(answer) => send(answer, [])}
                      />
                    ) : m.kind === "site" && m.html ? (
                      <>
                        <Markdown text={m.text} />
                        <SiteDeliveryCard
                          html={m.html}
                          name={m.site_name ?? project?.title ?? "site"}
                          style={m.site_style}
                          messageId={m.id}
                          onRequestChange={() =>
                            composerRef.current?.querySelector("textarea")?.focus()
                          }
                        />
                      </>
                    ) : (
                      <Markdown text={m.text} />
                    )}
                  </div>
                ),
              )}

              {pending && (
                <div className="mb-7 flex justify-end" data-testid="pending-user-message">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white/[0.04] px-4 py-2.5 text-[15px] leading-relaxed text-slate-400">
                    {pending}
                  </div>
                </div>
              )}
              {busy && (
                <div
                  aria-live="polite"
                  className="mb-8 flex items-center gap-2.5 text-[14px]"
                  data-testid="thinking-indicator"
                >
                  <span className="size-2 animate-star-breathe rounded-full bg-violet-400" />
                  <span className="animate-shimmer bg-gradient-to-r from-slate-500 via-white to-slate-500 bg-clip-text text-transparent">
                    Designing your site…
                  </span>
                </div>
              )}
            </div>

            <div
              ref={composerRef}
              className="mx-auto w-full max-w-3xl px-5 pb-5"
              data-testid="chat-composer-wrapper"
            >
              <Composer onSend={send} busy={busy} disabled={outOfQuota} hero={false} />
              <p className="mt-2 text-center text-[11px] text-slate-600">
                Previews are AI-generated drafts reviewed by LevelUp Studio before anything ships.
              </p>
            </div>
          </>
        )}
      </main>

      <Dialog open={quotaOpen} onOpenChange={setQuotaOpen}>
        <DialogContent className="border-white/10 bg-[#101019]" data-testid="quota-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">
              That's enough building for today
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              The studio takes a short break to keep every build sharp. Your projects stay saved —
              open any of them from the sidebar to review its live preview.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={() => setQuotaOpen(false)}
            className="mt-2 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 px-4 py-2.5 text-sm font-medium text-white transition-transform duration-200 active:scale-[0.98]"
            data-testid="quota-modal-close"
          >
            Got it
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
