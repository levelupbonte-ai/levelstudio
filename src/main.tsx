import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

// Capture external prompts/templates from levelup-ecosystem.com (via query params or postMessage)
function captureExternalPayload() {
  try {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt") || params.get("brief");
    const templateId = params.get("template") || params.get("template_id");
    const origin = params.get("from") || "";
    if (prompt || templateId) {
      sessionStorage.setItem(
        "levelup_handoff",
        JSON.stringify({ prompt: prompt || "", templateId: templateId || "", origin, at: Date.now() })
      );
    }
  } catch { /* ignore */ }

  window.addEventListener("message", (ev) => {
    const allowed = ["https://levelup-ecosystem.com", "https://www.levelup-ecosystem.com"];
    if (!allowed.includes(ev.origin)) return;
    const d = ev.data || {};
    if (d && d.type === "levelup:handoff" && (d.prompt || d.templateId)) {
      sessionStorage.setItem(
        "levelup_handoff",
        JSON.stringify({ prompt: d.prompt || "", templateId: d.templateId || "", origin: ev.origin, at: Date.now() })
      );
      window.dispatchEvent(new CustomEvent("levelup:handoff", { detail: d }));
    }
  });
}
captureExternalPayload();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
