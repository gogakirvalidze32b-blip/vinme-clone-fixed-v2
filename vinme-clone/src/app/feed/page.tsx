"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "@/components/TinderCard";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function FeedPage() {
  const router = useRouter();

  const [me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const[nextTop, setNextTop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const[matchedUser, setMatchedUser] = useState<any>(null);

  const [superLikesLeft, setSuperLikesLeft] = useState(1);
  const [messagesLeft, setMessagesLeft] = useState(1);

  const loadingTopRef = useRef(false);
  const meRef = useRef<any>(null);

  // ---------------- LOAD ME ----------------
  const loadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setMe(row);
    meRef.current = row;
    return row;
  }, [router]);

  // ---------------- MATCHING FIX ----------------
  const loadTop = useCallback(async (myProfile: any) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;

    const myId = myProfile.user_id;
    // დაზღვევა: თუ ბაზაში null აქვს, everyone-ად ჩავთვალოთ
    const mySeeking = myProfile.seeking || "everyone";
    const myGender = myProfile.gender || null;

    const { data: swiped } = await supabase
      .from("swipes")
      .select("to_id")
      .eq("from_id", myId);

    const excludedIds = swiped?.map((s: any) => s.to_id) ??[];

    // შეცვლილია latitude და longitude -> lat, lng
    let query = supabase
      .from("profiles")
      .select("user_id,first_name,nickname,age,city,photo1_url,last_seen,lat,lng,seeking,gender,onboarding_completed")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);

    // 👉 მე ვის ვეძებ (თუ everyone ან both არაა, მაშინ კონკრეტულ სქესს ვეძებთ)
    if (mySeeking !== "everyone" && mySeeking !== "both") {
      query = query.eq("gender", mySeeking);
    }

    // 👉 ისინი მე მეძებენ (თუ ჩემი სქესი მითითებული მაქვს)
    if (myGender) {
      // ვაჩვენოთ ისინი: ვისაც everyone აქვს, ან both აქვს, ან პირდაპირ ჩემს სქესს ეძებს, ან საერთოდ არ აქვთ მითითებული (null)
      query = query.or(`seeking.eq.everyone,seeking.eq.both,seeking.eq.${myGender},seeking.is.null`);
    }

    if (excludedIds.length > 0) {
      query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) {
      console.error("Feed Error:", error);
    }

    setTop(data?.[0] ?? null);
    setNextTop(data?.[1] ?? null);

    loadingTopRef.current = false;
  },[]);

  // ---------------- MATCH ----------------
  async function checkAndCreateMatch(myId: string, otherId: string) {
    const { data: theirSwipe } = await supabase
      .from("swipes")
      .select("id")
      .eq("from_id", otherId)
      .eq("to_id", myId)
      .in("action",["like", "super_like"])
      .maybeSingle();

    if (!theirSwipe) return null;

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created } = await supabase
      .from("matches")
      .insert({ user_a: myId, user_b: otherId })
      .select("id")
      .single();

    return created?.id ?? null;
  }

  // ---------------- ACTIONS ----------------
  const advanceCard = () => {
    if (nextTop) {
      setTop(nextTop);
      setNextTop(null);
    } else setTop(null);
  };

  const onLike = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: cur.user_id,
      action: "like",
    });

    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);

    if (mid) {
      setMatchedUser(cur);
      setMatchId(mid);
      setShowMatch(true);
    }

    loadTop(me);
  };

  const onSkip = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: cur.user_id,
      action: "skip",
    });

    loadTop(me);
  };

  const onSuperLike = async () => {
    if (!me || !top || superLikesLeft <= 0) return;
    const cur = { ...top };
    advanceCard();

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: cur.user_id,
      action: "super_like",
    });

    setSuperLikesLeft(0);

    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);

    if (mid) {
      setMatchedUser(cur);
      setMatchId(mid);
      setShowMatch(true);
    }

    loadTop(me);
  };

  // ---------------- SEND MESSAGE (+ BUTTON) ----------------
  const onSendMessage = async (message: string) => {
    if (!me || !top || messagesLeft <= 0) return;

    const cur = { ...top };
    advanceCard();

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: cur.user_id,
      action: "like",
    });

    await supabase.from("messages").insert({
      from_id: me.user_id,
      to_id: cur.user_id,
      message,
    });

    setMessagesLeft(0);

    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);

    if (mid) {
      setMatchedUser(cur);
      setMatchId(mid);
      setShowMatch(true);
    }

    loadTop(me);
  };

  // ---------------- INIT ----------------
  useEffect(() => {
    (async () => {
      const my = await loadMe();
      if (!my) return;

      await loadTop(my);
      setLoading(false);
    })();
  },[loadMe, loadTop]);

  // ---------------- CARD DATA ----------------
  const cardUser = useMemo(() => {
    if (!top) return null;

    return {
      id: top.user_id,
      user_id: top.user_id,
      nickname:
        top.first_name ??
        (top.nickname?.startsWith("User_")
          ? "Anonymous"
          : top.nickname) ??
        "Anonymous",
      age: top.age ?? 18,
      city: top.city || undefined,
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
      photo1_url: top.photo1_url,
    };
  },[top]);

  // ---------------- UI ----------------
  return (
    <div className="bg-black min-h-screen flex justify-center">
      <div className="w-full max-w-lg relative" style={{ height: "100dvh" }}>
        <TinderCard
          key={cardUser?.id ?? "empty"}
          user={cardUser}
          otherUserId={cardUser?.user_id}
          myProfile={me}
          onLike={onLike}
          onSkip={onSkip}
          onSuperLike={onSuperLike}
          onSendMessage={onSendMessage}
          messagesLeft={messagesLeft}
          superLikesLeft={superLikesLeft}
          onOpenProfile={() => cardUser && router.push(`/profile/${cardUser.user_id}`)}
          externalMatchId={matchId}
          externalShowMatch={showMatch}
          onCloseMatch={() => {
            setShowMatch(false);
            setMatchId(null);
            setMatchedUser(null);
          }}
          onOpenChat={() => matchId && router.push(`/chat/${matchId}`)}
          matchedUserName={matchedUser?.first_name ?? matchedUser?.nickname ?? undefined}
          matchedUserPhoto={matchedUser?.photo1_url ?? undefined}
        />
      </div>
      <BottomNav />
    </div>
  );
}