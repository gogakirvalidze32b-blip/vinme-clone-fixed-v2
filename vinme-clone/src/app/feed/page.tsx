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

  const [me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const[nextTop, setNextTop] = useState<any>(null);
  const[previousTop, setPreviousTop] = useState<any>(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);

  const [superLikesLeft, setSuperLikesLeft] = useState(0);
  const [firstImpressionsLeft, setFirstImpressionsLeft] = useState(0);

  const[showFIInput, setShowFIInput] = useState(false);
  const[showFIPaywall, setShowFIPaywall] = useState(false);
  const [showSLPaywall, setShowSLPaywall] = useState(false);
  
  // პროფილის ჩამოშლის და ლაივ მონაცემების State-ები
  const [expandedProfile, setExpandedProfile] = useState(false);
  const[liveProfileData, setLiveProfileData] = useState<any>(null);

  const [msgText, setMsgText] = useState("");
  const [selectedFIPack, setSelectedFIPack] = useState(12);
  const [selectedSLPack, setSelectedSLPack] = useState(10);

  const loadingTopRef = useRef(false);
  const meRef = useRef<any>(null);

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
  },[router]);

  const loadTop = useCallback(async (myProfile: any) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;

    const myId = myProfile.user_id;
    const mySeeking = myProfile.seeking || "everyone";
    const myGender = myProfile.gender || null;

    const { data: swiped } = await supabase
      .from("swipes")
      .select("to_id")
      .eq("from_id", myId);
    const excludedIds = swiped?.map((s: any) => s.to_id) ??[];

    let query = supabase
      .from("profiles")
      .select("user_id,first_name,nickname,age,city,photo1_url,last_seen,lat,lng,seeking,gender,onboarding_completed,bio,intent")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);

    if (mySeeking !== "everyone" && mySeeking !== "both")
      query = query.eq("gender", mySeeking);
    if (myGender)
      query = query.or(
        `seeking.eq.everyone,seeking.eq.both,seeking.eq.${myGender},seeking.is.null`
      );
    if (excludedIds.length > 0)
      query = query.not("user_id", "in", `(${excludedIds.join(",")})`);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(2);
    if (error) console.error("Feed Error:", error);

    setTop(data?.[0] ?? null);
    setNextTop(data?.[1] ?? null);

    loadingTopRef.current = false;
  },[]);

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

  const advanceCard = () => {
    setPreviousTop(top);
    setExpandedProfile(false);
    setLiveProfileData(null); // ვასუფთავებთ ლაივ დატას შემდეგი იუზერისთვის
    if (nextTop) {
      setTop(nextTop);
      setNextTop(null);
    } else setTop(null);
  };

  const onLike = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "like" });
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
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "skip" });
    loadTop(me);
  };

  // 🔥 REWIND (დაბრუნების ლოგიკა)
  const onRewind = async () => {
    if (!previousTop) return;
    
    // თუ არაა პრემიუმი, გადავა პრემიუმის გვერდზე
    if (!me?.is_premium) {
      router.push("/premium");
      return;
    }

    // თუ პრემიუმია, ვაბრუნებთ უკან და ვშლით სვაიპს ბაზიდან
    setNextTop(top);
    setTop(previousTop);
    setPreviousTop(null);
    setExpandedProfile(false);
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
      if (mid) {
        setMatchedUser(cur);
        setMatchId(mid);
        setShowMatch(true);
      }
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
      if (mid) {
        setMatchedUser(cur);
        setMatchId(mid);
        setShowMatch(true);
      }
      loadTop(me);
    } else {
      setShowFIInput(false);
      setShowFIPaywall(true);
    }
  };

  // 🔥 როცა ისარს აწვება, ეგრევე ბაზიდან იღებს ფრეშ მონაცემებს (Bio, Intent)
  const handleOpenProfile = async () => {
    if (!top?.user_id) return;
    setExpandedProfile(true);
    
    // ლაივ რეჟიმში ვიღებთ ინფორმაციას 
    const { data } = await supabase
      .from("profiles")
      .select("bio, intent, city")
      .eq("user_id", top.user_id)
      .single();
      
    if (data) {
      setLiveProfileData(data);
    }
  };

  useEffect(() => {
    (async () => {
      const my = await loadMe();
      if (!my) return;
      await loadTop(my);
      setIsInitialLoad(false);
    })();
  },[loadMe, loadTop]);

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

  const fiPackages =[
    { id: 3, count: 3, price: "2.49", total: 7.47, label: null, save: null },
    { id: 12, count: 12, price: "1.99", total: 23.88, label: L("პოპულარული", "Popular"), save: "20%" },
    { id: 25, count: 25, price: "1.59", total: 39.75, label: L("საუკეთესო ფასი", "Best Value"), save: "36%" },
  ];

  const slPackages =[
    { id: 3, count: 3, price: "2.99", total: 8.97, label: null },
    { id: 10, count: 10, price: "2.49", total: 24.90, label: L("პოპულარული", "Popular") },
  ];

  if (isInitialLoad) {
    return <div className="bg-black min-h-[100dvh]" />;
  }

  // ვიყენებთ ლაივ მონაცემებს თუ ჩაიტვირთა, თუ არა ძველს
  const displayBio = liveProfileData?.bio !== undefined ? liveProfileData.bio : top?.bio;
  const displayIntent = liveProfileData?.intent !== undefined ? liveProfileData.intent : top?.intent;
  const displayCity = liveProfileData?.city !== undefined ? liveProfileData.city : top?.city;

  return (
    <div className="bg-black min-h-screen flex justify-center overflow-hidden">
      <div className="w-full max-w-lg relative" style={{ height: "100dvh" }}>
        
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
          onOpenProfile={handleOpenProfile} // 🔥 ვაწვდით ჩვენს ახალ ფუნქციას
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
          isInitialLoad={isInitialLoad}
        />

        {/* ================= პროფილის ჩამოშლა (Live Data & Smooth Overlay) ================= */}
        {expandedProfile && cardUser && (
          <div className="absolute inset-x-0 bottom-0 z-50 bg-[#0f172a] rounded-t-3xl overflow-y-auto max-h-[85vh] animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-32">
            
            {/* Header / Arrow Down */}
            <div className="sticky top-0 w-full flex justify-center pt-4 pb-2 bg-gradient-to-b from-[#0f172a] to-transparent z-10">
              <button 
                onClick={() => setExpandedProfile(false)} 
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition backdrop-blur-md"
              >
                {/* პატარა თეთრი ისარი დაბლა */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <div className="px-6 pt-2 space-y-6">
              
              <div className="border-b border-white/10 pb-4">
                <h1 className="text-3xl font-black text-white">
                  {cardUser.nickname} <span className="font-light text-white/80">{cardUser.age}</span>
                </h1>
              </div>

              {displayBio && (
                <div>
                  <h3 className="text-white/50 font-bold text-[13px] mb-2 uppercase tracking-wide">{L("ჩემ შესახებ", "About Me")}</h3>
                  <p className="text-white/90 text-[16px] leading-relaxed bg-white/5 p-4 rounded-2xl">{displayBio}</p>
                </div>
              )}

              {displayIntent && (
                <div>
                  <h3 className="text-white/50 font-bold text-[13px] mb-2 uppercase tracking-wide">{L("ვეძებ", "Looking for")}</h3>
                  <div className="inline-flex items-center gap-2 bg-pink-500/20 border border-pink-500/30 px-4 py-2 rounded-xl text-pink-100 font-medium">
                    <span>💝</span> {displayIntent}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-white/50 font-bold text-[13px] mb-2 uppercase tracking-wide">{L("ძირითადი", "Essentials")}</h3>
                <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 text-white/90 text-[15px]">
                    <span className="text-xl">📍</span> {displayCity || L("თბილისი", "Tbilisi")}
                  </div>
                  {cardUser.distanceKm != null && (
                    <div className="flex items-center gap-3 text-white/90 text-[15px]">
                      <span className="text-xl">📏</span> {cardUser.distanceKm < 1 ? L("1 კმ-ზე ნაკლები", "Less than 1 km away") : `${cardUser.distanceKm} ${L("კმ", "km away")}`}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ... (First Impressions & Paywalls კოდი რჩება უცვლელი როგორც გქონდა) ... */}
        
        {/* ================= First Impressions მოდალი ================= */}
        {showFIInput && cardUser && (
           <div className="absolute inset-0 z-[60] bg-[#0b101a] flex flex-col animate-in fade-in slide-in-from-bottom-4">
           {/* ... (შენი ძველი მოდალის კოდი) ... */}
           </div>
        )}

        {/* ================= Paywalls ================= */}
        {showFIPaywall && ( <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in">...</div> )}
        {showSLPaywall && ( <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in">...</div> )}

      </div>
      <BottomNav />
    </div>
  );
}