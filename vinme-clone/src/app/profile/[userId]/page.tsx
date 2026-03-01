"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

function calcAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const bd = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--;
  return age;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

const COPY: Record<string, Record<string, string>> = {
  ka: {
    back: "← უკან",
    km_away: "კმ-ით შორს",
    bio: "ბიო",
    city: "ქალაქი",
    age: "ასაკი",
    gender: "სქესი",
    orientation: "სექსუალური ორიენტაცია",
    job: "სამუშაო",
    company: "კომპანია",
    education: "განათლება",
    lifestyle: "ცხოვრების სტილი",
    pets: "შინაური ცხოველი",
    drinking: "ალკოჰოლი",
    smoking: "მოწევა",
    workout: "ვარჯიში",
    intent: "მიზანი",
    send_message: "მესიჯის გაგზავნა",
    male: "მამრობითი", female: "მდედრობითი", nonbinary: "არარობინარი",
    straight: "ჰეტეროსექსუალი", gay: "გეი", lesbian: "ლესბოსელი", bisexual: "ბისექსუალი",
  },
  en: {
    back: "← Back",
    km_away: "km away",
    bio: "About",
    city: "Lives in",
    age: "Age",
    gender: "Gender",
    orientation: "Sexual Orientation",
    job: "Job",
    company: "Company",
    education: "Education",
    lifestyle: "Lifestyle",
    pets: "Pets",
    drinking: "Drinking",
    smoking: "Smoking",
    workout: "Workout",
    intent: "Looking for",
    send_message: "Send Message",
    male: "Man", female: "Woman", nonbinary: "Non-binary",
    straight: "Straight", gay: "Gay", lesbian: "Lesbian", bisexual: "Bisexual",
  },
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const lang = getLang();
  const c = COPY[lang] ?? COPY.ka;

  const [profile, setProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;

      const [{ data: other }, { data: me }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        uid ? supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      setProfile(other);
      setMyProfile(me);
      setLoading(false);
    })();
  }, [userId]);

  const photos = useMemo(() => {
    if (!profile) return [];
    return [1,2,3,4,5,6,7,8,9]
      .map(i => profile[`photo${i}_url`])
      .filter(Boolean)
      .map(p => photoSrc(p));
  }, [profile]);

  const age = useMemo(() => profile?.age ?? calcAge(profile?.birthdate ?? null), [profile]);

  const distanceKm = useMemo(() => {
    if (!profile?.latitude || !profile?.longitude) return null;
    if (!myProfile?.latitude || !myProfile?.longitude) return null;
    return haversineKm(myProfile.latitude, myProfile.longitude, profile.latitude, profile.longitude);
  }, [profile, myProfile]);

  async function goToChat() {
    if (!myProfile) return;
    const myId = myProfile.user_id;
    const { data: existing } = await supabase.from("matches").select("id")
      .or(`and(user_a.eq.${myId},user_b.eq.${userId}),and(user_a.eq.${userId},user_b.eq.${myId})`)
      .maybeSingle();
    if (existing?.id) { router.push(`/chat/${existing.id}`); return; }
    router.push("/chat");
  }

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  if (!profile) return <div className="h-screen bg-black flex items-center justify-center text-white">Profile not found</div>;

  const name = profile.nickname ?? profile.first_name ?? "User";

  return (
    <div className="bg-black text-white min-h-[100dvh] pb-32">
      <div className="mx-auto w-full max-w-lg">

        {/* PHOTO HEADER */}
        <div className="relative" style={{ height: "min(70vh, 520px)" }}>
          {photos.length > 0
            ? <img src={photos[activePhoto]} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-7xl">👤</div>}

          {/* gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />

          {/* back button */}
          <button onClick={() => router.back()}
            className="absolute top-4 left-4 z-10 rounded-full bg-black/50 backdrop-blur w-10 h-10 flex items-center justify-center text-white">
            ←
          </button>

          {/* photo dots */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 px-14">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setActivePhoto(i)}
                  className={`h-1 rounded-full transition-all ${i === activePhoto ? "bg-white w-8" : "bg-white/40 w-4"}`} />
              ))}
            </div>
          )}

          {/* photo nav */}
          {photos.length > 1 && (
            <>
              <button onClick={() => setActivePhoto(p => Math.max(0, p-1))}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
              <button onClick={() => setActivePhoto(p => Math.min(photos.length-1, p+1))}
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
            </>
          )}

          {/* name */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h1 className="text-3xl font-black">{name}{age ? `, ${age}` : ""}</h1>
            {distanceKm != null && (
              <p className="text-sm text-white/70 mt-0.5">📍 {distanceKm} {c.km_away}</p>
            )}
            {!distanceKm && profile.city && (
              <p className="text-sm text-white/70 mt-0.5">📍 {profile.city}</p>
            )}
          </div>
        </div>

        {/* INFO CARDS */}
        <div className="px-4 pt-4 space-y-3">

          {/* BIO */}
          {profile.bio && (
            <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">{c.bio}</div>
              <p className="text-sm leading-relaxed text-white/90">{profile.bio}</p>
            </div>
          )}

          {/* BASICS */}
          <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8 space-y-3">
            {profile.gender && (
              <InfoRow icon="⚧" label={c.gender} value={c[profile.gender] ?? profile.gender} />
            )}
            {profile.orientation && (
              <InfoRow icon="🏳️‍🌈" label={c.orientation} value={c[profile.orientation] ?? profile.orientation} />
            )}
            {profile.intent && (
              <InfoRow icon="💭" label={c.intent} value={profile.intent} />
            )}
            {profile.job_title && (
              <InfoRow icon="💼" label={c.job} value={profile.job_title} />
            )}
            {profile.company && (
              <InfoRow icon="🏢" label={c.company} value={profile.company} />
            )}
            {profile.education && (
              <InfoRow icon="🎓" label={c.education} value={profile.education} />
            )}
          </div>

          {/* LIFESTYLE */}
          {(profile.pets || profile.drinking || profile.smoking || profile.workout) && (
            <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">{c.lifestyle}</div>
              <div className="grid grid-cols-2 gap-2">
                {profile.pets && <Chip icon="🐾" label={profile.pets} />}
                {profile.drinking && <Chip icon="🍷" label={profile.drinking} />}
                {profile.smoking && <Chip icon="🚬" label={profile.smoking} />}
                {profile.workout && <Chip icon="💪" label={profile.workout} />}
              </div>
            </div>
          )}

          {/* ALL PHOTOS GRID */}
          {photos.length > 1 && (
            <div className="rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 gap-0.5">
                {photos.map((ph, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={`aspect-square overflow-hidden ${i === activePhoto ? "ring-2 ring-pink-500" : ""}`}>
                    <img src={ph} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEND MESSAGE */}
          <button onClick={goToChat}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 py-4 font-bold text-white text-base shadow-lg active:scale-[0.99] transition">
            💬 {c.send_message}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-white/35 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-white">{value}</div>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/6 px-3 py-2">
      <span className="text-base">{icon}</span>
      <span className="text-xs text-white/80 font-medium truncate">{label}</span>
    </div>
  );
}
