// Hand-written mirrors of backend/models/architect.py — keep both sides in sync.

export interface Attachment {
  name: string;
  mime: string;
  kind: "image" | "text" | "pdf" | "other";
  data: string;
  scan: "ok" | "unsupported" | "too_large" | "empty";
}

export interface Choice {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  label: string;
  options: Choice[];
  multi: boolean;
  allow_custom: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "questions" | "site" | "refusal" | "error" | "analysis";
  text: string;
  questions: Question[];
  attachments: Attachment[];
  site_name: string | null;
  site_style: string | null;
  suggestions: string[];
  html: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string | null;
  title: string;
  style: string | null;
  html: string | null;
  generating: boolean;
  progress: string | null;
  progress_step: number;
  progress_pct: number;
  progress_focus: string | null;
  template_id: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  style: string | null;
  has_site: boolean;
  updated_at: string;
}

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
  day: string;
  resets_at: string;
}

export interface ChatResponse {
  project: Project;
  quota: Quota;
}

export interface ShareLink {
  url: string;
  path: string;
  expires_at: string;
}

export interface Template {
  id: string;
  name: string;
  tagline: string;
  best_for: string;
  service: string;
  accent: string;
  kind: "starter" | "style" | "import";
  palette: string[];
  fonts: string | null;
  sections: string[];
  brief_prompt: string | null;
  owner_id?: string | null;
  created_at?: string | null;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
}
