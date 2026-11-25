import "dotenv/config";
import express from "express";
import cors from "cors";
import { summarizeVideo, discussVideo } from "./aiService.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ai/summarize", async (req, res) => {
  try {
    const { videoId, videoUrl } = req.body || {};
    const cleanId = String(videoId || "").trim();
    const cleanUrl = String(videoUrl || "").trim();

    if (!cleanUrl && !cleanId) {
      return res.status(400).json({ error: "Please provide a YouTube video link." });
    }

    const result = await summarizeVideo({
      videoId: cleanId,
      videoUrl: cleanUrl || `https://www.youtube.com/watch?v=${cleanId}`,
    });

    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to generate summary.",
    });
  }
});

app.post("/api/ai/discuss", async (req, res) => {
  try {
    const { videoTitle, videoUrl, summary, transcript, question, history } =
      req.body || {};

    if (!String(question || "").trim()) {
      return res.status(400).json({ error: "Please enter a question." });
    }

    const result = await discussVideo({
      videoTitle,
      videoUrl,
      summary,
      transcript,
      question,
      history,
    });

    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to discuss video.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});