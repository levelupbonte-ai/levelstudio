import { ALL_TEMPLATES, type TemplateData } from "./templates.ts";

export interface UserDoc {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
}

export interface UserSessionDoc {
  session_token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

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
  allow_custom?: boolean;
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

export interface ProjectDoc {
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

class InMemoryDb {
  projects = new Map<string, ProjectDoc>();
  users = new Map<string, UserDoc>();
  usersByEmail = new Map<string, string>();
  sessions = new Map<string, UserSessionDoc>();
  templates = new Map<string, TemplateData>();
  usage = new Map<string, number>();

  constructor() {
    this.seedTemplates();
  }

  seedTemplates() {
    for (const t of ALL_TEMPLATES) {
      this.templates.set(t.id, { ...t });
    }
  }

  getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  getUsage(day: string = this.getTodayString()): number {
    return this.usage.get(day) ?? 0;
  }

  incrementUsage(day: string = this.getTodayString()): number {
    const current = this.getUsage(day);
    const updated = current + 1;
    this.usage.set(day, updated);
    return updated;
  }

  migrateAnon(anonId: string, userId: string): number {
    if (!anonId || !userId) return 0;
    let count = 0;
    for (const project of this.projects.values()) {
      if (project.user_id === anonId) {
        project.user_id = userId;
        project.updated_at = new Date().toISOString();
        count++;
      }
    }
    for (const template of this.templates.values()) {
      if (template.owner_id === anonId) {
        template.owner_id = userId;
        count++;
      }
    }
    return count;
  }
}

export const db = new InMemoryDb();
