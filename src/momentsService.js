import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

const MOMENTS_COLLECTION = "userMoments";
const LOCAL_MOMENTS_KEY = "kl_user_moments_fallback_v1";

function readLocalMoments() {
  try {
    const raw = localStorage.getItem(LOCAL_MOMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMoments(list) {
  try {
    localStorage.setItem(LOCAL_MOMENTS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatTimestampHMS(totalSeconds) {
  const safeSec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

export function formatSavedDate(value) {
  if (!value) return new Date().toLocaleDateString();
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export async function fetchUserMoments(userId) {
  if (!userId) return [];

  const localForUser = readLocalMoments().filter((m) => m.userId === userId);

  try {
    const q = query(
      collection(db, MOMENTS_COLLECTION),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const items = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        userId: data.userId,
        videoId: data.videoId,
        videoTitle: data.videoTitle || "Untitled Video",
        videoThumbnail: data.videoThumbnail || "",
        videoUrl: data.videoUrl || "",
        momentTitle: data.momentTitle || "Saved Moment",
        timestampSec: Number(data.timestampSec) || 0,
        savedDateLabel: formatSavedDate(data.savedAt || data.savedDate),
        sortTime: data.savedAt?.toMillis?.() || new Date(data.savedDate || 0).getTime() || 0
      });
    });

    items.sort((a, b) => b.sortTime - a.sortTime);
    return items;
  } catch {
    return localForUser.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
  }
}

export async function saveUserMoment({
  userId,
  video,
  videoThumbnail,
  momentTitle,
  timestampSec
}) {
  if (!userId) {
    throw new Error("You must be logged in to save a moment.");
  }
  if (!video?.id) {
    throw new Error("Video information is missing.");
  }

  const cleanTitle = String(momentTitle || "").trim();
  if (!cleanTitle) {
    throw new Error("Please enter a title for your moment.");
  }

  const safeSec = Math.max(0, Math.floor(Number(timestampSec) || 0));
  const resolvedUrl =
    video.videoUrl ||
    video.streamUrl ||
    video.fallbackUrl ||
    (video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : "");

  const nowIso = new Date().toISOString();
  const payload = {
    userId,
    videoId: String(video.id),
    videoTitle: video.title || "Untitled Video",
    videoThumbnail: videoThumbnail || "",
    videoUrl: resolvedUrl,
    momentTitle: cleanTitle,
    timestampSec: safeSec,
    savedDate: nowIso,
    savedAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, MOMENTS_COLLECTION), payload);
    return {
      id: docRef.id,
      ...payload,
      savedDateLabel: formatSavedDate(nowIso),
      sortTime: Date.now()
    };
  } catch (err) {
    // Store locally if Firestore is unreachable or in offline fallback mode
    const fallbackItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...payload,
      savedDateLabel: formatSavedDate(nowIso),
      sortTime: Date.now()
    };
    const allLocal = readLocalMoments();
    writeLocalMoments([fallbackItem, ...allLocal]);
    if (err?.code === "permission-denied") {
      return fallbackItem;
    }
    return fallbackItem;
  }
}

export async function renameUserMoment(momentId, nextTitle) {
  const cleanTitle = String(nextTitle || "").trim();
  if (!cleanTitle) {
    throw new Error("Moment title cannot be empty.");
  }

  const localList = readLocalMoments();
  const updatedLocal = localList.map((m) =>
    m.id === momentId ? { ...m, momentTitle: cleanTitle } : m
  );
  writeLocalMoments(updatedLocal);

  if (!String(momentId).startsWith("local-")) {
    try {
      await updateDoc(doc(db, MOMENTS_COLLECTION, String(momentId)), {
        momentTitle: cleanTitle
      });
    } catch {
      // Local state already updated
    }
  }

  return cleanTitle;
}

export async function deleteUserMoment(momentId) {
  const localList = readLocalMoments().filter((m) => m.id !== momentId);
  writeLocalMoments(localList);

  if (!String(momentId).startsWith("local-")) {
    try {
      await deleteDoc(doc(db, MOMENTS_COLLECTION, String(momentId)));
    } catch {
      // Local state already updated
    }
  }
}

export function groupMomentsByVideo(moments) {
  const groupsMap = new Map();

  (moments || []).forEach((moment) => {
    const key = String(moment.videoId);
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        videoId: moment.videoId,
        videoTitle: moment.videoTitle,
        videoThumbnail: moment.videoThumbnail,
        videoUrl: moment.videoUrl,
        moments: []
      });
    }
    groupsMap.get(key).moments.push(moment);
  });

  return Array.from(groupsMap.values()).map((group) => ({
    ...group,
    moments: [...group.moments].sort((a, b) => a.timestampSec - b.timestampSec)
  }));
}