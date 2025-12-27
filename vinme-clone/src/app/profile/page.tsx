"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";
import { photoSrc } from "@/lib/photos";

type Profile = {
  anon_id: string;
  nickname: string;
  age: number;
  city: string;
  bio: string | null;
  photo1_url?: string | null;
  onboarding_step?: number | null;
  onboarding_completed?: boolean | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<Profile | null>(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const anonId = getOrCreateAnonId();

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          anon_id,
          nickname,
          age,
          city,
          bio,
          photo1_url,
          onboarding_step,
          onboarding_completed
        `
        )
        .eq("anon_id", anonId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Profile load error:", error);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      setP({
        anon_id: data.anon_id,
        nickname: data.nickname ?? "Anonymous",
        age: data.age ?? 18,
        city: data.city ?? "",
        bio: data.bio ?? "",
        photo1_url: data.photo1_url ?? null,
        onboarding_step: data.onboarding_step ?? 1,
        onboarding_completed: Boolean(data.onboarding_completed),
      });

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const avatarUrl = useMemo(() => {
    const raw = p?.photo1_url ?? null;
    return photoSrc(raw);
  }, [p?.photo1_url]);

  useEffect(() => {
    // როცა avatarUrl შეიცვლება, თავიდან ვცადოთ
    setImgOk(true);
  }, [avatarUrl]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (!p) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        No profile found
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-black text-white px-4 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl && imgOk ? (
            <img
              src={avatarUrl}
              alt="" // ✅ აღარ გამოჩნდება "avatar"
              onError={() => setImgOk(false)} // ✅ თუ ვერ ჩაიტვირთა -> fallback
              className="h-24 w-24 rounded-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/10" />
          )}

          {/* progress badge */}
          <div className="absolute -left-1 bottom-2 rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white">
            50%
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {p.nickname}, {p.age}
          </h1>
          <p className="text-white/70">{p.city}</p>

          <button className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black active:scale-[0.99]">
            ✏️ Edit profile
          </button>
        </div>
      </div>

      {/* Bio */}
      {p.bio ? (
        <div className="mt-6 rounded-2xl bg-zinc-900/70 p-4">
          <p className="text-white/90">{p.bio}</p>
        </div>
      ) : null}

      {/* Tinder-style cards */}
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
