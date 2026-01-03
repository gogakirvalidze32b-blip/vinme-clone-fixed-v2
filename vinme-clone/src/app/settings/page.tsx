"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 ring-1 ring-white/10 overflow-hidden">
      {title ? (
        <div className="px-4 pt-4 pb-2 text-sm font-semibold text-white/80">
          {title}
        </div>
      ) : null}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  onClick,
  right,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-3 rounded-xl px-3 py-3 bg-white/5 hover:bg-white/10 active:scale-[0.99] transition"
    >
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-white">{label}</div>
        {value ? (
          <div className="mt-0.5 text-[13px] text-white/60 truncate">
            {value}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 flex items-center gap-2 text-white/70">
        {right ?? <span className="text-xl leading-none">›</span>}
      </div>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full transition",
        checked ? "bg-pink-500/90" : "bg-white/15",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span
        className={[
          "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

// ✅ FIX: update -> upsert (თუ row არ არსებობს, მაინც ჩაიწეროს)
async function saveProfilePatch(patch: Record<string, any>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("No user") };

  // anon_id fallback (რადგან DB-ში NOT NULL არის)
  const anonId = `anon_${user.id.replace(/-/g, "").slice(0, 12)}`;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        anon_id: anonId,
        ...patch,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) console.error("saveProfilePatch error:", error);
  return { data, error };
}


export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
  await supabase.auth.signOut();
  router.replace("/login"); // ან "/" სადაც შენი login-ია
};



const handleDeleteProfile = async () => {
  const ok = confirm("Delete your profile? This cannot be undone.");
  if (!ok) return;

  // ✅ 1. backend function (სუფთა delete)
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    alert(error.message);
    return;
  }

  // ✅ 2. logout
  await supabase.auth.signOut();

  // ✅ 3. redirect
  router.replace("/login");
}

  const [enableDiscovery, setEnableDiscovery] = React.useState(true);
  const [readReceipts, setReadReceipts] = React.useState(true);
  const [photoVerifiedOnly, setPhotoVerifiedOnly] = React.useState(false);

  // UI only — შენ მერე DB-ში/State-ში მიაბამ
  const [distanceKm, setDistanceKm] = React.useState(19);
  const [ageMin, setAgeMin] = React.useState(18);
  const [ageMax, setAgeMax] = React.useState(83);

  // ✅ დამატებულია მხოლოდ იმისთვის, რომ Save-ს ჰქონდეს რასაც წერს DB-ში
  const [city, setCity] = React.useState<string | null>(null);
  const [seeking, setSeeking] = React.useState<string>("everyone");


  // ✅ FIX: Refresh-ის მერე რომ არ დაბრუნდეს ძველზე — DB-დან წამოიღე და state-ში ჩასვი
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("city, seeking, min_age, max_age, max_distance_km")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("load settings error:", error);
        return;
      }
      if (!data) return;

      setCity(data.city ?? null);
      setSeeking((data.seeking as any) ?? "everyone");

      // თუ DB-ში არის, state-შიც ჩასვი
      if (typeof data.max_distance_km === "number") setDistanceKm(data.max_distance_km);
      if (typeof data.min_age === "number") setAgeMin(data.min_age);
      if (typeof data.max_age === "number") setAgeMax(data.max_age);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // ✅ ეს wrapper აკეთებს სკროლს (და bottom nav-სთვის padding აქვს)
    <div className="min-h-[100dvh] bg-black text-white overflow-y-auto overscroll-y-contain">
      {/* ✅ Header (sticky) */}
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur ring-1 ring-white/10">
        <div className="mx-auto w-full max-w-md px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 active:scale-[0.99] transition"
          >
            ← Back
          </button>
          <div className="text-lg font-extrabold">Settings</div>
        </div>
      </div>

      {/* ✅ Content */}
      <div className="mx-auto w-full max-w-md px-4 pt-4 pb-[calc(140px+env(safe-area-inset-bottom))] space-y-4">
        {/* Premium cards (placeholder like Tinder) */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-zinc-900/70 ring-1 ring-white/10 p-4 flex items-center justify-between">
            <div>
              <div className="text-base font-extrabold">tinder</div>
              <div className="text-sm text-white/60">
                Priority Likes, See who Likes you & More
              </div>
            </div>
    
            <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-200">
              Shekhvdi +
            </span>
          </div>
        </div>

        {/* Account */}
        <Card title="Account Settings">
          <div className="space-y-2">
            <Row label="Phone Number" value="Add / Change" onClick={() => {}} />
            <Row label="Email" value="Add / Change" onClick={() => {}} />
          </div>
        </Card>

        {/* Discovery */}
        <Card title="Discovery Settings">
          <div className="space-y-3">
            <Row label="Location" value="T’bilisi, Georgia" onClick={() => {}} />
            <Row label="Interested In" value="Women" onClick={() => {}} />

            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold">Maximum Distance</div>
                  <div className="text-[13px] text-white/60">{distanceKm} km</div>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseInt(e.target.value || "19", 10))}
                className="mt-3 w-full"
              />
            </div>

            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold">Age Range</div>
                  <div className="text-[13px] text-white/60">
                    {ageMin} - {ageMax}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Min</span>
                  <span>{ageMin}</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={99}
                  value={ageMin}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "18", 10);
                    setAgeMin(Math.min(v, ageMax));
                  }}
                  className="w-full"
                />

                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Max</span>
                  <span>{ageMax}</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={99}
                  value={ageMax}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "83", 10);
                    setAgeMax(Math.max(v, ageMin));
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Visibility */}
        <Card title="Enable Discovery">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
              <div>
                <div className="text-[15px] font-semibold">Enable Discovery</div>
                <div className="text-[13px] text-white/60">
                  Turn off to hide your profile from the stack.
                </div>
              </div>
              <Toggle checked={enableDiscovery} onChange={setEnableDiscovery} />
            </div>
          </div>
        </Card>

        {/* Messaging */}
        <Card title="Control Who Messages You">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
              <div>
                <div className="text-[15px] font-semibold">Photo Verified Chat</div>
                <div className="text-[13px] text-white/60">
                  Only receive messages from Photo Verified profiles.
                </div>
              </div>
              <Toggle checked={photoVerifiedOnly} onChange={setPhotoVerifiedOnly} />
            </div>
          </div>
        </Card>

        {/* Read receipts */}
        <Card title="Read Receipts">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
              <div>
                <div className="text-[15px] font-semibold">Send Read Receipts</div>
                <div className="text-[13px] text-white/60">
                  Prevent matches from seeing read status.
                </div>
              </div>
              <Toggle checked={readReceipts} onChange={setReadReceipts} />
            </div>
          </div>
        </Card>

        {/* Safety / Legal */}
        <Card title="Privacy">
          <div className="space-y-2">
            <Row label="Cookie Policy" onClick={() => {}} />
            <Row label="Privacy Policy" onClick={() => {}} />
            <Row label="Privacy Preferences" onClick={() => {}} />
          </div>
        </Card>

        <Card title="Legal">
          <div className="space-y-2">
            <Row label="Licenses" onClick={() => {}} />
            <Row label="Terms of Service" onClick={() => {}} />
          </div>
        </Card>

        {/* ✅ SAVE */}
        <div className="mt-6 mb-24">
          <button
            type="button"
            onClick={async () => {
              const { error } = await saveProfilePatch({
                city,
                seeking,
                min_age: Number(ageMin),
                max_age: Number(ageMax),
                max_distance_km: Number(distanceKm),
              });

              // თუ error არ არის — შენახულია. (UI არ შევცვალე, უბრალოდ console-ში ჩანს)
              if (error) console.error(error);
            }}
            className="w-full rounded-2xl bg-white py-4 font-semibold text-black active:scale-[0.99]"
          >
            Save
          </button>
        </div>



{/* Logout + Delete */}
<div className="pt-2">
  <button
    type="button"
    onClick={handleLogout}
    className="w-full rounded-2xl bg-white/10 px-4 py-4 text-center font-extrabold hover:bg-white/15 active:scale-[0.99] transition"
  >
    Logout
  </button>

  <div className="mt-6 flex items-center justify-center opacity-80">
    <div className="h-16 w-16 rounded-full bg-gradient-to-b from-pink-500 to-orange-400" />
  </div>
  <div className="mt-3 text-center text-xs text-white/50">Version 1.0.0</div>

  <button
    type="button"
    onClick={() => router.push("/delete-account")}
    className="mt-6 w-full rounded-2xl bg-white/5 px-4 py-4 text-center font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/10 active:scale-[0.99] transition"
  >
    Delete Account
  </button>
</div>


      </div>
    </div>
  );
}