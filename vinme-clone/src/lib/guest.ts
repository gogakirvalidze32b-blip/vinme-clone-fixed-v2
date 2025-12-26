// src/lib/guest.ts

const ANON_KEY = "hug_anon_id";

/**
 * Returns a stable anon_id stored in localStorage.
 * Used before login and as a bridge until user_id is bound.
 */
export function getOrCreateAnonId() {
  if (typeof window === "undefined") return "server";

  const existing = localStorage.getItem(ANON_KEY);
  if (existing) return existing;

  const id = `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(ANON_KEY, id);
  return id;
}

/**
 * DEV / debug helper: clears anon_id so mobile doesn't keep old profiles.
 * Call manually from console when needed:
 *   resetAnonId();
 */
export function resetAnonId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ANON_KEY);
}

/**
 * Optional helper: force-generate a new anon id (and return it).
 * Useful when you want to rotate anon id after sign-out etc.
 */
export function forceNewAnonId() {
  if (typeof window === "undefined") return "server";
  resetAnonId();
  return getOrCreateAnonId();
}

const NAMES = ["Ani", "Nino", "Mariam", "Elene", "Salome", "Gio", "Nika", "Luka", "Sandro", "Dato"];

/**
 * Generates a simple anonymous nickname.
 * NOTE: don't bake age into nickname (keeps stale values + confuses updates).
 */
export function generateAnonName() {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  return name;
}
