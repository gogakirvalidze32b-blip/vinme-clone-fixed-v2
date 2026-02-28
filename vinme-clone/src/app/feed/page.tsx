"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "@/components/TinderCard";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

export default function FeedPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const loadingTopRef = useRef(false);

  const loadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) { router.replace("/login"); return null; }
    const { data: row } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setMe(row);
    return row;
  }, [router]);

  const loadTop = useCallback(async (myProfile: any) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;

    const myId = myProfile.user_id;

    // ✅ seeking = ვის ეძებ (male / female / nonbinary / everyone)
    // ✅ gender  = შენი სქესი
    const seeking = myProfile.seeking ?? "everyone";
    const myGender = myProfile.gender ?? null;

    // უკვე swipe-ულები
    const { data: swiped } = await supabase
      .from("swipes").select("to_id").eq("from_id", myId);
    const excludedIds = swiped?.map((s: any) => s.to_id) ?? [];

    let query = supabase.from("profiles").select("*")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);

    // ✅ 1. მე ვის ვეძებ — seeking ფილტრი
    if (seeking !== "everyone") {
      query = query.eq("gender", seeking);
    }

    // ✅ 2. მხოლოდ ის გამოჩნდეს ვისაც ჩემი სქესი სურს
    // (seeking=everyone OR seeking=ჩემი_სქესი)
    if (myGender) {
      query = query.or(`seeking.eq.everyone,seeking.eq.${myGender}`);
    }

    // უკვე ნანახები არ გამოჩნდეს
    if (excludedIds.length > 0) {
      query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setTop(data ?? null);
    loadingTopRef.current = false;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const my = await loadMe();
      if (!alive || !my) return;
      await loadTop(my);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [loadMe, loadTop]);

  async function checkAndCreateMatch(myId: string, otherId: string): Promise<string | null> {
    const { data: theirSwipe } = await supabase
      .from("swipes").select("id")
      .eq("from_id", otherId).eq("to_id", myId).eq("action", "like").maybeSingle();
    if (!theirSwipe) return null;

    const { data: existing } = await supabase.from("matches").select("id")
      .or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`)
      .limit(1).maybeSingle();
    if (existing?.id) return String(existing.id);

    const { data: created } = await supabase.from("matches")
      .insert({ user_a: myId, user_b: otherId }).select("id").single();
    return created?.id ? String(created.id) : null;
  }

  const onLike = async () => {
    if (!me || !top) return;
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: top.user_id, action: "like" });
    const mid = await checkAndCreateMatch(me.user_id, top.user_id);
    if (mid) { setMatchId(mid); setShowMatch(true); }
    await loadTop(me);
  };

  const onSkip = async () => {
    if (!me || !top) return;
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: top.user_id, action: "skip" });
    await loadTop(me);
  };

  const cardUser = useMemo(() => {
    if (!top) return null;
    return {
      id: top.user_id, user_id: top.user_id,
      nickname: top.nickname ?? "Anonymous",
      age: top.age ?? 18, city: top.city ?? "",
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
    };
  }, [top]);

  if (loading) return (
    <div className="flex h-[100dvh] items-center justify-center bg-black text-white">Loading…</div>
  );

  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-md h-screen">
        <TinderCard
          key={cardUser?.id ?? "empty"}
          user={cardUser}
          otherUserId={cardUser?.user_id}
          myProfile={me}
          onLike={onLike}
          onSkip={onSkip}
          onOpenProfile={() => cardUser && router.push(`/profile/${cardUser.user_id}`)}
          externalMatchId={matchId}
          externalShowMatch={showMatch}
          onCloseMatch={() => setShowMatch(false)}
          onOpenChat={() => matchId && router.push(`/chat/${matchId}`)}
        />
      </div>
      <BottomNav />
    </div>
  );
}
