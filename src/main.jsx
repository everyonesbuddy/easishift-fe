import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import HqApp from "./components/HQ/HqApp";
import { AuthProvider } from "./context/AuthContext";
import { GuideTourProvider } from "./context/GuideTourContext";
import { initializeAnalytics, isAnalyticsHost } from "./utils/analytics";

const analyticsDebug =
  import.meta.env.DEV && import.meta.env.VITE_GA_DEBUG === "true";
initializeAnalytics({
  enabled:
    (import.meta.env.PROD && isAnalyticsHost(window.location.hostname)) ||
    analyticsDebug,
  id: import.meta.env.VITE_GA_MEASUREMENT_ID || "G-20LSFMFPL1",
  debug: analyticsDebug,
});

// /hq is WiserShifts' own command center: a separate app with its own
// sign-in, outside the workspace product (no workspace session or menus).
const isHq = window.location.pathname === "/hq" || window.location.pathname.startsWith("/hq/");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isHq ? (
      <HqApp />
    ) : (
      <AuthProvider>
        <GuideTourProvider>
          <App />
        </GuideTourProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
