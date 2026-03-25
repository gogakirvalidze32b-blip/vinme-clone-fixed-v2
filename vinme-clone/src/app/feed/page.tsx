"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "@/components/TinderCard";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";
import { getLang } from "@/lib/i18n";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function FeedPage() {
  const router = useRouter();
  const lang = getLang();
  const L = (ka: string, en: string) => (lang === "en" ? en : ka);

  // ქეშირებული State-ები
  const[me, setMe] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("feed_me_cache");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const[top, setTop] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("feed_top_cache");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const[nextTop, setNextTop] = useState<any>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("feed_next_cache");
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const[previousTop, setPreviousTop] = useState<any>(null); 
  
  const[isInitialLoad, setIsInitialLoad] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("feed_top_cache");
    }
    return true;
  });

  const[matchId, setMatchId] = useState<string | null>(null);
  const[showMatch, setShowMatch] = useState(false);
  const[matchedUser, setMatchedUser] = useState<any>(null);

  const[superLikesLeft, setSuperLikesLeft] = useState(0); 
  const[firstImpressionsLeft, setFirstImpressionsLeft] = useState(0);

  const[showFIInput, setShowFIInput] = useState(false);
  const[showFIPaywall, setShowFIPaywall] = useState(false);
  const[showSLPaywall, setShowSLPaywall] = useState(false);
  
  const[expandedProfile, setExpandedProfile] = useState(false); 
  const[liveProfileData, setLiveProfileData] = useState<any>(null);
  
  const[msgText, setMsgText] = useState("");
  const[selectedFIPack, setSelectedFIPack] = useState(12);
  const[selectedSLPack, setSelectedSLPack] = useState(10);

  const loadingTopRef = useRef(false);
  const meRef = useRef<any>(me);

  // 🔥 SIDEBACK LOGIC: ეკრანის მარცხენა კიდიდან გამოწევა (ხურავს მხოლოდ ღია ფანჯრებს და არ აგდებს აპიდან!)
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    // თუ მარცხენა კიდიდან გამოწია მინიმუმ 100px-ით
    if (touchStartX.current < 40 && touchEndX - touchStartX.current > 100) {
      if (showSLPaywall) setShowSLPaywall(false);
      else if (showFIPaywall) setShowFIPaywall(false);
      else if (showFIInput) setShowFIInput(false);
      else if (expandedProfile) setExpandedProfile(false);
      else if (showMatch) { setShowMatch(false); setMatchId(null); setMatchedUser(null); }
    }
  };

  const loadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) { router.replace("/login"); return null; }
    const { data: row } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    setMe(row);
    meRef.current = row;
    localStorage.setItem("feed_me_cache", JSON.stringify(row));
    return row;
  }, [router]);

  const loadTop = useCallback(async (myProfile: any) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;

    const myId = myProfile.user_id;
    const mySeeking = myProfile.seeking || "everyone";
    const myGender = myProfile.gender || null;

    const { data: swiped } = await supabase.from("swipes").select("to_id").eq("from_id", myId);
    const excludedIds = swiped?.map((s: any) => s.to_id) ??[];

    let query = supabase
      .from("profiles")
      .select("user_id,first_name,nickname,age,city,photo1_url,last_seen,lat,lng,seeking,gender,onboarding_completed,bio,intent")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);

    if (mySeeking !== "everyone" && mySeeking !== "both") query = query.eq("gender", mySeeking);
    if (myGender) query = query.or(`seeking.eq.everyone,seeking.eq.both,seeking.eq.${myGender},seeking.is.null`);
    if (excludedIds.length > 0) query = query.not("user_id", "in", `(${excludedIds.join(",")})`);

    const { data, error } = await query.order("created_at", { ascending: false }).limit(2);
    if (error) console.error("Feed Error:", error);

    setTop(data?.[0] ?? null);
    setNextTop(data?.[1] ?? null);
    
    localStorage.setItem("feed_top_cache", JSON.stringify(data?.[0] || null));
    localStorage.setItem("feed_next_cache", JSON.stringify(data?.[1] || null));

    loadingTopRef.current = false;
  },[]);

  async function checkAndCreateMatch(myId: string, otherId: string) {
    const { data: theirSwipe } = await supabase.from("swipes").select("id").eq("from_id", otherId).eq("to_id", myId).in("action",["like", "super_like"]).maybeSingle();
    if (!theirSwipe) return null;
    const { data: existing } = await supabase.from("matches").select("id").or(`and(user_a.eq.${myId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${myId})`).maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created } = await supabase.from("matches").insert({ user_a: myId, user_b: otherId }).select("id").single();
    return created?.id ?? null;
  }

  const advanceCard = () => {
    setPreviousTop(top); 
    setExpandedProfile(false); 
    setLiveProfileData(null);
    if (nextTop) { 
      setTop(nextTop); 
      setNextTop(null); 
      localStorage.setItem("feed_top_cache", JSON.stringify(nextTop));
      localStorage.removeItem("feed_next_cache");
    } else {
      setTop(null);
      localStorage.removeItem("feed_top_cache");
    }
  };

  const onLike = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "like" });
    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);
    if (mid) { setMatchedUser(cur); setMatchId(mid); setShowMatch(true); }
    loadTop(me);
  };

  const onSkip = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "skip" });
    loadTop(me);
  };

  const onRewind = async () => {
    if (!me?.is_premium) { 
      router.push("/premium"); 
      return; 
    } 
    if (!previousTop) return;
    
    setNextTop(top);
    setTop(previousTop);
    setPreviousTop(null);
    await supabase.from("swipes").delete().eq("from_id", me.user_id).eq("to_id", previousTop.user_id);
  };

  const handleSuperLikeClick = async () => {
    if (superLikesLeft > 0) {
      if (!me || !top) return;
      const cur = { ...top };
      advanceCard();
      await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "super_like" });
      setSuperLikesLeft((prev) => prev - 1);
      const mid = await checkAndCreateMatch(me.user_id, cur.user_id);
      if (mid) { setMatchedUser(cur); setMatchId(mid); setShowMatch(true); }
      loadTop(me);
    } else {
      setShowSLPaywall(true);
    }
  };

  const handleOpenMessageModal = () => setShowFIInput(true);

  const handleSendMessage = async () => {
    if (!msgText.trim()) return;
    if (firstImpressionsLeft > 0) {
      if (!me || !top) return;
      const cur = { ...top };
      advanceCard();
      await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "like" });
      await supabase.from("messages").insert({ from_id: me.user_id, to_id: cur.user_id, message: msgText });
      setFirstImpressionsLeft((prev) => prev - 1);
      setShowFIInput(false);
      setMsgText("");
      const mid = await checkAndCreateMatch(me.user_id, cur.user_id);
      if (mid) { setMatchedUser(cur); setMatchId(mid); setShowMatch(true); }
      loadTop(me);
    } else {
      setShowFIInput(false);
      setTimeout(() => setShowFIPaywall(true), 50);
    }
  };

  const handleOpenProfile = async () => {
    if (!top?.user_id) return;
    setExpandedProfile(true);
    const { data } = await supabase.from("profiles").select("bio, intent, city").eq("user_id", top.user_id).single();
    if (data) setLiveProfileData(data);
  };

  useEffect(() => {
    (async () => {
      const my = await loadMe();
      if (!my) return;
      await loadTop(my);
      setIsInitialLoad(false);
    })();
  }, [loadMe, loadTop]);

  const cardUser = useMemo(() => {
    if (!top) return null;
    let dist: number | undefined = undefined;
    if (me?.lat && me?.lng && top.lat && top.lng) {
      dist = haversineKm(me.lat, me.lng, top.lat, top.lng);
    }
    return {
      id: top.user_id, 
      user_id: top.user_id,
      nickname: top.first_name ?? (top.nickname?.startsWith("User_") ? "Anonymous" : top.nickname) ?? "Anonymous",
      age: top.age ?? 18, 
      city: top.city || undefined,
      distanceKm: dist, 
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
      photo1_url: top.photo1_url,
    };
  },[top, me]);

  const nextCardUser = useMemo(() => {
    if (!nextTop) return null;
    let dist: number | undefined = undefined;
    if (me?.lat && me?.lng && nextTop.lat && nextTop.lng) {
      dist = haversineKm(me.lat, me.lng, nextTop.lat, nextTop.lng);
    }
    return {
      id: nextTop.user_id, 
      user_id: nextTop.user_id,
      nickname: nextTop.first_name ?? (nextTop.nickname?.startsWith("User_") ? "Anonymous" : nextTop.nickname) ?? "Anonymous",
      age: nextTop.age ?? 18, 
      city: nextTop.city || undefined,
      distanceKm: dist, 
      photo_url: nextTop.photo1_url ? photoSrc(nextTop.photo1_url) : null,
      photo1_url: nextTop.photo1_url,
    };
  }, [nextTop, me]);

  const fiPackages =[
    { id: 3, count: 3, price: "2.49", total: 7.47, label: null, save: null },
    { id: 12, count: 12, price: "1.99", total: 23.88, label: L("პოპულარული", "Popular"), save: "20%" },
    { id: 25, count: 25, price: "1.59", total: 39.75, label: L("საუკეთესო ფასი", "Best Value"), save: "36%" },
  ];

  const slPackages =[
    { id: 3, count: 3, price: "2.99", total: 8.97, label: null },
    { id: 10, count: 10, price: "2.49", total: 24.90, label: L("პოპულარული", "Popular") },
  ];

  if (isInitialLoad) return <div className="bg-[#0b0e14] min-h-[100dvh]" />;

  const displayBio = liveProfileData?.bio !== undefined ? liveProfileData.bio : top?.bio;
  const displayIntent = liveProfileData?.intent !== undefined ? liveProfileData.intent : top?.intent;
  const displayCity = liveProfileData?.city !== undefined ? liveProfileData.city : top?.city;

  return (
    <div 
      className="bg-[#0b0e14] min-h-screen flex justify-center overflow-hidden overscroll-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full relative mx-auto" style={{ height: "100dvh" }}>
        
        {/* 🔥 უკანა ბარათი: 1:1 ზომაში ზის, Scale მოხსნილია. საერთოდ არ გამოჩნდება სანამ არ გაწევ! */}
        {nextCardUser && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <TinderCard
              key={nextCardUser.id + "_bg"}
              user={nextCardUser}
              otherUserId={nextCardUser.user_id}
              myProfile={me}
              onSendMessage={() => {}} 
              messagesLeft={0}
              isBackground={false} // მნიშვნელოვანია! რომ ღილაკების ადგილები 100% დაემთხვეს წინა ბარათს
            />
          </div>
        )}

        {/* 🌟 წინა (მთავარი) ბარათი */}
        <div className="absolute inset-0 z-10">
          <TinderCard
            key={cardUser?.id ?? "empty"}
            user={cardUser}
            otherUserId={cardUser?.user_id}
            myProfile={me}
            onLike={onLike}
            onSkip={onSkip}
            onRewind={onRewind}
            onSuperLike={handleSuperLikeClick} 
            onSendMessage={handleOpenMessageModal} 
            messagesLeft={firstImpressionsLeft}
            superLikesLeft={superLikesLeft}
            onOpenProfile={handleOpenProfile} 
            externalMatchId={matchId}
            externalShowMatch={showMatch}
            onCloseMatch={() => { setShowMatch(false); setMatchId(null); setMatchedUser(null); }}
            onOpenChat={() => matchId && router.push(`/chat/${matchId}`)}
            matchedUserName={matchedUser?.first_name ?? matchedUser?.nickname ?? undefined}
            matchedUserPhoto={matchedUser?.photo1_url ?? undefined}
            isInitialLoad={isInitialLoad}
            isBackground={false}
          />
        </div>

        {/* ================= პროფილის ჩამოშლა (Tinder Style) ================= */}
        {expandedProfile && cardUser && (
          <div className="absolute inset-0 z-[40] bg-[#11141a] overflow-y-auto pb-28 animate-in slide-in-from-bottom-full duration-300">
            <div className="relative w-full aspect-[3/4] max-h-[70vh]">
              <img src={cardUser.photo_url || ""} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#11141a] via-[#11141a]/20 to-transparent" />
              
              <button 
                onClick={() => setExpandedProfile(false)} 
                className="absolute -bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(236,72,153,0.4)] z-10 text-white active:scale-90 transition"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              <div className="absolute bottom-4 left-6">
                <h1 className="text-4xl font-black text-white drop-shadow-lg">
                  {cardUser.nickname} <span className="font-light text-white/90">{cardUser.age}</span>
                </h1>
              </div>
            </div>
            
            <div className="px-6 pt-10 space-y-7">
              <div>
                <h3 className="text-white/40 font-bold text-[13px] uppercase tracking-wider mb-3">{L("ვეძებ", "Looking for")}</h3>
                <div className="inline-flex items-center gap-2 bg-[#1a1f2b] border border-white/5 px-4 py-2 rounded-xl text-white text-[15px] font-medium">
                  <span>💝</span> {displayIntent || "short_term"}
                </div>
              </div>

              <div>
                <h3 className="text-white/40 font-bold text-[13px] uppercase tracking-wider mb-3">{L("ძირითადი", "Essentials")}</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-white/90 text-[16px] font-medium">
                    <span className="text-xl">📍</span> {displayCity || L("თბილისი", "Tbilisi")}
                  </div>
                  {cardUser.distanceKm != null && (
                    <div className="flex items-center gap-3 text-white/90 text-[16px] font-medium">
                      <span className="text-xl">📏</span> {cardUser.distanceKm < 1 ? L("1 კმ-ზე ნაკლები", "Less than 1 km away") : `${cardUser.distanceKm} ${L("კმ", "km away")}`}
                    </div>
                  )}
                </div>
              </div>

              {displayBio && (
                <div>
                  <h3 className="text-white/40 font-bold text-[13px] uppercase tracking-wider mb-3">{L("ჩემ შესახებ", "About me")}</h3>
                  <p className="text-white/80 text-[16px] leading-relaxed">{displayBio}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= First Impressions მოდალი ================= */}
        {showFIInput && cardUser && (
          <div className="absolute inset-0 z-[60] bg-[#0b0e14] flex flex-col animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 flex items-center justify-between">
              <button onClick={() => setShowFIInput(false)} className="text-white/50 text-2xl font-bold">✕</button>
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[#1e293b] text-blue-500 font-bold text-xs">{firstImpressionsLeft}</div>
            </div>
            <div className="px-6 flex flex-col flex-1 pb-6">
              <div className="text-blue-500 font-bold text-[13px] mb-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                {L("5x გაზარდე მეჩის შანსი", "Up to 5x your chances to match")}
              </div>
              <h2 className="text-[17px] font-bold text-white mb-6 leading-snug">
                {L("გამოირჩიე პირველი შთაბეჭდილებით. გააგზავნე მესიჯი. ნახე თუ იქნება მეჩი.", "Stand out with First Impressions. Send a message. See if it's a match.")}
              </h2>
              <div className="relative w-full max-h-[45vh] aspect-[4/5] rounded-[24px] overflow-hidden bg-zinc-800 shadow-2xl mx-auto">
                {cardUser.photo_url && <img src={cardUser.photo_url} alt="" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <div className="absolute bottom-5 left-5 font-bold text-2xl text-white drop-shadow-md">{cardUser.nickname}, {cardUser.age}</div>
              </div>
              <div className="mt-auto pt-6">
                <div className="flex bg-[#1a1f2b] rounded-full p-1 pl-4 items-center">
                  <input type="text" value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder={L("შენი მესიჯი", "Your message")} className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder-zinc-500" autoFocus />
                  <button onClick={handleSendMessage} disabled={!msgText.trim()} className={`font-bold px-5 py-3 rounded-full transition-colors ${msgText.trim() ? "text-blue-500" : "text-zinc-600"}`}>
                    {L("გაგზავნა", "Send")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= First Impressions Paywall ================= */}
        {showFIPaywall && (
          <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end animate-in fade-in">
            <div className="bg-[#11141a] w-full rounded-t-3xl pt-6 pb-8 px-5 shadow-2xl slide-in-from-bottom-full border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowFIPaywall(false)} className="text-white/50 text-2xl font-bold">✕</button>
                <div className="text-blue-500 font-bold flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  {L("შეიძინე პირველი შთაბეჭდილება", "Get First Impressions")}
                </div>
                <div className="w-6"></div>
              </div>
              <h2 className="text-[17px] font-bold text-white mb-6 text-center leading-snug">
                {L("გამოირჩიე პირველი შთაბეჭდილებით. შენ გაქვს 5x მეტი შანსი მიიღო მეჩი!", "Stand out with First Impressions. You're up to 5x more likely to get a match!")}
              </h2>
              <div className="space-y-3 mb-6">
                {fiPackages.map((pack) => {
                  const isSelected = selectedFIPack === pack.id;
                  return (
                    <button key={pack.id} onClick={() => setSelectedFIPack(pack.id)} 
                      className={`w-full relative flex justify-between items-center p-4 rounded-xl border-2 transition ${isSelected ? "border-blue-500 bg-blue-500/10" : "border-white/5 bg-[#1a1f2b]"}`}>
                      {pack.label && <span className={`absolute -top-2.5 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isSelected ? "bg-blue-500 text-white" : "bg-zinc-700 text-zinc-300"}`}>{pack.label}</span>}
                      {pack.save && <span className="absolute top-4 right-4 text-[11px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{L("დაზოგე", "Save")} {pack.save}</span>}
                      <span className={`font-bold text-[16px] ${isSelected ? "text-white" : "text-zinc-200"}`}>{pack.count} First Impressions</span>
                      <span className={`text-[14px] mt-6 ${isSelected ? "text-blue-400" : "text-zinc-400"}`}>{pack.price} {L("₾/ცალი", "₾/ea")}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-center mb-6 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <span className="bg-[#11141a] px-4 text-xs font-bold text-zinc-500 uppercase relative">or</span>
              </div>
              <button onClick={() => router.push("/premium")} className="w-full bg-[#1a1f2b] border border-white/5 rounded-xl p-4 flex justify-between items-center mb-6 hover:bg-white/5 transition">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-white/50 uppercase mb-1">{L("შეიცავს 3 უფასოს კვირაში", "Includes 3 free First Impressions a week")}</span>
                  <div className="flex items-center gap-2"><span className="text-zinc-300 text-lg">🔥</span><span className="font-bold text-white">Get Shekhvdi Plus</span></div>
                </div>
                <span className="bg-zinc-700 px-4 py-1.5 rounded-full text-xs font-bold">Select</span>
              </button>
              <button onClick={() => router.push(`/checkout?product=first_impression&pack=${selectedFIPack}`)} 
                className="w-full bg-blue-500 text-white font-bold text-[16px] py-4 rounded-full active:scale-95 transition shadow-lg shadow-blue-500/20">
                {L(`გაგრძელება ${fiPackages.find(p=>p.id===selectedFIPack)?.total.toFixed(2)} ₾`, `Continue for ${fiPackages.find(p=>p.id===selectedFIPack)?.total.toFixed(2)} ₾ total`)}
              </button>
            </div>
          </div>
        )}

        {/* ================= Super Like Paywall ================= */}
        {showSLPaywall && (
          <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end animate-in fade-in">
            <div className="bg-[#11141a] w-full rounded-t-3xl pt-6 pb-8 px-5 shadow-2xl slide-in-from-bottom-full border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowSLPaywall(false)} className="text-white/50 text-2xl font-bold">✕</button>
                <div className="text-blue-400 font-bold flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {L("შეიძინე Super Likes", "Get Super Likes")}
                </div>
                <div className="w-6"></div>
              </div>
              <h2 className="text-[17px] font-bold text-white mb-8 text-center leading-snug px-4">
                {L("გამოირჩიე Super Like-ით. შენ გაქვს 3x მეტი შანსი მიიღო მეჩი!", "Stand out with Super Like. You're 3x more likely to get a match!")}
              </h2>
              <div className="flex gap-3 justify-center mb-8">
                {slPackages.map((pack) => {
                  const isSelected = selectedSLPack === pack.id;
                  return (
                    <div key={pack.id} onClick={() => setSelectedSLPack(pack.id)} 
                      className={`relative flex-1 rounded-2xl p-5 flex flex-col justify-between h-44 cursor-pointer transition border-2 ${isSelected ? "border-blue-500 bg-blue-500/10" : "border-white/5 bg-[#1a1f2b]"}`}>
                      {pack.label && <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase whitespace-nowrap ${isSelected ? "bg-blue-500 text-white" : "bg-zinc-700 text-zinc-300"}`}>{pack.label}</span>}
                      <span className={`text-[16px] font-bold text-center mt-2 ${isSelected ? "text-white" : "text-zinc-200"}`}>{pack.count} Super Likes</span>
                      <div className="mt-auto">
                        <div className={`text-center text-[13px] mb-3 ${isSelected ? "text-blue-400" : "text-zinc-400"}`}>{pack.price} {L("₾/ცალი", "₾/ea")}</div>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/checkout?product=super_like&pack=${pack.id}`); }}
                          className={`w-full font-bold py-2 rounded-full text-sm transition ${isSelected ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white/10 text-blue-500 hover:bg-white/20"}`}>
                          {L("არჩევა", "Select")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mb-6 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <span className="bg-[#11141a] px-4 text-xs font-bold text-zinc-500 uppercase relative">or</span>
              </div>
              <button onClick={() => router.push("/premium")} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 rounded-xl p-4 flex justify-between items-center active:scale-95 transition shadow-lg shadow-amber-500/20">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-black/70 uppercase mb-1">{L("შეიცავს 2 უფასო Super Like-ს კვირაში", "Includes 2 free Super Likes every week")}</span>
                  <div className="flex items-center gap-2"><span className="text-black text-xl">💛</span><span className="font-bold text-black text-[16px]">Get Shekhvdi Plus</span></div>
                </div>
                <span className="bg-black/20 px-4 py-1.5 rounded-full text-xs font-bold text-black uppercase">Select</span>
              </button>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}