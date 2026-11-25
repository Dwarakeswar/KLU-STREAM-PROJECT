import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  extractYouTubeId,
  fetchVideoSummary,
  sendVideoDiscussion,
} from "./fellowViewerService";

export default function AiFellowViewerPage() {
  const location = useLocation();

  const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || "");
  const [videoId, setVideoId] = useState(
    location.state?.videoId || extractYouTubeId(location.state?.videoUrl || "")
  );
  const [videoTitle, setVideoTitle] = useState(location.state?.videoTitle || "");

  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    const nextUrl = location.state?.videoUrl || "";
    const nextId = location.state?.videoId || extractYouTubeId(nextUrl);
    if (nextUrl || nextId) {
      setVideoUrl(nextUrl || `https://www.youtube.com/watch?v=${nextId}`);
      setVideoId(nextId);
      setVideoTitle(location.state?.videoTitle || "");
      setSummary("");
      setKeyPoints([]);
      setTranscript("");
      setNotice("");
      setError("");
      setMessages([]);
      setChatError("");
    }
  }, [location.state]);

  function handleUrlInput(e) {
    const val = e.target.value;
    setVideoUrl(val);
    setVideoId(extractYouTubeId(val));
    setSummary("");
    setKeyPoints([]);
    setTranscript("");
    setNotice("");
    setError("");
    setMessages([]);
    setChatError("");
  }

  async function handleGetSummary(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    const id = videoId || extractYouTubeId(videoUrl);
    if (!id) {
      setError("Please enter a valid YouTube video URL.");
      return;
    }

    const cleanUrl = videoUrl.trim() || `https://www.youtube.com/watch?v=${id}`;
    setVideoId(id);
    setLoadingSummary(true);

    try {
      const data = await fetchVideoSummary({ videoId: id, videoUrl: cleanUrl });
      if (data.title) setVideoTitle(data.title);

      if (!data.hasSubtitles) {
        setSummary("");
        setKeyPoints([]);
        setTranscript("");
        setNotice(data.message || "Subtitles are unavailable for this video.");
        return;
      }

      setSummary(data.summary || "");
      setKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
      setTranscript(data.transcript || "");
    } catch (err) {
      setError(err.message || "Could not generate summary.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleAskQuestion(e) {
    e.preventDefault();
    setChatError("");
    const text = question.trim();
    if (!text) return;

    if (!transcript) {
      setChatError("Generate a video summary with available subtitles first.");
      return;
    }

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setQuestion("");
    setSendingChat(true);

    try {
      const data = await sendVideoDiscussion({
        videoTitle,
        videoUrl,
        summary,
        transcript,
        question: text,
        history: nextMessages,
      });

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setChatError(err.message || "Could not get a reply.");
    } finally {
      setSendingChat(false);
    }
  }

  return (
    <section className="fellow-page">
      <div className="fellow-header">
        <div>
          <h1>AI Video Summary &amp; Discussion</h1>
          <p className="fellow-subtitle">
            Paste a YouTube link, click Get Summary, and chat about the video.
          </p>
        </div>
      </div>

      <form className="fellow-url-bar" onSubmit={handleGetSummary}>
        <input
          type="url"
          className="fellow-input"
          placeholder="Paste YouTube link (watch?v=..., youtu.be/..., or embed/...)"
          value={videoUrl}
          onChange={handleUrlInput}
        />
        <button
          type="submit"
          className="fellow-btn fellow-btn-primary"
          disabled={loadingSummary}
        >
          {loadingSummary ? "Getting Summary..." : "Get Summary"}
        </button>
      </form>

      {error && <div className="fellow-error">{error}</div>}
      {notice && <div className="fellow-notice">{notice}</div>}

      <div className="fellow-grid">
        <div className="fellow-left">
          <div className="fellow-card">
            <div className="fellow-player-box">
              {videoId ? (
                <iframe
                  className="fellow-yt-slot"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={videoTitle || "YouTube Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="fellow-placeholder">
                  Paste a YouTube video link above to preview it.
                </div>
              )}
            </div>
          </div>

          <div className="fellow-card">
            <h2>{videoTitle || "Summary"}</h2>
            {loadingSummary && <p className="fellow-note">Fetching captions &amp; summarizing...</p>}
            {!loadingSummary && summary && <p className="fellow-subtitle">{summary}</p>}
            {keyPoints.length > 0 && (
              <ul style={{ marginTop: "12px", paddingLeft: "18px" }}>
                {keyPoints.map((point, idx) => (
                  <li key={idx} style={{ marginBottom: "6px" }}>
                    {point}
                  </li>
                ))}
              </ul>
            )}
            {!loadingSummary && !summary && !notice && !error && (
              <p className="fellow-note">
                Enter a YouTube link and click <strong>Get Summary</strong>.
              </p>
            )}
          </div>
        </div>

        <div className="fellow-right">
          <div className="fellow-card fellow-chat-card">
            <h2>Discuss This Video</h2>

            <div className="fellow-thread">
              {messages.length === 0 ? (
                <div className="fellow-placeholder">
                  Ask anything about the video once its summary is loaded.
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`fellow-bubble ${
                      m.role === "user" ? "from-user" : "from-ai"
                    }`}
                  >
                    <div className="fellow-meta">
                      <span>{m.role === "user" ? "You" : "AI"}</span>
                    </div>
                    <p>{m.text}</p>
                  </div>
                ))
              )}

              {sendingChat && (
                <div className="fellow-bubble from-ai">
                  <div className="fellow-meta">
                    <span>AI</span>
                  </div>
                  <p>Thinking...</p>
                </div>
              )}
            </div>

            {chatError && <div className="fellow-error">{chatError}</div>}

            <form className="fellow-input-row" onSubmit={handleAskQuestion}>
              <input
                type="text"
                className="fellow-input"
                placeholder="Ask a question or discuss the video..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={sendingChat || !transcript}
              />
              <button
                type="submit"
                className="fellow-btn fellow-btn-primary"
                disabled={sendingChat || !transcript}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}