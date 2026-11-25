import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchUserMoments,
  renameUserMoment,
  deleteUserMoment,
  groupMomentsByVideo,
  formatTimestampHMS
} from "./momentsService";

export default function MyMomentsPage({ user }) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchUserMoments(user?.uid)
      .then((list) => {
        if (active) setMoments(list);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Failed to load saved moments.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  function handleJumpToMoment(moment) {
    navigate(`/watch/${encodeURIComponent(String(moment.videoId))}`, {
      state: {
        startAtSec: moment.timestampSec,
        momentId: moment.id,
        momentTitle: moment.momentTitle
      }
    });
  }

  function startRename(moment) {
    setEditingId(moment.id);
    setEditTitle(moment.momentTitle);
    setConfirmDeleteId(null);
    setError("");
  }

  async function handleSaveRename(momentId) {
    if (!editTitle.trim()) {
      setError("Please enter a moment title.");
      return;
    }
    setBusyId(momentId);
    setError("");
    try {
      const updatedTitle = await renameUserMoment(momentId, editTitle);
      setMoments((prev) =>
        prev.map((m) => (m.id === momentId ? { ...m, momentTitle: updatedTitle } : m))
      );
      setEditingId(null);
      setEditTitle("");
    } catch (err) {
      setError(err?.message || "Could not rename moment.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete(momentId) {
    setBusyId(momentId);
    setError("");
    try {
      await deleteUserMoment(momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err?.message || "Could not delete moment.");
    } finally {
      setBusyId(null);
    }
  }

  const groupedVideos = groupMomentsByVideo(moments);

  return (
    <main className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">PERSONAL BOOKMARKS</p>
          <h1>My Moments ({moments.length})</h1>
          <p className="muted">
            Jump straight back to your favourite timestamps across KL Stream videos.
          </p>
        </div>
        <Link to="/home" className="btn secondary">
          ← Browse Videos
        </Link>
      </div>

      {error && <div className="lock-banner"><strong>{error}</strong></div>}

      {loading ? (
        <div className="empty-state">Loading your saved moments...</div>
      ) : groupedVideos.length === 0 ? (
        <div className="empty-state">
          <h2>No saved moments yet</h2>
          <p className="muted">
            Open any video, click <strong>Save Moment</strong> at your favourite spot, and it will appear here.
          </p>
          <div style={{ marginTop: "14px" }}>
            <Link to="/home" className="btn primary">
              Watch a Video
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {groupedVideos.map((group) => (
            <section className="admin-panel" key={group.videoId}>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)"
                }}
              >
                <img
                  src={
                    group.videoThumbnail ||
                    "https://placehold.co/240x135/0D111B/F5F5F5?text=KL+STREAM"
                  }
                  alt={group.videoTitle}
                  style={{
                    width: "140px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
                <div>
                  <span className="badge">
                    {group.moments.length}{" "}
                    {group.moments.length === 1 ? "Moment" : "Moments"}
                  </span>
                  <h2 style={{ marginTop: "6px" }}>{group.videoTitle}</h2>
                </div>
              </div>

              <div className="video-grid">
                {group.moments.map((moment) => {
                  const isEditing = editingId === moment.id;
                  const isConfirmingDelete = confirmDeleteId === moment.id;
                  const isBusy = busyId === moment.id;

                  return (
                    <article className="video-card" key={moment.id}>
                      <div className="thumb-wrap">
                        <img
                          src={
                            moment.videoThumbnail ||
                            group.videoThumbnail ||
                            "https://placehold.co/640x360/0D111B/F5F5F5?text=KL+STREAM"
                          }
                          alt={moment.momentTitle}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/640x360/0D111B/F5F5F5?text=KL+STREAM";
                          }}
                        />
                        <span className="platform-tag">
                          ⏱ {formatTimestampHMS(moment.timestampSec)}
                        </span>
                      </div>

                      <div className="video-content">
                        <span className="badge">{moment.savedDateLabel}</span>

                        {isEditing ? (
                          <div style={{ marginTop: "8px" }}>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Enter new moment title"
                              disabled={isBusy}
                            />
                            <div className="video-actions" style={{ marginTop: "8px" }}>
                              <button
                                type="button"
                                className="btn primary"
                                onClick={() => handleSaveRename(moment.id)}
                                disabled={isBusy}
                              >
                                {isBusy ? "Saving..." : "Save Title"}
                              </button>
                              <button
                                type="button"
                                className="btn secondary"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditTitle("");
                                }}
                                disabled={isBusy}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3>{moment.momentTitle}</h3>
                            <p className="small muted">{moment.videoTitle}</p>
                            <p className="small">
                              Timestamp:{" "}
                              <strong>{formatTimestampHMS(moment.timestampSec)}</strong>
                            </p>
                          </>
                        )}

                        {!isEditing && (
                          <div className="video-actions">
                            <button
                              type="button"
                              className="btn primary"
                              style={{ gridColumn: "1 / -1" }}
                              onClick={() => handleJumpToMoment(moment)}
                              disabled={isBusy}
                            >
                              ▶ Jump to {formatTimestampHMS(moment.timestampSec)}
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => startRename(moment)}
                              disabled={isBusy}
                            >
                              Rename
                            </button>
                            {isConfirmingDelete ? (
                              <button
                                type="button"
                                className="btn secondary danger"
                                onClick={() => handleConfirmDelete(moment.id)}
                                disabled={isBusy}
                              >
                                {isBusy ? "Deleting..." : "Confirm Delete"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn secondary danger"
                                onClick={() => setConfirmDeleteId(moment.id)}
                                disabled={isBusy}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}

                        {isConfirmingDelete && !isEditing && (
                          <button
                            type="button"
                            className="inline-link small"
                            style={{ marginTop: "6px" }}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel delete
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}