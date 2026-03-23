"use client";
 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
 
export default function LikesPage() {
  const router = useRouter();
  const lang = getLang();
  const L = (ka: string, en: string) => lang === "en" ? en : ka;
 
  // Cache რიცხვისთვის (რომ ეგრევე გამოჩნდეს)
  const [likeCount, setLikeCount] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("likes_count_cache");
      return cached ? Number(cached) : 0;
    }
    return 0;
  });
  
  const [isPremium, setIsPremium] = useState(false);
  const [likers, setLikers] = useState<{ id: string; name: string; age: number; photo: string }[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
 
      try {
        const[
          { data: profile },
          { data: myMatches },
          { data: mySwipes },
          { data: incomingLikes }
        ] = await Promise.all([
          supabase.from("profiles").select("is_premium, premium_until").eq("user_id", uid).maybeSingle(),
          supabase.from("matches").select("user_a, user_b").or(`user_a.eq.${uid},user_b.eq.${uid}`),
          supabase.from("swipes").select("to_id").eq("from_id", uid),
          supabase.from("swipes").select("from_id").eq("to_id", uid).eq("action", "like")
        ]);

        if (!alive) return;

        const premium = profile?.is_premium === true && (!profile?.premium_until || new Date(profile.premium_until) > new Date());
        setIsPremium(premium);

        const excludeIds = new Set([
          ...(myMatches || []).map((m: any) => m.user_a === uid ? m.user_b : m.user_a),
          ...(mySwipes ||[]).map((s: any) => s.to_id)
        ]);

        const actionableIds = (incomingLikes ||[])
          .map((s: any) => s.from_id)
          .filter((id: string) => !excludeIds.has(id));

        const realCount = actionableIds.length;
        setLikeCount(realCount);
        localStorage.setItem("likes_count_cache", String(realCount));

        if (realCount === 0) {
          setLoading(false);
          return;
        }

        const idsToFetch = actionableIds.slice(0, 50);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nickname, age, photo1_url")
          .in("user_id", idsToFetch);

        if (!alive) return;

        const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/";
        if (profiles) {
          setLikers(profiles.map((p: any) => ({
            id: p.user_id,
            name: p.nickname || "?",
            age: p.age || 0,
            photo: p.photo1_url ? (p.photo1_url.startsWith("http") ? p.photo1_url : STORAGE_URL + p.photo1_url) : "",
          })));
        }

      } catch (err) {
        console.error("Likes load error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  },[]);

  const handleQuickAction = async (targetId: string, action: "like" | "pass", e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;

    setLikers(prev => prev.filter(l => l.id !== targetId));
    setLikeCount(prev => Math.max(0, prev - 1));

    await supabase.from("swipes").insert({ from_id: uid, to_id: targetId, action: action });
    if (action === "like") {
      await supabase.from("matches").insert({ user_a: uid, user_b: targetId });
    }
  };

  const skeletons = Array.from({ length: Math.min(likeCount || 4, 10) });
 
  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white pb-36">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="text-2xl font-extrabold mb-1">{L("მოწონებები", "Likes")}</h1>
        
        {/* TABS */}
        <div className="flex border-b border-white/10 mt-6 mb-6">
          <button className="flex-1 pb-3 text-sm font-bold border-b-2 border-pink-500 text-white flex items-center justify-center gap-1.5">
            {likeCount} {L("მოწონება", "Likes")}
          </button>
          <button className="flex-1 pb-3 text-sm font-semibold text-white/40 flex items-center justify-center gap-1.5">
            {L("საუკეთესო", "Top Picks")}
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>
        </div>

        {loading ? (
          /* LOADING მდგომარეობა: გამოჩნდება ბლარ-ჩარჩოები (Skeletons) */
          <div className="grid grid-cols-2 gap-3">
            {skeletons.map((_, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-900 select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10 blur-xl scale-110 opacity-70" />
              </div>
            ))}
          </div>
        ) : isPremium ? (
          /* ================= PREMIUM იუზერები (არანაირი სარეკლამო ღილაკი) ================= */
          likeCount === 0 ? (
            <div className="text-center text-white/40 mt-20">
              {L("ჯერ არავის მოუწონებია შენი პროფილი", "No new likes yet")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {likers.map((liker) => (
                <div
                  key={liker.id}
                  onClick={() => router.push(`/profile/${liker.id}`)}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-900 cursor-pointer active:scale-95 transition"
                >
                  {liker.photo ? (
                    <img src={liker.photo} alt={liker.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  
                  <div className="absolute bottom-16 left-3">
                    <div className="font-bold text-sm">{liker.name}{liker.age ? `, ${liker.age}` : ""}</div>
                  </div>

                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                    <button onClick={(e) => handleQuickAction(liker.id, "pass", e)} className="w-10 h-10 flex items-center justify-center bg-zinc-800/80 backdrop-blur rounded-full text-red-500 hover:bg-red-500 hover:text-white transition shadow-lg">✕</button>
                    <button onClick={(e) => handleQuickAction(liker.id, "like", e)} className="w-10 h-10 flex items-center justify-center bg-zinc-800/80 backdrop-blur rounded-full text-green-500 hover:bg-green-500 hover:text-white transition shadow-lg">❤️</button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ================= არა-PREMIUM იუზერები ================= */
          <div className="relative">
            {likeCount === 0 ? (
              /* თუ 0 ლაიქია - სქრინის დიზაინი შუაში გულით */
              <div className="flex flex-col items-center justify-center mt-12 px-2 text-center">
                <p className="text-white/80 text-[15px] mb-10 leading-relaxed">
                  {L("გააქტიურე Premium-ი, რომ ნახო ადამიანები, რომლებმაც უკვე დაგალაიქეს.", "Upgrade to Premium to see people who have already liked you.")}
                </p>
                {/* მოოქროსფრო გულის აიქონი (სქრინის მსგავსად) */}
                <div className="text-7xl mb-10 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] select-none">
                  💛
                </div>
                <p className="text-white/90 text-sm font-medium">
                  {L("ნახე ვის მოეწონე Premium-ით™", "See people who liked you with Premium™")}
                </p>
              </div>
            ) : (
              /* თუ არის ლაიქები - დაბლარული პროფილები */
              <div className="grid grid-cols-2 gap-3">
                {likers.map((liker) => (
                  <div key={liker.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-900 select-none">
                    {liker.photo ? (
                      <img src={liker.photo} alt={liker.name} className="absolute inset-0 w-full h-full object-cover blur-xl scale-[1.15] opacity-80" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 z-10">
                      <div className="font-bold text-[15px] text-white drop-shadow-md">
                        {liker.name}{liker.age ? `, ${liker.age}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= გადახდის STICKY ღილაკი (მხოლოდ არა-PREMIUM-ზე, ყოველთვის ჩანს) ================= */}
      {!loading && !isPremium && (
        <div className="fixed bottom-[100px] left-0 right-0 px-6 z-40 flex justify-center">
          <button
            onClick={() => router.push("/premium")}
            className="w-full max-w-sm rounded-full bg-gradient-to-r from-amber-400 to-yellow-600 py-4 font-bold text-black text-[16px] shadow-[0_4px_20px_rgba(251,191,36,0.4)] active:scale-95 transition-all"
          >
            {L("ნახე ვის მოეწონე", "See Who Likes You")}
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}