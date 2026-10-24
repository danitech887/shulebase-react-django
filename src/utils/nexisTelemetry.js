import axios from "axios";

// Public Nexis Tunnel URL (or environment variable VITE_NEXIS_URL)
const NEXIS_INGEST_URL =
  import.meta.env.VITE_NEXIS_URL || "https://salty-breads-talk.loca.lt/api/v1/telemetry/events";

/**
 * Sends a telemetry event to the Nexis engine via the public tunnel.
 * Uses fire-and-forget so user experience in ShuleBase is never affected.
 */
export function sendToNexis(level = "INFO", tag = "User.Action", message = "", metadata = {}) {
  try {
    fetch(NEXIS_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true",
      },
      body: JSON.stringify({
        system_id: "shulebase-frontend",
        software_id: "shulebase",
        level: level,
        tag: tag,
        message: message,
        metadata: metadata,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Ignore network failures if tunnel or backend is offline
    });
  } catch (e) {
    // Fail silently in production
  }
}

/**
 * Attaches request and response interceptors to an Axios instance.
 * Automatically logs endpoint, HTTP status, and roundtrip latency.
 */
export function setupAxiosTelemetry(axiosInstance = axios) {
  if (!axiosInstance || !axiosInstance.interceptors) return;

  axiosInstance.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      try {
        const elapsed = Date.now() - (response.config.metadata?.startTime || Date.now());
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userEmail = user.email || user.username || "Authenticated User";
        const method = response.config.method?.toUpperCase() || "GET";
        const url = response.config.url || "";

        sendToNexis(
          "INFO",
          "User.API",
          `[${userEmail}] ${method} ${url} -> ${response.status} (${elapsed}ms)`,
          { status: response.status, elapsed, method, url }
        );
      } catch (err) {}
      return response;
    },
    (error) => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userEmail = user.email || user.username || "User";
        const method = error.config?.method?.toUpperCase() || "REQ";
        const url = error.config?.url || "endpoint";
        const status = error.response?.status || "NET_ERR";

        sendToNexis(
          "ERROR",
          "User.Error",
          `[${userEmail}] ${method} ${url} failed (${status}): ${error.message}`,
          { status, method, url, error: error.message }
        );
      } catch (err) {}
      return Promise.reject(error);
    }
  );
}

// Rolling reproduction breadcrumb trail (actions leading up to any error)
const breadcrumbs = [];

export function addBreadcrumb(type, text) {
  try {
    breadcrumbs.push({
      type,
      text,
      url: window.location.pathname || "/",
      time: new Date().toISOString(),
    });
    if (breadcrumbs.length > 20) breadcrumbs.shift();
  } catch (e) {}
}

/**
 * Intercepts client-side React Router navigation (history.pushState, popstate, links)
 * so every page and menu click is recorded in real time.
 */
export function initNavigationTelemetry() {
  if (typeof window === "undefined" || !window.history) return;

  // Intercept history.pushState (React Router navigate())
  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args) {
    originalPushState.apply(this, args);
    try {
      const path = window.location.pathname + window.location.search;
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userEmail = user.email || user.username || "Guest";
      addBreadcrumb("nav", `Navigated to ${path}`);
      sendToNexis("INFO", "User.Nav", `[${userEmail}] Navigated to ${path}`, { path });
    } catch (e) {}
  };

  // Intercept back / forward buttons
  window.addEventListener("popstate", () => {
    try {
      const path = window.location.pathname + window.location.search;
      addBreadcrumb("nav", `Navigated (popstate) to ${path}`);
      sendToNexis("INFO", "User.Nav", `Navigated (popstate) to ${path}`, { path });
    } catch (e) {}
  });

  // Log initial session start
  try {
    const currentPath = window.location.pathname || "/";
    addBreadcrumb("session", `Session initialized at ${currentPath}`);
    sendToNexis("INFO", "User.Session", `Active session initialized at ${currentPath}`);
  } catch (e) {}
}

/**
 * Real User Monitoring (RUM): Tracks button clicks, tabs, forms, and UI actions.
 */
export function initUserActionTelemetry() {
  if (typeof window === "undefined") return;

  window.addEventListener(
    "click",
    (event) => {
      try {
        const target = event.target?.closest("button, a, [role='button'], input[type='submit'], select, .tab, .menu-item");
        if (target) {
          const rawText = target.innerText?.trim() || "";
          const label =
            rawText.slice(0, 35) ||
            target.getAttribute("aria-label") ||
            target.getAttribute("title") ||
            target.getAttribute("name") ||
            target.tagName.toLowerCase();
          const targetType = target.tagName.toLowerCase();
          const path = window.location.pathname || "/";
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          const userEmail = user.email || user.username || "User";

          addBreadcrumb("click", `Clicked ${targetType} "${label}"`);
          sendToNexis(
            "INFO",
            "User.Action",
            `[${userEmail}] Clicked ${targetType} "${label}" on ${path}`,
            {
              element: targetType,
              label,
              path,
              id: target.id || undefined,
            }
          );
        }
      } catch (e) {}
    },
    true
  );
}

/**
 * Catches unhandled browser exceptions and promise rejections with reproduction breadcrumbs.
 */
export function initGlobalErrorLogging() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    sendToNexis(
      "ERROR",
      "UI.Crash",
      `Unhandled UI Error: ${event.message} at ${event.filename || "app"}:${event.lineno || 0}`,
      {
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        breadcrumbs: [...breadcrumbs],
      }
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendToNexis(
      "ERROR",
      "Promise.Reject",
      `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
      { reason: String(event.reason), breadcrumbs: [...breadcrumbs] }
    );
  });
}

// Auto-initialize on import
setupAxiosTelemetry(axios);
initNavigationTelemetry();
initUserActionTelemetry();
initGlobalErrorLogging();
