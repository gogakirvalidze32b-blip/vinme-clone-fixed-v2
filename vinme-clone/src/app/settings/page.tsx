"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getLang } from "@/lib/i18n";

// ბაზაში მონაცემების შენახვის დამხმარე ფუნქცია
async function saveProfilePatch(patch: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("No user") };
  const anonId = `anon_${user.id.replace(/-/g, "").slice(0, 12)}`;
  const { error } = await supabase.from("profiles").upsert({ user_id: user.id, anon_id: anonId, ...patch }, { onConflict: "user_id" });
  return { error };
}

// უფასო / სტანდარტული Toggle
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${checked ? "bg-rose-500" : "bg-white/15"}`}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-200 transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// 🌟 PREMIUM Toggle (თუ არ აქვს პრემიუმი, უჩვენებს ბოქლომს და აგდებს ყიდვაზე)
function PremiumToggleRow({ label, sub, checked, isPremium, onToggle, onPaywall }: { 
  label: string; sub: string; checked: boolean; isPremium: boolean; onToggle: (v: boolean) => void; onPaywall: () => void;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 transition" 
         onClick={() => !isPremium ? onPaywall() : null}
         style={{ cursor: !isPremium ? "pointer" : "default" }}>
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          {label}
          {!isPremium && <span className="text-[9px] bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 rounded text-white uppercase font-bold tracking-wider">Premium</span>}
        </div>
        <div className="text-xs text-white/40 mt-0.5">{sub}</div>
      </div>
      <div className="flex items-center gap-2">
        {!isPremium ? (
          <span className="text-xl opacity-70">🔒</span>
        ) : (
          <Toggle checked={checked} onChange={onToggle} />
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-white/40 uppercase tracking-widest px-1 mb-2 mt-6">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white/5 ring-1 ring-white/8 overflow-hidden divide-y divide-white/5">{children}</div>;
}

function Row({ label, sub, onClick, right, isPremiumLock }: { label: string; sub?: string; onClick?: () => void; right?: React.ReactNode; isPremiumLock?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/8 transition">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white flex items-center gap-2">
          {label}
          {isPremiumLock && <span className="text-[9px] bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 rounded text-white uppercase font-bold tracking-wider">Premium</span>}
        </div>
        {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
      </div>
      {right ?? (isPremiumLock ? <span className="text-xl opacity-70">🔒</span> : <span className="text-white/25 text-xl shrink-0">›</span>)}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
  const L = (k: string, e: string) => ka ? k : e;

  // 1. ძირითადი State-ები
  const [enableDiscovery, setEnableDiscovery] = useState(true);
  const[readReceipts, setReadReceipts] = useState(true);
  const[photoVerifiedOnly, setPhotoVerifiedOnly] = useState(false);
  const [distanceKm, setDistanceKm] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const[ageMax, setAgeMax] = useState(45);
  
  // 2. 🌟 Premium State-ები 🌟
  const [isPremium, setIsPremium] = useState(false);
  const[hideAge, setHideAge] = useState(false);
  const [hideDistance, setHideDistance] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);

  // 3. სისტემური State-ები
  const [saving, setSaving] = useState(false);
  const[saved, setSaved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSaving, setPauseSaving] = useState(false);
  const[scheduledDeletion, setScheduledDeletion] = useState<string | null>(null);

  // მონაცემების წამოღება
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles")
        // დავამატე პრემიუმ ველები სელექთში
        .select("max_distance_km, min_age, max_age, is_paused, is_premium, hide_age, hide_distance, incognito_mode")
        .eq("user_id", user.id).maybeSingle();
      
      if (!data) return;
      
      if (data.max_distance_km) setDistanceKm(data.max_distance_km);
      if (data.min_age) setAgeMin(data.min_age);
      if (data.max_age) setAgeMax(data.max_age);
      setIsPaused(data.is_paused ?? false);
      
      // პრემიუმ მონაცემების მინიჭება
      setIsPremium(data.is_premium ?? false);
      setHideAge(data.hide_age ?? false);
      setHideDistance(data.hide_distance ?? false);
      setIncognitoMode(data.incognito_mode ?? false);

      const { data: del } = await supabase.from("scheduled_deletions")
        .select("scheduled_for").eq("user_id", user.id).maybeSingle();
      if (del) setScheduledDeletion(del.scheduled_for);
    })();
  },[]);

  // ყველაფრის შენახვა (მათ შორის პრემიუმ სეთინგების)
  async function handleSave() {
    setSaving(true);
    await saveProfilePatch({ 
      max_distance_km: distanceKm, 
      min_age: ageMin, 
      max_age: ageMax,
      hide_age: hideAge,
      hide_distance: hideDistance,
      incognito_mode: incognitoMode
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function handlePauseToggle(val: boolean) {
    setPauseSaving(true);
    await saveProfilePatch({ is_paused: val });
    setIsPaused(val);
    setPauseSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleCancelDeletion() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("scheduled_deletions").delete().eq("user_id", user.id);
    await supabase.from("profiles").update({ deleted_at: null }).eq("user_id", user.id);
    setScheduledDeletion(null);
  }

  async function handleDelete() {
    const ok = confirm(ka
      ? "პროფილი დაიბლოკება და 30 დღეში სამუდამოდ წაიშლება. გააგრძელებ?"
      : "Your profile will be deactivated and permanently deleted in 30 days. Continue?");
    if (!ok) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("profiles").update({ deleted_at: new Date().toISOString(), is_paused: true }).eq("user_id", user.id);
    await supabase.from("scheduled_deletions").upsert({ user_id: user.id, scheduled_for: scheduledFor }, { onConflict: "user_id" });
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const deletionDate = scheduledDeletion
    ? new Date(scheduledDeletion).toLocaleDateString(ka ? "ka-GE" : "en-US", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex justify-center">
      <div className="w-full max-w-lg">

        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12 transition">
            {L("← უკან", "← Back")}
          </button>
          <h1 className="text-lg font-extrabold flex-1">{L("პარამეტრები", "Settings")}</h1>
        </div>

        <div className="px-4 pt-3" style={{ paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))" }}>

          {/* SCHEDULED DELETION BANNER */}
          {scheduledDeletion && (
            <div className="mt-2 rounded-2xl bg-red-500/15 ring-1 ring-red-500/30 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-red-400 text-sm">{L("პროფილი იშლება", "Account scheduled for deletion")}</div>
                <div className="text-xs text-white/50 mt-0.5">{L(`წაიშლება: ${deletionDate}`, `Deletes on: ${deletionDate}`)}</div>
              </div>
              <button onClick={handleCancelDeletion} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black shrink-0">
                {L("გაუქმება", "Cancel")}
              </button>
            </div>
          )}

          {/* 🌟 PREMIUM BANNER 🌟 */}
          {!isPremium ? (
            <div className="rounded-2xl bg-gradient-to-r from-rose-500/20 to-orange-400/20 ring-1 ring-rose-500/30 p-4 flex items-center justify-between mt-2">
              <div>
                <div className="font-extrabold">Shekhvdi+</div>
                <div className="text-xs text-white/50 mt-0.5">{L("პრიორიტეტული მოწონება, ნახე ვინ მოგწონს", "Priority Likes, See who Likes you")}</div>
              </div>
              <button onClick={() => router.push("/premium")} className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white shrink-0">Upgrade</button>          
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 ring-1 ring-rose-500/30 p-4 flex items-center justify-between mt-2">
              <div>
                <div className="font-extrabold text-rose-400">✨ Premium Active</div>
                <div className="text-xs text-white/50 mt-0.5">{L("თქვენ გაქვთ სრული წვდომა", "You have full access")}</div>
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          <SectionLabel>{L("ანგარიშის პარამეტრები", "Account Settings")}</SectionLabel>
          <Card>
            <Row label={L("ტელეფონის ნომერი", "Phone Number")} sub={L("დამატება / შეცვლა", "Add / Change")} />
            <Row label={L("ელ.ფოსტა", "Email")} sub={L("დამატება / შეცვლა", "Add / Change")} />
            <Row label={L("ენა", "Language")} sub={ka ? "ქართული" : "English"} onClick={() => {
              const newLang = ka ? "en" : "ka";
              localStorage.setItem("lang", newLang);
              window.dispatchEvent(new Event("app:lang"));
              window.location.reload();
            }} right={
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${ka ? "text-rose-400" : "text-white/30"}`}>KA</span>
                <span className="text-white/20">/</span>
                <span className={`text-xs font-bold ${!ka ? "text-rose-400" : "text-white/30"}`}>EN</span>
              </div>
            } />
            <Row label={L("პროფილის რედაქტირება", "Edit Profile")} onClick={() => router.push("/profile/edit")} />
          </Card>

          {/* 🌟 PRIVACY & PREMIUM CONTROLS 🌟 */}
          <SectionLabel>{L("კონფიდენციალურობა (Premium)", "Privacy & Control")}</SectionLabel>
          <Card>
            <PremiumToggleRow 
              label={L("ინკოგნიტო რეჟიმი", "Incognito Mode")}
              sub={L("გამოუჩნდი მხოლოდ მათ, ვინც მოგწონს", "Only show me to people I like")}
              isPremium={isPremium}
              checked={incognitoMode}
              onToggle={setIncognitoMode}
              onPaywall={() => router.push("/premium")}
            />
            <PremiumToggleRow 
              label={L("ასაკის დამალვა", "Hide My Age")}
              sub={L("არ გამოაჩინო ასაკი პროფილზე", "Don't show age on my profile")}
              isPremium={isPremium}
              checked={hideAge}
              onToggle={setHideAge}
              onPaywall={() => router.push("/premium")}
            />
            <PremiumToggleRow 
              label={L("მანძილის დამალვა", "Hide My Distance")}
              sub={L("არ გამოაჩინო დისტანცია", "Don't show how far away I am")}
              isPremium={isPremium}
              checked={hideDistance}
              onToggle={setHideDistance}
              onPaywall={() => router.push("/premium")}
            />
          </Card>

          {/* PAUSE */}
          <SectionLabel>{L("პროფილის სტატუსი", "Profile Status")}</SectionLabel>
          <Card>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{L("პროფილის პაუზა", "Pause Profile")}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {isPaused
                    ? L("პროფილი დამალულია — ჩართე რო ისევ გამოჩნდე", "Profile hidden — enable to reappear")
                    : L("გამორთვით დაიმალები ყველასგან", "Turn off to hide from everyone")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pauseSaving && <span className="text-xs text-white/30">...</span>}
                <Toggle checked={isPaused} onChange={handlePauseToggle} />
              </div>
            </div>
          </Card>

          {/* DISCOVERY */}
          <SectionLabel>{L("ძიების პარამეტრები", "Discovery Settings")}</SectionLabel>
          <Card>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium">{L("ჩემი მდებარეობა", "My Current Location")}</div>
                  <div className="text-xs text-rose-400 mt-0.5">{L("ახალი ლოქეიშენის დამატება", "Add a new location")}</div>
                </div>
              </div>
              <span className="text-white/25 text-xl">›</span>
            </div>

            <div className="px-4 py-4">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/70 font-medium">{L("მაქსიმალური დისტანცია", "Maximum Distance")}</span>
                <span className="font-bold text-white">{distanceKm} km</span>
              </div>
              <input type="range" min={1} max={200} value={distanceKm} onChange={e => setDistanceKm(+e.target.value)}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #f43f5e ${distanceKm / 2}%, rgba(255,255,255,0.1) ${distanceKm / 2}%)`, accentColor: "#f43f5e" }} />
            </div>

            <div className="px-4 py-4">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/70 font-medium">{L("ასაკის დიაპაზონი", "Age Range")}</span>
                <span className="font-bold text-white">{ageMin}–{ageMax}</span>
              </div>
              <input type="range" min={18} max={80} value={ageMin} onChange={e => setAgeMin(Math.min(+e.target.value, ageMax - 1))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-3"
                style={{ background: `linear-gradient(to right, #f43f5e ${((ageMin - 18) / 62) * 100}%, rgba(255,255,255,0.1) ${((ageMin - 18) / 62) * 100}%)`, accentColor: "#f43f5e" }} />
              <input type="range" min={18} max={80} value={ageMax} onChange={e => setAgeMax(Math.max(+e.target.value, ageMin + 1))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #f43f5e ${((ageMax - 18) / 62) * 100}%, rgba(255,255,255,0.1) ${((ageMax - 18) / 62) * 100}%)`, accentColor: "#f43f5e" }} />
            </div>
            
            {/* 🌟 Advanced Filters Teaser 🌟 */}
            <Row 
              label={L("გაფართოებული ფილტრები", "Advanced Filters")} 
              sub={L("სიმაღლე, რელიგია და სხვა", "Height, religion & more")} 
              onClick={() => router.push("/premium")} 
              isPremiumLock={true} 
            />

            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{L("ძიების ჩართვა", "Enable Discovery")}</div>
                <div className="text-xs text-white/40">{L("გამორთვით დაიმალები", "Turn off to hide your profile")}</div>
              </div>
              <Toggle checked={enableDiscovery} onChange={setEnableDiscovery} />
            </div>
          </Card>

          {/* MESSAGING */}
          <SectionLabel>{L("შეტყობინებები", "Messaging")}</SectionLabel>
          <Card>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{L("წაკითხვის სტატუსი", "Read Receipts")}</div>
                <div className="text-xs text-white/40">{L("გამორთვით შეხვედრები ვერ ნახავენ", "Prevent matches from seeing read status")}</div>
              </div>
              <Toggle checked={readReceipts} onChange={setReadReceipts} />
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{L("ფოტო-ვერიფიცირებული ჩათი", "Photo Verified Chat")}</div>
                <div className="text-xs text-white/40">{L("მხოლოდ ვერიფიცირებულებისგან", "Only verified profiles")}</div>
              </div>
              <Toggle checked={photoVerifiedOnly} onChange={setPhotoVerifiedOnly} />
            </div>
          </Card>

          {/* CONTACT & LEGAL... */}
          <SectionLabel>{L("კონტაქტი", "Contact Us")}</SectionLabel>
          <Card>
            <Row label={L("დახმარება", "Help & Support")} onClick={() => router.push("/help")} />
            <Row label={L("პრობლემის შეტყობინება", "Report a problem")} onClick={() => {}} />
          </Card>

          {/* SAVE BUTTON */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="mt-5 w-full rounded-2xl bg-rose-500 py-4 font-bold text-white disabled:opacity-60 active:scale-[0.99] transition">
            {saved ? "✓ " + L("შენახულია!", "Saved!") : saving ? "..." : L("შენახვა", "Save")}
          </button>

          {/* LOGOUT */}
          <button type="button" onClick={handleLogout}
            className="mt-3 w-full rounded-2xl bg-white/5 py-4 font-semibold text-white hover:bg-white/10 active:scale-[0.99] transition ring-1 ring-white/8">
            {L("გასვლა", "Logout")}
          </button>

          <div className="flex flex-col items-center py-6 gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-rose-500 to-orange-400" />
            <div className="text-xs text-white/25">{L("ვერსია", "Version")} 1.0.0</div>
          </div>

          {/* DELETE */}
          {!scheduledDeletion && (
            <button type="button" onClick={handleDelete}
              className="w-full rounded-2xl ring-1 ring-red-500/30 py-4 font-semibold text-red-400 hover:bg-red-500/10 active:scale-[0.99] transition mb-4">
              {L("ანგარიშის წაშლა", "Delete Account")}
            </button>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}