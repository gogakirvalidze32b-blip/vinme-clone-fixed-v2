"use client";

import { useEffect, useMemo, useState } from "react";
import OnboardingShell from "@/components/OnboardingShell";
import { photoSrc } from "@/lib/photos";
import { getOrCreateAnonId, generateAnonName } from "@/lib/guest";
import { supabase } from "@/lib/supabase";

import {
  EMPTY_PROFILE,
  Profile,
  calcAgeFromBirthdate,
  formatBirthInputToISO,
  getProfileByIdentity,
  upsertProfileByIdentity,
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
      type="button"
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
      type="button"
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

// ✅ ONLY change: auto-format DD/MM/YYYY, digits-only, auto-insert "/"
function formatDMYInput(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);

  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

function computeNextStep(profile: Profile): Step {
  if (!profile.first_name?.trim()) return "name";

  // ✅ ONLY change: TS-safe (age may be invalid/null depending on helper)
  const a = profile.birthdate ? calcAgeFromBirthdate(profile.birthdate) : null;
  if (!profile.birthdate || a == null || a < 18) return "birth";

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
  const [birthInput, setBirthInput] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string>("");



  useEffect(() => setMounted(true), []);

  // keep userId synced
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // init
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg("");

        const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = sess.session?.user?.id ?? null;
        if (alive) setUserId(uid);

        const a = getOrCreateAnonId();
        if (alive) setAnonId(a);

        // ✅ ensure user row exists if logged in (this is key)
        if (uid) {
          await upsertProfileByIdentity({
            user_id: uid,
            anon_id: a,
          } as any);
        } else {
          // anon-only (guest)
          await upsertProfileByIdentity({
            anon_id: a,
            user_id: null,
          } as any);
        }

        // ✅ always read by identity (prefers user_id)
        const { data, error: gErr } = await getProfileByIdentity({
          user_id: uid ?? undefined,
          anon_id: a,
        });
        if (gErr) throw gErr;

        if (data) {
          const merged: Profile = {
            ...EMPTY_PROFILE,
            ...data,

            anon_id: data.anon_id ?? a,
            user_id: (data.user_id ?? uid ?? null) as any,

            nickname: data.nickname ?? generateAnonName(),
            first_name: data.first_name ?? "",
            birthdate: data.birthdate ?? "",
age: calcAgeFromBirthdate(data.birthdate ?? null),
            bio: data.bio ?? "",

            gender: (data.gender as any) ?? "",
            show_gender: Boolean(data.show_gender),
            seeking: (data.seeking as any) ?? "everyone",
            intent: (data.intent as any) ?? "",

            distance_km: data.distance_km ?? 50,

            photo1_url: data.photo1_url ?? "",
            photo2_url: data.photo2_url ?? "",
            photo3_url: data.photo3_url ?? "",
            photo4_url: data.photo4_url ?? "",
            photo5_url: data.photo5_url ?? "",
            photo6_url: data.photo6_url ?? "",

            onboarding_step: data.onboarding_step ?? 1,
            onboarding_completed: Boolean(data.onboarding_completed),
          };

          if (alive) setP(merged);

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

          if (shouldSkipOnboarding) {
            window.location.replace("/feed");
            return;
          }

          const next = computeNextStep(merged);
          if (alive) setStep(next);

          if (merged.birthdate) {
            const [yyyy, mm, dd] = merged.birthdate.split("-");
            if (yyyy && mm && dd && alive) setBirthInput(`${dd}/${mm}/${yyyy}`);
          }
        }
      } catch (e: any) {
        console.error("ONBOARDING INIT ERROR:", e);
        if (alive) setMsg(e?.message ?? "Init failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const canNext = useMemo(() => {
    if (step === "rules") return true;
    if (step === "name") return p.first_name.trim().length >= 2;
    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return false;
      const a = calcAgeFromBirthdate(iso);
      return a != null && a >= 18;
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

    const uid = userId ?? null;
    const base: any = {
      anon_id: anonId || p.anon_id,
      user_id: uid,
      ...payload,
    };

    try {
      // ✅ one reliable write path: upsert by identity
      const { data, error } = await upsertProfileByIdentity(base);
      if (error) throw error;
      if (data) setP((prev) => ({ ...prev, ...data } as any));
    } catch (e: any) {
      console.error("savePartial error:", e);
      setMsg("DB ERROR: " + (e?.message ?? "Unknown error"));
    } finally {
      setSaving(false);
    }
  }



async function uploadToStorage(file: File, slot: 1 | 2 | 3 | 4 | 5 | 6) {
  if (!file) return;

  setSaving(true);
  setMsg("");

  try {
    const uid =
  userId ??
  (await supabase.auth.getUser()).data.user?.id ??
  null;

    const owner = uid ?? anonId;
    if (!owner) throw new Error("No user/anon id");

    const bucket = "photos";
    const ext = file.name.split(".").pop() || "jpg";
    const stamp = Date.now();

    const key = `photo${slot}_url` as const;
    const objectKey = `${owner}/photo${slot}-${stamp}.${ext}`;
    const path = `${bucket}/${objectKey}`; // ✅ DB-ში ეს ინახება

    // ✅ upload: key უნდა იყოს bucket-ის შიგნით (არავითარი "photos/" წინ)
    const { error: upErr } = await supabase.storage
  .from(bucket)
  .upload(objectKey, file, { upsert: true });


    if (upErr) throw upErr;

    const cleanPath = path.replace(/\r?\n/g, "").trim();

    setP((prev) => ({ ...prev, [key]: cleanPath } as any));
    await savePartial({ [key]: cleanPath } as any);
  } catch (e: any) {
    console.error("upload error:", e);
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
        nickname: first_name,
        onboarding_step: 2,
      });

      return setStep("birth");
    }

    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return;

      const age = calcAgeFromBirthdate(iso);
      if (age == null) return;
      if (age < 18) return setMsg("18+ უნდა იყო 🙂");

    await savePartial({
  birthdate: iso,
  onboarding_step: 3,
});
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

    // ✅ STEP 8 finish: WRITE TO user_id row (prevents feed/onboarding loop)
    if (step === "photos") {
      if (!p.photo1_url) {
        setMsg("Photo 1 აუცილებელია ✅");
        return;
      }

      setSaving(true);
      setMsg("");

      try {
const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = sess.session?.user?.id ?? null;
        if (!uid) {
          setMsg("Auth session missing ❌ (გაიარე Google login თავიდან)");
          return;
        }

        const { data, error } = await upsertProfileByIdentity({
          user_id: uid,
          anon_id: anonId || p.anon_id,
          photo1_url: p.photo1_url,
          photo2_url: p.photo2_url,
          photo3_url: p.photo3_url,
          photo4_url: p.photo4_url,
          photo5_url: p.photo5_url,
          photo6_url: p.photo6_url,
          onboarding_step: 8,
          onboarding_completed: true,
        } as any);

        if (error) throw error;
        if (data) setP((prev) => ({ ...prev, ...data } as any));

        window.location.replace("/feed");
        return;
      } catch (e: any) {
        console.error("finish onboarding error:", e);
        setMsg(e?.message ?? "Finish failed");
      } finally {
        setSaving(false);
      }
    }
  }

  if (!mounted) return null;

  if (loading) {
    return (
      <OnboardingShell title="Loading..." subtitle="Please wait 🙏">
        <div className="text-center text-zinc-400">Loading…</div>
        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    );
  }

  // ----------------------------
  // UI STEPS (your existing UI)
  // ----------------------------

  if (step === "rules") {
    return (
      <OnboardingShell
        title="Quick rules"
        subtitle="Be respectful, no spam, and stay safe 🙂"
      >
        <div className="space-y-3 text-sm text-zinc-300">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            ✅ No hate / harassment <br />
            ✅ No scams / spam <br />
            ✅ Use recent photos
          </div>

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            I agree ✅
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "name") {
    return (
      <OnboardingShell title="Your name" subtitle="What should we call you?">
        <div className="space-y-4">
          <input
            value={p.first_name}
            onChange={(e) =>
              setP((prev) => ({ ...prev, first_name: e.target.value } as any))
            }
            placeholder="Enter your name"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-white outline-none"
          />

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "birth") {
    return (
      <OnboardingShell
        title="Your birthday"
        subtitle="You must be 18+ (DD/MM/YYYY)"
      >
        <div className="space-y-4">
          <input
            value={birthInput}
            onChange={(e) => setBirthInput(formatDMYInput(e.target.value))}
            placeholder="DD/MM/YYYY"
            inputMode="numeric"
            maxLength={10}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-white outline-none"
          />

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "gender") {
    return (
      <OnboardingShell title="Your gender" subtitle="Choose what fits you">
        <div className="space-y-3">
          <Pill
            active={p.gender === "male"}
            onClick={() => setP((prev) => ({ ...prev, gender: "male" } as any))}
          >
            👨 Male
          </Pill>
          <Pill
            active={p.gender === "female"}
            onClick={() =>
              setP((prev) => ({ ...prev, gender: "female" } as any))
            }
          >
            👩 Female
          </Pill>
          <Pill
            active={p.gender === "nonbinary"}
            onClick={() =>
              setP((prev) => ({ ...prev, gender: "nonbinary" } as any))
            }
          >
            🌈 Non-binary
          </Pill>

          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={Boolean(p.show_gender)}
              onChange={(e) =>
                setP((prev) => ({
                  ...prev,
                  show_gender: e.target.checked,
                }))
              }
            />
            Show gender on profile
          </div>

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "seeking") {
    return (
      <OnboardingShell title="Looking for" subtitle="Who do you want to see?">
        <div className="space-y-3">
          <Pill
            active={p.seeking === "everyone"}
            onClick={() =>
              setP((prev) => ({ ...prev, seeking: "everyone" } as any))
            }
          >
            🌍 Everyone
          </Pill>
          <Pill
            active={p.seeking === "male"}
            onClick={() => setP((prev) => ({ ...prev, seeking: "male" } as any))}
          >
            👨 Men
          </Pill>
          <Pill
            active={p.seeking === "female"}
            onClick={() =>
              setP((prev) => ({ ...prev, seeking: "female" } as any))
            }
          >
            👩 Women
          </Pill>
          <Pill
            active={p.seeking === "nonbinary"}
            onClick={() =>
              setP((prev) => ({ ...prev, seeking: "nonbinary" } as any))
            }
          >
            🌈 Non-binary
          </Pill>

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "intent") {
    return (
      <OnboardingShell title="Intent" subtitle="What are you here for?">
        <div className="space-y-3">
          {intents.map((it) => (
            <Pill
              key={it.id}
              active={p.intent === it.id}
              onClick={() => setP((prev) => ({ ...prev, intent: it.id } as any))}
            >
              <div className="text-base font-semibold">
                {it.emoji} {it.label}
              </div>
            </Pill>
          ))}

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
      </OnboardingShell>
    );
  }

  if (step === "distance") {
    return (
      <OnboardingShell title="Distance" subtitle="How far should we search?">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-sm text-zinc-300 mb-2">
              Distance: <span className="font-semibold">{p.distance_km} km</span>
            </div>

            <input
              type="range"
              min={5}
              max={200}
              value={p.distance_km ?? 50}
              onChange={(e) =>
                setP((prev) => ({
                  ...prev,
                  distance_km: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Continue →
          </PrimaryButton>

          {msg && <p className="text-sm text-zinc-300">{msg}</p>}
        </div>
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
    
   const raw = (p as any)[key] as string | null | undefined;
const src = photoSrc(raw);

// ✅ ეს ლოგები გვაჩვენებს უხილავ სიმბოლოებს (\n, space, etc)



    return (
      <label
        key={i}
        className={`relative aspect-[3/4] rounded-2xl border cursor-pointer overflow-hidden ${
          i === 1 && !p.photo1_url ? "border-pink-500/70" : "border-zinc-800"
        } bg-zinc-900/30`}
        title={`Upload Photo ${i}`}
      >
  {src ? (
  <img
    src={src}
    alt=""
    className="h-full w-full object-cover"
    onError={(e) => {
      (e.currentTarget as HTMLImageElement).src = "";
    }}
  />
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
        Finish &amp; Go to Feed 🔥
      </PrimaryButton>

      {msg && <p className="text-sm text-zinc-300">{msg}</p>}
    </OnboardingShell>
  );
}
