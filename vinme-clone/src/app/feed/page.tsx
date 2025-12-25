"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import TinderCard from "@/components/TinderCard";
import BottomNav from "@/components/BottomNav";

type Gender = "" | "male" | "female" | "other";
type Seeking = "everyone" | "male" | "female" | "other";

// ✅ DB row shape (profiles table)
type ProfileRow = {
  user_id: string; // ✅ auth uid
  anon_id: string | null;
  nickname: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  gender: Gender | null;
  seeking: Seeking | null;
  photo_url: string | null;
  created_at: string | null;
};

type CardUser = {
  id: string; // ✅ we will pass target user's user_id here
  anon_id?: string | null;
  nickname: string;
  age: number;
  city: string;
  bio: string;
  gender: Gender;
  seeking: Seeking;
  photo_url?: string | null;
};

export default function FeedPage() {
  const router = useRouter();

  const [me, setMe] = useState<ProfileRow | null>(null);
  const [top, setTop] = useState<ProfileRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingTop, setLoadingTop] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  console.log("=== LOAD ME ===");


  const loadMe = useCallback(async () => {
    setErr(null);
    

    // ✅ session is often more reliable than getUser in client flows
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      setErr(sessionErr.message);
      setMe(null);
      return null;
    }

    if (!session?.user) {
      router.replace("/");
      setMe(null);
      return null;
    }

    const userId = session.user.id;

    // ✅ IMPORTANT: fetch by user_id (uuid)
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, created_at"
      )
      .eq("user_id", userId)
      .maybeSingle();


        console.log("=== LOAD ME ===");
  console.log("SESSION USER ID:", userId);
  console.log("ME DATA:", data);
  console.log("ME ERROR:", error);

    if (error) {
      console.error("Profile load error:", error.message);
      setErr(error.message);
      setMe(null);
      return null;
    }

    const row = (data as ProfileRow | null) ?? null;
    setMe(row);
    return row;
  }, [router]);

  const loadTop = useCallback(async (myUserId: string) => {
    setLoadingTop(true);
    setErr(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, created_at")
      .neq("user_id", myUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

      console.log("=== LOAD TOP ===");
  console.log("MY USER ID:", myUserId);
  console.log("TOP DATA:", data);
  console.log("TOP ERROR:", error);

    if (error) {
      console.error("Top load error:", error.message);
      setErr(error.message);
      setTop(null);
    } else {
      setTop((data as ProfileRow | null) ?? null);
    }

    setLoadingTop(false);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const meRow = await loadMe();

        if (!alive) return;

        if (!meRow?.user_id) {
          // ✅ profile not created yet
          setTop(null);
          return;
        }

        await loadTop(meRow.user_id);
      } catch (e) {
        console.error("Feed load fatal error:", e);
        if (alive) {
          setErr(e instanceof Error ? e.message : "Unknown error");
          setTop(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadMe, loadTop]);

  // --- Actions (swipes/matches) ---
  const writeSwipe = useCallback(
    async (action: "like" | "skip", targetUserId: string) => {
      if (!me?.user_id) return;

      const { error } = await supabase.from("swipes").insert({
        from_id: me.user_id, // ✅ my user_id
        to_id: targetUserId, // ✅ target user_id
        action,
      });

      if (error) console.warn("swipe insert error:", error.message);
    },
    [me?.user_id]
  );

  const tryMakeMatch = useCallback(
    async (targetUserId: string) => {
      if (!me?.user_id) return false;

      const { data: backLike, error } = await supabase
        .from("swipes")
        .select("id")
        .eq("from_id", targetUserId)
        .eq("to_id", me.user_id)
        .eq("action", "like")
        .limit(1);

      if (error) {
        console.warn("backLike check error:", error.message);
        return false;
      }

      const isMutual = (backLike?.length ?? 0) > 0;
      if (!isMutual) return false;

      const { error: mErr } = await supabase.from("matches").insert({
        user_a: me.user_id,
        user_b: targetUserId,
      });

      if (mErr) console.warn("match insert error:", mErr.message);
      return true;
    },
    [me?.user_id]
  );

  const onSkip = useCallback(async () => {
    if (!top || !me?.user_id) return;
    await writeSwipe("skip", top.user_id);
    await loadTop(me.user_id);
  }, [loadTop, me?.user_id, top, writeSwipe]);

  const onLike = useCallback(async () => {
    if (!top || !me?.user_id) return;

    await writeSwipe("like", top.user_id);
    const matched = await tryMakeMatch(top.user_id);

    if (matched) {
      console.log("✅ MATCH!");
      // router.push("/matches");
      // router.push(`/chat/${top.user_id}`);
    }

    await loadTop(me.user_id);
  }, [loadTop, me?.user_id, top, tryMakeMatch, writeSwipe]);

  const onOpenProfile = useCallback(() => {
    if (!top) return;
    router.push(`/profile/${top.user_id}`);
  }, [router, top]);

  const cardUser = useMemo<CardUser | null>(() => {
    if (!top) return null;

    return {
      id: top.user_id, // ✅ target id for actions/routes
      anon_id: top.anon_id,
      nickname: top.nickname ?? "Anonymous",
      age: top.age ?? 18,
      city: top.city ?? "",
      bio: top.bio ?? "",
      gender: (top.gender ?? "") as Gender,
      seeking: (top.seeking ?? "everyone") as Seeking,
      photo_url: top.photo_url ?? null,
    };
  }, [top]);

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  // ✅ If my profile row doesn't exist yet
  if (!me?.user_id) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-black text-white pb-24">
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div>
            <div className="text-xl font-semibold mb-2">Finish your profile 📝</div>
            <div className="opacity-80 text-sm">
              Profiles table-ში შენი user_id ჯერ არ არის ჩაწერილი. შედი Settings-ში და Save დააჭირე.
            </div>
            <button
              className="mt-4 px-4 py-2 rounded-xl bg-white text-black"
              onClick={() => router.push("/settings")}
            >
              Go to Settings
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-white">
<div className="flex-1 relative px-4 border border-red-500">
        {err ? (
          <div className="max-w-md w-full text-center">
            <div className="text-red-400 font-semibold mb-2">Error</div>
            <div className="text-sm opacity-90 break-words">{err}</div>
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-white text-black"
              onClick={() => router.refresh()}
            >
              Reload
            </button>
          </div>
        ) : !cardUser ? (
          <div className="text-center">
            <div className="text-lg font-semibold">No profiles found 😅</div>
            <div className="mt-4 flex gap-3 justify-center">
              <button className="px-4 py-2 rounded-xl bg-neutral-800" onClick={() => router.push("/")}>
                Home
              </button>
              <button className="px-4 py-2 rounded-xl bg-white text-black" onClick={() => router.push("/settings")}>
                Settings
              </button>
            </div>
          </div>
        ) : (
          <TinderCard
            user={cardUser}
            loading={loadingTop}
            onLike={onLike}
            onSkip={onSkip}
            onOpenProfile={onOpenProfile}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
