export function getOrCreateAnonId() {
  const key = "hug_anon_id";
  if (typeof window === "undefined") return "server";

  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}

// ✅ დაამატე ეს
const NAMES = [
  "Ani", "Nino", "Mariam", "Elene", "Salome",
  "Gio", "Nika", "Luka", "Sandro", "Dato",
];

export function generateAnonName(age?: number) {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  return age ? `${name}, ${age}` : name;
}
