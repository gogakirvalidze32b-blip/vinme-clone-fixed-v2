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

  // ✅ ONBOARDING FLAGS (ეს აკლდა)
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

  // ✅ ONBOARDING FLAGS
  onboarding_step: 1,
  onboarding_completed: false,
};

// -------------------------
// GETTERS
// -------------------------

export async function getProfile(anon_id: string) {
  return supabase
    .from("profiles")
    .select("*")
    .eq("anon_id", anon_id)
    .maybeSingle();
}

export async function getProfileByIdentity(params: {
  user_id?: string;
  anon_id?: string;
}) {
  if (params.user_id) {
    return supabase
      .from("profiles")
      .select("*")
      .eq("user_id", params.user_id)
      .maybeSingle();
  }

  return supabase
    .from("profiles")
    .select("*")
    .eq("anon_id", params.anon_id!)
    .maybeSingle();
}

// -------------------------
// UPSERT (✅ FIXED)
// -------------------------

export async function upsertProfile(
  payload: Partial<Profile> & { anon_id: string }
) {
  const safe: Partial<Profile> & { anon_id: string; age: number } = {
    ...payload,
    age: payload.age ?? 18,
  };

  return supabase
    .from("profiles")
    .upsert(safe, {
      onConflict: "anon_id", // ✅ ALWAYS anon_id
    });
}

// identity wrapper (kept for API compatibility)
export async function upsertProfileByIdentity(payload: any) {
  const hasUserId = Boolean(payload.user_id);

  const onConflict = hasUserId ? "user_id" : "anon_id";

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict })
    .select()
    .maybeSingle();

  return { data, error };
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

