import { supabase } from "@/lib/supabase";

export type Gender = "male" | "female" | "nonbinary";
export type Seeking = "everyone" | Gender;
export type Intent =
  | "long_term"
  | "long_term_open"
  | "short_term_open"
  | "short_term"
  | "friends"
  | "figuring_out";

export type Profile = {
  anon_id: string;
  user_id?: string | null;

  first_name: string;
  nickname: string;
  birthdate: string; // YYYY-MM-DD
  age: number;

  city: string;
  bio: string;

  gender: Gender | "";
  show_gender: boolean;
  seeking: Seeking;
  intent: Intent | "";

  distance_km: number;

  photo1_url: string;
  photo2_url: string;
  photo3_url: string;
  photo4_url: string;
  photo5_url: string;
  photo6_url: string;

  // ✅ ONBOARDING FLAGS
  onboarding_step: number;
  onboarding_completed: boolean;
};

export const EMPTY_PROFILE: Profile = {
  anon_id: "",
  user_id: null,

  first_name: "",
  nickname: "",
  birthdate: "",
  age: 18,

  city: "",
  bio: "",

  gender: "",
  show_gender: false,
  seeking: "everyone",
  intent: "",

  distance_km: 50,

  photo1_url: "",
  photo2_url: "",
  photo3_url: "",
  photo4_url: "",
  photo5_url: "",
  photo6_url: "",

  onboarding_step: 1,
  onboarding_completed: false,
};

// -------------------------
// GETTERS
// -------------------------

export async function getProfile(anon_id: string) {
  return supabase.from("profiles").select("*").eq("anon_id", anon_id).maybeSingle();
}

export async function getProfileByIdentity(params: {
  user_id?: string;
  anon_id?: string;
}) {
  // 1) try by user_id first
  if (params.user_id) {
    const res = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", params.user_id)
      .maybeSingle();

    // ✅ fallback anon_id-ზე თუ user_id-ით ვერ მოიძებნა
    if (!res.data && params.anon_id) {
      return supabase
        .from("profiles")
        .select("*")
        .eq("anon_id", params.anon_id)
        .maybeSingle();
    }

    return res;
  }

  // 2) anon fallback
  return supabase
    .from("profiles")
    .select("*")
    .eq("anon_id", params.anon_id!)
    .maybeSingle();
}

// -------------------------
// UPSERT
// -------------------------

export async function upsertProfile(payload: Partial<Profile> & { anon_id: string }) {
  const patched: any = { ...payload };

  // ✅ if birthdate present, compute age (if not provided or defaulted)
  if (patched.birthdate && (patched.age == null || patched.age === 18)) {
    const a = calcAgeFromBirthdate(patched.birthdate);
    if (a != null) patched.age = a;
  }

  // ✅ Don't force-write 18 unless caller explicitly sends no age and no birthdate
  if (patched.age == null && !patched.birthdate) patched.age = 18;

  return supabase.from("profiles").upsert(patched, { onConflict: "anon_id" });
}

/**
 * ✅ FIXED Identity upsert strategy:
 * - Always upsert by anon_id (guest row is source of truth)
 * - If user_id exists -> bind it to the same row via update
 *
 * This prevents "two rows" problems that break feed queries by user_id.
 */
export async function upsertProfileByIdentity(
  payload: Partial<Profile> & { anon_id: string }
) {
  const safe: any = { ...payload };

  if (safe.birthdate && (safe.age == null || safe.age === 18)) {
    const a = calcAgeFromBirthdate(safe.birthdate);
    if (a != null) safe.age = a;
  }

  if (safe.age == null && !safe.birthdate) safe.age = 18;

  // 1) Upsert by anon_id always
  const { data: row, error: upErr } = await supabase
    .from("profiles")
    .upsert(safe, { onConflict: "anon_id" })
    .select("*")
    .maybeSingle();

  if (upErr) return { data: null, error: upErr };

  // 2) If logged in -> bind user_id to THIS row (anon_id)
  if (safe.user_id) {
    const { data: bound, error: bindErr } = await supabase
      .from("profiles")
      .update({ user_id: safe.user_id })
      .eq("anon_id", safe.anon_id)
      .select("*")
      .maybeSingle();

    if (bindErr) return { data: row ?? null, error: bindErr };
    return { data: bound ?? row ?? null, error: null };
  }

  return { data: row ?? null, error: null };
}

// -------------------------
// HELPERS
// -------------------------

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isValidDateYMD(y: number, m: number, d: number) {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // validate real calendar date using UTC
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

// ✅ Stable age calc (UTC-safe) — ONLY ONCE (no duplicates)
export function calcAgeFromBirthdate(iso?: string | null): number | null {
  if (!iso) return null;

  // Expect YYYY-MM-DD
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]); // 1–12
  const day = Number(m[3]);   // 1–31

  if (!isValidDateYMD(year, month, day)) return null;

  // UTC-safe "today"
  const now = new Date();
  const nowY = now.getUTCFullYear();
  const nowM = now.getUTCMonth() + 1;
  const nowD = now.getUTCDate();

  let age = nowY - year;

  // Check if birthday already happened this year
  if (nowM < month || (nowM === month && nowD < day)) {
    age -= 1;
  }

  // Safety guard (no negatives)
  if (age < 0) return null;

  return age;
}


/**
 * ✅ Accepts:
 * - "DD/MM/YYYY" (your onboarding input)
 * - "YYYY-MM-DD" (already ISO)
 * - any string with 8 digits (tries DDMMYYYY then MMDDYYYY)
 *
 * Returns "YYYY-MM-DD" or "" if invalid
 */
export function formatBirthInputToISO(v: string) {
  if (!v) return "";

  // If already ISO
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (!isValidDateYMD(y, m, d)) return "";
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // Strip non-digits
  const cleaned = v.replace(/[^\d]/g, "");
  if (cleaned.length !== 8) return "";

  const a = Number(cleaned.slice(0, 2));
  const b = Number(cleaned.slice(2, 4));
  const yyyy = Number(cleaned.slice(4, 8));

  // Try DDMMYYYY
  if (isValidDateYMD(yyyy, b, a)) return `${yyyy}-${pad2(b)}-${pad2(a)}`;

  // Try MMDDYYYY
  if (isValidDateYMD(yyyy, a, b)) return `${yyyy}-${pad2(a)}-${pad2(b)}`;

  return "";
}
