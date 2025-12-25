"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";

type Profile = {
  anon_id: string;
  nickname: string;
  age: number;
  city: string;
  bio: string | null;
  photo1_url?: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const anonId = getOrCreateAnonId();

      const { data } = await supabase
        .from("profiles")
        .select("anon_id,nickname,age,city,bio,photo1_url")
        .eq("anon_id", anonId)
        .maybeSingle();

      if (data) setP(data);
      setLoading(false);
    })();
  }, []);

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
          <img
            src={
              p.photo1_url ||
              "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400"
            }
            alt="avatar"
            className="h-24 w-24 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 rounded-full bg-pink-500 px-2 py-1 text-xs font-bold">
            50%
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {p.nickname}, {p.age}
          </h1>
          <p className="text-white/70">{p.city}</p>

          <button className="mt-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            ✏️ Edit profile
          </button>
        </div>
      </div>

      {/* Bio */}
      {p.bio && (
        <div className="mt-6 rounded-2xl bg-zinc-900/70 p-4">
          <p className="text-white/90">{p.bio}</p>
        </div>
      )}

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
