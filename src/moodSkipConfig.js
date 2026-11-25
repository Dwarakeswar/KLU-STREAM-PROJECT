export const MOODSKIP_ACTIONS = [
  {
    id: "bored",
    emoji: "😴",
    label: "Bored",
    deltaSec: 10
  },
  {
    id: "irritated",
    emoji: "😤",
    label: "Irritated",
    deltaSec: 20
  },
  {
    id: "loved-it",
    emoji: "😍",
    label: "Loved it",
    deltaSec: -5
  },
  {
    id: "confused",
    emoji: "😕",
    label: "Confused",
    deltaSec: -20
  }
];

export function computeMoodTargetSec(currentSec, deltaSec, durationSec = 0) {
  const safeCurrent = Math.max(0, Number(currentSec) || 0);
  const safeDelta = Number(deltaSec) || 0;
  let target = safeCurrent + safeDelta;

  if (target < 0) {
    target = 0;
  }

  if (Number.isFinite(durationSec) && durationSec > 0) {
    const maxAllowed = Math.max(0, durationSec - 1);
    if (target > maxAllowed) {
      target = maxAllowed;
    }
  }

  return Math.floor(target);
}

export function formatShortClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}