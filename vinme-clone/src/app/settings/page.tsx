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
  const { error } = await supabase.from("profiles")
    .upsert({ user_id: user.id, anon_id: anonId, ...patch }, { onConflict: "user_id" });
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

function Row({ label, value, onClick }: { label: string; value?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-white/5 hover:bg-white/8 active:scale-[0.99] transition">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        {value && <div className="mt-0.5 text-xs text-white/50 truncate">{value}</div>}
      </div>
      <span className="text-white/30 text-xl shrink-0">›</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1 mb-2">{title}</div>
      <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/8 overflow-hidden divide-y divide-white/5">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const lang = getLang();

  const [enableDiscovery, setEnableDiscovery] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [photoVerifiedOnly, setPhotoVerifiedOnly] = useState(false);
  const [distanceKm, setDistanceKm] = useState(50);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles")
        .select("max_distance_km,min_age,max_age").eq("user_id", user.id).maybeSingle();
      if (!data) return;
      if (data.max_distance_km) setDistanceKm(data.max_distance_km);
      if (data.min_age) setAgeMin(data.min_age);
      if (data.max_age) setAgeMax(data.max_age);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    await saveProfilePatch({ max_distance_km: distanceKm, min_age: ageMin, max_age: ageMax });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleDelete() {
    const ok = confirm(lang === "ka" ? "ანგარიში წაიშლება. დარწმუნებული ხარ?" : "Delete your account? This cannot be undone.");
    if (!ok) return;
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { alert(error.message); return; }
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white flex justify-center">
      <div className="w-full max-w-lg flex flex-col" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}>

        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="rounded-full bg-white/8 px-4 py-2 text-sm font-semibold hover:bg-white/12 transition">
            {t("back", lang)}
          </button>
          <h1 className="text-lg font-extrabold flex-1">{t("settings_title", lang)}</h1>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-5">

          {/* Premium banner */}
          <div className="rounded-2xl bg-gradient-to-r from-pink-500/20 to-orange-400/20 ring-1 ring-pink-500/30 p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-base">Shekhvdi+</div>
              <div className="text-xs text-white/60 mt-0.5">{t("premium_sub", lang)}</div>
            </div>
            <button className="rounded-full bg-pink-500 px-4 py-2 text-sm font-bold text-white shrink-0">
              Upgrade
            </button>
          </div>

          {/* Discovery */}
          <Section title={t("discovery", lang)}>
            <div className="px-4 py-4 space-y-4">
              {/* Distance slider */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/70">{t("max_distance", lang)}</span>
                  <span className="font-semibold">{distanceKm} km</span>
                </div>
                <input type="range" min={1} max={200} value={distanceKm}
                  onChange={e => setDistanceKm(+e.target.value)}
                  className="w-full accent-pink-500" />
              </div>

              {/* Age range */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/70">{t("age_range", lang)}</span>
                  <span className="font-semibold">{ageMin} – {ageMax}</span>
                </div>
                <div className="space-y-1">
                  <input type="range" min={18} max={80} value={ageMin}
                    onChange={e => setAgeMin(Math.min(+e.target.value, ageMax - 1))}
                    className="w-full accent-pink-500" />
                  <input type="range" min={18} max={80} value={ageMax}
                    onChange={e => setAgeMax(Math.max(+e.target.value, ageMin + 1))}
                    className="w-full accent-pink-500" />
                </div>
              </div>
            </div>
          </Section>

          {/* Toggles */}
          <Section title={t("enable_discovery", lang)}>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t("enable_discovery", lang)}</div>
                <div className="text-xs text-white/40 mt-0.5">{t("enable_discovery_sub", lang)}</div>
              </div>
              <Toggle checked={enableDiscovery} onChange={setEnableDiscovery} />
            </div>
          </Section>

          <Section title={t("read_receipts", lang)}>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t("read_receipts", lang)}</div>
                <div className="text-xs text-white/40 mt-0.5">{t("read_receipts_sub", lang)}</div>
              </div>
              <Toggle checked={readReceipts} onChange={setReadReceipts} />
            </div>
            <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
              <div>
                <div className="text-sm font-medium">{t("photo_verified", lang)}</div>
                <div className="text-xs text-white/40 mt-0.5">{t("photo_verified_sub", lang)}</div>
              </div>
              <Toggle checked={photoVerifiedOnly} onChange={setPhotoVerifiedOnly} />
            </div>
          </Section>

          {/* Legal */}
          <Section title={t("privacy", lang)}>
            <Row label={t("cookie_policy", lang)} />
            <Row label={t("privacy_policy", lang)} />
            <Row label={t("privacy_prefs", lang)} />
          </Section>

          <Section title={t("legal", lang)}>
            <Row label={t("licenses", lang)} />
            <Row label={t("terms", lang)} />
          </Section>

          {/* SAVE */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full rounded-2xl bg-white py-4 font-bold text-black disabled:opacity-60 active:scale-[0.99] transition">
            {saved ? "✓ Saved!" : saving ? "..." : t("save", lang)}
          </button>

          {/* LOGOUT */}
          <button type="button" onClick={handleLogout}
            className="w-full rounded-2xl bg-white/8 py-4 font-semibold text-white hover:bg-white/12 active:scale-[0.99] transition">
            {t("logout", lang)}
          </button>

          {/* version */}
          <div className="flex justify-center py-2">
            <div className="text-xs text-white/25">{t("version", lang)} 1.0.0</div>
          </div>

          {/* DELETE */}
          <button type="button" onClick={handleDelete}
            className="w-full rounded-2xl ring-1 ring-red-500/30 py-4 font-semibold text-red-400 hover:bg-red-500/10 active:scale-[0.99] transition">
            {t("delete_account", lang)}
          </button>

          <div className="h-4" />
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
