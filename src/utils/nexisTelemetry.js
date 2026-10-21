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
        system_id: "shulebase-ingress",
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

/**
 * Catches unhandled browser exceptions and promise rejections.
 */
export function initGlobalErrorLogging() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    sendToNexis(
      "ERROR",
      "UI.Crash",
      `Unhandled UI Error: ${event.message} at ${event.filename || "app"}:${event.lineno || 0}`,
      { stack: event.error?.stack, filename: event.filename, lineno: event.lineno }
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendToNexis(
      "ERROR",
      "Promise.Reject",
      `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
      { reason: String(event.reason) }
    );
  });
}

// Auto-initialize on import
setupAxiosTelemetry(axios);
initGlobalErrorLogging();
