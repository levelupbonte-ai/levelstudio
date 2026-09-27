import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function SEOHead() {
  const location = useLocation();

  useEffect(() => {
    const isLanding = location.pathname === "/" && !location.hash.includes("session_id=");
    const robotsMeta = document.getElementById("meta-robots") as HTMLMetaElement | null;

    if (isLanding) {
      document.title = "LevelStudio — Free Website Preview Tool";
      if (robotsMeta) {
        robotsMeta.setAttribute("content", "index, follow");
      }
    } else {
      // Internal app screens, preview, workspace, projects, auth stay noindex
      if (robotsMeta) {
        robotsMeta.setAttribute("content", "noindex, nofollow");
      }
      if (location.pathname.startsWith("/preview") || location.pathname.startsWith("/share")) {
        document.title = "Site Preview — LevelStudio";
      } else if (location.pathname.startsWith("/workspace")) {
        document.title = "Workspace — LevelStudio";
      } else if (location.pathname.startsWith("/projects")) {
        document.title = "My Projects — LevelStudio";
      } else if (location.pathname.startsWith("/templates")) {
        document.title = "Templates Gallery — LevelStudio";
      } else if (location.pathname.startsWith("/login")) {
        document.title = "Sign In — LevelStudio";
      }
    }
  }, [location.pathname, location.hash]);

  return null;
}
