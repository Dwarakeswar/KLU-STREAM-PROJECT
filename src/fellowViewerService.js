const API_BASE = import.meta.env.VITE_AI_API_URL || "http://localhost:5000";

export function extractYouTubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        const v = parsed.searchParams.get("v") || "";
        return /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : "";
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        const id = parts[1] || "";
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Invalid server response." };
  }

  if (!res.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

export function fetchVideoSummary({ videoId, videoUrl }) {
  return postJson("/api/ai/summarize", { videoId, videoUrl });
}

export function sendVideoDiscussion({
  videoTitle,
  videoUrl,
  summary,
  transcript,
  question,
  history,
}) {
  return postJson("/api/ai/discuss", {
    videoTitle,
    videoUrl,
    summary,
    transcript,
    question,
    history,
  });
}