"use client";

import { useEffect, useMemo, useState } from "react";
import OnboardingShell from "@/components/OnboardingShell";
import { getOrCreateAnonId, generateAnonName } from "@/lib/guest";
import { supabase } from "@/lib/supabase";
import {
  EMPTY_PROFILE,
  Profile,
  calcAgeFromBirthdate,
  formatBirthInputToISO,
  getProfileByIdentity,
  upsertProfileByIdentity,
  Gender,
  Seeking,
  Intent,
} from "@/lib/profile";

type Step =
  | "rules"
  | "name"
  | "birth"
  | "gender"
  | "seeking"
  | "intent"
  | "distance"
  | "photos";

const intents: { id: Intent; label: string; emoji: string }[] = [
  { id: "long_term", label: "Long-term partner", emoji: "💘" },
  { id: "long_term_open", label: "Long-term, open to short", emoji: "😍" },
  { id: "short_term_open", label: "Short-term, open to long", emoji: "🥂" },
  { id: "short_term", label: "Short-term fun", emoji: "🎉" },
  { id: "friends", label: "New friends", emoji: "👋" },
  { id: "figuring_out", label: "Still figuring it out", emoji: "🤔" },
];

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: any;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? "border-pink-500 bg-pink-500/10"
          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
      }`}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  disabled,
  children,
  onClick,
}: {
  disabled?: boolean;
  children: any;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-full px-5 py-4 text-lg font-semibold transition ${
        disabled
          ? "bg-zinc-700/40 text-zinc-400"
          : "bg-white text-zinc-900 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function computeNextStep(profile: Profile): Step {
  if (!profile.first_name?.trim()) return "name";
  if (!profile.birthdate || calcAgeFromBirthdate(profile.birthdate) < 18)
    return "birth";
  if (!profile.gender) return "gender";
  if (!profile.seeking) return "seeking";
  if (!profile.intent) return "intent";
  if (!profile.distance_km) return "distance";
  if (!profile.photo1_url) return "photos";
  return "photos";
}

export default function OnboardingClient() {

  
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [step, setStep] = useState<Step>("rules");
  const [p, setP] = useState<Profile>(EMPTY_PROFILE);
  const [birthInput, setBirthInput] = useState(""); // DD/MM/YYYY

  const [userId, setUserId] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string>("");

  // ✅ keep userId synced (google auth sometimes arrives after first render)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMounted(true);

    (async () => {
   // 1) session/user
const { data: sess } = await supabase.auth.getSession();
const uid = sess.session?.user?.id ?? null;
setUserId(uid);

// 2) anon id
const a = getOrCreateAnonId();
setAnonId(a);

// ✅ 3) ENSURE ROW EXISTS (და თუ uid არის, მაშინვე bind)
await upsertProfileByIdentity({
  anon_id: a,
  user_id: uid ?? null,
  age: 18,
} as any);

// 4) ახლა უკვე წაიკითხე profile
const { data } = await getProfileByIdentity({
  user_id: uid ?? undefined,
  anon_id: a,
      });

      if (data) {
        const merged: Profile = {
          ...EMPTY_PROFILE,
          ...data,

          // 🔑 identities
          anon_id: data.anon_id ?? a,
          user_id: (data.user_id ?? uid ?? null) as any,

          // 👤 basic info
          nickname: data.nickname ?? generateAnonName(),
          first_name: data.first_name ?? "",
          birthdate: data.birthdate ?? "",
          age: ((data.age ?? 18) as number) ?? 18,
          city: data.city ?? "",
          bio: data.bio ?? "",

          // 🧬 preferences
          gender: (data.gender as any) ?? "",
          show_gender: Boolean(data.show_gender),
          seeking: (data.seeking as any) ?? "everyone",
          intent: (data.intent as any) ?? "",

          // 📍 distance
          distance_km: data.distance_km ?? 50,

          // 🖼 photos
          photo1_url: data.photo1_url ?? "",
          photo2_url: data.photo2_url ?? "",
          photo3_url: data.photo3_url ?? "",
          photo4_url: data.photo4_url ?? "",
          photo5_url: data.photo5_url ?? "",
          photo6_url: data.photo6_url ?? "",

          // ✅ flags
          onboarding_step: data.onboarding_step ?? 1,
          onboarding_completed: Boolean(data.onboarding_completed),
        };

        setP(merged);

        // ✅ თუ user უკვე logined-ია და ეს პროფილი anon-ზე იყო → მივაბათ user_id
      if (uid) {
  await upsertProfileByIdentity({
    anon_id: a,
    user_id: uid,
    age: merged.age ?? 18,
  } as any);
        }

        // ✅ მეორე შესვლაზე: დასრულებულია + photo1 აქვს -> პირდაპირ PROFILE (არა feed)
      const shouldSkipOnboarding =
  merged.onboarding_completed === true &&
  (merged.onboarding_step ?? 0) >= 8 &&
  Boolean(merged.photo1_url) &&
  Boolean(merged.first_name?.trim()) &&
  Boolean(merged.birthdate) &&
  Boolean(merged.gender) &&
  Boolean(merged.seeking) &&
  Boolean(merged.intent) &&
  Boolean(merged.distance_km);



        const next = computeNextStep(merged);
        setStep(next);

        if (merged.birthdate) {
          const [yyyy, mm, dd] = merged.birthdate.split("-");
          if (yyyy && mm && dd) setBirthInput(`${dd}/${mm}/${yyyy}`);
        }
      } else {
        // ჯერ არ აქვს პროფილი — ლოკალურად ვამზადებთ
        setP((prev) => ({
          ...prev,
          anon_id: a,
          user_id: uid,
          nickname: generateAnonName(),
          age: 18,
          distance_km: 50,
        }));
        setStep("rules");
      }

      setLoading(false);
    })();
  }, []);

  const canNext = useMemo(() => {
    if (step === "rules") return true;
    if (step === "name") return p.first_name.trim().length >= 2;
    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return false;
      return calcAgeFromBirthdate(iso) >= 18;
    }
    if (step === "gender") return Boolean(p.gender);
    if (step === "seeking") return Boolean(p.seeking);
    if (step === "intent") return Boolean(p.intent);
    if (step === "distance")
      return (p.distance_km ?? 0) >= 5 && (p.distance_km ?? 0) <= 200;
    if (step === "photos") return Boolean(p.photo1_url);
    return true;
  }, [step, p, birthInput]);
async function savePartial(payload: Partial<Profile>) {
  setSaving(true);
  setMsg("");

  const { data: gu, error: guErr } = await supabase.auth.getUser();
  const uid = gu?.user?.id ?? null;

  const base: any = {
    anon_id: anonId || p.anon_id,
    user_id: uid,
    ...payload,
  };

  console.log("SAVE_PARTIAL payload:", base);
  if (guErr) console.log("getUser error:", guErr);

  const { data, error } = await upsertProfileByIdentity(base);

  console.log("UPSERT result:", { data, error });

  if (error) {
    console.error(error);
    setMsg("DB ERROR: " + error.message);
  }

  setSaving(false);
  }

  // ✅ Upload helper: 6 slot, Storage -> public URL -> save DB
  async function uploadToStorage(file: File, slot: 1 | 2 | 3 | 4 | 5 | 6) {
    if (!file) return;

    setSaving(true);
    setMsg("");

    try {
      const uid =
        userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

      const owner = uid ?? anonId;
      if (!owner) throw new Error("No user/anon id");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${owner}/photo${slot}-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos") // bucket name
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("No public URL");

      const key = `photo${slot}_url` as const;

      // UI update
      setP((prev) => ({ ...prev, [key]: publicUrl } as any));

      // DB save immediately
      await savePartial({ [key]: publicUrl } as any);

      setMsg(`Photo ${slot} saved ✅`);
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    setMsg("");

    if (step === "rules") return setStep("name");

    if (step === "name") {
      const first_name = p.first_name.trim();
      if (first_name.length < 2) return;
      await savePartial({
        first_name,
        nickname: p.nickname || generateAnonName(),
        onboarding_step: 2,
      });
      return setStep("birth");
    }

    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return;
      const age = calcAgeFromBirthdate(iso);
      if (age < 18) return setMsg("18+ უნდა იყო 🙂");

      await savePartial({ birthdate: iso, age, onboarding_step: 3 });
      return setStep("gender");
    }

    if (step === "gender") {
      await savePartial({
        gender: p.gender as any,
        show_gender: p.show_gender,
        onboarding_step: 4,
      });
      return setStep("seeking");
    }

    if (step === "seeking") {
      await savePartial({ seeking: p.seeking, onboarding_step: 5 });
      return setStep("intent");
    }

    if (step === "intent") {
      await savePartial({ intent: p.intent as any, onboarding_step: 6 });
      return setStep("distance");
    }

    if (step === "distance") {
      await savePartial({ distance_km: p.distance_km, onboarding_step: 7 });
      return setStep("photos");
    }

if (step === "photos") {
  if (!p.photo1_url) {
    setMsg("Photo 1 აუცილებელია ✅");
    return;
  }









  

  // 1️⃣ ჯერ ჩვეულებრივი save (როგორც უკვე გაქვს)
  await savePartial({
    photo1_url: p.photo1_url,
    photo2_url: p.photo2_url,
    photo3_url: p.photo3_url,
    photo4_url: p.photo4_url,
    photo5_url: p.photo5_url,
    photo6_url: p.photo6_url,
    onboarding_step: 8,
    onboarding_completed: true,
  });
// 2️⃣ FORCE UPDATE — reliable + debuggable ✅
const { data: gu, error: guErr } = await supabase.auth.getUser();
if (guErr) console.error("getUser error:", guErr);

const uid = gu?.user?.id ?? null;

const patch = {
  onboarding_step: 8,
  onboarding_completed: true,
  ...(uid ? { user_id: uid } : {}),
};

// 1) try by anon_id first
let q = supabase.from("profiles").update(patch).eq("anon_id", anonId).select().maybeSingle();
let { data: updData, error: updErr } = await q;

console.log("FORCE UPDATE by anon_id:", { updData, updErr, anonId, uid });

if (updErr) {
  setMsg("Update error: " + updErr.message);
  return;
}

// 2) if matched 0 rows and we have uid, try by user_id
if (!updData && uid) {
  const retry = await supabase
    .from("profiles")
    .update({ onboarding_step: 8, onboarding_completed: true })
    .eq("user_id", uid)
    .select()
    .maybeSingle();

  updData = retry.data;
  updErr = retry.error;

  console.log("FORCE UPDATE by user_id:", { updData, updErr, uid });

  if (updErr) {
    setMsg("Update error: " + updErr.message);
    return;
  }
}

if (!updData) {
  setMsg("Update matched 0 rows ❗ (anon_id/user_id mismatch ან RLS)");
  return;
}


  // 3️⃣ მერე გადავდივართ პროფილზე
  window.location.replace("/profile");
    }
  }

  if (!mounted) return null;

  if (loading) {const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

    return (
      <main className="min-h-[100svh] bg-zinc-950 text-white">
        <div className="mx-auto max-w-md px-5 py-8">
          <div className="h-7 w-44 animate-pulse rounded bg-zinc-800" />
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      </main>
    );
  }

  if (step === "rules") {
    return (
      <OnboardingShell
        title="Welcome 👋"
        subtitle="Please follow these House Rules."
        footer={
          <PrimaryButton disabled={saving} onClick={goNext}>
            I agree
          </PrimaryButton>
        }
      >
        <div className="space-y-4 text-zinc-300">
          <div>
            <div className="font-semibold text-white">Be yourself.</div>
            <div className="text-sm text-zinc-400">
              Make sure your profile is true to who you are.
            </div>
          </div>
          <div>
            <div className="font-semibold text-white">Stay safe.</div>
            <div className="text-sm text-zinc-400">
              Don’t be too quick to share personal info.
            </div>
          </div>
          <div>
            <div className="font-semibold text-white">Play it cool.</div>
            <div className="text-sm text-zinc-400">Respect others.</div>
          </div>
          <div>
            <div className="font-semibold text-white">Be proactive.</div>
            <div className="text-sm text-zinc-400">Report bad behavior.</div>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  if (step === "name") {
    return (
      <OnboardingShell
        title="What’s your first name?"
        subtitle="This is how it’ll appear on your profile."
      >
        <input
          className="w-full rounded-xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
          placeholder="Enter first name"
          value={p.first_name}
          onChange={(e) => setP({ ...p, first_name: e.target.value })}
        />
        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  if (step === "birth") {
    return (
      <OnboardingShell
        title="Your b-day?"
        subtitle="Your profile shows your age, not your birth date."
      >
        <input
          inputMode="numeric"
          className="w-full rounded-xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800 outline-none focus:ring-zinc-600"
          placeholder="DD/MM/YYYY"
          value={birthInput}
          onChange={(e) => setBirthInput(e.target.value)}
        />
        <div className="text-xs text-zinc-400">
          {(() => {
            const iso = formatBirthInputToISO(birthInput);
            if (!iso) return "Format: 12/03/2002";
            const a = calcAgeFromBirthdate(iso);
            return a < 18 ? "18+ აუცილებელია 🙂" : `Age: ${a}`;
          })()}
        </div>
        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  if (step === "gender") {
    return (
      <OnboardingShell
        title="What’s your gender?"
        subtitle="Select one to help us show you to the right people."
      >
        <div className="space-y-3">
          {(["male", "female", "nonbinary"] as Gender[]).map((g) => (
            <Pill
              key={g}
              active={p.gender === g}
              onClick={() => setP({ ...p, gender: g })}
            >
              <div className="text-lg font-semibold capitalize">{g}</div>
            </Pill>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={p.show_gender}
            onChange={(e) => setP({ ...p, show_gender: e.target.checked })}
          />
          Show gender on profile
        </label>

        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  if (step === "seeking") {
    return (
      <OnboardingShell
        title="Who are you interested in seeing?"
        subtitle="This controls your feed filter."
      >
        <div className="space-y-3">
          {(["male", "female", "nonbinary", "everyone"] as Seeking[]).map(
            (s) => (
              <Pill
                key={s}
                active={p.seeking === s}
                onClick={() => setP({ ...p, seeking: s })}
              >
                <div className="text-lg font-semibold capitalize">{s}</div>
              </Pill>
            )
          )}
        </div>
        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  if (step === "intent") {
    return (
      <OnboardingShell
        title="What are you looking for?"
        subtitle="Pick one (you can change later)."
      >
        <div className="grid grid-cols-2 gap-3">
          {intents.map((it) => (
            <button
              key={it.id}
              onClick={() => setP({ ...p, intent: it.id })}
              className={`rounded-2xl border p-4 text-left transition ${
                p.intent === it.id
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
              }`}
            >
              <div className="text-2xl">{it.emoji}</div>
              <div className="mt-2 text-sm font-semibold">{it.label}</div>
            </button>
          ))}
        </div>
        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  if (step === "distance") {
    return (
      <OnboardingShell
        title="Your distance preference?"
        subtitle="Set the maximum distance for matches."
      >
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>Distance Preference</span>
            <span className="text-white">{p.distance_km} km</span>
          </div>
          <input
            type="range"
            min={5}
            max={200}
            value={p.distance_km}
            onChange={(e) =>
              setP({ ...p, distance_km: Number(e.target.value) })
            }
            className="mt-4 w-full"
          />
          <div className="mt-2 text-center text-xs text-zinc-500">
            You can change preferences later in Settings
          </div>
        </div>

        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Next
        </PrimaryButton>
        {msg && <p className="text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  // photos
  return (
    <OnboardingShell
      title="Add your recent pics"
      subtitle="Photo 1 is required. Add more to stand out."
    >
      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3, 4, 5, 6] as const).map((i) => {
          const key = `photo${i}_url` as const;
          const url = (p as any)[key] as string;

          return (
            <label
              key={i}
              className={`relative aspect-[3/4] rounded-2xl border cursor-pointer overflow-hidden ${
                i === 1 && !p.photo1_url
                  ? "border-pink-500/70"
                  : "border-zinc-800"
              } bg-zinc-900/30`}
              title={`Upload Photo ${i}`}
            >
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <span className="text-2xl">＋</span>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadToStorage(f, i);
                  e.currentTarget.value = "";
                }}
              />

              <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">
                {i === 1 ? "Photo 1 (required)" : `Photo ${i}`}
              </div>
            </label>
          );
        })}
      </div>

      <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
        Finish & Go to Profile 🔥
      </PrimaryButton>
      {msg && <p className="text-sm text-zinc-300">{msg}</p>}
    </OnboardingShell>
  );
}
