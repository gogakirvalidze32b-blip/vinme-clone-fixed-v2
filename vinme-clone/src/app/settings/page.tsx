"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { getLang, t } from "@/lib/i18n";

async function saveProfilePatch(patch: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("No user") };
  const anonId = `anon_${user.id.replace(/-/g, "").slice(0, 12)}`;
  const { error } = await supabase.from("profiles").upsert({ user_id: user.id, anon_id: anonId, ...patch }, { onConflict: "user_id" });
  return { error };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? "bg-pink-500" : "bg-white/15"}`}>
      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

function Row({ label, sub, onClick, right }: { label: string; sub?: string; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/8 transition">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
      </div>
      {right ?? <span className="text-white/25 text-xl shrink-0">›</span>}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-zinc-900/70 ring-1 ring-white/8 overflow-hidden divide-y divide-white/5">{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-white/35 uppercase tracking-wider px-1 mb-2 mt-5">{children}</div>;
}

export default function SettingsPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
  const L = (k: string, e: string) => ka ? k : e;

  const [enableDiscovery, setEnableDiscovery] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [photoVerifiedOnly, setPhotoVerifiedOnly] = useState(false);
  const [distanceKm, setDistanceKm] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [scheduledDeletion, setScheduledDeletion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles")
        .select("max_distance_km,min_age,max_age,is_paused").eq("user_id", user.id).maybeSingle();
      if (!data) return;
      if (data.max_distance_km) setDistanceKm(data.max_distance_km);
      if (data.min_age) setAgeMin(data.min_age);
      if (data.max_age) setAgeMax(data.max_age);
      setIsPaused(data.is_paused ?? false);

      // check scheduled deletion
      const { data: del } = await supabase.from("scheduled_deletions")
        .select("scheduled_for").eq("user_id", user.id).maybeSingle();
      if (del) setScheduledDeletion(del.scheduled_for);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    await saveProfilePatch({ max_distance_km: distanceKm, min_age: ageMin, max_age: ageMax });
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
    // restore profile
    await supabase.from("profiles").update({ deleted_at: null }).eq("user_id", user.id);
    setScheduledDeletion(null);
  }

  async function handleDelete() {
    const ok = confirm(
      ka
        ? "პროფილი დაიბლოკება და 30 დღეში სამუდამოდ წაიშლება. გააგრძელებ?"
        : "Your profile will be deactivated and permanently deleted in 30 days. Continue?"
    );
    if (!ok) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // mark profile as deleted_at
    await supabase.from("profiles").update({ deleted_at: new Date().toISOString(), is_paused: true }).eq("user_id", user.id);

    // schedule deletion
    await supabase.from("scheduled_deletions").upsert({
      user_id: user.id,
      scheduled_for: scheduledFor,
    }, { onConflict: "user_id" });

    await supabase.auth.signOut();
    router.replace("/login");
  }

  const deletionDate = scheduledDeletion
    ? new Date(scheduledDeletion).toLocaleDateString(ka ? "ka-GE" : "en-US", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex justify-center">
      <div className="w-full max-w-lg flex flex-col min-h-[100dvh]">

        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12 transition">
            {L("← უკან", "← Back")}
          </button>
          <h1 className="text-lg font-extrabold flex-1">{L("პარამეტრები", "Settings")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>

          {/* SCHEDULED DELETION BANNER */}
          {scheduledDeletion && (
            <div className="mt-2 rounded-2xl bg-red-500/15 ring-1 ring-red-500/30 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-red-400 text-sm">
                  {L("პროფილი იშლება", "Account scheduled for deletion")}
                </div>
                <div className="text-xs text-white/50 mt-0.5">
                  {L(`წაიშლება: ${deletionDate}`, `Deletes on: ${deletionDate}`)}
                </div>
              </div>
              <button onClick={handleCancelDeletion}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black shrink-0">
                {L("გაუქმება", "Cancel")}
              </button>
            </div>
          )}

          {/* PREMIUM */}
          <div className="rounded-2xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 ring-1 ring-pink-500/30 p-4 flex items-center justify-between mt-2">
            <div>
              <div className="font-extrabold">Shekhvdi+</div>
              <div className="text-xs text-white/50 mt-0.5">{L("პრიორიტეტული მოწონება, ნახე ვინ მოგწონს", "Priority Likes, See who Likes you")}</div>
            </div>
            <button className="rounded-full bg-pink-500 px-4 py-2 text-sm font-bold text-white shrink-0">Upgrade</button>
          </div>

          {/* ACCOUNT */}
          <SectionLabel>{L("ანგარიშის პარამეტრები", "Account Settings")}</SectionLabel>
          <Card>
            <Row label={L("ტელეფონის ნომერი", "Phone Number")} sub={L("დამატება / შეცვლა", "Add / Change")} />
            <Row label={L("ელ.ფოსტა", "Email")} sub={L("დამატება / შეცვლა", "Add / Change")} />
            <Row label={L("პროფილის რედაქტირება", "Edit Profile")} onClick={() => router.push("/profile/edit")} />
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
            <div className="px-4 py-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/70">{L("მაქსიმალური დისტანცია", "Maximum Distance")}</span>
                  <span className="font-semibold">{distanceKm} km</span>
                </div>
                <input type="range" min={1} max={200} value={distanceKm} onChange={e => setDistanceKm(+e.target.value)} className="w-full accent-pink-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/70">{L("ასაკის დიაპაზონი", "Age Range")}</span>
                  <span className="font-semibold">{ageMin}–{ageMax}</span>
                </div>
                <input type="range" min={18} max={80} value={ageMin} onChange={e => setAgeMin(Math.min(+e.target.value, ageMax-1))} className="w-full accent-pink-500 mb-1" />
                <input type="range" min={18} max={80} value={ageMax} onChange={e => setAgeMax(Math.max(+e.target.value, ageMin+1))} className="w-full accent-pink-500" />
              </div>
            </div>
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

          {/* CONTACT */}
          <SectionLabel>{L("კონტაქტი", "Contact Us")}</SectionLabel>
          <Card>
            <Row label={L("დახმარება", "Help & Support")} onClick={() => {}} />
            <Row label={L("პრობლემის შეტყობინება", "Report a problem")} onClick={() => {}} />
          </Card>

          {/* COMMUNITY */}
          <SectionLabel>{L("საზოგადოება", "Community")}</SectionLabel>
          <Card>
            <Row label={L("საზოგადოების წესები", "Community Guidelines")} onClick={() => {}} />
            <Row label={L("უსაფრთხოების რჩევები", "Safety Tips")} onClick={() => {}} />
            <Row label={L("უსაფრთხოების ცენტრი", "Safety Center")} onClick={() => {}} />
          </Card>

          {/* PRIVACY */}
          <SectionLabel>{L("კონფიდენციალურობა", "Privacy")}</SectionLabel>
          <Card>
            <Row label={L("ქუქი-პოლიტიკა", "Cookie Policy")} onClick={() => router.push("/legal/cookies")} />
            <Row label={L("კონფიდენციალურობის პოლიტიკა", "Privacy Policy")} onClick={() => router.push("/legal/privacy")} />
            <Row label={L("კონფიდენციალურობის პარამეტრები", "Privacy Preferences")} onClick={() => router.push("/legal/privacy-prefs")} />
          </Card>

          {/* LEGAL */}
          <SectionLabel>{L("სამართლებრივი", "Legal")}</SectionLabel>
          <Card>
            <Row label={L("ლიცენზიები", "Licenses")} onClick={() => router.push("/legal/licenses")} />
            <Row label={L("გამოყენების პირობები", "Terms of Service")} onClick={() => router.push("/legal/terms")} />
          </Card>

          {/* SAVE */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="mt-5 w-full rounded-2xl bg-white py-4 font-bold text-black disabled:opacity-60 active:scale-[0.99] transition">
            {saved ? "✓ " + L("შენახულია!", "Saved!") : saving ? "..." : L("შენახვა", "Save")}
          </button>

          {/* LOGOUT */}
          <button type="button" onClick={handleLogout}
            className="mt-3 w-full rounded-2xl bg-zinc-900 py-4 font-semibold text-white hover:bg-zinc-800 active:scale-[0.99] transition ring-1 ring-white/8">
            {L("გასვლა", "Logout")}
          </button>

          {/* VERSION + LOGO */}
          <div className="flex flex-col items-center py-6 gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-b from-pink-500 to-orange-400" />
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