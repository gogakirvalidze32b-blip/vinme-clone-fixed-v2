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
  id: string; // ✅ target user's user_id
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

  // ----------------------------
  // LOAD ME
  // ----------------------------
  const loadMe = useCallback(async () => {
    setErr(null);

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
  const loadTop = useCallback(
    async (myUserId: string, mySeeking?: Seeking | null) => {
      setLoadingTop(true);
      setErr(null);

      // ✅ 1) get ids I already swiped (like/skip)
      const { data: swipedRows, error: swErr } = await supabase
        .from("swipes")
        .select("to_id")
        .eq("from_id", myUserId);

      if (swErr) console.warn("Failed to load swipes:", swErr.message);

      const swipedIds = (swipedRows ?? [])
        .map((r: any) => r.to_id)
        .filter(Boolean) as string[];

      // ✅ 2) base query: not me
      let q = supabase
        .from("profiles")
        .select(
          "user_id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, created_at"
        )
        .neq("user_id", myUserId);

      // ✅ 3) seeking filter
      if (mySeeking && mySeeking !== "everyone") {
        q = q.eq("gender", mySeeking);
      }

      // ✅ 4) exclude already swiped users
      if (swipedIds.length > 0) {
        const inList = `(${swipedIds.map((id) => `"${id}"`).join(",")})`;
        q = q.not("user_id", "in", inList);
      }

      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Top load error:", error.message);
        setErr(error.message);
        setTop(null);
      } else {
        setTop((data as ProfileRow | null) ?? null);
      }

      setLoadingTop(false);
    },
    []
  );


  // ----------------------------
  // ACTIONS: writeSwipe + tryMakeMatch
  // ----------------------------
  const writeSwipe = useCallback(
    async (action: "like" | "skip", targetUserId: string) => {
      if (!me?.user_id) return false;

      console.log("SWIPE:", { action, from: me.user_id, to: targetUserId });

      const { error } = await supabase.from("swipes").insert({
        from_id: me.user_id,
        to_id: targetUserId,
        action,
      });

      console.log("swipe insert:", error ?? "ok");
      if (error) console.warn("swipe insert error:", error.message);

      return !error;
    },
    [me?.user_id]
  );

  const tryMakeMatch = useCallback(
    async (targetUserId: string) => {
      if (!me?.user_id) return null;

      console.log("TRY MATCH:", { me: me.user_id, target: targetUserId });

      // ✅ 1) check if target already liked me (target -> me)
      const back = await supabase
        .from("swipes")
        .select("id")
        .eq("from_id", targetUserId)
        .eq("to_id", me.user_id)
        .eq("action", "like")
        .maybeSingle();

      console.log("backLike:", back.data ?? null, back.error ?? null);

      if (back.error) {
        console.warn("backLike check error:", back.error.message);
        return null;
      }

      if (!back.data) return null; // not mutual yet

      // ✅ 2) canonical pair (min/max) to prevent duplicates
      const a = me.user_id < targetUserId ? me.user_id : targetUserId;
      const b = me.user_id < targetUserId ? targetUserId : me.user_id;

      // ✅ 3) find existing match
      const { data: existing, error: findErr } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();

      console.log("existing match:", existing ?? null, findErr ?? null);

      if (findErr) {
        console.warn("match find error:", findErr.message);
        return null;
      }
      if (existing?.id) return String(existing.id);

      // ✅ 4) create match
      const { data: created, error: mErr } = await supabase
        .from("matches")
        .insert({ user_a: a, user_b: b })
        .select("id")
        .maybeSingle();

      console.log("match insert:", created ?? null, mErr ?? null);

      if (mErr) {
        // duplicate/unique -> already exists (ok)
        const msg = String(mErr.message || "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          const { data: again } = await supabase
            .from("matches")
            .select("id")
            .eq("user_a", a)
            .eq("user_b", b)
            .maybeSingle();
          if (again?.id) return String(again.id);
        }

        console.warn("match insert error:", mErr.message);
        return null;
      }

      return created?.id ? String(created.id) : null;
    },
    [me?.user_id]
  );

  // ----------------------------
  // UI handlers for TinderCard
  // ----------------------------
  const onSkip = useCallback(async () => {
    if (!top || !me?.user_id) return;
    await writeSwipe("skip", top.user_id);
    await loadTop(me.user_id, me.seeking);
  }, [loadTop, me?.seeking, me?.user_id, top, writeSwipe]);

  // NOTE: returns matchId (string|null) so TinderCard can open the modal
  const onLike = useCallback(async (): Promise<string | null> => {
    if (!top || !me?.user_id) return null;

    // ✅ 0) write MY like first (me -> target)
    const ok = await writeSwipe("like", top.user_id);
    if (!ok) {
      await loadTop(me.user_id, me.seeking);
      return null;
    }

    // ✅ 1) then try mutual match
    const matchId = await tryMakeMatch(top.user_id);

    // ✅ 2) load next (optional: you can skip this when matchId exists)
    await loadTop(me.user_id, me.seeking);

    return matchId;
  }, [loadTop, me?.seeking, me?.user_id, top, tryMakeMatch, writeSwipe]);

  const onOpenProfile = useCallback(() => {
    if (!top) return;
    router.push(`/profile/${top.user_id}`);
  }, [router, top]);

  const cardUser = useMemo<CardUser | null>(() => {
    if (!top) return null;

    return {
      id: top.user_id,
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

  // ----------------------------
  // UI
  // ----------------------------
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
      <div className="min-h-[100dvh] flex flex-col bg-black text-white">
        <div className="flex-1 relative px-0 pb-28 overflow-hidden">
          <div className="mx-auto w-full max-w-[420px] px-4 pt-8">
            <div className="w-full rounded-3xl bg-zinc-950/60 ring-1 ring-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="text-center">
                <div className="text-xl font-semibold mb-2">
                  Finish your profile 📝
                </div>
                <div className="opacity-80 text-sm">
                  Profiles table-ში შენი user_id ჯერ არ არის ჩაწერილი. შედი
                  Settings-ში და Save დააჭირე.
                </div>
                <button
                  className="mt-5 w-full px-5 py-3 rounded-2xl bg-white text-black font-semibold active:scale-[0.99]"
                  onClick={() => router.push("/settings")}
                >
                  Go to Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0">
          <BottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-white">
      <div className="flex-1 relative px-0 pb-28 overflow-hidden">
        {err ? (
          <div className="w-full h-full px-6 flex items-center justify-center text-center">
            <div>
              <div className="text-red-400 font-semibold mb-2">Error</div>
              <div className="text-sm opacity-90 break-words">{err}</div>
              <button
                className="mt-4 px-4 py-2 rounded-lg bg-white text-black active:scale-[0.99]"
                onClick={() => router.refresh()}
              >
                Reload
              </button>
            </div>
          </div>
        ) : !cardUser ? (
          <div className="w-full h-full px-6 flex items-center justify-center text-center">
            <div>
              <div className="text-lg font-semibold">No profiles found 😅</div>
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  className="px-4 py-2 rounded-xl bg-neutral-800 active:scale-[0.99]"
                  onClick={() => router.push("/")}
                >
                  Home
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-white text-black active:scale-[0.99]"
                  onClick={() => router.push("/settings")}
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <TinderCard
            user={cardUser as any}
            otherUserId={cardUser.id} // ✅ target user_id
            loading={loadingTop}
            onLike={onLike} // ✅ returns matchId, TinderCard will open modal
            onSkip={onSkip}
            onOpenProfile={onOpenProfile}
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
}
