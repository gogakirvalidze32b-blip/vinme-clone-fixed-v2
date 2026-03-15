"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "@/components/TinderCard";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export default function FeedPage() {
  const router = useRouter();
  const[me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const[matchId, setMatchId] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const loadingTopRef = useRef(false);
  const meRef = useRef<any>(null);

  const loadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) { router.replace("/login"); return null; }
    
    const { data: row } = await supabase
      .from("profiles")
      .select("user_id,anon_id,seeking,gender,age,first_name,nickname,photo1_url,last_seen,latitude,longitude,city,onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();
      
    setMe(row);
    meRef.current = row;
    return row;
  }, [router]);

  // 📍 ლაივ ლოკაციის ტრეკერი (watchPosition)
  useEffect(() => {
    if (!me?.user_id || !navigator.geolocation) return;

    let lastLat = me.latitude;
    let lastLon = me.longitude;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLon = pos.coords.longitude;

        // ვამოწმებთ, იმოძრავა თუ არა მინიმუმ 2 კილომეტრით. 
        // თუ 2 კმ-ზე ნაკლებია სხვაობა, ტყუილად არ ვაწუხებთ ბაზას.
        if (lastLat && lastLon) {
          const movedDist = haversineKm(lastLat, lastLon, newLat, newLon);
          if (movedDist < 2) return; 
        }

        lastLat = newLat;
        lastLon = newLon;

        try {
          let newCity = me.city || "";
          // ⚠️ არ დაგავიწყდეს ქვემოთ email-ის შეცვლა შენი მეილით!
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLon}&format=json&zoom=10&addressdetails=1&email=gogakirvalidze@gmail.com`,
            { headers: { "Accept-Language": "ka" } }
          );
          if (res.ok) {
            const json = await res.json();
            newCity = json.address?.city || json.address?.town || json.address?.village || json.address?.county || newCity;
          }

          // ვაახლებთ ლოკაციას ბაზაში
          await supabase.from("profiles").update({ latitude: newLat, longitude: newLon, city: newCity }).eq("user_id", me.user_id);
          // ვაახლებთ Feed-ში
          setMe((prev: any) => prev ? { ...prev, latitude: newLat, longitude: newLon, city: newCity } : prev);
          
        } catch (err) {
          console.log("Live geocoding failed");
        }
      },
      (err) => console.error("Live location error:", err),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );

    // როცა იუზერი სხვა გვერდზე გადადის, ლოკაციის ტრეკინგი ითიშება
    return () => navigator.geolocation.clearWatch(watchId);
  }, [me?.user_id]);

  const loadTop = useCallback(async (myProfile: any) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;
    const myId = myProfile.user_id;
    const seeking = myProfile.seeking ?? "everyone";
    const myGender = myProfile.gender ?? null;
    const { data: swiped } = await supabase.from("swipes").select("to_id").eq("from_id", myId);
    const excludedIds = swiped?.map((s: any) => s.to_id) ??[];
    
    let query = supabase.from("profiles")
      .select("user_id,first_name,nickname,age,city,photo1_url,last_seen,latitude,longitude,seeking,gender,onboarding_completed")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);
      
    if (seeking !== "everyone") query = query.eq("gender", seeking);
    if (myGender) query = query.or(`seeking.eq.everyone,seeking.eq.${myGender}`);
    if (excludedIds.length > 0) query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
    
    const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    setTop(data ?? null);
    loadingTopRef.current = false;
  },[]);

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

  // მეორე მხარისთვის realtime match
  useEffect(() => {
    if (!me) return;
    const ch = supabase.channel(`feed-matches-${me.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, async (payload) => {
        const match = payload.new as any;
        if (match.user_a !== me.user_id && match.user_b !== me.user_id) return;
        const otherId = match.user_a === me.user_id ? match.user_b : match.user_a;
        const { data: otherProfile } = await supabase
          .from("profiles").select("user_id,first_name,nickname,photo1_url")
          .eq("user_id", otherId).maybeSingle();
        setMatchedUser(otherProfile ?? null);
        setMatchId(String(match.id));
        setShowMatch(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me]);

  async function checkAndCreateMatch(myId: string, otherId: string): Promise<string | null> {
    const { data: theirSwipe } = await supabase.from("swipes").select("id")
      .eq("from_id", otherId).eq("to_id", myId).eq("action", "like").maybeSingle();
    if (!theirSwipe) return null;
    const { data: existing } = await supabase.from("matches").select("id")
      .or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`)
      .limit(1).maybeSingle();
    if (existing?.id) return String(existing.id);
    const { data: created } = await supabase.from("matches").insert({ user_a: myId, user_b: otherId }).select("id").single();
    return created?.id ? String(created.id) : null;
  }

  const onLike = async () => {
    if (!me || !top) return;
    const currentTop = { ...top };
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: top.user_id, action: "like" });
    const mid = await checkAndCreateMatch(me.user_id, top.user_id);
    if (mid) {
      setMatchedUser(currentTop);
      setMatchId(mid);
      setShowMatch(true);
    }
    setTop(null);
    await loadTop(me);
  };

  const onSkip = async () => {
    if (!me || !top) return;
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: top.user_id, action: "skip" });
    setTop(null);
    await loadTop(me);
  };

  const distanceKm = useMemo(() => {
    if (!me?.latitude || !me?.longitude || !top?.latitude || !top?.longitude) return undefined;
    
    // 0,0 კოორდინატების დამცავი ბაგის წინააღმდეგ
    if (me.latitude === 0 && me.longitude === 0) return undefined;
    if (top.latitude === 0 && top.longitude === 0) return undefined;

    const d = haversineKm(me.latitude, me.longitude, top.latitude, top.longitude);
    
    // 5000 კმ-ზე მეტი თუ არის (ემულატორის ბაგი), ვმალავთ მანძილს
    if (d > 5000) return undefined;
    
    return d;
  }, [me, top]);

  const cardUser = useMemo(() => {
    if (!top) return null;
    return {
      id: top.user_id, user_id: top.user_id,
      nickname: top.first_name ?? top.nickname ?? "Anonymous",
      age: top.age ?? 18,
      city: top.city || undefined,
      distanceKm,
      recentlyActive: top.last_seen ? (Date.now() - new Date(top.last_seen).getTime()) < 30 * 60 * 1000 : false,
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
      photo1_url: top.photo1_url,
    };
  }, [top, distanceKm]);

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
          onOpenProfile={() => cardUser && router.push(`/profile/${cardUser.user_id}`)}
          externalMatchId={matchId}
          externalShowMatch={showMatch}
          onCloseMatch={() => { setShowMatch(false); setMatchId(null); setMatchedUser(null); }}
          onOpenChat={() => matchId && router.push(`/chat/${matchId}`)}
          matchedUserName={matchedUser?.first_name ?? matchedUser?.nickname ?? undefined}
          matchedUserPhoto={matchedUser?.photo1_url ?? undefined}
        />
      </div>
      <BottomNav />
    </div>
  );
}