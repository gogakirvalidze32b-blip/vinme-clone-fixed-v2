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

  const[me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [nextTop, setNextTop] = useState<any>(null);
  const[loading, setLoading] = useState(true);

  const [matchId, setMatchId] = useState<string | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const[matchedUser, setMatchedUser] = useState<any>(null);

  // ლიმიტები (რეალურ პროექტში ბაზიდან უნდა წამოიღო)
  const [superLikesLeft, setSuperLikesLeft] = useState(1);
  const [messagesLeft, setMessagesLeft] = useState(1);

  // მოდალების State-ები (ახალი)
  const [showMsgModal, setShowMsgModal] = useState(false);
  const[showMsgPaywall, setShowMsgPaywall] = useState(false);
  const[showSuperLikePaywall, setShowSuperLikePaywall] = useState(false);
  const [msgText, setMsgText] = useState("");

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

  // ---------------- LOAD TOP ----------------
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
      .select("user_id,first_name,nickname,age,city,photo1_url,last_seen,lat,lng,seeking,gender,onboarding_completed")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null);

    if (mySeeking !== "everyone" && mySeeking !== "both") {
      query = query.eq("gender", mySeeking);
    }
    if (myGender) {
      query = query.or(`seeking.eq.everyone,seeking.eq.both,seeking.eq.${myGender},seeking.is.null`);
    }
    if (excludedIds.length > 0) {
      query = query.not("user_id", "in", `(${excludedIds.join(",")})`);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) console.error("Feed Error:", error);

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

  // 🔥 შეცვლილი SUPER LIKE ლოგიკა
  const handleSuperLikeClick = () => {
    if (superLikesLeft > 0) {
      executeSuperLike();
    } else {
      setShowSuperLikePaywall(true); // ვხსნით Paywall მოდალს
    }
  };

  const executeSuperLike = async () => {
    if (!me || !top) return;
    const cur = { ...top };
    advanceCard();

    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "super_like" });
    setSuperLikesLeft(prev => prev - 1);

    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);
    if (mid) { setMatchedUser(cur); setMatchId(mid); setShowMatch(true); }
    loadTop(me);
  };

  // 🔥 შეცვლილი SEND MESSAGE ლოგიკა (First Impressions)
  const handleMessageClick = () => {
    if (messagesLeft > 0) {
      setShowMsgModal(true); // ვხსნით მესიჯის დასაწერ ფანჯარას
    } else {
      setShowMsgPaywall(true); // ვხსნით Paywall მოდალს
    }
  };

  const executeSendMessage = async () => {
    if (!me || !top || !msgText.trim()) return;
    const cur = { ...top };
    advanceCard();

    // 1. ვაკეთებთ ლაიქს
    await supabase.from("swipes").insert({ from_id: me.user_id, to_id: cur.user_id, action: "like" });
    // 2. ვწერთ მესიჯს
    await supabase.from("messages").insert({ from_id: me.user_id, to_id: cur.user_id, message: msgText });
    
    setMessagesLeft(prev => prev - 1);
    setShowMsgModal(false);
    setMsgText("");

    const mid = await checkAndCreateMatch(me.user_id, cur.user_id);
    if (mid) { setMatchedUser(cur); setMatchId(mid); setShowMatch(true); }
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
  }, [loadMe, loadTop]);

  const cardUser = useMemo(() => {
    if (!top) return null;
    return {
      id: top.user_id,
      user_id: top.user_id,
      nickname: top.first_name ?? (top.nickname?.startsWith("User_") ? "Anonymous" : top.nickname) ?? "Anonymous",
      age: top.age ?? 18,
      city: top.city || undefined,
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
      photo1_url: top.photo1_url,
    };
  }, [top]);

  return (
    <div className="bg-black min-h-screen flex justify-center overflow-hidden">
      <div className="w-full max-w-lg relative" style={{ height: "100dvh" }}>
        
        {/* მთავარი Feed */}
        <TinderCard
          key={cardUser?.id ?? "empty"}
          user={cardUser}
          otherUserId={cardUser?.user_id}
          myProfile={me}
          onLike={onLike}
          onSkip={onSkip}
          // 🔥 აქ ვაწვდით ახალ ფუნქციებს:
          onSuperLike={handleSuperLikeClick} 
          onSendMessage={handleMessageClick} // ეს უნდა გამოიძახოს ლურჯმა ღილაკმა TinderCard-ში
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

        {/* ================= MODAL: მესიჯის გაგზავნა (სქრინი 2) ================= */}
        {showMsgModal && cardUser && (
          <div className="absolute inset-0 z-[60] bg-[#0f172a] flex flex-col animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 flex items-center justify-between">
              <button onClick={() => setShowMsgModal(false)} className="text-white/50 text-3xl leading-none">×</button>
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-500 font-bold text-sm">
                {messagesLeft}
              </div>
            </div>
            <div className="px-6 flex-1 flex flex-col">
              <div className="text-blue-500 font-bold text-sm mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                Up to 5x your chances to match
              </div>
              <h2 className="text-xl font-bold text-white mb-6 leading-snug">
                Stand out with First Impressions. Send a message. See if it's a match.
              </h2>
              <div className="relative flex-1 max-h-[50vh] rounded-2xl overflow-hidden bg-zinc-800 mb-6 shadow-xl">
                {cardUser.photo_url && (
                  <img src={cardUser.photo_url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 font-bold text-xl text-white">
                  {cardUser.nickname}, {cardUser.age}
                </div>
              </div>
              <div className="mt-auto mb-6">
                <div className="flex bg-zinc-900 border border-zinc-700 rounded-2xl p-2 items-center">
                  <input
                    type="text"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    placeholder="Your message"
                    className="flex-1 bg-transparent text-white px-3 py-2 outline-none"
                    autoFocus
                  />
                  <button 
                    onClick={executeSendMessage}
                    disabled={!msgText.trim()}
                    className="text-white/50 font-bold px-4 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: Message Paywall (სქრინი 3) ================= */}
        {showMsgPaywall && (
          <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in">
            <div className="bg-[#0f172a] w-full rounded-t-3xl pt-6 pb-8 px-6 shadow-2xl slide-in-from-bottom-full">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowMsgPaywall(false)} className="text-white/50 text-3xl leading-none">×</button>
                <div className="text-blue-500 font-bold flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  Get First Impressions
                </div>
                <div className="w-8"></div>
              </div>
              <h2 className="text-xl font-bold text-white mb-6 text-center leading-snug">
                Stand out with First Impressions. You're up to 5x more likely to get a match!
              </h2>
              
              <div className="space-y-3 mb-6">
                <button onClick={() => router.push("/premium")} className="w-full flex justify-between items-center p-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:border-blue-500 transition">
                  <span className="font-bold text-white">3 First Impressions</span>
                  <span className="text-white/70">14.60 ₾/ea</span>
                </button>
                <button onClick={() => router.push("/premium")} className="w-full flex flex-col p-4 rounded-xl border-2 border-blue-500 bg-blue-500/10 relative transition">
                  <span className="absolute -top-2.5 left-4 bg-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</span>
                  <div className="flex justify-between items-center w-full">
                    <span className="font-bold text-white text-lg">12 First Impressions</span>
                    <span className="text-white/70">10.30 ₾/ea</span>
                  </div>
                </button>
                <button onClick={() => router.push("/premium")} className="w-full flex justify-between items-center p-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:border-blue-500 transition">
                  <span className="font-bold text-white">50 First Impressions</span>
                  <span className="text-white/70">5.90 ₾/ea</span>
                </button>
              </div>

              <div className="text-center mb-6 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700"></div></div>
                <span className="bg-[#0f172a] px-4 text-sm text-white/50 relative">or</span>
              </div>

              <button onClick={() => router.push("/premium")} className="w-full bg-[#1a1a1a] border border-zinc-700 rounded-xl p-4 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xl">🔥</span>
                  <span className="font-bold text-white">Get Tinder Platinum</span>
                </div>
                <span className="bg-zinc-800 px-4 py-1.5 rounded-full text-sm font-bold">Select</span>
              </button>

              <button onClick={() => router.push("/premium")} className="w-full bg-blue-500 text-white font-bold text-lg py-4 rounded-full active:scale-95 transition">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ================= MODAL: Super Like Paywall (სქრინი 4/5) ================= */}
        {showSuperLikePaywall && (
          <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in">
            <div className="bg-[#0f172a] w-full rounded-t-3xl pt-6 pb-8 px-6 shadow-2xl slide-in-from-bottom-full">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setShowSuperLikePaywall(false)} className="text-white/50 text-3xl leading-none">×</button>
                <div className="text-blue-400 font-bold flex items-center gap-2">
                  ⭐ Get Super Likes
                </div>
                <div className="w-8"></div>
              </div>
              <h2 className="text-xl font-bold text-white mb-6 text-center leading-snug">
                Stand out with Super Like. You're 3x more likely to get a match!
              </h2>

              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                <div onClick={() => router.push("/premium")} className="min-w-[160px] snap-center bg-zinc-800 border border-zinc-700 rounded-2xl p-5 flex flex-col justify-between h-48 cursor-pointer hover:border-blue-400 transition">
                  <span className="text-lg font-bold">3 Super Likes</span>
                  <div>
                    <div className="text-white/60 mb-3">4.99 ₾/ea</div>
                    <button className="w-full bg-blue-500 text-white font-bold py-2 rounded-full">Select</button>
                  </div>
                </div>
                <div onClick={() => router.push("/premium")} className="min-w-[160px] snap-center bg-[#1a233a] border-2 border-blue-400 rounded-2xl p-5 flex flex-col justify-between h-48 relative cursor-pointer">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-400 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase">Popular</span>
                  <span className="text-lg font-bold">10 Super Likes</span>
                  <div>
                    <div className="text-white/60 mb-3">1.29 ₾/ea</div>
                    <button className="w-full bg-blue-500 text-white font-bold py-2 rounded-full">Select</button>
                  </div>
                </div>
              </div>

              <div className="text-center my-4 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700"></div></div>
                <span className="bg-[#0f172a] px-4 text-sm text-white/50 relative">or</span>
              </div>

              <button onClick={() => router.push("/premium")} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xl">💛</span>
                  <span className="font-bold text-black">Get Tinder Gold™</span>
                </div>
                <span className="bg-black/20 px-4 py-1.5 rounded-full text-sm font-bold text-black">Select</span>
              </button>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}