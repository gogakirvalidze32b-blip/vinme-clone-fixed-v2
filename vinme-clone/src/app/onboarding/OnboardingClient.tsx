"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  stripNullish,
  Gender,
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

  const a = profile.birthdate ? calcAgeFromBirthdate(profile.birthdate) : null;
  if (!profile.birthdate || a == null || a < 18) return "birth";
  if (!profile.gender) return "gender";
  if (!profile.seeking) return "seeking";
  if (!profile.intent) return "intent";
  if (!profile.distance_km) return "distance";
  if (!profile.photo1_url) return "photos";
  return "photos";
}

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

export default function OnboardingClient() {
  const router = useRouter();

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

        // ✅ ensure profile row exists (user or guest)
        await upsertProfileByIdentity({
          user_id: uid ?? null,
          anon_id: a,
        } as any);

        const { data, error: gErr } = await getProfileByIdentity({
          user_id: uid ?? undefined,
          anon_id: a,
        });
        if (gErr) throw gErr;

        const merged: Profile = {
          ...EMPTY_PROFILE,
          ...(data ?? {}),
          anon_id: (data?.anon_id ?? a) as any,
          user_id: (data?.user_id ?? uid ?? null) as any,

          nickname: (data?.nickname ?? generateAnonName()) as any,
          first_name: (data?.first_name ?? "") as any,
          birthdate: (data?.birthdate ?? "") as any,
          age: data?.birthdate ? calcAgeFromBirthdate(data.birthdate) : null,

          bio: (data?.bio ?? "") as any,

          gender: ((data as any)?.gender ?? "") as any,
          show_gender: Boolean((data as any)?.show_gender),
          seeking: ((data as any)?.seeking ?? "everyone") as any,
          intent: ((data as any)?.intent ?? "") as any,

          distance_km: (data as any)?.distance_km ?? 50,

          photo1_url: (data as any)?.photo1_url ?? "",
          photo2_url: (data as any)?.photo2_url ?? "",
          photo3_url: (data as any)?.photo3_url ?? "",
          photo4_url: (data as any)?.photo4_url ?? "",
          photo5_url: (data as any)?.photo5_url ?? "",
          photo6_url: (data as any)?.photo6_url ?? "",

          onboarding_step: (data as any)?.onboarding_step ?? 1,
          onboarding_completed: Boolean((data as any)?.onboarding_completed),
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
          router.replace("/feed");
          return;
        }

        const next = computeNextStep(merged);
        if (alive) setStep(next);

        if (merged.birthdate) {
          const [yyyy, mm, dd] = merged.birthdate.split("-");
          if (yyyy && mm && dd && alive) setBirthInput(`${dd}/${mm}/${yyyy}`);
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
  }, [router]);

  const canNext = useMemo(() => {
    if (step === "rules") return true;

    if (step === "name") return (p.first_name?.trim().length ?? 0) >= 2;

    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return false;
      const a = calcAgeFromBirthdate(iso);
      return a != null && a >= 18;
    }

    if (step === "gender") return Boolean(p.gender);
    if (step === "seeking") return Boolean((p as any).seeking);
    if (step === "intent") return Boolean((p as any).intent);

    if (step === "distance") {
      const km = (p as any).distance_km ?? 0;
      return km >= 5 && km <= 200;
    }

    if (step === "photos") return Boolean((p as any).photo1_url);

    return true;
  }, [step, p, birthInput]);

  async function savePartial(payload: Partial<Profile>) {
    setSaving(true);
    setMsg("");

    try {
      const uid =
        userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

      const patch = stripNullish({
        ...(payload as any),
        user_id: uid,
        anon_id: anonId || (p as any).anon_id,
      });

      const { data, error } = await upsertProfileByIdentity(patch as any);
      if (error) throw error;

      if (data) setP((prev) => ({ ...prev, ...(data as any) }));
      else setP((prev) => ({ ...prev, ...(payload as any) }));
    } catch (e: any) {
      console.error("savePartial error:", e);
      setMsg(e?.message ?? "Save failed");
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
        userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;

      const owner = uid ?? anonId;
      if (!owner) throw new Error("No user/anon id");

      const bucket = "photos";
      const ext = file.name.split(".").pop() || "jpg";
      const stamp = Date.now();

      const key = `photo${slot}_url` as const;
      const objectKey = `${owner}/photo${slot}-${stamp}.${ext}`;
      const dbPath = `${bucket}/${objectKey}`; // ✅ DB-ში PATH ინახება

      // ✅ upload inside bucket (NO "photos/" prefix here)
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(objectKey, file, { upsert: true });

      if (upErr) throw upErr;

      const cleanPath = dbPath.replace(/\r?\n/g, "").trim();

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

    // 1) rules
    if (step === "rules") {
      setStep("name");
      return;
    }

    // 2) name
    if (step === "name") {
      const first_name = (p.first_name ?? "").trim();
      if (first_name.length < 2) return;

      setP((prev) => ({ ...prev, first_name, nickname: prev.nickname ?? first_name }));
      await savePartial({ first_name, nickname: p.nickname ?? first_name, onboarding_step: 2 } as any);

      setStep("birth");
      return;
    }

    // 3) birth
    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return;

      const age = calcAgeFromBirthdate(iso);
      if (age == null) return;

      if (age < 18) {
        setMsg("18+ უნდა იყო 🙂");
        return;
      }

      setP((prev) => ({ ...prev, birthdate: iso, age } as any));
      await savePartial({ birthdate: iso, age, onboarding_step: 3 } as any);

      setStep("gender");
      return;
    }

    // 4) gender
    if (step === "gender") {
      await savePartial({
        gender: (p as any).gender,
        show_gender: (p as any).show_gender ?? false,
        onboarding_step: 4,
      } as any);

      setStep("seeking");
      return;
    }

    // 5) seeking
    if (step === "seeking") {
      await savePartial({ seeking: (p as any).seeking, onboarding_step: 5 } as any);
      setStep("intent");
      return;
    }

    // 6) intent
    if (step === "intent") {
      await savePartial({ intent: (p as any).intent, onboarding_step: 6 } as any);
      setStep("distance");
      return;
    }

    // 7) distance
    if (step === "distance") {
      await savePartial({
        distance_km: (p as any).distance_km ?? 50,
        onboarding_step: 7,
      } as any);
      setStep("photos");
      return;
    }

    // 8) photos finish -> feed
    if (step === "photos") {
      if (!(p as any).photo1_url) {
        setMsg("Photo 1 აუცილებელია ✅");
        return;
      }

      setSaving(true);
      setMsg("");

      try {
        const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = sess.session?.user?.id ?? null;
        if (!uid) throw new Error("Auth session missing ❌");

        const finalPayload = stripNullish({
          user_id: uid,
          anon_id: anonId || (p as any).anon_id,

          first_name: (p.first_name ?? "").trim() || (p.nickname ?? ""),
          nickname: (p.nickname ?? "").trim() || (p.first_name ?? ""),

          birthdate: (p as any).birthdate,
          age: (p as any).age,

          bio: (p as any).bio ?? "",
          city: (p as any).city ?? null,

          gender: (p as any).gender,
          show_gender: (p as any).show_gender ?? false,
          seeking: (p as any).seeking,
          intent: (p as any).intent,
          distance_km: (p as any).distance_km ?? 50,

          photo1_url: (p as any).photo1_url,
          photo2_url: (p as any).photo2_url,
          photo3_url: (p as any).photo3_url,
          photo4_url: (p as any).photo4_url,
          photo5_url: (p as any).photo5_url,
          photo6_url: (p as any).photo6_url,

          onboarding_step: 8,
          onboarding_completed: true,
        });

        const { data, error } = await upsertProfileByIdentity(finalPayload as any);
        if (error) throw error;
        if (data) setP((prev) => ({ ...prev, ...(data as any) }));

        router.replace("/feed");
      } catch (e: any) {
        console.error("finish onboarding error:", e);
        setMsg(e?.message ?? "Finish failed");
      } finally {
        setSaving(false);
      }

      return;
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
  // UI STEPS
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
            value={p.first_name ?? ""}
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
      <OnboardingShell
        title="What’s your gender?"
        subtitle="Select one to help us show you to the right people."
      >
        <div className="space-y-3">
          {(["male", "female", "nonbinary"] as Gender[]).map((g) => (
            <Pill
              key={g}
              active={(p as any).gender === g}
              onClick={() => setP((prev) => ({ ...prev, gender: g } as any))}
            >
              <div className="text-lg font-semibold capitalize">{g}</div>
            </Pill>
          ))}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={(p as any).show_gender ?? false}
            onChange={(e) =>
              setP((prev) => ({ ...prev, show_gender: e.target.checked } as any))
            }
          />
          Show gender on profile
        </label>

        <div className="mt-4">
          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Next
          </PrimaryButton>
        </div>

        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
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
          {(["male", "female", "nonbinary", "everyone"] as const).map((s) => (
            <Pill
              key={s}
              active={(p as any).seeking === s}
              onClick={() => setP((prev) => ({ ...prev, seeking: s } as any))}
            >
              <div className="text-lg font-semibold capitalize">{s}</div>
            </Pill>
          ))}
        </div>

        <div className="mt-4">
          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Next
          </PrimaryButton>
        </div>

        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
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
              type="button"
              onClick={() => setP((prev) => ({ ...prev, intent: it.id } as any))}
              className={`rounded-2xl border p-4 text-left transition ${
                (p as any).intent === it.id
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
              }`}
            >
              <div className="text-2xl">{it.emoji}</div>
              <div className="mt-2 text-sm font-semibold">{it.label}</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Next
          </PrimaryButton>
        </div>

        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
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
            <span className="text-white">{(p as any).distance_km ?? 50} km</span>
          </div>

          <input
            type="range"
            min={5}
            max={200}
            value={(p as any).distance_km ?? 50}
            onChange={(e) =>
              setP((prev) => ({
                ...prev,
                distance_km: Number(e.target.value),
              } as any))
            }
            className="mt-4 w-full"
          />

          <div className="mt-2 text-center text-xs text-zinc-500">
            You can change preferences later in Settings
          </div>
        </div>

        <div className="mt-4">
          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            Next
          </PrimaryButton>
        </div>

        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
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
          const path = (p as any)[key] as string;
          const url = photoSrc(path);

          return (
            <label
              key={i}
              className={`relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border ${
                i === 1 && !(p as any).photo1_url
                  ? "border-pink-500/70"
                  : "border-zinc-800"
              } bg-zinc-900/30`}
              title={`Upload Photo ${i}`}
            >
              {path ? (
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
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

      <div className="mt-4">
        <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
          Finish & Go to Feed 🔥
        </PrimaryButton>
      </div>

      {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
    </OnboardingShell>
  );
}
