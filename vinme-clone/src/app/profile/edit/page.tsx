"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  nickname: string | null;
  age: number | null;

  bio: string | null;
  city: string | null;

  gender: string | null; // "male" | "female" | ...
  orientation: string | null; // "straight" | "gay" | ...

  show_age: boolean | null;
  show_distance: boolean | null;

  photo1_url: string | null;
  photo2_url: string | null;
  photo3_url: string | null;
  photo4_url: string | null;
  photo5_url: string | null;
  photo6_url: string | null;
  photo7_url: string | null;
  photo8_url: string | null;
  photo9_url: string | null;
};


type Tab = "edit" | "preview";

function normalizeSupabaseError(err: any) {
  if (!err) return null;
  const out: any = {};
  try {
    for (const k of Object.getOwnPropertyNames(err)) out[k] = err[k];
  } catch {}
  out.message = out.message ?? err?.message ?? String(err);
  out.details = out.details ?? err?.details;
  out.hint = out.hint ?? err?.hint;
  out.code = out.code ?? err?.code;
  return out;
}

function clampBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return fallback;
  return !!v;
}

export default function EditProfilePage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("edit");
  const [loading, setLoading] = useState(true);
  const [busyPhoto, setBusyPhoto] = useState<number | null>(null);

  // autosave state
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [p, setP] = useState<ProfileRow | null>(null);

  // form state
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<string>(""); // "male" etc.
  const [orientation, setOrientation] = useState<string>(""); // "straight" etc.
  const [showAge, setShowAge] = useState<boolean>(true);
  const [showDistance, setShowDistance] = useState<boolean>(true);

  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = sess.session?.user?.id ?? null;
        if (!uid) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            user_id,
            first_name,
            nickname,
            age,
            bio,
            city,
            gender,
            orientation,
            show_age,
            show_distance,
            photo1_url,
            photo2_url,
            photo3_url,
            photo4_url,
            photo5_url,
            photo6_url,
            photo7_url,
            photo8_url,
            photo9_url
          `
          )
          .eq("user_id", uid)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          const e = normalizeSupabaseError(error);
          console.error("EditProfile load error:", e);
          setErr(e?.message ?? "Failed to load profile");
          setP(null);
          return;
        }

        if (!data) {
          router.replace("/onboarding");
          return;
        }

        const row: ProfileRow = {
          user_id: data.user_id,
          first_name: data.first_name ?? null,
          nickname: data.nickname ?? null,
          age: data.age ?? null,

          bio: data.bio ?? null,
          city: (data as any).city ?? null,
          
          gender: (data as any).gender ?? null,
          orientation: (data as any).orientation ?? null,

          show_age: clampBool((data as any).show_age, true),
          show_distance: clampBool((data as any).show_distance, true),

          photo1_url: data.photo1_url ?? null,
          photo2_url: (data as any).photo2_url ?? null,
          photo3_url: (data as any).photo3_url ?? null,
          photo4_url: (data as any).photo4_url ?? null,
          photo5_url: (data as any).photo5_url ?? null,
          photo6_url: (data as any).photo6_url ?? null,
          photo7_url: (data as any).photo7_url ?? null,
          photo8_url: (data as any).photo8_url ?? null,
          photo9_url: (data as any).photo9_url ?? null,
        };

        setP(row);

        // hydrate form
        setBio(row.bio ?? "");
        setCity(row.city ?? "");
        setGender(row.gender ?? "");
        setOrientation(row.orientation ?? "");
        setShowAge(clampBool(row.show_age, true));
        setShowDistance(clampBool(row.show_distance, true));

        hydratedRef.current = true;
        dirtyRef.current = false;
        setSaveMsg(null);
      } catch (e: any) {
        const ex = normalizeSupabaseError(e);
        console.error("EditProfile fatal:", ex);
        setErr(ex?.message ?? "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const displayName = useMemo(() => {
    if (!p) return "";
    return (p.first_name ?? "").trim() || (p.nickname ?? "").trim() || "Profile";
  }, [p]);

  const photos = useMemo<(string | null)[]>(() => {
    if (!p) return Array(9).fill(null);
    return [
      p.photo1_url,
      p.photo2_url,
      p.photo3_url,
      p.photo4_url,
      p.photo5_url,
      p.photo6_url,
      p.photo7_url,
      p.photo8_url,
      p.photo9_url,
    ];
  }, [p]);

  // mark dirty on form changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    dirtyRef.current = true;
  }, [bio, city,  gender, orientation, showAge, showDistance]);

  function buildPayload() {
    return {
      bio: bio.trim() || null,
      city: city.trim() || null,
      gender: gender || null,
      orientation: orientation || null,
      show_age: !!showAge,
      show_distance: !!showDistance,
    };
  }

  async function flushSave(reason: "debounce" | "back") {
    if (!p) return;
    if (!dirtyRef.current) return;
    if (savingRef.current) return;

    const payload = buildPayload();
    const payloadKey = JSON.stringify(payload);

    // prevent spam saves when nothing changed
    if (payloadKey === lastSavedPayloadRef.current) {
      dirtyRef.current = false;
      return;
    }

    try {
      savingRef.current = true;
      setSaving(true);
      setErr(null);
      setSaveMsg(reason === "back" ? "Saving…" : null);

      const { error } = await supabase.from("profiles").update(payload).eq("user_id", p.user_id);
      if (error) throw error;

      lastSavedPayloadRef.current = payloadKey;
      dirtyRef.current = false;
      setSaveMsg("Saved ✅");
      setTimeout(() => setSaveMsg(null), 1200);
    } catch (e: any) {
      const ex = normalizeSupabaseError(e);
      console.error("Auto-save error:", ex);
      setErr(ex?.message ?? "Failed to save");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // debounce autosave while typing (every ~900ms)
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!dirtyRef.current) return;
    const t = setTimeout(() => flushSave("debounce"), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bio, city,  gender, orientation, showAge, showDistance]);

  async function handleBack() {
    await flushSave("back");
    router.back();
  }

  // --- PHOTO UPLOAD ---
  async function handlePickPhoto(slotIndex: number, file: File) {
    if (!p) return;

    try {
      setErr(null);
      setSaveMsg(null);
      setBusyPhoto(slotIndex);

      const { data: sess, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const uid = sess.session?.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `profiles/${uid}/${Date.now()}-${slotIndex}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("photos") // ✅ your bucket
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const col = `photo${slotIndex + 1}_url`;
      const payload: Record<string, any> = {};
      payload[col] = path;

      const { error: dbErr } = await supabase.from("profiles").update(payload).eq("user_id", uid);
      if (dbErr) throw dbErr;

      setP((prev) => (prev ? ({ ...prev, [col]: path } as ProfileRow) : prev));
      setSaveMsg("Photo saved ✅");
      setTimeout(() => setSaveMsg(null), 1200);
    } catch (e: any) {
      const ex = normalizeSupabaseError(e);
      console.error("Photo upload error:", ex);
      setErr(ex?.message ?? "Photo upload failed");
    } finally {
      setBusyPhoto(null);
    }
  }

  async function removePhoto(slotIndex: number) {
    if (!p) return;

    try {
      setErr(null);
      setSaveMsg(null);
      setBusyPhoto(slotIndex);

      const { data: sess, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const uid = sess.session?.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }

      const col = `photo${slotIndex + 1}_url`;
      const payload: Record<string, any> = {};
      payload[col] = null;

      const { error } = await supabase.from("profiles").update(payload).eq("user_id", uid);
      if (error) throw error;

      setP((prev) => (prev ? ({ ...prev, [col]: null } as ProfileRow) : prev));
      setSaveMsg("Removed ✅");
      setTimeout(() => setSaveMsg(null), 1200);
    } catch (e: any) {
      const ex = normalizeSupabaseError(e);
      console.error("Remove photo error:", ex);
      setErr(ex?.message ?? "Failed to remove photo");
    } finally {
      setBusyPhoto(null);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (err && !p) {
    return (
      <div className="min-h-[100svh] bg-black text-white px-4 pt-6 pb-24 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-zinc-950/90 p-6 ring-1 ring-white/10 text-center">
          <div className="text-red-400 font-semibold mb-2">Error</div>
          <div className="text-sm text-white/80 break-words">{err}</div>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black active:scale-[0.99]"
              onClick={() => router.refresh()}
            >
              Reload 🔄
            </button>
            <button
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 active:scale-[0.99]"
              onClick={() => router.push("/profile")}
            >
              Back 👤
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!p) return null;

return (
  <main className="fixed inset-0 bg-zinc-950 text-white flex flex-col">
    {/* Header (always visible) */}
    <div className="shrink-0 bg-zinc-950/90 backdrop-blur border-b border-white/10">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-2xl text-pink-500 active:scale-[0.99]"
            aria-label="Back"
            title="Back"
          >
            ←
          </button>

          <div className="text-lg font-extrabold">Edit profile</div>

          <button
            onClick={() => router.push("/settings")}
            className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/15"
            aria-label="Settings"
            title="Settings"
          >
            ⚙️
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center justify-center gap-10 text-sm">
          <button
            onClick={() => setTab("edit")}
            className={tab === "edit" ? "font-semibold" : "text-white/50"}
          >
            Edit
          </button>
          <div className="h-5 w-px bg-white/15" />
          <button
            onClick={() => setTab("preview")}
            className={tab === "preview" ? "font-semibold" : "text-white/50"}
          >
            Preview{" "}
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-pink-500 align-middle" />
          </button>
        </div>

        {/* save status */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="text-white/50">
            {saving ? "Saving…" : dirtyRef.current ? "Unsaved changes" : " "}
          </div>
          <div className="text-white/60">{saveMsg ?? " "}</div>
        </div>
      </div>
    </div>

    {/* ✅ Scroll container (THIS fixes your issue) */}
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[480px] px-4 pb-32">
        {err ? (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm ring-1 ring-red-500/20 text-red-200">
            {err}
          </div>
        ) : null}

        {tab === "preview" ? (
          <PreviewCard
            name={displayName}
            age={p.age}
            bio={bio}
            photo={photos[0]}
            city={city}
          />
        ) : (
          <>
            {/* Media */}
            <section className="mt-6">
              <div className="text-xl font-extrabold">Media</div>
              <div className="mt-1 text-sm text-white/70">
                Add up to 9 photos. Use prompts to share your personality.
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((path, i) => (
                  <PhotoSlot
                    key={i}
                    index={i}
                    path={path}
                    busy={busyPhoto === i}
                    onPick={(file) => handlePickPhoto(i, file)}
                    onRemove={() => removePhoto(i)}
                  />
                ))}
              </div>
            </section>
{/* 
            Photo options / Smart Photos (UI only for now)
            <section className="mt-10">
              <div className="text-xl font-extrabold">Photo Options</div>
              <div className="mt-4 rounded-3xl bg-white/10 ring-1 ring-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-5">
                  <div>
                    <div className="text-lg font-semibold">Smart Photos</div>
                    <div className="mt-1 text-sm text-white/70">
                      Continuously tests all your profile photos to find the best one.
                    </div>
                  </div>

                  <Toggle value={true} onChange={() => {}} disabled />
                </div>
              </div>
              <div className="mt-2 text-xs text-white/50">(Coming soon — ახლა UI only)</div>
            </section> */}

            {/* About Me */}
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <div className="text-xl font-extrabold">About Me</div>
                <div className="text-sm text-white/60">{bio.length}/500</div>
              </div>
              <textarea
                className="mt-3 w-full rounded-2xl bg-white/10 p-4 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 outline-none focus:ring-pink-500/50"
                placeholder="About Me"
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
              />
              <div className="mt-3 text-sm text-sky-400 underline opacity-90 cursor-pointer select-none">
                Quick ‘About Me’ tips
              </div>
            </section>

            {/* Living in / City */}
            <section className="mt-10">
              <div className="flex items-center gap-2 text-xl font-extrabold">
                <span className="text-pink-500">•</span> Living In
              </div>
              <div className="mt-3 rounded-3xl bg-white/10 ring-1 ring-white/10 p-4">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Add City"
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/40"
                />
              </div>
            </section>

            {/* Gender */}
            <section className="mt-10">
              <div className="text-xl font-extrabold">Gender</div>
              <div className="mt-3 rounded-3xl bg-white/10 ring-1 ring-white/10 p-4">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-transparent outline-none text-white"
                >
                  <option value="" className="bg-zinc-950">
                    Select
                  </option>
                  <option value="male" className="bg-zinc-950">
                    Man
                  </option>
                  <option value="female" className="bg-zinc-950">
                    Woman
                  </option>
                  <option value="nonbinary" className="bg-zinc-950">
                    Non-binary
                  </option>
                  <option value="other" className="bg-zinc-950">
                    Other
                  </option>
                </select>
              </div>
            </section>

            {/* Sexual Orientation */}
            <section className="mt-8">
              <div className="text-xl font-extrabold">Sexual Orientation</div>
              <div className="mt-3 rounded-3xl bg-white/10 ring-1 ring-white/10 p-4">
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full bg-transparent outline-none text-white"
                >
                  <option value="" className="bg-zinc-950">
                    Select
                  </option>
                  <option value="straight" className="bg-zinc-950">
                    Straight
                  </option>
                  <option value="gay" className="bg-zinc-950">
                    Gay
                  </option>
                  <option value="bisexual" className="bg-zinc-950">
                    Bisexual
                  </option>
                  <option value="other" className="bg-zinc-950">
                    Other
                  </option>
                </select>
              </div>
            </section>

            {/* Control toggles */}
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <div className="text-xl font-extrabold">Control Your Profile</div>
                <div className="rounded-full bg-pink-500/20 px-3 py-1 text-xs text-pink-300 ring-1 ring-pink-500/20">
                  Shekvhdi Plus®
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-white/10 ring-1 ring-white/10 overflow-hidden">
                <RowToggle
                  title="Don't Show My Age"
                  value={!showAge}
                  onChange={(v) => setShowAge(!v)}
                />
                <Divider />
                <RowToggle
                  title="Don't Show My Distance"
                  value={!showDistance}
                  onChange={(v) => setShowDistance(!v)}
                />
              </div>
            </section>

            {/* Bottom marker */}
           
            <div className="h-10" />
          </>
        )}
      </div>
    </div>
  </main>
);

}

function Divider() {
  return <div className="h-px bg-white/10" />;
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`h-8 w-14 rounded-full relative ring-1 ring-white/10 ${
        value ? "bg-pink-500" : "bg-white/15"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label="Toggle"
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
          value ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

function RowToggle({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-5">
      <div className="text-base">{title}</div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionRow({
  title,
  value,
  placeholder,
  onChange,
}: {
  title: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="mt-10">
      <div className="rounded-3xl bg-white/10 ring-1 ring-white/10 p-4">
        <div className="text-sm text-white/70">{title}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full bg-transparent outline-none text-white placeholder:text-white/40"
        />
      </div>
    </section>
  );
}

function PhotoSlot({
  index,
  path,
  onPick,
  onRemove,
  busy,
}: {
  index: number;
  path: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
  busy?: boolean;
}) {
  const inputId = `photo-slot-${index}`;
  const url = useMemo(() => (path ? photoSrc(path) : ""), [path]);

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
      {path ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 h-9 w-9 rounded-full bg-zinc-950/80 ring-1 ring-white/15 flex items-center justify-center text-white"
            aria-label="Remove"
            title="Remove"
          >
            ✕
          </button>
        </>
      ) : (
        <label
          htmlFor={inputId}
          className="flex h-full w-full cursor-pointer items-center justify-center text-4xl text-white/40"
          title="Add photo"
        >
          +
        </label>
      )}

      {busy ? (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-sm">
          Uploading…
        </div>
      ) : null}

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f) onPick(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}

function PreviewCard({
  name,
  age,
  bio,
  photo,
  city,
}: {
  name: string;
  age: number | null;
  bio: string;
  photo: string | null;
  city: string;
}) {
  const avatar = useMemo(() => (photo ? photoSrc(photo) : ""), [photo]);

  return (
    <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
          {photo ? <img src={avatar} className="h-full w-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-lg font-extrabold">
            {name}
            {age != null ? `, ${age}` : ""}
          </div>
          <div className="text-sm text-white/70">{city || " "}</div>
        </div>
      </div>

      {bio ? <div className="mt-4 text-white/85 text-sm whitespace-pre-wrap">{bio}</div> : null}
    </div>
  );
}
