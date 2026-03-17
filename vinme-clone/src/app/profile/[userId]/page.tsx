"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const INTENT_KA: Record<string,string> = { relationship:"ურთიერთობა", friends:"მეგობრობა", casual:"კაჟუალი", short_term_open:"მოკლევადიანი", long_term_open:"გრძელვადიანი", long_term:"გრძელვადიანი", short_term:"მოკლევადიანი", networking:"ნეთვორქინგი" };
const INTENT_EN: Record<string,string> = { relationship:"Relationship", friends:"Friends", casual:"Casual", short_term_open:"Short-term", long_term_open:"Long-term", long_term:"Long-term", short_term:"Short-term", networking:"Networking" };
const GENDER_KA: Record<string,string> = { male:"მამაკაცი", female:"ქალი", nonbinary:"არარობინარი" };
const GENDER_EN: Record<string,string> = { male:"Man", female:"Woman", nonbinary:"Non-binary" };
const ORIENT_KA: Record<string,string> = { straight:"ჰეტეროსექსუალი", gay:"გეი", lesbian:"ლესბოსელი", bisexual:"ბისექსუალი", asexual:"ასექსუალი", demisexual:"დემისექსუალი", pansexual:"პანსექსუალი", queer:"ქვირი", questioning:"კითხვის ნიშნის ქვეშ", not_listed:"სხვა", other:"სხვა" };
const ORIENT_EN: Record<string,string> = { straight:"Straight", gay:"Gay", lesbian:"Lesbian", bisexual:"Bisexual", asexual:"Asexual", demisexual:"Demisexual", pansexual:"Pansexual", queer:"Queer", questioning:"Questioning", not_listed:"Not listed", other:"Other" };

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const lang = getLang();
  const ka = lang !== "en";

  const [profile, setProfile] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

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

      // ✅ შენი GPS-ის განახლება — რათა კილომეტრი სწორად გამოჩნდეს
      if (uid && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            // state-ი განვაახლოთ მყისიერად — UI-ში კილომეტრი გამოჩნდება
            setMyProfile((prev: any) => prev ? { ...prev, latitude: lat, longitude: lon } : prev);
            // ბაზაშიც შეინახოს
            await supabase.from("profiles")
              .update({ latitude: lat, longitude: lon })
              .eq("user_id", uid);
          },
          () => {
            // GPS permission denied — ძველი კოორდინატები დარჩება
          }
        );
      }
    })();
  }, [userId]);

  const photos = useMemo(() => {
    if (!profile) return [];
    return [1,2,3,4,5,6,7,8,9].map(i => profile[`photo${i}_url`]).filter(Boolean).map((p: string) => photoSrc(p));
  }, [profile]);

  const age = useMemo(() => profile?.age ?? calcAge(profile?.birthdate ?? null), [profile]);

 const distanceKm = useMemo(() => {
    // 1. ვაზღვევთ, რომ მონაცემები აუცილებლად რიცხვებად აღიქვას
    const lat1 = Number(myProfile?.latitude);
    const lon1 = Number(myProfile?.longitude);
    const lat2 = Number(profile?.latitude);
    const lon2 = Number(profile?.longitude);

    // 2. თუ რომელიმეს კოორდინატი 0-ია ან საერთოდ არ გვაქვს (null/undefined)
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      console.log("კმ არ იწერება იმიტომ, რომ კოორდინატები აკლია:", {
        შენი_Lat: lat1, 
        მეორეს_Lat: lat2 
      });
      return null;
    }

    // 3. ვითვლით მანძილს ფორმულით
    const dist = haversineKm(lat1, lon1, lat2, lon2);
    
    console.log("დათვლილი მანძილი კილომეტრებში არის:", dist);

    // 4. თუ 5000 კმ-ზე მეტია, დავმალოთ
    if (dist > 5000) return null;
    
    return dist;
  },[profile, myProfile]);

  
  async function goToChat() {
    if (!myProfile) return;
    const myId = myProfile.user_id;
    const { data: existing } = await supabase.from("matches").select("id")
      .or(`and(user_a.eq.${myId},user_b.eq.${userId}),and(user_a.eq.${userId},user_b.eq.${myId})`).maybeSingle();
    if (existing?.id) { router.push(`/chat/${existing.id}`); return; }
    router.push("/chat");
  }

  if (loading) return <div className="h-[100dvh] bg-black flex items-center justify-center text-white">Loading…</div>;
  if (!profile) return <div className="h-[100dvh] bg-black flex items-center justify-center text-white">Not found</div>;

  const name = profile.nickname ?? profile.first_name ?? "User";

  return (
    <div className="min-h-[100dvh] bg-black text-white">

      <div className="mx-auto" style={{ maxWidth: 430 }}>

        {/* PHOTO SECTION */}
        <div className="relative w-full bg-black overflow-hidden" style={{ height: "80dvh" }}>

          {photos.length > 0 ? (
            <img
              src={photos[activePhoto]}
              className="absolute inset-0 w-full h-full object-cover object-top"
              alt=""
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
              <span className="text-7xl opacity-20">👤</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75 pointer-events-none" />

          {photos.length > 1 && (
            <div className="absolute top-3 left-0 right-0 flex gap-1 px-12 z-20">
              {photos.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
                  <div className={`h-full bg-white transition-all ${i <= activePhoto ? "w-full" : "w-0"}`} />
                </div>
              ))}
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setActivePhoto(p => Math.max(0, p-1))} />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={() => setActivePhoto(p => Math.min(photos.length-1, p+1))} />
            </>
          )}

          <button onClick={() => router.back()}
            className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white shadow"
            style={{ marginTop: "env(safe-area-inset-top, 0px)" }}>
            ←
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black drop-shadow">{name}</span>
                  {age && <span className="text-3xl font-light text-white/85 drop-shadow">{age}</span>}
                </div>

                {(profile.city || distanceKm != null) && (
                  <div className="flex items-center gap-1 text-sm text-white/80 mt-1 font-medium drop-shadow-md">
                    <span>📍</span>
                    <span>
                      {profile.city ? profile.city : ""}
                      {profile.city && distanceKm != null ? " · " : ""}
                      {distanceKm != null ? `${distanceKm} ${ka ? "კმ" : "km"}` : ""}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setShowDetails(v => !v); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth" }), 60); }}
                className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-xl transition-transform"
                style={{ transform: showDetails ? "rotate(180deg)" : "rotate(0deg)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2.5">
              {profile.intent && (
                <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">
                  🎯 {ka ? (INTENT_KA[profile.intent] ?? profile.intent) : (INTENT_EN[profile.intent] ?? profile.intent)}
                </span>
              )}
              {profile.gender && (
                <span className="rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium">
                  {ka ? (GENDER_KA[profile.gender] ?? profile.gender) : (GENDER_EN[profile.gender] ?? profile.gender)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* DETAILS */}
        <div ref={detailsRef} className={`overflow-hidden transition-all duration-300 ${showDetails ? "opacity-100" : "opacity-0 h-0"}`}>
          <div className="px-4 py-4 space-y-3" style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>

            {profile.bio && (
              <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8">
                <div className="text-[11px] text-white/35 uppercase tracking-wide mb-1">{ka ? "ბიო" : "About"}</div>
                <p className="text-sm leading-relaxed text-white/90">{profile.bio}</p>
              </div>
            )}

            <div className="rounded-2xl bg-zinc-900 ring-1 ring-white/8 divide-y divide-white/5 overflow-hidden">
              {profile.gender && <InfoRow icon="⚧" label={ka?"სქესი":"Gender"} value={ka?(GENDER_KA[profile.gender]??profile.gender):(GENDER_EN[profile.gender]??profile.gender)} />}
              {profile.orientation && <InfoRow icon="" label={ka?"ორიენტაცია":"Orientation"} value={ka?(ORIENT_KA[profile.orientation]??profile.orientation):(ORIENT_EN[profile.orientation]??profile.orientation)} />}
              {profile.intent && <InfoRow icon="🎯" label={ka?"მიზანი":"Looking for"} value={ka?(INTENT_KA[profile.intent]??profile.intent):(INTENT_EN[profile.intent]??profile.intent)} />}
              {profile.job_title && <InfoRow icon="💼" label={ka?"სამსახური":"Job"} value={`${profile.job_title}${profile.company?" · "+profile.company:""}`} />}
              {profile.education && <InfoRow icon="🎓" label={ka?"განათლება":"Education"} value={profile.education} />}
            </div>

            {(profile.pets||profile.drinking||profile.smoking||profile.workout) && (
              <div className="flex flex-wrap gap-2">
                {profile.pets && <Chip icon="🐾" label={profile.pets} />}
                {profile.drinking && <Chip icon="🍷" label={profile.drinking} />}
                {profile.smoking && <Chip icon="🚬" label={profile.smoking} />}
                {profile.workout && <Chip icon="💪" label={profile.workout} />}
              </div>
            )}

            {photos.length > 1 && (
              <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden">
                {photos.map((ph, i) => (
                  <button key={i} onClick={() => { setActivePhoto(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`aspect-square overflow-hidden ${i===activePhoto?"ring-2 ring-pink-500":""}`}>
                    <img src={ph} className="w-full h-full object-cover" alt=""
                      onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                  </button>
                ))}
              </div>
            )}

            <button onClick={goToChat}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 py-4 font-bold text-white text-base shadow-lg active:scale-[0.99] transition">
              💬 {ka ? "მესიჯის გაგზავნა" : "Send Message"}
            </button>
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-white/35 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-xs text-white/75 font-medium">{label}</span>
    </div>
  );
}
