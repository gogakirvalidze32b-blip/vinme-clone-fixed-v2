"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

const COMPLETENESS_FIELDS = [
  "nickname", "bio", "city", "gender", "orientation", "intent",
  "job_title", "company", "education", "pets", "drinking", "smoking", "workout", "photo1_url"
];

function calcProgress(p: any): number {
  if (!p) return 0;
  const filled = COMPLETENESS_FIELDS.filter(f => p[f] && String(p[f]).trim() !== "").length;
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

export default function ProfileClient() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
  const L = (k: string, e: string) => ka ? k : e;

  const [me, setMe] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. მყისიერი ჩატვირთვა ქეშიდან
    try {
      const cached = localStorage.getItem("my_profile_cache");
      if (cached) setMe(JSON.parse(cached));
    } catch (e) {
      console.error("Cache error:", e);
    }

    // 2. ფონური განახლება ბაზიდან
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) { router.replace("/login"); return; }

        const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
        if (!data) { router.replace("/onboarding"); return; }
        if (!data.onboarding_completed) { router.replace("/onboarding"); return; }
        
        setMe(data);
        localStorage.setItem("my_profile_cache", JSON.stringify(data));

        // 3. ავტომატური ლოკაციის განახლება (ფონურად)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&email=shekhvdi_app@gmail.com`
              );
              const geo = await res.json();
              const cityName = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.suburb || geo.address?.county;
              
              if (cityName && cityName !== data.city) {
                await supabase.from("profiles").update({ 
                  city: cityName, 
                  latitude: pos.coords.latitude, 
                  longitude: pos.coords.longitude 
                }).eq("user_id", uid);
              }
            } catch (e) {}
          }, () => {}, { timeout: 10000 });
        }
      } catch (e) {
        console.error("Load error:", e);
      }
    })();
  }, [router]);

  // Hydration fix: სანამ კლიენტი არ დაიქოქება, არაფერს ვხატავთ
  if (!mounted) return <div className="min-h-screen bg-zinc-950" />;
  // თუ ქეშიც ცარიელია და ბაზაც იტვირთება
  if (!me) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white/20 animate-pulse">Loading...</div>;

  const name = me?.nickname ?? me?.first_name ?? "";
  const age = me?.age ?? null;
  const avatarUrl = me?.photo1_url ? photoSrc(me.photo1_url) : null;
  const pct = calcProgress(me);

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white" style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom, 0px))" }}>

      <div className="mx-auto w-full max-w-lg px-4 pt-5">

        {/* TOP ROW */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/feed")}
            className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12 transition">
            ← {L("სვაიპი", "Swipe")}
          </button>
          <button onClick={() => router.push("/settings")}
            className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition">
            ⚙️
          </button>
        </div>

        {/* AVATAR + NAME */}
        <div className="flex items-center gap-4 mb-8">
          {/* Progress ring */}
          <div className="relative h-24 w-24 shrink-0">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="#ec4899" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-[6px] rounded-full overflow-hidden bg-zinc-900 ring-2 ring-white/5">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="eager" />
                : <div className="w-full h-full flex items-center justify-center text-3xl bg-zinc-800">👤</div>}
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-600 rounded-full px-2 py-0.5 text-[10px] font-black shadow-lg">
              {pct}%
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">
                {name}{age ? `, ${age}` : ""}
              </h1>
              {name && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">✓</span>
              )}
            </div>
            <button onClick={() => router.push("/profile/edit")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black hover:bg-zinc-200 transition active:scale-95">
              ✏️ {L("რედაქტირება", "Edit")}
            </button>
          </div>
        </div>

        {/* DOUBLE DATE BANNER */}
        <div className="rounded-3xl bg-zinc-900 p-4 border border-white/5 mb-4 flex items-center gap-4 shadow-xl">
          <div className="text-3xl shrink-0">👥</div>
          <div className="flex-1">
            <div className="font-bold text-sm">{L("Double Date", "Double Date")}</div>
            <div className="text-xs text-white/40">{L("მეგობრებთან ერთად", "Try matching with friends")}</div>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">→</button>
        </div>

        {/* TILES */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Tile icon="⭐" title={L("სუპერ", "Super")} sub="0" />
          <Tile icon="⚡" title={L("ბუსტი", "Boost")} sub="0" />
          <Tile icon="🔥" title={L("გამოწერა", "Subs")} sub="Plus" />
        </div>

        {/* PREMIUM BANNER */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 p-5 border border-amber-500/20 flex items-center justify-between shadow-2xl">
          <div className="flex-1 pr-4">
            <div className="font-black text-amber-400 text-lg uppercase tracking-wider">Premium</div>
            <div className="text-xs text-white/50 mt-1">{L("ნახე ვინ მოგწონს", "See who likes you")}</div>
          </div>
          <button onClick={() => router.push("/premium")}
            className="rounded-full bg-amber-400 px-6 py-2.5 font-black text-black text-xs uppercase hover:bg-amber-300 transition active:scale-95 shadow-lg shadow-amber-500/20">
            Upgrade
          </button>
        </div>

      </div>
      <BottomNav />
    </main>
  );
}

function Tile({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <button className="rounded-2xl bg-zinc-900 p-4 text-left border border-white/5 hover:bg-zinc-800 transition active:scale-95">
      <div className="text-xl mb-2">{icon}</div>
      <div className="text-[11px] font-bold text-white/80">{title}</div>
      <div className="text-[10px] text-white/30 font-medium truncate">{sub}</div>
    </button>
  );
}