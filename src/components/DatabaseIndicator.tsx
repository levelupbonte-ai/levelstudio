import { useQuery } from "@tanstack/react-query";
import { Database, CheckCircle2, RefreshCw } from "lucide-react";
import { apiGet } from "@/lib/api";

interface DbStats {
  totalProjects: number;
  totalTemplates: number;
  totalUsers: number;
  totalSessions: number;
  todayUsage: number;
  timestamp: string;
}

export default function DatabaseIndicator() {
  return null;
}

