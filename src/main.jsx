import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { GuideTourProvider } from "./context/GuideTourContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <GuideTourProvider>
        <App />
      </GuideTourProvider>
    </AuthProvider>
  </StrictMode>,
);
