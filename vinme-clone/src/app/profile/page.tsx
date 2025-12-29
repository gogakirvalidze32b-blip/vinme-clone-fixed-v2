"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { calcAgeFromBirthdate } from "@/lib/profile";

type Profile = {
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
  const [p, setP] = useState<Profile | null>(null);
  const [imgOk, setImgOk] = useState(true);
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
          setP(null);
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
          (data.first_name ?? "").trim() ||
          (data.nickname ?? "").trim() ||
          "";

        // ✅ თუ სახელი მაინც ცარიელია -> onboarding (რადგან “რეალური პროფილი” გინდა)
        if (!displayName) {
          router.replace("/onboarding");
          return;
        }

        const finalAge = calcAgeFromBirthdate(data.birthdate ?? null);

        setP({
          user_id: data.user_id,
          anon_id: data.anon_id ?? null,
          first_name: data.first_name ?? null,
          nickname: data.nickname ?? null,
          birthdate: data.birthdate ?? null,
          city: data.city ?? "",
          bio: data.bio ?? null,
          photo1_url: data.photo1_url ?? null,
          onboarding_step: data.onboarding_step ?? null,
          onboarding_completed: data.onboarding_completed ?? null,
        });

        // (თუ გინდა age UI-ში)
        // NOTE: p.age field აღარ გვაქვს აქ; UI-ში პირდაპირ finalAge გამოვიყენოთ
        // მარტივად: render-ში calcAgeFromBirthdate(p.birthdate) დააყენე

      } catch (e: any) {
        const ex = normalizeSupabaseError(e);
        console.error("Profile page fatal error:", ex);
        setLoadErr(ex?.message ?? "Something went wrong");
        setP(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const avatarUrl = useMemo(() => photoSrc(p?.photo1_url ?? null), [p?.photo1_url]);

  useEffect(() => setImgOk(true), [avatarUrl]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="min-h-[100svh] bg-black text-white px-4 pt-6 pb-28 flex items-center justify-center">
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

  if (!p) return null;

  const shownAge = calcAgeFromBirthdate(p.birthdate ?? null);

  return (
    <div className="min-h-[100svh] bg-black text-white px-4 pt-6 pb-28">
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl && imgOk ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setImgOk(false)}
              className="h-24 w-24 rounded-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/10" />
          )}

          <div className="absolute -left-1 bottom-2 rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white">
            50%
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {((p.first_name ?? "").trim() || (p.nickname ?? "").trim())}
            {shownAge != null ? `, ${shownAge}` : ""}
          </h1>

          <p className="text-white/70">{p.city ?? ""}</p>

          <button className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black active:scale-[0.99]">
            ✏️ Edit profile
          </button>
        </div>
      </div>

      {p.bio ? (
        <div className="mt-6 rounded-2xl bg-zinc-900/70 p-4">
          <p className="text-white/90">{p.bio}</p>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-zinc-900 p-4 text-center">
          ⭐
          <p className="mt-2 text-sm text-white/70">Super Likes</p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-4 text-center text-purple-400">
          ⚡
          <p className="mt-2 text-sm text-white/70">Boosts</p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-4 text-center text-pink-500">
          🔥
          <p className="mt-2 text-sm text-white/70">Subscriptions</p>
        </div>
      </div>
    </div>
  );
}
