"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";
import { calcAgeFromBirthdate } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import TinderCard from "@/components/TinderCard";
import BottomNav from "@/components/BottomNav";

type Gender = "" | "male" | "female" | "nonbinary" | "other";
type Seeking = "everyone" | "male" | "female" | "nonbinary" | "other";

type ProfileRow = {
  id: string;            // ✅ profiles.id (row id)
  user_id: string;       // ✅ auth uuid

  anon_id: string | null;
  nickname: string | null;
  age: number | null;
  city: string | null;
  bio: string | null;
  gender: Gender | null;
  seeking: Seeking | null;

  photo_url?: string | null;
  photo1_url?: string | null;

  onboarding_completed?: boolean | null;
  onboarding_step?: number | null;

  first_name?: string | null;

  created_at: string | null;
};


type CardUser = {
  id: string;          // profiles.id (row id)
  user_id: string;     // ✅ profiles.user_id (auth uuid)
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
  // LOAD ME (ONLY by user_id)
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
      setMe(null);
      router.replace("/");
      return null;
    }

    const userId = session.user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, photo1_url, created_at, onboarding_completed, onboarding_step, first_name"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setMe(null);
      return null;
    }

    const row = (data as ProfileRow | null) ?? null;
    setMe(row);
    return row;
  }, [router]);

  // ----------------------------
  // LOAD TOP
  // ----------------------------
  const loadTop = useCallback(
    async (myUserId: string, mySeeking?: Seeking | null) => {
      setLoadingTop(true);
      setErr(null);

      try {
        const { data: swipedRows, error: swErr } = await supabase
          .from("swipes")
          .select("to_id")
          .eq("from_id", myUserId);

        if (swErr) console.warn("Failed to load swipes:", swErr.message);

        const swipedIds = (swipedRows ?? [])
          .map((r: any) => r.to_id)
          .filter(Boolean) as string[];
const { data, error } = await supabase
  .from("profiles")
  .select(
    "user_id, anon_id, nickname, birthdate, age, city, bio, gender, seeking, photo_url, photo1_url, created_at"
  )
  .neq("user_id", myUserId);

        if (mySeeking && mySeeking !== "everyone") {
          q = q.eq("gender", mySeeking);
        }

        if (swipedIds.length > 0) {
          // supabase "in" expects "(...)" as a string when using .not("col","in", value)
          const inList = `(${swipedIds.map((id) => `"${id}"`).join(",")})`;
          q = q.not("user_id", "in", inList);
        }

       const { data: topRows, error: topErr } = await q
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();


        if (error) {
          setErr(error.message);
          setTop(null);
        } else {
          setTop((data as ProfileRow | null) ?? null);
        }
      } finally {
        setLoadingTop(false);
      }
    },
    []
  );

  // ----------------------------
  // INITIAL BOOTSTRAP
  // ----------------------------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const my = await loadMe();

        // no profile row yet -> onboarding
        if (!my?.user_id) {
          if (alive) setLoading(false);
          router.replace("/onboarding");
          return;
        }

        // force onboarding completion
        const completed =
          my.onboarding_completed === true && (my.onboarding_step ?? 0) >= 8;

        if (!completed) {
          if (alive) setLoading(false);
          router.replace("/onboarding");
          return;
        }

        await loadTop(my.user_id, my.seeking);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Feed init error");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadMe, loadTop, router]);

  // ----------------------------
  // ACTIONS
  // ----------------------------
  const writeSwipe = useCallback(
    async (action: "like" | "skip", targetUserId: string) => {
      if (!me?.user_id) return false;

      const { error } = await supabase.from("swipes").insert({
        from_id: me.user_id,
        to_id: targetUserId,
        action,
      });

      if (error) console.warn("swipe insert error:", error.message);
      return !error;
    },
    [me?.user_id]
  );

  const tryMakeMatch = useCallback(
    async (targetUserId: string) => {
      if (!me?.user_id) return null;

      const back = await supabase
        .from("swipes")
        .select("id")
        .eq("from_id", targetUserId)
        .eq("to_id", me.user_id)
        .eq("action", "like")
        .maybeSingle();

      if (back.error) return null;
      if (!back.data) return null;

      const a = me.user_id < targetUserId ? me.user_id : targetUserId;
      const b = me.user_id < targetUserId ? targetUserId : me.user_id;

      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();

      if (existing?.id) return String(existing.id);

      const { data: created, error: mErr } = await supabase
        .from("matches")
        .insert({ user_a: a, user_b: b })
        .select("id")
        .maybeSingle();

      if (mErr) return null;
      return created?.id ? String(created.id) : null;
    },
    [me?.user_id]
  );

  const onSkip = useCallback(async () => {
    if (!top || !me?.user_id) return;
    await writeSwipe("skip", top.user_id);
    await loadTop(me.user_id, me.seeking);
  }, [loadTop, me?.seeking, me?.user_id, top, writeSwipe]);

  const onLike = useCallback(async (): Promise<string | null> => {
    if (!top || !me?.user_id) return null;

    const ok = await writeSwipe("like", top.user_id);
    if (!ok) {
      await loadTop(me.user_id, me.seeking);
      return null;
    }

    const matchId = await tryMakeMatch(top.user_id);
    await loadTop(me.user_id, me.seeking);
    return matchId;
  }, [loadTop, me?.seeking, me?.user_id, top, tryMakeMatch, writeSwipe]);

  const onOpenProfile = useCallback(() => {
    if (!top) return;
    router.push(`/profile/${top.user_id}`);
  }, [router, top]);
// ✅ აქ ხდება PATH -> URL
const cardUser = useMemo<CardUser | null>(() => {
  if (!top) return null;

  const raw = top.photo_url ?? top.photo1_url ?? null;
  const photo = photoSrc(raw); // ✅ PATH -> URL

  return {
    id: top.id,               // ✅ profiles row id
    user_id: top.user_id,     // ✅ auth uuid (ეს გჭირდება match-სთვის)
    anon_id: top.anon_id ?? null,
    nickname: top.nickname ?? "Anonymous",
age: calcAgeFromBirthdate(top.birthdate) ?? 18,
    city: top.city ?? "",
    bio: top.bio ?? "",
    gender: (top.gender ?? "") as any,
    seeking: (top.seeking ?? "everyone") as any,
    photo_url: photo, // ✅ აქ უკვე URL მიდის TinderCard-ში
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
                  Profiles table-ში row ვერ ვიპოვე user_id-ით. შედი Onboarding-ში.
                </div>
                <button
                  className="mt-5 w-full px-5 py-3 rounded-2xl bg-white text-black font-semibold active:scale-[0.99]"
                  onClick={() => router.push("/onboarding")}
                >
                  Go to Onboarding
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
  otherUserId={cardUser.user_id}   // ✅ ესაა სწორი (auth uuid)
            loading={loadingTop}
            onLike={onLike}
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
