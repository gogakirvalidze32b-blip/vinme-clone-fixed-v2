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
 
  const [likeCount, setLikeCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [likers, setLikers] = useState<{ id: string; name: string; age: number; photo: string }[]>([]);
 
  useEffect(() => {
    try {
      const cachedCount = localStorage.getItem("likes_count_cache");
      if (cachedCount !== null) setLikeCount(Number(cachedCount));
    } catch (e) {}
 
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;
 
      // Premium სტატუსი
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("user_id", uid)
        .maybeSingle();
 
      const premium = profile?.is_premium === true &&
        (!profile?.premium_until || new Date(profile.premium_until) > new Date());
 
      setIsPremium(premium);
 
      // ჩემი მეჩები — გამორიცხვისთვის
      const { data: myMatches } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
 
      const matchedIds = new Set(
        (myMatches || []).map((m: any) => m.user1_id === uid ? m.user2_id : m.user1_id)
      );
 
      // ლაიქების რაოდენობა
      const { count } = await supabase
        .from("swipes")
        .select("id", { count: "exact", head: true })
        .eq("to_id", uid)
        .eq("action", "like");
 
      if (count !== null) {
        setLikeCount(count);
        localStorage.setItem("likes_count_cache", String(count));
      }
 
      // თუ premium — ვინ მოგწონა
      if (premium) {
        const { data: swipes } = await supabase
          .from("swipes")
          .select("from_id")
          .eq("to_id", uid)
          .eq("action", "like")
          .limit(50);
 
        if (swipes && swipes.length > 0) {
          const fromIds = swipes
            .map((s: any) => s.from_id)
            .filter((id: string) => !matchedIds.has(id)); // მეჩები გამოვრიცხოთ
 
          if (fromIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, nickname, age, photo1_url")
              .in("user_id", fromIds);
 
            if (profiles) {
              setLikers(profiles.map((p: any) => ({
                id: p.user_id,
                name: p.nickname || "?",
                age: p.age || 0,
                photo: p.photo1_url || "",
              })));
            }
          }
        }
      }
    })();
  }, []);
 
  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="text-2xl font-extrabold mb-1">{L("მოწონებები", "Likes")}</h1>
        <p className="text-sm text-white/40 mb-6">
          {L(`${likeCount} ადამიანმა მოგიწონა`, `${likeCount} people liked you`)}
        </p>
 
        {/* TABS */}
        <div className="flex rounded-full bg-white/8 p-1 mb-6">
          <button className="flex-1 rounded-full py-2 text-sm font-semibold bg-white text-black">
            {L(`${likeCount} მოწონება`, `${likeCount} Like${likeCount !== 1 ? "s" : ""}`)}
          </button>
          <button className="flex-1 rounded-full py-2 text-sm font-semibold text-white/40">
            {L("საუკეთესო", "Top Picks")}
            <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>
        </div>
 
        {isPremium ? (
          <div className="grid grid-cols-2 gap-3">
            {likers.length === 0 ? (
              <div className="col-span-2 text-center text-white/40 py-12">
                {L("ჯერ არავის მოუწონებია", "No likes yet")}
              </div>
            ) : (
              likers.map((liker) => (
                <div
                  key={liker.id}
                  onClick={() => router.push(`/profile/${liker.id}`)}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 cursor-pointer active:scale-95 transition"
                >
                  {liker.photo ? (
                    <img
                      src={liker.photo}
                      alt={liker.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <div className="font-bold text-sm">{liker.name}{liker.age ? `, ${liker.age}` : ""}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20" />
                  <div className="absolute inset-0 backdrop-blur-xl" />
                  <div className="absolute bottom-3 left-3">
                    <div className="h-3 w-20 bg-white/30 rounded-full" />
                    <div className="h-2 w-12 bg-white/20 rounded-full mt-1.5" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
              <div className="rounded-3xl bg-zinc-950/90 backdrop-blur p-6 ring-1 ring-white/10 text-center w-full max-w-[280px]">
                <div className="text-4xl mb-3">👀</div>
                <div className="font-extrabold text-base mb-1">
                  {L("ნახე ვინ მოგწონს", "See Who Likes You")}
                </div>
                <div className="text-xs text-white/50 mb-4">
                  {L("გააქტიურე Premium-ი ვინ მოგწონს სანახავად", "Upgrade to see everyone who already liked you")}
                </div>
                <button
                  onClick={() => router.push("/premium")}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 font-bold text-black text-sm hover:shadow-lg transition active:scale-95">
                  {L("Upgrade Premium", "Upgrade to Gold")} 👑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}