"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
  created_at: string;
};

type ProfileLite = {
  user_id: string;
  first_name: string | null;
  nickname: string | null;
  age: number | null;
  city: string | null;
  photo1_url: string | null; // PATH ან URL
  lat: number | null;
  lng: number | null;
};

type RowVM = MatchRow & { other?: ProfileLite };

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function MatchesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState<Pick<ProfileLite, "lat" | "lng"> | null>(null);
  const [rows, setRows] = useState<RowVM[]>([]);

  // Preview UI state (blur card)
  const previewPhoto = useMemo(() => {
    const first = rows[0]?.other?.photo1_url ?? null;
    return first ? photoSrc(first) : "";
  }, [rows]);

  const previewAge = useMemo(() => rows[0]?.other?.age ?? "?", [rows]);

  const onCta = () => {
    // აქ შეგიძლია upgrade/paywall გახსნა ან უბრალოდ /premium
    router.push("/profile");
  };

  const goToFeed = () => router.push("/feed");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setMsg("");

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          if (alive) setMsg("ჯერ დალოგინდი 🙂");
          return;
        }

        // 1) load my lat/lng
        const { data: myProf, error: myErr } = await supabase
          .from("profiles")
          .select("user_id, lat, lng")
          .eq("user_id", user.id)
          .maybeSingle();

        if (myErr) {
          // არ ვაფეილებთ გვერდს, უბრალოდ km არ გამოჩნდება
          console.log("my profile load err:", myErr.message);
        }
        if (alive) setMe(myProf ? { lat: myProf.lat ?? null, lng: myProf.lng ?? null } : null);

        // 2) load matches
        const { data, error } = await supabase
          .from("matches")
          .select("*")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) {
          if (alive) setMsg("შეცდომა: " + error.message);
          return;
        }

        const matches = (data ?? []) as MatchRow[];
        if (matches.length === 0) {
          if (alive) setRows([]);
          return;
        }

        // 3) other ids
        const otherIds = matches.map((m) => (m.user_a === user.id ? m.user_b : m.user_a));

        // 4) load other profiles WITH lat/lng
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("user_id, first_name, nickname, age, city, photo1_url, lat, lng")
          .in("user_id", otherIds);

        if (profErr) {
          if (alive) setMsg("Profiles error: " + profErr.message);
          return;
        }

        const map = new Map<string, ProfileLite>();
        (profs ?? []).forEach((p: any) => map.set(p.user_id, p as ProfileLite));

        const out: RowVM[] = matches.map((m) => {
          const otherId = m.user_a === user.id ? m.user_b : m.user_a;
          return { ...m, other: map.get(otherId) };
        });

        if (alive) setRows(out);
      } catch (e: any) {
        if (alive) setMsg(e?.message ?? "Unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="rounded-2xl bg-zinc-900/40 p-4 ring-1 ring-white/10">
          <div className="text-3xl font-semibold">Likes</div>

          {/* აქ შეგიძლია tabs მოგვიანებით */}
          <div className="mt-3 flex items-center gap-6 text-sm text-white/60">
            <span>{rows.length} Like</span>
            <span className="flex items-center gap-2">
              Top Picks <span className="h-2 w-2 rounded-full bg-red-500" />
            </span>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="mt-6 h-[260px] w-[180px] rounded-3xl bg-white/10 animate-pulse" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-white/70">
                <div className="text-base">ჯერ Match არ გაქვს.</div>
                <button
                  className="mt-3 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                  onClick={goToFeed}
                >
                  Feed-ზე გადასვლა
                </button>
              </div>
            ) : (
              <>
                <p className="text-center text-white/70">
                  Upgrade to Gold to see people who have already liked you.
                </p>

                {/* ✅ KM (თუ lat/lng არის) */}
                <div className="mt-2 text-center text-sm text-white/60">
                  {(() => {
                    const myLat = me?.lat ?? null;
                    const myLng = me?.lng ?? null;
                    const otherLat = rows[0]?.other?.lat ?? null;
                    const otherLng = rows[0]?.other?.lng ?? null;

                    const km =
                      myLat != null && myLng != null && otherLat != null && otherLng != null
                        ? distanceKm(myLat, myLng, otherLat, otherLng)
                        : null;

                    return km !== null ? <span>დაახლოებით {km} km შენგან</span> : null;
                  })()}
                </div>

                {/* Preview Card */}
                <div className="mt-8 flex justify-start">
                  <div className="relative h-[280px] w-[190px] overflow-hidden rounded-[28px] bg-white/10 ring-1 ring-white/10">
                    {previewPhoto ? (
                      <img
                        src={previewPhoto}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ filter: "blur(18px)" }}
                      />
                    ) : (
                      <div className="h-full w-full bg-white/10" />
                    )}

                    {/* bottom left info */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-14 rounded-full bg-white/40" />
                        <div className="text-lg font-semibold">
                          {previewAge}
                          <span className="ml-1 inline-block h-4 w-4 rounded-full bg-sky-500/80 align-middle" />
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-white/80">
                        <span className="text-sm">👥</span>
                        <span className="text-sm">Music</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-12">
                  <button
                    type="button"
                    onClick={onCta}
                    className="w-full rounded-full bg-[#E1B12C] py-4 text-center text-lg font-semibold text-black active:scale-[0.99]"
                  >
                    See Who Likes You
                  </button>
                </div>
              </>
            )}
          </div>

          {/* tiny links (optional) */}
          <div className="mt-8 flex gap-4 text-sm text-white/50"></div>

          {msg && <div className="mt-4 text-sm text-red-300">{msg}</div>}
        </div>
      </div>
    </main>
  );
}