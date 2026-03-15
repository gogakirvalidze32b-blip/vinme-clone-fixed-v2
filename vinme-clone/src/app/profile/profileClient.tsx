"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [me, setMe] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) { router.replace("/login"); return; }

        const { data } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
        if (!data) { router.replace("/onboarding"); return; }
        if (!data.onboarding_completed) { router.replace("/onboarding"); return; }
        
        setMe(data);
        
        // ✅ Auto-update city from GPS in background (non-blocking)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
              const lang = typeof window !== "undefined" ? (localStorage.getItem("app_lang") ?? "ka") : "ka";
              const acceptLang = lang === "en" ? "en" : "ka";
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=${acceptLang}`,
                { headers: { "User-Agent": "Shekhvdi/1.0" } }
              );
              const geo = await res.json();
              const cityName = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.suburb || geo.address?.county;
              
              if (cityName || (pos.coords.latitude && pos.coords.longitude)) {
                await supabase.from("profiles").update({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  ...(cityName ? { city: cityName } : {}),
                }).eq("user_id", uid);
              }
            } catch (e) {
              console.error("Geolocation error:", e);
            }
          }, () => {});
        }
      } catch (e) {
        console.error("Profile load error:", e);
      }
    })();
  }, [router]);

  const name = me?.nickname ?? me?.first_name ?? "";
  const age = me?.age ?? null;
  const avatarUrl = me?.photo1_url ? photoSrc(me.photo1_url) : null;
  const pct = calcProgress(me);
const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

      <div className="mx-auto w-full max-w-lg px-4 pt-5">

        {/* TOP ROW */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/feed")}
            className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12 transition">
            ← {L("სვაიპი", "Swipe")}
          </button>
          <div className="flex gap-2">
            <button onClick={() => router.push("/settings")}
              className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/12 transition">
              ⚙️
            </button>
          </div>
        </div>
{/* AVATAR + NAME */}
<div className="flex items-center gap-4 mb-6">
  {/* Progress ring */}
  <div className="relative h-20 w-20 shrink-0">
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle cx="40" cy="40" r="36" fill="none" stroke="#ec4899" strokeWidth="5"
        strokeDasharray={`${2 * Math.PI * 36}`}
        strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
        strokeLinecap="round" />
    </svg>
    <div className="absolute inset-[5px] rounded-full overflow-hidden bg-zinc-800">
      {avatarUrl
        ? <img 
            src={avatarUrl} 
            alt="" 
            className="w-full h-full object-cover" 
            loading="eager"
            decoding="async"
          />
        : <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>}
    </div>
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-950 rounded-full px-2 py-0.5 text-[10px] font-bold ring-2 ring-pink-500 whitespace-nowrap">
      {pct}%
    </div>
  </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
<h1 className="text-2xl font-extrabold">
  {name ? `${name}${age ? `, ${age}` : ""}` : "..."}
</h1>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs border border-blue-400/40">✓</span>
            </div>
            <button onClick={() => router.push("/profile/edit")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition active:scale-[0.99]">
              ✏️ {L("პროფილის რედაქტირება", "Edit profile")}
            </button>
          </div>
        </div>

        {/* DOUBLE DATE */}
        <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10 mb-4 flex items-center gap-3">
          <div className="text-2xl shrink-0">👥</div>
          <div className="flex-1">
            <div className="font-bold text-sm">{L("Double Date", "Try Double Date")}</div>
            <div className="text-xs text-white/50">{L("მეგობრებს დაპატიჟე", "Invite your friends and find other pairs.")}</div>
          </div>
          <button onClick={() => {}} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 shrink-0">→</button>
        </div>

        {/* TILES */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile icon="⭐" title={L("სუპერ ლაიქი", "Super Likes")} sub="0" onClick={() => {}} />
          <Tile icon="⚡" title={L("ბუსტი", "Boosts")} sub={L("ჩემი ბუსტები", "My Boosts")} onClick={() => {}} />
          <Tile icon="🔥" title={L("გამოწერა", "Subs")} sub={L("გამოწერები", "Subscriptions")} onClick={() => {}} />
        </div>

        {/* PREMIUM */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-4 ring-1 ring-amber-500/20 flex items-center justify-between">
          <div>
            <div className="font-extrabold">Premium</div>
            <div className="text-xs text-white/60 mt-0.5">{L("ნახე ვინ მოგწონს, საუკეთესო და სხვა.", "See who likes you, top picks, and more.")}</div>
          </div>
          <button onClick={() => router.push("/premium")}
            className="rounded-full bg-amber-300 px-5 py-2.5 font-bold text-zinc-900 text-sm shrink-0 hover:bg-amber-200 transition active:scale-95">
            Upgrade
          </button>
        </div>

      </div>
      <BottomNav />
    </main>
  );
}

function Tile({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-3xl bg-white/8 p-4 text-left ring-1 ring-white/10 hover:bg-white/12 transition active:scale-[0.99]">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-bold">{title}</div>
      <div className="text-xs text-white/50 mt-0.5">{sub}</div>
    </button>
  );
}
