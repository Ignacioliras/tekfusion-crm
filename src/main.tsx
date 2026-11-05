import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@sentry/react";
import "./index.css";
import App from "./App.tsx";
import { initSentry } from "./lib/sentry";

// After a new deploy, the service worker may replace its pre-cache while
// the page still holds old chunk references. A reload picks up the new
// HTML + new SW cache. A sessionStorage guard prevents infinite loops.
// See https://vite.dev/guide/build.html#load-error-handling
window.addEventListener("vite:preloadError", () => {
  const key = "chunk-reload";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
});

// Off unless VITE_SENTRY_DSN is set (only in the cloud).
const isSentryEnabled = initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isSentryEnabled ? (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    ) : (
      <App />
    )}
  </StrictMode>,
);
