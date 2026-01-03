"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";
import TinderCard from "@/components/TinderCard";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

type Gender = "" | "male" | "female" | "nonbinary" | "other";
type Seeking = "everyone" | "male" | "female" | "nonbinary" | "other";

type ProfileRow = {
  id?: string;
  user_id: string;

  anon_id: string | null;
  first_name: string | null;
  nickname: string | null;

  age: number | null;
  city: string | null;
  bio: string | null;

  gender: Gender | null;
  seeking: Seeking | null;

  photo1_url: string | null;
  photo_url?: string | null;

  lat: number | null;
  lng: number | null;

  onboarding_completed: boolean | null;
  onboarding_step: number | null;

  created_at?: string | null;
};

type CardUser = {
  id: string;
  user_id: string;
  anon_id: string | null;
  nickname: string;
  age: number;
  city: string;
  bio: string;
  photo_url: string | null;
};

export default function FeedPage() {
  const router = useRouter();

  const [me, setMe] = useState<ProfileRow | null>(null);
  const [top, setTop] = useState<ProfileRow | null>(null);

  const myGender = me?.gender ?? null;

  const geoOnce = useRef(false);

  const [loading, setLoading] = useState(true);
  const [loadingTop, setLoadingTop] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        "user_id, anon_id, nickname, age, city, bio, gender, seeking, photo_url, photo1_url, created_at, onboarding_completed, onboarding_step, first_name, lat, lng"
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

        let q = supabase
          .from("profiles")
          .select(
            "user_id, anon_id, nickname, age, city, bio, gender, seeking, photo1_url, photo_url, created_at"
          )
          .eq("paused", false)
          .neq("user_id", myUserId)
          .not("photo1_url", "is", null)
          .eq("onboarding_completed", true);

        if (swipedIds.length > 0) {
          const inList = `(${swipedIds.map((id) => `"${id}"`).join(",")})`;
          q = q.not("user_id", "in", inList);
        }

        if (mySeeking && mySeeking !== "everyone") {
          q = q.eq("gender", mySeeking);
        }

        if (myGender === "male" || myGender === "female" || myGender === "nonbinary") {
          q = q.in("seeking", [myGender, "everyone"]);
        }

        const { data: topRow, error } = await q
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          setErr(error.message);
          setTop(null);
        } else {
          setErr(null);
          setTop((topRow as ProfileRow | null) ?? null);
        }
      } finally {
        setLoadingTop(false);
      }
    },
    [myGender]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const my = await loadMe();

        if (!my?.user_id) {
          if (alive) setLoading(false);
          router.replace("/onboarding");
          return;
        }

        if (!geoOnce.current && "geolocation" in navigator) {
          geoOnce.current = true;

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;

              const { error } = await supabase
                .from("profiles")
                .update({ lat, lng })
                .eq("user_id", my.user_id);

              if (error) console.log("geo update error:", error.message);
            },
            (err) => console.log("geo denied/failed:", err?.message),
            { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 }
          );
        }

        const completed = my.onboarding_completed === true && (my.onboarding_step ?? 0) >= 8;
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

  const writeSwipe = useCallback(
    async (action: "like" | "skip", targetUserId: string) => {
      if (!me?.user_id) return false;

      const payload = { from_id: me.user_id, to_id: targetUserId, action };
      const { error } = await supabase.from("swipes").insert(payload as any);

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

    setTop(null);
    await writeSwipe("skip", top.user_id);

    requestAnimationFrame(() => {
      loadTop(me.user_id, me.seeking);
    });
  }, [top, me?.user_id, me?.seeking, loadTop, writeSwipe]);

  const onLike = useCallback(async (): Promise<string | null> => {
    if (!top || !me?.user_id) return null;

    setTop(null);

    const ok = await writeSwipe("like", top.user_id);

    if (!ok) {
      requestAnimationFrame(() => {
        loadTop(me.user_id, me.seeking);
      });
      return null;
    }

    const matchId = await tryMakeMatch(top.user_id);

    requestAnimationFrame(() => {
      loadTop(me.user_id, me.seeking);
    });

    return matchId;
  }, [top, me?.user_id, me?.seeking, loadTop, writeSwipe, tryMakeMatch]);

  const onOpenProfile = useCallback(() => {
    if (!top) return;
    router.push(`/profile/${top.user_id}`);
  }, [router, top]);

  const cardUser: CardUser | null = useMemo(() => {
    if (!top) return null;

    const raw = top.photo_url ?? top.photo1_url ?? null;
    const photo = raw ? photoSrc(raw) : null;

    return {
      id: top.user_id,
      user_id: top.user_id,
      anon_id: top.anon_id ?? null,
      nickname: top.nickname ?? "Anonymous",
      age: top.age ?? 18,
      city: top.city ?? "",
      bio: top.bio ?? "",
      photo_url: photo,
    };
  }, [top]);

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (!me?.user_id) {
    return (
      <main className="h-[100dvh] bg-black text-white overflow-hidden">
        <div className="mx-auto w-full max-w-[420px] h-full px-4 pt-6">
          <div className="w-full h-full flex items-center justify-center text-center">
            <div>
              <div className="text-xl font-semibold mb-2">Finish your profile 📝</div>
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
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] bg-black text-white overflow-hidden">
      {/* ✅ ეკრანი მთლიანად კარტას — ქვემოთ ადგილი BottomNav-სთვის */}
      <div className="mx-auto w-full max-w-[420px] h-full px-0">
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
          // ✅ ეს pb არის “ზუსტად” რომ ქვედა UI ლამაზად ჩაჯდეს (როგორც სქრინზე)
          <div className="w-full h-full pb-[92px]">
            <TinderCard
              key={cardUser.id}
              user={cardUser as any}
              otherUserId={cardUser.user_id}
              loading={loadingTop}
              onLike={onLike}
              onSkip={onSkip}
              onOpenProfile={onOpenProfile}
            />
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}