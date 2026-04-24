export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const body = req.body || {};
    const eventName = body.eventName || "unknown_event";

    console.log(
      JSON.stringify({
        source: "thinkoutloud-client",
        eventName,
        metadata: body.metadata || {},
        path: body.path || "",
        timestamp: body.timestamp || Date.now(),
        userAgent: body.userAgent || ""
      })
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("log-event error", error);
    return res.status(200).json({ ok: false });
  }
}
