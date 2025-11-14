/**
 * E2E Bridge Client Example
 * Posts to the bridge's /v1/responses and prints streamed events.
 * Requires the bridge running and a real backend configured via env.
 */

const BASE = process.env.AF_BRIDGE_BASE_URL || "http://127.0.0.1:8081";
const MODEL = process.env.AF_MODEL || "multi_tier_support";

async function main() {
  const url = `${BASE.replace(/\/$/, "")}/v1/responses`;
  const body = {
    model: MODEL,
    input: "I need help with order 12345. I want a replacement and need to know when it will arrive.",
    stream: true,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? ` - ${txt}` : ""}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  console.log("[E2E] Streaming events from bridge...\n");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() || "";
    for (const line of parts) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (jsonStr === "[DONE]") {
        console.log("[E2E] DONE");
        return;
      }
      try {
        const ev = JSON.parse(jsonStr);
        console.log("event:", ev.type || "?", ev);
      } catch {
        // ignore
      }
    }
  }
}

main().catch((e) => {
  console.error("[E2E] error:", e);
  process.exit(1);
});
