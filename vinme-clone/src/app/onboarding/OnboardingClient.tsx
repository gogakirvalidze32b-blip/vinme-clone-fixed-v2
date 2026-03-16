"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import OnboardingShell from "@/components/OnboardingShell";
import LangMenu from "@/components/LangMenu";

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

import { getLang, type Lang } from "@/lib/i18n";

type Step =
  | "rules"
  | "name"
  | "birth"
  | "gender"
  | "seeking"
  | "intent"
  | "distance"
  | "photos";

/** ✅ OUTSIDE component — ასე აღარ “რემაუნთდება” ყოველ ასოზე */
function WithLang({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute right-4 top-4 z-50">
        <LangMenu />
      </div>
      {children}
    </div>
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

  // ✅ LIVE LANG (no reload) — და არ იწვევს input reset-ს
  const [lang, setLang] = useState<Lang>("ka");
  useEffect(() => {
    const sync = () => setLang(getLang());
    sync();
    window.addEventListener("app:lang", sync);
    return () => window.removeEventListener("app:lang", sync);
  }, []);

  // ✅ texts (hook MUST be up here, always)
  const copy = useMemo(() => {
    return lang === "ka"
      ? {
          rules_title: "წესები",
          rules_sub: "იყავი ზრდილობიანი, არ გააკეთო სპამი და იყავი უსაფრთხოდ 🙂",
          agree: "ვეთანხმები ✅",

          name_title: "შენი სახელი",
          name_sub: "როგორ მოგმართოთ?",
          name_ph: "შეიყვანე სახელი",
          cont: "გაგრძელება →",

          birth_title: "დაბადების თარიღი",
          birth_sub: "უნდა იყო 18+ (DD/MM/YYYY)",
          next: "შემდეგი",

          gender_title: "შენი სქესი?",
          gender_sub: "აირჩიე ერთი.",
          show_gender: "სქესი გამოჩნდეს პროფილზე",

          seeking_title: "ვის გინდა ნახვა?",
          seeking_sub: "ეს მართავს feed-ის ფილტრს.",

          intent_title: "რას ეძებ?",
          intent_sub: "აირჩიე ერთი (შეცვლი მერე).",

          distance_title: "დისტანცია?",
          distance_sub: "დააყენე მაქსიმალური დისტანცია.",
          distance_label: "დისტანცია",
          later_settings: "შემდეგში Settings-ში შეცვლი",

          photos_title: "ატვირთე ფოტოები",
          photos_sub: "Photo 1 აუცილებელია. მეტი ფოტო უკეთესია.",
          photo1_req: "Photo 1 (აუცილებელია)",
          photoX: (i: number) => `Photo ${i}`,
          finish: "დასრულება & Feed-ზე გადასვლა 🔥",

          loading_title: "იტვირთება...",
          loading_sub: "მოიცადე 🙏",
          loading_line: "იტვირთება…",

          age18: "18+ უნდა იყო 🙂",
          photo1_need: "Photo 1 აუცილებელია ✅",
        }
      : {
          rules_title: "Quick rules",
          rules_sub: "Be respectful, no spam, and stay safe 🙂",
          agree: "I agree ✅",

          name_title: "Your name",
          name_sub: "What should we call you?",
          name_ph: "Enter your name",
          cont: "Continue →",

          birth_title: "Your birthday",
          birth_sub: "You must be 18+ (DD/MM/YYYY)",
          next: "Next",

          gender_title: "What’s your gender?",
          gender_sub: "Select one to help us show you to the right people.",
          show_gender: "Show gender on profile",

          seeking_title: "Who are you interested in seeing?",
          seeking_sub: "This controls your feed filter.",

          intent_title: "What are you looking for?",
          intent_sub: "Pick one (you can change later).",

          distance_title: "Your distance preference?",
          distance_sub: "Set the maximum distance for matches.",
          distance_label: "Distance Preference",
          later_settings: "You can change preferences later in Settings",

          photos_title: "Add your recent pics",
          photos_sub: "Photo 1 is required. Add more to stand out.",
          photo1_req: "Photo 1 (required)",
          photoX: (i: number) => `Photo ${i}`,
          finish: "Finish & Go to Feed 🔥",

          loading_title: "Loading...",
          loading_sub: "Please wait 🙏",
          loading_line: "Loading…",

          age18: "You must be 18+ 🙂",
          photo1_need: "Photo 1 is required ✅",
        };
  }, [lang]);

  // ✅ intents dynamic labels — hook is UP HERE (not inside if)
  const intents: { id: Intent; label: string; emoji: string }[] = useMemo(() => {
    return lang === "ka"
      ? [
          { id: "long_term", label: "გრძელვადიანი პარტნიორი", emoji: "💘" },
          { id: "long_term_open", label: "გრძელვადიანი, შეიძლება მოკლეც", emoji: "😍" },
          { id: "short_term_open", label: "მოკლე, შეიძლება გრძელიც", emoji: "🥂" },
          { id: "short_term", label: "მოკლე გართობა", emoji: "🎉" },
          { id: "friends", label: "ახალი მეგობრები", emoji: "👋" },
          { id: "figuring_out", label: "ჯერ ვარკვევ", emoji: "🤔" },
        ]
      : [
          { id: "long_term", label: "Long-term partner", emoji: "💘" },
          { id: "long_term_open", label: "Long-term, open to short", emoji: "😍" },
          { id: "short_term_open", label: "Short-term, open to long", emoji: "🥂" },
          { id: "short_term", label: "Short-term fun", emoji: "🎉" },
          { id: "friends", label: "New friends", emoji: "👋" },
          { id: "figuring_out", label: "Still figuring it out", emoji: "🤔" },
        ];
  }, [lang]);

  // ✅ focus fix refs
  const nameRef = useRef<HTMLInputElement | null>(null);
  const birthRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  // ✅ whenever step becomes name/birth → focus once
  useEffect(() => {
    if (!mounted) return;
    if (step === "name") requestAnimationFrame(() => nameRef.current?.focus());
    if (step === "birth") requestAnimationFrame(() => birthRef.current?.focus());
  }, [step, mounted]);

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

        // ensure profile row exists (user or guest)
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
      } {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const canNext = useMemo(() => {
    if (step === "rules") return true;

if (step === "name") {
  const name = p.first_name?.trim() ?? "";
  if (name.length < 2) return false;
  // მხოლოდ ასოები (ქართული, ინგლისური, space)
  if (!/^[\u10D0-\u10FF a-zA-Z\s\-]+$/.test(name)) return false;
  return true;
}

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

  const savePartial = useCallback(
    async (payload: Partial<Profile>) => {
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
      }  {
        setSaving(false);
      }
    },
    [anonId, p, userId]
  );

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
      const dbPath = `${bucket}/${objectKey}`; // ✅ DB-ში PATH

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
    }  {
      setSaving(false);
    }
  }

  async function goNext() {
    setMsg("");

    if (step === "rules") {
      setStep("name");
      return;
    }

if (step === "name") {
  const first_name = (p.first_name ?? "").trim();
  if (first_name.length < 2) return;
  if (!/^[\u10D0-\u10FF a-zA-Z\s\-]+$/.test(first_name)) {
    setMsg(lang === "ka" ? "სახელი მხოლოდ ასოებით უნდა იყოს" : "Name must contain only letters");
    return;
  }

  const nick = (p.nickname ?? "").trim() || first_name;
  setP((prev) => ({ ...prev, first_name, nickname: nick }));
  await savePartial({ first_name, nickname: nick, onboarding_step: 2 } as any);

  setStep("birth");
  return;
}

    if (step === "birth") {
      const iso = formatBirthInputToISO(birthInput);
      if (!iso) return;

      const age = calcAgeFromBirthdate(iso);
      if (age == null) return;

      if (age < 18) {
        setMsg(copy.age18);
        return;
      }

      setP((prev) => ({ ...prev, birthdate: iso, age } as any));
      await savePartial({ birthdate: iso, age, onboarding_step: 3 } as any);

      setStep("gender");
      return;
    }

    if (step === "gender") {
      await savePartial({
        gender: (p as any).gender,
        show_gender: (p as any).show_gender ?? false,
        onboarding_step: 4,
      } as any);

      setStep("seeking");
      return;
    }

    if (step === "seeking") {
      await savePartial({ seeking: (p as any).seeking, onboarding_step: 5 } as any);
      setStep("intent");
      return;
    }

    if (step === "intent") {
      await savePartial({ intent: (p as any).intent, onboarding_step: 6 } as any);
      setStep("distance");
      return;
    }

    if (step === "distance") {
      await savePartial({
        distance_km: (p as any).distance_km ?? 50,
        onboarding_step: 7,
      } as any);
      setStep("photos");
      return;
    }

    if (step === "photos") {
      if (!(p as any).photo1_url) {
        setMsg(copy.photo1_need);
        return;
      }

      setSaving(true);
      setMsg("");

      try {
      const { data: sess, error: sErr } = await supabase.auth.getSession();
if (sErr) throw sErr;

const uid = sess.session?.user?.id ?? null;

// ✅ თუ არ ხარ დალოგინებული → ჯერ Login და დავიმახსოვროთ დაბრუნება
if (!uid) {
  try {
    localStorage.setItem("after_login", "/onboarding"); 
    localStorage.setItem("after_login_reason", "finish_onboarding");
  } catch {}
  setMsg("გაგრძელებისთვის საჭიროა Login ✅");
  router.replace("/login");
  return;
}

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
      } {
        setSaving(false);
      }

      return;
    }
  }

  if (!mounted) return null;

  if (loading) {
    return (
      <WithLang>
        <OnboardingShell title={copy.loading_title} subtitle={copy.loading_sub}>
          <div className="text-center text-zinc-400">{copy.loading_line}</div>
          {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "rules") {
    return (
      <WithLang>
        <OnboardingShell title={copy.rules_title} subtitle={copy.rules_sub}>
          <div className="space-y-3 text-sm text-zinc-300">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              ✅ No hate / harassment <br />
              ✅ No scams / spam <br />
              ✅ Use recent photos
            </div>

            <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
              {copy.agree}
            </PrimaryButton>

            {msg && <p className="text-sm text-zinc-300">{msg}</p>}
          </div>
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "name") {
    return (
      <WithLang>
        <OnboardingShell title={copy.name_title} subtitle={copy.name_sub}>
          <div className="space-y-4">
            <input
              ref={nameRef}
              autoFocus
              value={p.first_name ?? ""}
              onChange={(e) =>
                setP((prev) => ({ ...prev, first_name: e.target.value } as any))
              }
              placeholder={copy.name_ph}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-white outline-none"
            />

            <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
              {copy.cont}
            </PrimaryButton>

            {msg && <p className="text-sm text-zinc-300">{msg}</p>}
          </div>
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "birth") {
    return (
      <WithLang>
        <OnboardingShell title={copy.birth_title} subtitle={copy.birth_sub}>
          <div className="space-y-4">
            <input
              ref={birthRef}
              autoFocus
              value={birthInput}
              onChange={(e) => setBirthInput(formatDMYInput(e.target.value))}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              maxLength={10}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-white outline-none"
            />

            <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
              {copy.cont}
            </PrimaryButton>

            {msg && <p className="text-sm text-zinc-300">{msg}</p>}
          </div>
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "gender") {
    return (
      <WithLang>
        <OnboardingShell title={copy.gender_title} subtitle={copy.gender_sub}>
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
            {copy.show_gender}
          </label>

          <div className="mt-4">
            <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
              {copy.next}
            </PrimaryButton>
          </div>

          {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "seeking") {
    return (
      <WithLang>
        <OnboardingShell title={copy.seeking_title} subtitle={copy.seeking_sub}>
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
              {copy.next}
            </PrimaryButton>
          </div>

          {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "intent") {
    return (
      <WithLang>
        <OnboardingShell title={copy.intent_title} subtitle={copy.intent_sub}>
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
              {copy.next}
            </PrimaryButton>
          </div>

          {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
        </OnboardingShell>
      </WithLang>
    );
  }

  if (step === "distance") {
    return (
      <WithLang>
        <OnboardingShell title={copy.distance_title} subtitle={copy.distance_sub}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>{copy.distance_label}</span>
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
              {copy.later_settings}
            </div>
          </div>

          <div className="mt-4">
            <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
              {copy.next}
            </PrimaryButton>
          </div>

          {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
        </OnboardingShell>
      </WithLang>
    );
  }

  // photos
  return (
    <WithLang>
      <OnboardingShell title={copy.photos_title} subtitle={copy.photos_sub}>
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
                  {i === 1 ? copy.photo1_req : copy.photoX(i)}
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-4">
          <PrimaryButton disabled={!canNext || saving} onClick={goNext}>
            {copy.finish}
          </PrimaryButton>
        </div>

        {msg && <p className="mt-3 text-sm text-zinc-300">{msg}</p>}
      </OnboardingShell>
    </WithLang>
  );
}