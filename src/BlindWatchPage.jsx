import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { fetchUserWatchHistory } from "./recommendations";
import {
  VIDEO_CATEGORIES,
  starterVideos,
  getVideoThumbnail,
  readData
} from "./data";

const LOCAL_SUBMISSIONS_KEY = "kl_submissions_fallback_v1";

function readLocalSubmissions() {
  return readData(LOCAL_SUBMISSIONS_KEY, []);
}

function readCatalogCache() {
  const existing = readData("videos", null);
  return Array.isArray(existing) && existing.length > 0 ? existing : starterVideos;
}

async function fetchAvailableCatalog() {
  const baseVideos = readCatalogCache().map((v) => ({
    ...v,
    category: VIDEO_CATEGORIES.includes(v.category) ? v.category : "Movies",
    status: "approved"
  }));

  let submissions = readLocalSubmissions().filter((item) => item.status === "approved");
  try {
    const q = query(collection(db, "videoSubmissions"), where("status", "==", "approved"));
    const snap = await getDocs(q);
    const approvedList = [];
    snap.forEach((d) => approvedList.push({ id: d.id, ...d.data() }));
    submissions = approvedList;
  } catch {
    // Use local approved submissions if offline
  }

  const uniqueMap = new Map();
  submissions
    .filter((item) => item.status === "approved")
    .forEach((item) => {
      uniqueMap.set(String(item.id), {
        id: item.id,
        title: item.title,
        category: VIDEO_CATEGORIES.includes(item.category) ? item.category : "Movies",
        sourceType: item.isHls ? "hls" : "mp4",
        platform: "Creator Upload (Cloudinary)",
        streamUrl: item.hlsUrl || item.videoUrl,
        fallbackUrl: item.videoUrl,
        videoUrl: item.videoUrl,
        publicId: item.publicId,
        thumbnail: item.thumbnailUrl || "",
        creatorName: item.creatorName || "Creator",
        status: "approved",
        qualities: ["Auto", "1080p", "720p", "480p", "360p"],
        description: item.description || "Uploaded by a KL Stream creator."
      });
    });

  return [...Array.from(uniqueMap.values()), ...baseVideos];
}

function pickRandomVideo(pool, excludeId = null) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const candidates =
    excludeId !== null && excludeId !== undefined
      ? pool.filter((item) => String(item.id) !== String(excludeId))
      : pool;

  const activePool = candidates.length > 0 ? candidates : pool;
  const randomIndex = Math.floor(Math.random() * activePool.length);
  return activePool[randomIndex];
}

export default function BlindWatchPage({ user }) {
  const [catalog, setCatalog] = useState(() => readCatalogCache());
  const [watchedIds, setWatchedIds] = useState(() => new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [mode, setMode] = useState("random"); // "random" | "genre" | "unwatched"
  const [selectedGenre, setSelectedGenre] = useState(VIDEO_CATEGORIES[0] || "Movies");

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStepLabel, setSpinStepLabel] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");

  const navigate = useNavigate();
  const isLocked = Boolean(user?.parentalLock?.enabled);

  useEffect(() => {
    let active = true;
    setLoadingCatalog(true);

    Promise.all([fetchAvailableCatalog(), fetchUserWatchHistory(user?.uid)])
      .then(([videosList, historyList]) => {
        if (!active) return;
        setCatalog(videosList);

        const seen = new Set();
        (historyList || []).forEach((entry) => {
          const vid = entry?.videoId ?? entry?.id;
          if (vid !== undefined && vid !== null) {
            seen.add(String(vid));
          }
        });
        setWatchedIds(seen);
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      // Cleanup handled via local timer ids inside triggerBlindPick
    };
  }, []);

  function getCandidatePool() {
    if (mode === "genre") {
      return catalog.filter(
        (v) => (v.category || "Movies").toLowerCase() === selectedGenre.toLowerCase()
      );
    }

    if (mode === "unwatched") {
      return catalog.filter((v) => !watchedIds.has(String(v.id)));
    }

    return catalog;
  }

  function triggerBlindPick({ isAgain = false } = {}) {
    if (isSpinning || loadingCatalog) return;

    setStatusNotice("");
    const pool = getCandidatePool();

    if (pool.length === 0) {
      if (mode === "unwatched") {
        setStatusNotice(
          "You have already watched every available video in the catalog! Try Completely Random or Random by Genre."
        );
      } else {
        setStatusNotice(`No videos found under ${selectedGenre} right now.`);
      }
      return;
    }

    const previousId = isAgain && selectedVideo ? selectedVideo.id : null;
    const chosen = pickRandomVideo(pool, previousId);

    // Keep title and thumbnail hidden during the selection & suspenseful reveal
    setSelectedVideo(chosen);
    setRevealed(false);
    setIsSpinning(true);

    const cues = [
      "Shuffling KL Stream catalog...",
      "Locking onto a mystery pick...",
      "Preparing suspenseful reveal..."
    ];
    let idx = 0;
    setSpinStepLabel(cues[0]);

    const cueTimer = setInterval(() => {
      idx += 1;
      if (idx < cues.length) {
        setSpinStepLabel(cues[idx]);
      }
    }, 360);

    setTimeout(() => {
      clearInterval(cueTimer);
      setIsSpinning(false);
      setRevealed(true);
      setSpinStepLabel("");
    }, 1150);
  }

  function handleWatchNow() {
    if (!selectedVideo || !revealed) return;
    navigate(`/watch/${encodeURIComponent(String(selectedVideo.id))}`, {
      state: { video: selectedVideo }
    });
  }

  const unwatchedCount = catalog.filter((v) => !watchedIds.has(String(v.id))).length;

  return (
    <main className="page narrow">
      <section className="hero-banner">
        <div>
          <p className="eyebrow light">BLIND WATCH</p>
          <h1>Can&apos;t decide what to watch? Let KL Stream choose.</h1>
          <p>
            Pick a selection mode, hit Surprise Me, and let KL Stream lock in a hidden pick before revealing it.
          </p>
          <div className="hero-actions">
            <Link className="btn outline-light" to="/home">
              ← Back to Catalog
            </Link>
            <Link className="btn outline-light" to="/my-moments">
              My Moments
            </Link>
          </div>
        </div>
        <div className="hero-stat">
          <strong>{catalog.length}</strong>
          <span>Catalog Titles</span>
        </div>
      </section>

      {isLocked && (
        <div className="lock-banner">
          <span>
            🔒 <strong>Parental Lock is ON.</strong> Your PIN will be requested when opening the selected video.
          </span>
          <Link to="/profile" className="btn secondary">
            Manage PIN
          </Link>
        </div>
      )}

      <section className="form-card">
        <p className="eyebrow">SELECTION MODE</p>
        <h2>Choose How KL Stream Picks</h2>

        <div className="category-pills" style={{ marginTop: "10px" }}>
          <button
            type="button"
            className={`pill ${mode === "random" ? "active" : ""}`}
            onClick={() => {
              setMode("random");
              setStatusNotice("");
            }}
            disabled={isSpinning}
          >
            Completely Random
          </button>

          <button
            type="button"
            className={`pill ${mode === "genre" ? "active" : ""}`}
            onClick={() => {
              setMode("genre");
              setStatusNotice("");
            }}
            disabled={isSpinning}
          >
            Random by Genre
          </button>

          <button
            type="button"
            className={`pill ${mode === "unwatched" ? "active" : ""}`}
            onClick={() => {
              setMode("unwatched");
              setStatusNotice("");
            }}
            disabled={isSpinning}
          >
            Unwatched Only ({unwatchedCount})
          </button>
        </div>

        {mode === "genre" && (
          <div style={{ marginTop: "12px" }}>
            <label>Select Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setStatusNotice("");
              }}
              disabled={isSpinning}
            >
              {VIDEO_CATEGORIES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="video-actions" style={{ marginTop: "18px", maxWidth: "420px" }}>
          <button
            type="button"
            className="btn primary"
            onClick={() => triggerBlindPick({ isAgain: false })}
            disabled={isSpinning || loadingCatalog}
          >
            {isSpinning ? "Selecting..." : "🎲 Surprise Me"}
          </button>

          {selectedVideo && !isSpinning && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => triggerBlindPick({ isAgain: true })}
              disabled={loadingCatalog}
            >
              ↻ Surprise Me Again
            </button>
          )}
        </div>

        {statusNotice && (
          <p className="message" style={{ marginTop: "12px" }}>
            {statusNotice}
          </p>
        )}
      </section>

      {/* Hidden title & thumbnail during selection; suspenseful reveal once ready */}
      {(isSpinning || (selectedVideo && revealed)) && (
        <section className="admin-panel" style={{ marginTop: "18px" }}>
          {isSpinning || !revealed ? (
            <div className="empty-state" style={{ padding: "36px 20px" }}>
              <span className="badge">BLIND SELECTION IN PROGRESS</span>
              <h2 style={{ marginTop: "12px" }}>
                {spinStepLabel || "Choosing your mystery video..."}
              </h2>
              <p className="muted small" style={{ marginTop: "8px" }}>
                Title and thumbnail stay hidden until the reveal finishes.
              </p>
            </div>
          ) : (
            <article className="video-card" style={{ maxWidth: "560px", margin: "0 auto" }}>
              <div className="thumb-wrap">
                <img
                  src={getVideoThumbnail(selectedVideo)}
                  alt={selectedVideo.title}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://placehold.co/640x360/0D111B/F5F5F5?text=KL+STREAM";
                  }}
                />
                <span className="platform-tag">
                  {selectedVideo.platform || "YouTube"}
                </span>
                {isLocked && <span className="lock-tag">🔒 PIN Locked</span>}
              </div>

              <div className="video-content">
                <span className="badge">{selectedVideo.category}</span>
                <h3>{selectedVideo.title}</h3>
                <p>{selectedVideo.description}</p>
                {selectedVideo.creatorName && (
                  <p className="creator-credit small">
                    Uploaded by {selectedVideo.creatorName}
                  </p>
                )}

                <div className="video-actions" style={{ marginTop: "14px" }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleWatchNow}
                  >
                    {isLocked ? "🔒 Unlock & Watch Now" : "▶ Watch Now"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => triggerBlindPick({ isAgain: true })}
                  >
                    Try Another
                  </button>
                </div>
              </div>
            </article>
          )}
        </section>
      )}
    </main>
  );
}