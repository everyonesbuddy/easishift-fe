import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <GuideTourProvider>
        <App />
      </GuideTourProvider>
    </AuthProvider>
  </StrictMode>,
);
