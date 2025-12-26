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
  const safe: Partial<Profile> & { anon_id: string; age: number } = {
    ...payload,
    age: payload.age ?? 18,
  };

  // ✅ ALWAYS anon_id
  return supabase.from("profiles").upsert(safe, {
    onConflict: "anon_id",
  });
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
  const safe: any = {
    ...payload,
    age: payload.age ?? 18,
  };

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

export function calcAgeFromBirthdate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();

  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  return age;
}

export function formatBirthInputToISO(v: string) {
  const cleaned = v.replace(/[^\d]/g, "");
  if (cleaned.length !== 8) return "";

  const dd = cleaned.slice(0, 2);
  const mm = cleaned.slice(2, 4);
  const yyyy = cleaned.slice(4, 8);

  const iso = `${yyyy}-${mm}-${dd}`;
  const dt = new Date(iso + "T00:00:00");

  if (Number.isNaN(dt.getTime())) return "";
  return iso;
}
