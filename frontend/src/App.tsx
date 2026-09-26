import { Routes, Route, useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import TemplatesAll from "@/pages/TemplatesAll";
import AuthCallback from "@/pages/AuthCallback";

// The AuthCallback must intercept #session_id BEFORE the normal routes render.
export default function App() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/templates" element={<TemplatesAll />} />
    </Routes>
  );
}
