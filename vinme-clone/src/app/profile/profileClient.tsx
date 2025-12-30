"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { calcAgeFromBirthdate } from "@/lib/profile";

type ProfileRow = {
  user_id: string;
  anon_id: string | null;
  first_name: string | null;
  nickname: string | null;
  birthdate: string | null;
  city: string | null;
  bio: string | null;
  photo1_url: string | null;
  onboarding_step: number | null;
  onboarding_completed: boolean | null;
};

function normalizeSupabaseError(err: any) {
  if (!err) return null;
  const out: any = {};
  try {
    for (const k of Object.getOwnPropertyNames(err)) out[k] = err[k];
  } catch {}
  out.message = out.message ?? err?.message ?? String(err);
  out.details = out.details ?? err?.details;
  out.hint = out.hint ?? err?.hint;
  out.code = out.code ?? err?.code;
  return out;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<ProfileRow | null>(null);
    const [otherUser, setOtherUser] = useState<ProfileRow | null>(null);
  
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);

        const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = sess.session?.user?.id ?? null;
        if (!uid) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            user_id,
            anon_id,
            first_name,
            nickname,
            birthdate,
            city,
            bio,
            photo1_url,
            onboarding_step,
            onboarding_completed
          `
          )
          .eq("user_id", uid)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          const e = normalizeSupabaseError(error);
          console.error("Profile load error:", e);
          setLoadErr(e?.message ?? "Failed to load profile");
          setMe(null);
          return;
        }

        // ✅ თუ row არ არსებობს -> onboarding
        if (!data) {
          router.replace("/onboarding");
          return;
        }

        // ✅ თუ onboarding არ არის დასრულებული -> onboarding
        if (data.onboarding_completed !== true) {
          router.replace("/onboarding");
          return;
        }

        const displayName =
          (data.first_name ?? "").trim() || (data.nickname ?? "").trim() || "";

        // ✅ “რეალური პროფილი” გინდა → თუ სახელი ცარიელია, ისევ onboarding
        if (!displayName) {
          router.replace("/onboarding");
          return;
        }

        setMe({
          user_id: data.user_id,
          anon_id: data.anon_id ?? null,
          first_name: data.first_name ?? null,
          nickname: data.nickname ?? null,
          birthdate: data.birthdate ?? null,
          city: data.city ?? null,
          bio: data.bio ?? null,
          photo1_url: data.photo1_url ?? null,
          onboarding_step: data.onboarding_step ?? null,
          onboarding_completed: data.onboarding_completed ?? null,
        });
      } catch (e: any) {
        const ex = normalizeSupabaseError(e);
        console.error("Profile page fatal error:", ex);
        setLoadErr(ex?.message ?? "Something went wrong");
        setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const name = useMemo(() => {
    if (!me) return "";
    return (me.first_name ?? "").trim() || (me.nickname ?? "").trim() || "";
  }, [me]);

  const age = useMemo(() => {
    if (!me) return null;
    return calcAgeFromBirthdate(me.birthdate ?? null);
  }, [me]);

  const avatarUrl = useMemo(() => photoSrc(me?.photo1_url ?? null), [me?.photo1_url]);

  // 0..100 progress (მარტივი მაგალითი — შენ შეგიძლია ზუსტად ჩათვალო)
  const progress = useMemo(() => {
    if (!me) return 0;

    // მარტივი scoring:
    // name 20, birth 20, city 10, bio 10, photo 40 = 100
    let score = 0;
    const hasName = !!((me.first_name ?? "").trim() || (me.nickname ?? "").trim());
    const hasBirth = !!(me.birthdate ?? "");
    const hasCity = !!((me.city ?? "").trim());
    const hasBio = !!((me.bio ?? "").trim());
    const hasPhoto = !!((me.photo1_url ?? "").trim());

    if (hasName) score += 20;
    if (hasBirth) score += 20;
    if (hasCity) score += 10;
    if (hasBio) score += 10;
    if (hasPhoto) score += 40;

    // თუ onboarding_completed true, მაინც 100 დავტოვოთ
    if (me.onboarding_completed === true) score = 100;

    return score;
  }, [me]);

  const pct = Math.max(0, Math.min(100, progress));

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="min-h-[100svh] bg-black text-white px-4 pt-6 pb-24 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-zinc-950/90 p-6 ring-1 ring-white/10 text-center">
          <div className="text-red-400 font-semibold mb-2">Error</div>
          <div className="text-sm text-white/80 break-words">{loadErr}</div>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black active:scale-[0.99]"
              onClick={() => router.refresh()}
            >
              Reload 🔄
            </button>
            <button
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 active:scale-[0.99]"
              onClick={() => router.push("/feed")}
            >
              Go Feed 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!me) return null;

  return (
    <main className="min-h-[100svh] bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <BackButton href="/feed" label="Back" />

          <div className="flex items-center gap-2">
            <button
              className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              type="button"
              title="Safety"
              aria-label="Safety"
              onClick={() => alert("Soon")}
            >
              🛡️
            </button>

            <button
              className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              type="button"
              title="Settings"
              aria-label="Settings"
              onClick={() => router.push("/settings")}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mt-6 flex items-center gap-4">
          {/* Avatar + progress ring */}
          <div className="relative h-20 w-20 shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(rgba(236,72,153,.95) ${pct * 3.6}deg, rgba(255,255,255,.12) 0deg)`,
              }}
            />
            <div className="absolute inset-[3px] rounded-full bg-zinc-950" />

            <div className="absolute inset-[6px] overflow-hidden rounded-full bg-white/10">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/60">
                  👤
                </div>
              )}
            </div>

            {/* % badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold ring-2 ring-pink-500">
              {pct}%
            </div>
          </div>

          {/* Name + button */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">
                {name}
                {age != null ? `, ${age}` : ""}
              </h1>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70">
                ✓
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/profile/edit")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
            >
              ✏️ Edit profile
            </button>
          </div>
        </div>

        {/* Big card */}
        <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-2xl">👥</div>
              <div>
                <div className="text-lg font-bold">Try Double Date</div>
                <div className="text-sm text-white/70">
                  Invite your friends and find other pairs.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-2 text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              aria-label="Open"
              title="Open"
              onClick={() => alert("Soon")}
            >
              ➜
            </button>
          </div>
        </div>

        {/* Small tiles row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Tile icon="⭐" title="Super Likes" subtitle="0" onClick={() => alert("Soon")} />
          <Tile icon="⚡" title="Boosts" subtitle="My Boosts" onClick={() => alert("Soon")} />
          <Tile icon="🔥" title="Subs" subtitle="Subscriptions" onClick={() => alert("Soon")} />
        </div>

        {/* Optional promo card */}
        <div className="mt-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900/30 to-zinc-900/30 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-extrabold">Premium</div>
              <div className="mt-1 text-sm text-white/75">
                See who likes you, top picks, and more.
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-amber-300 px-5 py-3 font-semibold text-zinc-900 hover:bg-amber-200"
              onClick={() => alert("Soon")}
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Tile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white/10 p-4 text-left ring-1 ring-white/10 hover:bg-white/15"
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="text-xs text-white/60">{subtitle}</div>
    </button>
  );
}
