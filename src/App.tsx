import { Routes, Route, useLocation } from "react-router-dom";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import TemplatesPage from "@/pages/templates";
import WorkspacePage from "@/pages/workspace";
import ProjectsPage from "@/pages/projects";
import PreviewPage from "@/pages/preview";
import AuthCallbackPage from "@/pages/auth-callback";

export default function App() {
  const location = useLocation();

  // The AuthCallback must intercept #session_id BEFORE the normal routes render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallbackPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/templates/:templateId" element={<TemplatesPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/preview/:projectId" element={<PreviewPage />} />
      <Route path="/share/:token" element={<PreviewPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
    </Routes>
  );
}
