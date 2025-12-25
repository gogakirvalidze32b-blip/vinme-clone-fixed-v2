"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import TinderCard from "@/components/TinderCard";
import BottomNav from "@/components/BottomNav";

type Gender = "" | "male" | "female" | "other";
type Seeking = "everyone" | "male" | "female" | "other";

type ProfileRow = {
  // ✅ აქ id არის alias-ით დაბრუნებული user_id
  id: string;
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
  id: string;
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

  const toCardUser = useCallback((p: ProfileRow): CardUser => {
    return {
      id: p.id,
      anon_id: p.anon_id,
      nickname: p.nickname ?? "Anonymous",
      age: p.age ?? 18,
      city: p.city ?? "",
      bio: p.bio ?? "",
      gender: (p.gender ?? "") as Gender,
      seeking: (p.seeking ?? "everyone") as Seeking,
      photo_url: p.photo_url ?? null,
    };
  }, []);

  const loadMe = useCallback(async () => {
    setErr(null);

    // ✅ session-safe (არ აგდებს Auth session missing!)
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      console.error("Session error:", sessionErr.message);
      setErr("Auth error");
      return null;
    }

    if (!session?.user) {
      router.replace("/"); // ან /login
      return null;
    }

    const userId = session.user.id;

    // ✅ profiles-ში ახლა გვაქვს user_id, ვაბრუნებთ alias-ით როგორც id
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id:id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, created_at"
      )
      .eq("user_id", userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      console.error("Profile load error:", error.message);
      setErr(error.message);
      return null;
    }

    // თუ user_id არ გაქვს ჯერ შევსებული, data იქნება null
    setMe(data ?? null);
    return data ?? null;
  }, [router]);

  const loadTop = useCallback(async (myUserId: string) => {
    setLoadingTop(true);
    setErr(null);

    // ✅ 1 პროფილი ჩემის გარდა
    const { data, error } = await supabase
  .from("profiles")
  .select("user_id:id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, created_at")
  .neq("user_id", myUserId)
  .not("user_id", "is", null)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (error) {
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

      const meRow = await loadMe();
      if (!alive) return;

      // ✅ თუ ჩემი პროფილი არ არსებობს profiles-ში (user_id არაა შევსებული), გადავიყვანოთ settings-ზე
      if (!meRow?.id) {
        setTop(null);
        setLoading(false);
        return;
      }

      await loadTop(meRow.id);

      if (!alive) return;
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [loadMe, loadTop]);

  // --- Actions (თუ tables გაქვს) ---
  const writeSwipe = useCallback(
    async (action: "like" | "skip", targetUserId: string) => {
      if (!me?.id) return;

      // ⚠️ თუ table names/columns სხვანაირად გაქვს, აქ მოარგე
      const { error } = await supabase.from("swipes").insert({
        from_id: me.id, // user_id
        to_id: targetUserId, // user_id
        action,
      });

      if (error) console.warn("swipe insert error:", error.message);
    },
    [me?.id]
  );

  const tryMakeMatch = useCallback(
    async (targetUserId: string) => {
      if (!me?.id) return false;

      const { data: backLike, error } = await supabase
        .from("swipes")
        .select("id")
        .eq("from_id", targetUserId)
        .eq("to_id", me.id)
        .eq("action", "like")
        .limit(1);

      if (error) {
        console.warn("backLike check error:", error.message);
        return false;
      }

      const isMutual = (backLike?.length ?? 0) > 0;
      if (!isMutual) return false;

      const { error: mErr } = await supabase.from("matches").insert({
        user_a: me.id,
        user_b: targetUserId,
      });

      if (mErr) console.warn("match insert error:", mErr.message);
      return true;
    },
    [me?.id]
  );

  const onSkip = useCallback(async () => {
    if (!top || !me?.id) return;
    await writeSwipe("skip", top.id);
    await loadTop(me.id);
  }, [loadTop, me?.id, top, writeSwipe]);

  const onLike = useCallback(async () => {
    if (!top || !me?.id) return;

    await writeSwipe("like", top.id);
    const matched = await tryMakeMatch(top.id);

    if (matched) {
      console.log("✅ MATCH!");
      // router.push("/matches");
      // ან router.push(`/chat/${top.id}`);
    }

    await loadTop(me.id);
  }, [loadTop, me?.id, top, tryMakeMatch, writeSwipe]);

  const onOpenProfile = useCallback(() => {
    if (!top) return;
    router.push(`/profile/${top.id}`);
  }, [router, top]);

  const cardUser = useMemo(() => (top ? toCardUser(top) : null), [toCardUser, top]);

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  // ✅ თუ ჩემი profile row არ არის (user_id ჯერ არ შეივსო), გადამისამართება/მინიშნება
  if (!me?.id) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-black text-white">
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
      <div className="flex-1 flex items-center justify-center px-4">
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
              <button
                className="px-4 py-2 rounded-xl bg-neutral-800"
                onClick={() => router.push("/")}
              >
                Home
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-white text-black"
                onClick={() => router.push("/settings")}
              >
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
