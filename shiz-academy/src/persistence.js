// Lightweight persistence helpers for game save data

export const SAVE_KEY = 'performer-jam-save-v3';
export const SAVE_VERSION = 4;

// Read, parse, and lightly migrate a save object from localStorage
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const version = typeof parsed.version === 'number' ? parsed.version : 3;
    const migrated = migrateSave(parsed, version);
    return migrated;
  } catch (_) {
    return null;
  }
}

// Write a save object to localStorage, annotating with version
export function writeSave(saveObj) {
  try {
    const { trendsByWeek, ...rest } = saveObj || {};
    const payload = { ...rest, version: SAVE_VERSION };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (_) {
    return false;
  }
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && typeof parsed === 'object');
  } catch (_) {
    return false;
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (_) {
    return false;
  }
}

function migrateSave(s, fromVersion) {
  let out = { ...s };
  // v3 -> v4: ensure new fields exist with safe defaults.
  if (fromVersion < 4) {
    if (typeof out.vinylUnlocked !== 'boolean') out.vinylUnlocked = false;
    // trendsByWeek is derived; if present from older saves, keep for backward compat.
    // actions normalization and counters are handled in App.jsx load application path.
  }
  return out;
}

