import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { readData, saveData } from "./data";

const LOCAL_HISTORY_KEY = "kl_watch_history_v1";

function getLocalHistoryMap(userId) {
  const all = readData(LOCAL_HISTORY_KEY, {});
  return all[userId] || {};
}

function saveLocalHistoryEntry(userId, entry) {
  const all = readData(LOCAL_HISTORY_KEY, {});
  const userMap = all[userId] || {};
  userMap[entry.videoId] = entry;
  all[userId] = userMap;
  saveData(LOCAL_HISTORY_KEY, all);
}

export async function recordVideoWatch(userId, video) {
  if (!userId || !video) return;

  const existingLocal = getLocalHistoryMap(userId)[video.id];
  const nextCount = (existingLocal?.watchCount || 0) + 1;
  const localEntry = {
    userId,
    videoId: video.id,
    category: video.category || "Movies",
    watchCount: nextCount,
    lastWatchedAt: Date.now()
  };
  saveLocalHistoryEntry(userId, localEntry);

  try {
    const docId = `${userId}_${video.id}`;
    const ref = doc(db, "watchHistory", docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentCount = snap.data().watchCount || 0;
      await updateDoc(ref, {
        category: video.category || "Movies",
        watchCount: currentCount + 1,
        lastWatchedAt: serverTimestamp()
      });
    } else {
      await setDoc(ref, {
        userId,
        videoId: video.id,
        category: video.category || "Movies",
        watchCount: 1,
        lastWatchedAt: serverTimestamp()
      });
    }
  } catch {
    // Fallback to localStorage if Firestore is offline or unauthenticated (e.g., demo admin)
  }
}

export async function fetchUserWatchHistory(userId) {
  const localMap = getLocalHistoryMap(userId);
  if (!userId) return [];

  try {
    const q = query(collection(db, "watchHistory"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const entries = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const ts = data.lastWatchedAt?.toMillis ? data.lastWatchedAt.toMillis() : Date.now();
        const entry = {
          userId: data.userId,
          videoId: data.videoId,
          category: data.category || "Movies",
          watchCount: data.watchCount || 1,
          lastWatchedAt: ts
        };
        entries.push(entry);
        saveLocalHistoryEntry(userId, entry);
      });
      return entries.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
    }
  } catch {
    // Use local fallback
  }

  return Object.values(localMap).sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
}

export function calculateCategoryCounts(historyEntries) {
  const counts = {
    Movies: 0,
    "TV Shows": 0,
    "Live Streams": 0
  };
  (historyEntries || []).forEach((item) => {
    const cat = item.category;
    const w = item.watchCount || 1;
    if (cat) {
      counts[cat] = (counts[cat] || 0) + w;
    }
  });
  return counts;
}

export function getPersonalizedRecommendations(videos, historyEntries, limit = 6) {
  const approvedVideos = (videos || []).filter((v) => v.status !== "pending" && v.status !== "rejected");
  const watchedIds = new Set((historyEntries || []).map((h) => String(h.videoId)));

  if (!historyEntries || historyEntries.length === 0) {
    return {
      isNewUser: true,
      topCategories: [],
      categoryCounts: {},
      items: approvedVideos.slice(0, limit)
    };
  }

  const categoryCounts = calculateCategoryCounts(historyEntries);
  const sortedCategories = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const unwatched = approvedVideos.filter((v) => !watchedIds.has(String(v.id)));
  const watched = approvedVideos.filter((v) => watchedIds.has(String(v.id)));

  const rankedUnwatched = [...unwatched].sort((a, b) => {
    const scoreA = categoryCounts[a.category] || 0;
    const scoreB = categoryCounts[b.category] || 0;
    return scoreB - scoreA;
  });

  const finalList =
    rankedUnwatched.length >= limit
      ? rankedUnwatched.slice(0, limit)
      : [...rankedUnwatched, ...watched].slice(0, limit);

  return {
    isNewUser: false,
    topCategories: sortedCategories,
    categoryCounts,
    items: finalList
  };
}
