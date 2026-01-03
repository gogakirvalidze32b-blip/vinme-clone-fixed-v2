"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


type Gender = "" | "male" | "female" | "nonbinary" | "other";
type Seeking = "everyone" | "male" | "female" | "nonbinary" | "other";

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  nickname: string | null;
  birthdate: string | null; // yyyy-mm-dd
  city: string | null;
  bio: string | null;
  gender: Gender | null;
  seeking: Seeking | null;

  // discovery prefs (optional columns)
  min_age: number | null;
  max_age: number | null;
  max_distance_km: number | null;
  show_me: boolean | null;
};

type EditMode = "text" | "number" | "range" | "select" | "toggle" | "date";

type SheetState =
  | null
  | {
      key: keyof ProfileRow | "email";
      title: string;
      mode: EditMode;
      value: any;
      options?: { label: string; value: any }[];
      min?: number;
      max?: number;
      step?: number;
      // for range
      value2?: any;
      min2?: number;
      max2?: number;
      step2?: number;
    };

function calcAge(birthdate: string | null) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function fmtSeeking(s: Seeking | null | undefined) {
  if (!s) return "—";
  if (s === "everyone") return "Everyone";
  if (s === "male") return "Men";
  if (s === "female") return "Women";
  if (s === "nonbinary") return "Non-binary";
  return "Other";
}

export default function SettingsPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [p, setP] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [sheet, setSheet] = useState<SheetState>(null);

  // 1) session
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      const id = data.user?.id ?? null;
      setUid(id);
      setEmail(data.user?.email ?? null);
      if (!id) {
        router.replace("/login");
        return;
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  const loadProfile = useCallback(async () => {
    if (!uid) return;
    setErr(null);
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, first_name, nickname, birthdate, city, bio, gender, seeking, min_age, max_age, max_distance_km, show_me"
      )
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    setP((data as ProfileRow) ?? null);
    setLoading(false);
  }, [uid]);

  // 2) initial load
  useEffect(() => {
    if (!uid) return;
    loadProfile();
  }, [uid, loadProfile]);

  // 3) save patch
  const saveProfilePatch = useCallback(
    async (patch: Partial<ProfileRow>) => {
      if (!uid) return;

      setErr(null);
      const key = Object.keys(patch)[0] ?? "save";
      setSavingKey(key);

      const { error } = await supabase.from("profiles").update(patch).eq("user_id", uid);

      if (error) {
        setErr(error.message);
        setSavingKey(null);
        return;
      }

      // optimistic update
      setP((prev) => (prev ? { ...prev, ...patch } : prev));
      setSavingKey(null);
    },
    [uid]
  );

  const age = useMemo(() => calcAge(p?.birthdate ?? null), [p?.birthdate]);
  const ageRangeText = useMemo(() => {
    const a = p?.min_age ?? null;
    const b = p?.max_age ?? null;
    if (!a && !b) return "—";
    if (a && b) return `${a} - ${b}`;
    if (a && !b) return `${a}+`;
    if (!a && b) return `Up to ${b}`;
    return "—";
  }, [p?.min_age, p?.max_age]);

  const distanceText = useMemo(() => {
    const km = p?.max_distance_km ?? null;
    return km ? `${km} km` : "—";
  }, [p?.max_distance_km]);

  const locationText = useMemo(() => p?.city ?? "—", [p?.city]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }
function openEdit(key: string, config?: any) {
  setSheet({ key, ...config });
}

  // ✅ Fixed wrapper (parent-ის scroll lock-ს არ ვეყრდნობით)
  return (
    <div className="fixed inset-0 bg-black text-white">
      {/* ✅ REAL SCROLL CONTAINER */}
      <div className="absolute inset-0 overflow-y-auto touch-pan-y overscroll-y-contain">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-black/85 backdrop-blur border-b border-white/10">
          <div className="mx-auto w-full max-w-md px-4 py-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 active:scale-[0.98]"
            >
              ← Back
            </button>
            <div className="text-lg font-semibold">Settings</div>

            {loading ? (
              <div className="ml-auto text-xs text-white/40">Loading…</div>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto w-full max-w-md px-4 py-4 pb-[140px]">
          {err ? (
            <div className="mb-4 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {/* Premium */}
          <div className="space-y-3">
            <PromoCard
              title="tinder"
              subtitle="Priority Likes, See who Likes you & More"
              tag="PLATINUM"
            />
            <PromoCard title="tinder" subtitle="See who Likes you & More!" tag="GOLD" />
            <PromoCard title="tinder+" subtitle="Unlimited Likes & More!" tag="PLUS" />
          </div>

          <Section title="Account Settings">
            <Row
              title="Phone Number"
              subtitle="Add / Change"
              onClick={() => {
                // აქ როცა გინდა გააკეთებ phone add flow
                openEdit("first_name", {
                  title: "Phone Number (later)",
                  mode: "text",
                  value: "",
                });
              }}
            />
            <Row
              title="Email"
              subtitle={email ?? "—"}
              onClick={() =>
                openEdit("email", {
                  title: "Email",
                  mode: "text",
                  value: email ?? "",
                })
              }
            />

            <Row
              title="First Name"
              subtitle={p?.first_name ?? "Add"}
              onClick={() =>
                openEdit("first_name", {
                  title: "First Name",
                  mode: "text",
                  value: p?.first_name ?? "",
                })
              }
              rightHint={savingKey === "first_name" ? "Saving…" : undefined}
            />

            <Row
              title="Nickname"
              subtitle={p?.nickname ?? "Add"}
              onClick={() =>
                openEdit("nickname", {
                  title: "Nickname",
                  mode: "text",
                  value: p?.nickname ?? "",
                })
              }
              rightHint={savingKey === "nickname" ? "Saving…" : undefined}
            />

            <Row
              title="Birthdate"
              subtitle={p?.birthdate ? `${p.birthdate}${age != null ? ` • ${age}` : ""}` : "Add"}
              onClick={() =>
                openEdit("birthdate", {
                  title: "Birthdate",
                  mode: "date",
                  value: p?.birthdate ?? "",
                })
              }
              rightHint={savingKey === "birthdate" ? "Saving…" : undefined}
            />
          </Section>

          <Section title="Discovery Settings">
            <Row
              title="Location"
              subtitle={locationText}
              onClick={() =>
                openEdit("city", {
                  title: "Location",
                  mode: "text",
                  value: p?.city ?? "",
                })
              }
              rightHint={savingKey === "city" ? "Saving…" : undefined}
            />

            <Row
              title="Interested In"
              subtitle={fmtSeeking(p?.seeking)}
              onClick={() =>
                openEdit("seeking", {
                  title: "Interested In",
                  mode: "select",
                  value: p?.seeking ?? "everyone",
                  options: [
                    { label: "Everyone", value: "everyone" },
                    { label: "Men", value: "male" },
                    { label: "Women", value: "female" },
                    { label: "Non-binary", value: "nonbinary" },
                    { label: "Other", value: "other" },
                  ],
                })
              }
              rightHint={savingKey === "seeking" ? "Saving…" : undefined}
            />

            <Row
              title="Age Range"
              subtitle={ageRangeText}
              onClick={() =>
                openEdit("min_age", {
                  title: "Age Range",
                  mode: "range",
                  value: p?.min_age ?? 18,
                  min: 18,
                  max: 60,
                  step: 1,
                  value2: p?.max_age ?? 35,
                  min2: 18,
                  max2: 80,
                  step2: 1,
                })
              }
              rightHint={savingKey === "min_age" || savingKey === "max_age" ? "Saving…" : undefined}
            />

            <Row
              title="Maximum Distance"
              subtitle={distanceText}
              onClick={() =>
                openEdit("max_distance_km", {
                  title: "Maximum Distance (km)",
                  mode: "number",
                  value: p?.max_distance_km ?? 25,
                  min: 1,
                  max: 200,
                  step: 1,
                })
              }
              rightHint={savingKey === "max_distance_km" ? "Saving…" : undefined}
            />
          </Section>

          <Section title="Privacy & Safety">
            <Row
              title="Manage Active Status"
              subtitle="Settings"
              onClick={() => openEdit("bio", { title: "Active Status (later)", mode: "text", value: "" })}
            />

            <Row
              title="Enable Discovery"
              subtitle={p?.show_me === false ? "Off" : "On"}
              onClick={() =>
                openEdit("show_me", {
                  title: "Enable Discovery",
                  mode: "toggle",
                  value: p?.show_me !== false,
                })
              }
              rightHint={savingKey === "show_me" ? "Saving…" : undefined}
            />

            <Row title="Photo Verified Chat" subtitle="Must be verified" onClick={() => {}} />
            <Row title="Read Receipts" subtitle="Send Read Receipts" onClick={() => {}} />
            <Row title="Block Contacts" subtitle="Manage" onClick={() => {}} />
          </Section>

          <Section title="Legal">
            <Row title="Terms of Service" onClick={() => {}} />
            <Row title="Privacy Policy" onClick={() => {}} />
            <Row title="Licenses" onClick={() => {}} />
          </Section>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl bg-white/10 py-4 font-semibold ring-1 ring-white/10 active:scale-[0.99]"
            >
              Logout
            </button>
          </div>

          <div className="mt-10 text-center text-white/40 text-sm">Version 0.1</div>
        </div>
      </div>

      {/* ✅ Bottom sheet editor */}
      {sheet ? (
        <EditSheet
          state={sheet}
          onClose={() => setSheet(null)}
          onSave={async (next) => {
            // email is auth (later); now just close
            if (sheet.key === "email") {
              setEmail(String(next ?? ""));
              setSheet(null);
              return;
            }

            if (sheet.mode === "range") {
              const minAge = Number(next?.min ?? 18);
              const maxAge = Number(next?.max ?? 35);
              await saveProfilePatch({ min_age: minAge, max_age: maxAge });
              setSheet(null);
              return;
            }

            await saveProfilePatch({ [sheet.key]: next } as any);
            setSheet(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* UI blocks */

function PromoCard({
  title,
  subtitle,
  tag,
}: {
  title: string;
  subtitle: string;
  tag: string;
}) {
  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 px-5 py-4 flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-white/55 text-sm">{subtitle}</div>
      </div>
      <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide">
        {tag}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
      <div className="mb-3 text-white/60 text-sm font-semibold">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  title,
  subtitle,
  onClick,
  rightHint,
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  rightHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-black/45 px-4 py-4 ring-1 ring-white/10 flex items-center justify-between active:scale-[0.99]"
    >
      <div className="text-left">
        <div className="font-semibold">{title}</div>
        {subtitle ? <div className="text-white/50 text-sm">{subtitle}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {rightHint ? <span className="text-xs text-white/35">{rightHint}</span> : null}
        <div className="text-white/40 text-xl">›</div>
      </div>
    </button>
  );
}

/* ===== Bottom sheet editor ===== */

function EditSheet({
  state,
  onClose,
  onSave,
}: {
  state: NonNullable<SheetState>;
  onClose: () => void;
  onSave: (next: any) => Promise<void> | void;
}) {
  const [v, setV] = useState<any>(state.value ?? "");
  const [v2, setV2] = useState<any>(state.value2 ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setV(state.value ?? "");
    setV2(state.value2 ?? "");
  }, [state]);

  return (
    <div className="fixed inset-0 z-[99999]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-zinc-950 ring-1 ring-white/10 p-4">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">{state.title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10"
            >
              ✕
            </button>
          </div>

          <div className="mt-4">
            {state.mode === "text" ? (
              <input
                value={v}
                onChange={(e) => setV(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
                placeholder="Type…"
              />
            ) : null}

            {state.mode === "number" ? (
              <input
                type="number"
                value={v}
                min={state.min}
                max={state.max}
                step={state.step}
                onChange={(e) => setV(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
              />
            ) : null}

            {state.mode === "date" ? (
              <input
                type="date"
                value={v}
                onChange={(e) => setV(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
              />
            ) : null}

            {state.mode === "select" ? (
              <div className="space-y-2">
                {(state.options ?? []).map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setV(opt.value)}
                    className={[
                      "w-full rounded-2xl px-4 py-3 text-left ring-1 transition",
                      v === opt.value
                        ? "bg-white/10 ring-white/20"
                        : "bg-white/5 ring-white/10",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}

            {state.mode === "toggle" ? (
              <button
                type="button"
                onClick={() => setV((x: any) => !x)}
                className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-4 flex items-center justify-between"
              >
                <span className="font-semibold">{v ? "On" : "Off"}</span>
                <span
                  className={[
                    "h-6 w-12 rounded-full p-1 transition",
                    v ? "bg-emerald-500/80" : "bg-white/15",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block h-4 w-4 rounded-full bg-white transition",
                      v ? "translate-x-6" : "translate-x-0",
                    ].join(" ")}
                  />
                </span>
              </button>
            ) : null}

            {state.mode === "range" ? (
              <div className="space-y-3">
                <div className="text-sm text-white/60">Min age</div>
                <input
                  type="range"
                  min={state.min ?? 18}
                  max={state.max ?? 80}
                  step={state.step ?? 1}
                  value={Number(v)}
                  onChange={(e) => setV(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-white/80 text-sm">{Number(v)}</div>

                <div className="mt-2 text-sm text-white/60">Max age</div>
                <input
                  type="range"
                  min={state.min2 ?? 18}
                  max={state.max2 ?? 80}
                  step={state.step2 ?? 1}
                  value={Number(v2)}
                  onChange={(e) => setV2(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-white/80 text-sm">{Number(v2)}</div>
              </div>
            ) : null}
          </div>
<div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-white/10 py-3 font-semibold ring-1 ring-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (state.mode === "range") {
                    await onSave({ min: v, max: v2 });
                  } else {
                    await onSave(v);
                  }
                } finally {
                  setBusy(false);
                }
              }}
              className="flex-1 rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-60"
            >
              Save
            </button>
          </div>

          <div className="h-[max(10px,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    </div>
  );
}