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
 
  // ვიყენებთ Cache-ს, რომ რიცხვი მაშინვე გამოჩნდეს გვერდის ჩატვირთვისას
  const [likeCount, setLikeCount] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("likes_count_cache");
      return cached ? Number(cached) : 0;
    }
    return 0;
  });
  
  const [isPremium, setIsPremium] = useState(false);
  const[likers, setLikers] = useState<{ id: string; name: string; age: number; photo: string }[]>([]);
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

  // სანამ იტვირთება, ეკრანზე გამოჩნდება იმდენი ცარიელი ჩარჩო, რამდენიც ქეშში იყო (ან მინიმუმ 4)
  const skeletons = Array.from({ length: Math.min(likeCount || 4, 10) });
 
  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="text-2xl font-extrabold mb-1">{L("მოწონებები", "Likes")}</h1>
        
        <p className="text-sm text-white/40 mb-6">
          {L(`${likeCount} ადამიანმა მოგიწონა`, `${likeCount} people liked you`)}
        </p>
 
        <div className="flex rounded-full bg-white/8 p-1 mb-6">
          <button className="flex-1 rounded-full py-2 text-sm font-semibold bg-white text-black">
            {L(`${likeCount} მოწონება`, `${likeCount} Like${likeCount !== 1 ? "s" : ""}`)}
          </button>
          <button className="flex-1 rounded-full py-2 text-sm font-semibold text-white/40">
            {L("საუკეთესო", "Top Picks")}
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>
        </div>
 
        {!loading && likeCount === 0 ? (
          /* თუ ნამდვილად 0 ლაიქია ჩატვირთვის მერე */
          <div className="text-center text-white/40 py-12">
            {L("ჯერ არავის მოუწონებია შენი პროფილი", "No new likes yet")}
          </div>
        ) : !loading && isPremium ? (
          /* ================= PREMIUM VERSION ================= */
          <div className="grid grid-cols-2 gap-3">
            {likers.map((liker) => (
              <div
                key={liker.id}
                onClick={() => router.push(`/profile/${liker.id}`)}
                className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 cursor-pointer active:scale-95 transition"
              >
                {liker.photo ? (
                  <img src={liker.photo} alt={liker.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
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
        ) : (
          /* ================= NON-PREMIUM & LOADING VERSION ================= */
          <div className="relative">
            <div className="grid grid-cols-2 gap-3 pb-24">
              {loading ? (
                /* Loading მდგომარეობაში მაშინვე ჩანს ცარიელი ბლარ-ჩარჩოები (რგოლის მაგივრად) */
                skeletons.map((_, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 select-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl scale-110 opacity-70" />
                  </div>
                ))
              ) : (
                /* ჩატვირთვის მერე ჩნდება ნამდვილი პროფილები ბლარით და სახელებით */
                likers.map((liker) => (
                  <div key={liker.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 select-none">
                    {liker.photo ? (
                      <img src={liker.photo} alt={liker.name} className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-80" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl scale-110" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 z-10">
                      <div className="font-bold text-sm text-white drop-shadow-md">
                        {liker.name}{liker.age ? `, ${liker.age}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* STICKY ბანერი, რომელიც სულ ჩანს შუაში სქროლვის დროს და გადადის /premium-ზე */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="sticky top-[30vh] flex flex-col items-center justify-center px-6 pointer-events-auto">
                <div className="rounded-3xl bg-zinc-950/90 backdrop-blur-md p-6 ring-1 ring-white/10 text-center w-full max-w-[280px] shadow-2xl">
                  <div className="text-4xl mb-3">👀</div>
                  <div className="text-sm text-white/70 mb-5 leading-relaxed font-medium">
                    {L("გააქტიურე Premium-ი და ნახე სრულად", "Upgrade to Premium to see everyone")}
                  </div>
                  <button
                    onClick={() => router.push("/premium")}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 font-bold text-black text-[15px] hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2">
                    {L("ნახე ვის მოეწონე", "See Who Liked You")} 👑
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}