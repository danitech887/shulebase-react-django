import threading
import json
import urllib.request
import urllib.error
import os

NEXIS_URL = os.environ.get("NEXIS_URL", "https://salty-breads-talk.loca.lt/api/v1/telemetry/events")


def _send_log_async(payload: dict):
    """
    Sends telemetry using Python's standard library urllib.request.
    Requires zero external packages (no httpx or requests needed).
    """
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            NEXIS_URL,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Bypass-Tunnel-Reminder": "true",
                "User-Agent": "ShuleBase-Django/1.0",
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            pass
    except Exception:
        # Non-blocking fail-safe: never crash Django if Nexis is unreachable
        pass


class NexisTelemetryMiddleware:
    """
    Django middleware to stream real API requests, status codes,
    user identities, and server errors to Nexis in real time.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Skip static assets or favicon
        path = request.path
        if path.startswith("/static/") or path.startswith("/media/") or path == "/favicon.ico":
            return response

        try:
            user = getattr(request, "user", None)
            username = user.username if (user and user.is_authenticated) else "guest"
            status = response.status_code

            level = "ERROR" if status >= 500 else "WARN" if status >= 400 else "INFO"

            payload = {
                "system_id": "shulebase-storage",
                "level": level,
                "tag": "Django.API",
                "message": f"[{username}] {request.method} {path} -> {status}",
                "metadata": {
                    "method": request.method,
                    "path": path,
                    "status_code": status,
                    "username": username,
                }
            }

            # Fire and forget in a background daemon thread
            threading.Thread(target=_send_log_async, args=(payload,), daemon=True).start()
        except Exception:
            pass

        return response

    def process_exception(self, request, exception):
        """
        Captures unhandled Django server exceptions with full Python stack traces
        and delivers them directly into Nexis in real time.
        """
        import traceback
        try:
            user = getattr(request, "user", None)
            username = user.username if (user and user.is_authenticated) else "guest"
            tb = traceback.format_exc()

            payload = {
                "system_id": "shulebase-storage",
                "level": "ERROR",
                "tag": "Django.Crash",
                "message": f"[{username}] Unhandled Server Exception: {type(exception).__name__}: {str(exception)}",
                "stack_trace": tb,
                "metadata": {
                    "method": request.method,
                    "path": request.path,
                    "exception_type": type(exception).__name__,
                }
            }
            threading.Thread(target=_send_log_async, args=(payload,), daemon=True).start()
        except Exception:
            pass
        return None
