import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Layout, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import Composer, { type Chip } from "@/components/Composer";
import CreditBadge from "@/components/CreditBadge";
import HeroIntro from "@/components/HeroIntro";
import LevelStudioIcon from "@/components/LevelStudioIcon";
import LevelStudioLogo from "@/components/LevelStudioLogo";
import LoginGate from "@/components/LoginGate";
import ServiceRail, { type Service, SERVICES } from "@/components/ServiceRail";
import TemplateGallery from "@/components/TemplateGallery";
import { ApiError, apiPost } from "@/lib/api";
import { logout, useAuth } from "@/lib/auth";
import type { Attachment, ChatResponse } from "@/lib/types";

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

const STEPS = [
  { n: "01", title: "Describe the business", text: "One sentence is enough. Pick a category, attach a brand visual or your current HTML page if you have one." },
  { n: "02", title: "Answer a few sharp questions", text: "The architect clarifies audience, sections, tone and conversion goal before a single line is written." },
  { n: "03", title: "Review the interactive draft", text: "A complete, responsive single-file website with working navigation, animations and real copy. Share it or request the production build." },
];

const FOOTER_LINKS: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
  { title: "Product", links: [{ label: "Start a draft", href: "/" }, { label: "Templates", href: "/templates" }, { label: "Workspace", href: "/workspace" }] },
  { title: "LevelUp Ecosystem", links: [{ label: "Production builds", href: "https://levelup-ecosystem.com", external: true }, { label: "Contact", href: "https://levelup-ecosystem.com/contact", external: true }] },
  { title: "Resources", links: [{ label: "llms.txt", href: "/llms.txt", external: true }, { label: "Sitemap", href: "/sitemap.xml", external: true }] },
];

export default function HomePage() {
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [picked, setPicked] = useState<Service[]>([]);
  const [template, setTemplate] = useState<string | null>(null);
  const [incomingPrompt, setIncomingPrompt] = useState("");
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handoff from /templates, /workspace and levelup-ecosystem.com (?prompt=&template=&service=)
  useEffect(() => {
    const ss = window.sessionStorage;
    const t = ss.getItem("selected_template");
    if (t) {
      setTemplate(t);
      ss.removeItem("selected_template");
    }
    const openId = ss.getItem("open_project");
    if (openId) {
      ss.removeItem("open_project");
      nav(`/studio/${openId}`, { replace: true });
      return;
    }
    const search = new URLSearchParams(window.location.search);
    const urlPrompt = search.get("prompt") || search.get("brief");
    const urlTemplate = search.get("template") || search.get("template_id");
    const urlService = search.get("service");
    if (urlPrompt) setIncomingPrompt(urlPrompt);
    if (urlTemplate) setTemplate(urlTemplate);
    if (urlService) {
      const found = SERVICES.find((s) => s.id === urlService || s.label.toLowerCase() === urlService.toLowerCase());
      if (found) setPicked([found]);
    }
    const stored = localStorage.getItem("levelup_prompt");
    if (stored) {
      setIncomingPrompt(stored);
      localStorage.removeItem("levelup_prompt");
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "LEVELUP_PROMPT" && event.data.prompt) setIncomingPrompt(String(event.data.prompt));
      if (event.data?.type === "LEVELUP_TEMPLATE" && event.data.templateId) setTemplate(String(event.data.templateId));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nav]);

  const chat = useMutation({
    mutationFn: (vars: { text: string; attachments: Attachment[] }) =>
      apiPost<ChatResponse>("/chat", { project_id: null, text: vars.text, template_id: template, attachments: vars.attachments }),
    onSuccess: (res) => {
      qc.setQueryData(["project", res.project.id], res.project);
      qc.setQueryData(["quota"], res.quota);
      void qc.invalidateQueries({ queryKey: ["projects"] });
      nav(`/studio/${res.project.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setLoginOpen(true);
        return;
      }
      const detail = err instanceof ApiError && err.body && typeof err.body === "object" ? String((err.body as { detail?: unknown }).detail ?? "") : "";
      if (err instanceof ApiError && err.status === 429) {
        setQuotaNotice(detail || "Daily generation allowance reached.");
        return;
      }
      toast.error(detail || "Something went wrong. Please try again.");
    },
  });

  const send = (text: string, attachments: Attachment[]) => {
    const brief = picked.length ? `Industry category: ${picked.map((p) => p.label).join(", ")}.${text ? `\n${text}` : ""}` : text;
    setQuotaNotice(null);
    chat.mutate({ text: brief, attachments });
  };

  const toggleService = (service: Service) => {
    setPicked((prev) => (prev.some((p) => p.id === service.id) ? prev.filter((p) => p.id !== service.id) : [...prev, service]));
    textareaRef.current?.focus();
  };

  const chips: Chip[] = picked.map((p) => ({ id: p.id, label: p.label }));
  const navBtn = "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-slate-300 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white";

  return (
    <div className="min-h-dvh bg-[#0B0B0D] text-slate-100" data-testid="home-page">
      <Toaster richColors />
      <LoginGate open={loginOpen} onClose={() => setLoginOpen(false)} />

      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#0B0B0D]/85 backdrop-blur" data-testid="app-header">
        <div className="mx-auto flex h-[60px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <LevelStudioLogo size="sm" showSubtitle={false} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />

          <nav className="hidden items-center gap-1 sm:flex">
            <button type="button" onClick={() => nav("/templates")} className={navBtn} data-testid="header-templates-link">Templates</button>
            <button type="button" onClick={() => nav("/workspace")} className={navBtn} data-testid="header-workspace-link">Workspace</button>
            <a href="https://levelup-ecosystem.com" target="_blank" rel="noopener noreferrer" className={navBtn} data-testid="header-ecosystem-link">
              LevelUp Ecosystem <ArrowUpRight className="size-3.5" />
            </a>
            <CreditBadge className="ml-2" />
            {authLoading ? null : user ? (
              <div className="ml-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-[12px] font-semibold text-white" data-testid="user-avatar">
                  {user.picture ? <img src={user.picture} alt={user.name} className="size-8 rounded-full object-cover" /> : user.name.slice(0, 1).toUpperCase()}
                </span>
                <button type="button" onClick={() => void logout()} className="grid size-8 place-items-center rounded-full text-slate-400 hover:text-white" title="Sign out" data-testid="logout-button">
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => nav("/login")} className="ml-2 inline-flex h-8 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#0B0B0D] transition-colors hover:bg-slate-200" data-testid="header-signin-button">
                Sign in
              </button>
            )}
          </nav>

          <button type="button" onClick={() => setMenuOpen((o) => !o)} className="grid size-9 place-items-center text-slate-300 sm:hidden" aria-label="Menu" data-testid="mobile-hamburger-button">
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/6 bg-[#0B0B0D] px-5 py-4 sm:hidden" data-testid="mobile-menu">
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => nav("/templates")} className="py-2 text-left text-[15px] text-slate-200" data-testid="mobile-menu-templates">Templates</button>
              <button type="button" onClick={() => nav("/workspace")} className="py-2 text-left text-[15px] text-slate-200" data-testid="mobile-menu-workspace">Workspace</button>
              <a href="https://levelup-ecosystem.com" target="_blank" rel="noopener noreferrer" className="py-2 text-[15px] text-slate-200">LevelUp Ecosystem</a>
              <div className="mt-3 flex items-center justify-between">
                <CreditBadge />
                {user ? (
                  <button type="button" onClick={() => void logout()} className="text-[13px] text-slate-400">Sign out</button>
                ) : (
                  <button type="button" onClick={() => nav("/login")} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[#0B0B0D]" data-testid="mobile-menu-signin">Sign in</button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <section className="flex flex-col items-center pb-10 pt-16 sm:pt-24" data-testid="hero-section">
          <HeroIntro />

          {template && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 px-3.5 py-1 text-[12.5px] text-slate-300" data-testid="hero-selected-template-badge">
              <Layout className="size-3.5 text-slate-400" />
              <span>Starting from template <strong className="text-white">{template}</strong></span>
              <button type="button" onClick={() => setTemplate(null)} className="ml-1 text-slate-400 hover:text-white" aria-label="Remove template">
                <X className="size-3" />
              </button>
            </div>
          )}

          <div className="mt-10 w-full max-w-[760px]">
            <Composer onSend={send} busy={chat.isPending} disabled={false} hero chips={chips} onRemoveChip={(id) => setPicked((p) => p.filter((x) => x.id !== id))} focusRef={textareaRef} initialValue={incomingPrompt} />
            {chat.isPending && (
              <div className="mt-4 flex items-center justify-center gap-2.5 text-[13px] text-slate-400" data-testid="opening-studio-indicator">
                <LevelStudioIcon className="size-4 animate-star-spin" />
                <span>Opening your studio</span>
              </div>
            )}
            {quotaNotice && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center text-[13px] text-amber-100" data-testid="quota-notice">
                {quotaNotice}
              </div>
            )}
          </div>

          <div className="mt-8 w-full max-w-[860px]">
            <ServiceRail selected={picked.map((p) => p.id)} onToggle={toggleService} disabled={chat.isPending} />
          </div>
        </section>

        <section className="grid gap-10 border-t border-white/6 py-20 md:grid-cols-3" data-testid="how-it-works-section">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-mono text-[12px] text-slate-500">{s.n}</span>
              <h3 className="mt-3 font-heading text-[17px] font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{s.text}</p>
            </div>
          ))}
        </section>

        <section className="border-t border-white/6 py-16" data-testid="templates-section">
          <TemplateGallery selected={template} onSelect={setTemplate} disabled={chat.isPending} onSeeAll={() => nav("/templates")} limit={isMobile ? 6 : 12} />
        </section>
      </main>

      <footer className="border-t border-white/6 bg-[#0A0A0B]" data-testid="landing-footer">
        <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <LevelStudioLogo size="md" showSubtitle={false} />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-slate-400">
              The website preview studio of LevelUp Ecosystem. Describe, answer, review — then hand the draft to our team for production.
            </p>
          </div>
          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-slate-300 transition-colors hover:text-white">{l.label}</a>
                    ) : (
                      <button type="button" onClick={() => nav(l.href)} className="text-[14px] text-slate-300 transition-colors hover:text-white">{l.label}</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 pb-10 text-[12.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} LevelStudio · LevelUp Ecosystem</span>
          <a href="https://levelup-ecosystem.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">levelup-ecosystem.com</a>
        </div>
      </footer>
    </div>
  );
}
