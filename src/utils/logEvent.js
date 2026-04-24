const LOG_EVENT_URL = "/api/log-event";

export async function logClientEvent(eventName, metadata = {}, options = {}) {
  if (!eventName || typeof window === "undefined") {
    return;
  }

  const payload = {
    eventName,
    metadata,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  };

  try {
    const body = JSON.stringify(payload);

    if (!options.forceFetch && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(LOG_EVENT_URL, blob);
      return;
    }

    await fetch(LOG_EVENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
  } catch (error) {
    console.error("Client logging failed", error);
  }
}
