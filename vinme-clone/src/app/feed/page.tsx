"use client";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TinderCard from "@/components/TinderCard";
import MatchOverlay from "@/components/MatchOverlay";
import SettingsModal from "@/components/SettingsModal";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId, generateAnonName } from "@/lib/guest";


/* ================= TYPES ================= */

type Gender = "male" | "female" | "nonbinary" | "other";

type Seeking = "everyone" | Gender;

type DbProfile = {
  anon_id: string;
  nickname: string;
  age: number;
  city: string;
  bio: string | null;
  gender: Gender | null;
  seeking: Seeking | null;
  photo1_url: string | null;
  created_at: string;
};

type SettingsState = {
  nickname: string;
  age: number;
  city: string;
  gender: Gender | "";
  seeking: Seeking;
  bio: string;
};

/* ================= PAGE ================= */

export default function FeedPage() {
async function testMatchTop() {
  if (!top || !meId) return;

  const matchId = await ensureMatchWith(top.anon_id);

  if (!matchId) {
    alert("matchId NULL (matches insert/check failed)");
    return;
  }

  setMatchedUser(top);
  setMatchedMatchId(matchId);
  setMatchOpen(true);
}


  const [meId, setMeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const top = useMemo(() => profiles[0] ?? null, [profiles]);
  const router = useRouter();
const [matchId, setMatchId] = useState<string | null>(null);

const [matchedUser, setMatchedUser] = useState<DbProfile | null>(null);
const [matchedMatchId, setMatchedMatchId] = useState<string | null>(null);


  const [settingsOpen, setSettingsOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [matchOpen, setMatchOpen] = useState(false);

  const [s, setS] = useState<SettingsState>({
    nickname: "",
    age: 18,
    city: "",
    gender: "",
    seeking: "everyone",
    bio: "",
  });

  async function getOrCreateMatch(otherUserId: string) {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;

  const me = authData.user?.id;
  if (!me) throw new Error("Not authenticated");

  const { data: existing, error: findErr } = await supabase
    .from("matches")
    .select("id")
    .or(
      `and(user1.eq.${me},user2.eq.${otherUserId}),and(user1.eq.${otherUserId},user2.eq.${me})`
    )
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing?.id) return existing.id as string;

  const { data: created, error: insErr } = await supabase
    .from("matches")
    .insert({ user1: me, user2: otherUserId })
    .select("id")
    .single();

  if (insErr) throw insErr;
  return created.id as string;
}


  const pollRef = useRef<number | null>(null);

  async function loadMeAndFeed(id: string) {
    const { data: me, error } = await supabase
      .from("profiles")
      .select("anon_id,nickname,age,city,bio,gender,seeking")
      .eq("anon_id", id)
      .maybeSingle();

    if (error) {
      console.log("me error:", error.message);
      return;
    }

    const myGender = me?.gender ?? null;
    const mySeeking = me?.seeking ?? "everyone";

    setS({
      nickname: me?.nickname ?? generateAnonName(),
      age: me?.age ?? 18,
      city: me?.city ?? "",
      gender: (me?.gender as Gender) ?? "",
      seeking: (me?.seeking as Seeking) ?? "everyone",
      bio: me?.bio ?? "",
    });

    const { data: people, error: e2 } = await supabase
      .from("profiles")
      .select(
        "anon_id,nickname,age,city,bio,gender,seeking,photo1_url,created_at"
      )
      .neq("anon_id", id)
      .order("created_at", { ascending: false });

    if (e2) {
      console.log("feed error:", e2.message);
      setProfiles([]);
      return;
    }

    const filtered =
      people?.filter((p) => {
        if (!p.gender) return false;

        const iLikeThem = mySeeking === "everyone" || p.gender === mySeeking;
        const theyLikeMe =
          p.seeking === "everyone" || (myGender && p.seeking === myGender);

        return iLikeThem && theyLikeMe;
      }) ?? [];

    setProfiles(filtered);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const id = getOrCreateAnonId();
      setMeId(id);
      await loadMeAndFeed(id);
      setLoading(false);
    })();

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    // stop polling if we have profiles
    if (profiles.length > 0) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // start polling when feed is empty
    if (pollRef.current) return;

    pollRef.current = window.setInterval(async () => {
      if (!meId) return;
      await loadMeAndFeed(meId);
    }, 8000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [profiles.length, loading, meId]);

  function popTop() {
    setProfiles((p) => p.slice(1));
  }

  async function likeTop() {
    if (!top || !meId) return;

    const { error } = await supabase.from("likes").insert({
      from_anon: meId,
      to_anon: top.anon_id,
    });

    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.log("like error:", error.message);
    }

    const { data: match } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(user1.eq.${meId},user2.eq.${top.anon_id}),and(user1.eq.${top.anon_id},user2.eq.${meId})`
      )
      .maybeSingle();

    if (match) setMatchOpen(true);

    popTop();
  }

  function skipTop() {
    popTop();
  }
  async function ensureMatchWith(otherAnon: string) {
  // 1) match არსებობს?
  const { data: existing, error: e1 } = await supabase
    .from("matches")
    .select("id,a_anon,b_anon")
    .or(`and(a_anon.eq.${meId},b_anon.eq.${otherAnon}),and(a_anon.eq.${otherAnon},b_anon.eq.${meId})`)
    .maybeSingle();

  if (e1) console.log("match check error:", e1.message);

  if (existing?.id) return existing.id as string;

  // 2) თუ არა — შექმენი
  const { data: created, error: e2 } = await supabase
    .from("matches")
    .insert({ a_anon: meId, b_anon: otherAnon })
    .select("id")
    .single();

  if (e2) {
    console.log("match create error:", e2.message);
    return null;
  }

  return (created?.id as string) ?? null;
}


  async function saveSettings() {
    setMsg("");
    setSaving(true);

    if (!meId) {
      setMsg("Anon ID ვერ მოიძებნა");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      anon_id: meId,
      nickname: s.nickname.trim(),
      age: s.age,
      city: s.city.trim(),
      bio: s.bio,
      gender: s.gender || null,
      seeking: s.seeking,
    });

    if (error) setMsg(error.message);
    else {
      setSettingsOpen(false);
      await loadMeAndFeed(meId);
    }

    setSaving(false);
  }


console.log("TOP DEBUG 👉", top);
console.log("TOP KEYS 👉", top ? Object.keys(top as any) : null);

const otherId =
  (top as any)?.user_id ??
  (top as any)?.userId ??
  (top as any)?.profile_id ??
  (top as any)?.id ??
  (top as any)?.uid ??
  (top as any)?.owner_id ??
  null;

const cardUser =
  top && otherId
    ? {
        id: String(otherId),
        nickname: top.nickname,
        age: top.age,
        city: top.city,
        distanceKm: 0,
        recentlyActive: true,
        photo_url: (top as any).photo1_url ?? null,
      }
    : null;


console.log("cardUser DEBUG 👉", cardUser);
console.log("cardUser keys 👉", cardUser ? Object.keys(cardUser as any) : null);


  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      {/* phone frame */}
      <div className="relative w-full max-w-[420px] min-h-screen overflow-hidden">
        {/* Old UI: only logo top-left (inside TinderCard). */}
   <TinderCard
  user={cardUser}
otherUserId={String(
  (cardUser as any)?.id ??
  (cardUser as any)?.user_id ??
  (cardUser as any)?.uid ??
  ""
)}

  loading={loading}
  onLike={likeTop}
  onSkip={skipTop}
  onOpenProfile={() => setSettingsOpen(true)}
  showTopTabs={false}
/>


       <MatchOverlay
  visible={matchOpen}
  onClose={() => setMatchOpen(false)}
  otherPhoto={cardUser?.photo_url ?? null}
  otherName={cardUser?.nickname ?? "Match"}
  onMessage={async (text) => {
    try {
      const otherUserId = String(
        (cardUser as any)?.id ??
          (cardUser as any)?.user_id ??
          (cardUser as any)?.uid ??
          ""
      );

      if (!otherUserId) {
        console.error("Missing otherUserId for match/message", cardUser);
        return;
      }

      const id = await getOrCreateMatch(otherUserId);
      setMatchId(id);

      const { error } = await supabase.from("messages").insert({
        match_id: id,
        sender_anon: "me",
        content: text,
      });

      if (error) {
        console.error("Message insert error:", error);
        return;
      }

      setMatchOpen(false);
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error("SEND MESSAGE FAILED:", err);
    }
  }}
/>

        {settingsOpen && (
          <SettingsModal
            value={s}
            setValue={setS}
            onClose={() => setSettingsOpen(false)}
            onSave={saveSettings}
            saving={saving}
            msg={msg}
            onRandomName={() =>
              setS((p) => ({ ...p, nickname: generateAnonName() }))
            }
          />
        )}
      </div>
    </div>
  );
}
