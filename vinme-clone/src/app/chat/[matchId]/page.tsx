"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import { photoSrc } from "@/lib/photos";

type DbMessage = {
  id: string;
  match_id: number | null; // bigint in DB
  sender_anon: string;
  content: string;
  created_at?: string;
  read_at?: string | null;
};

type DbMatch = {
  id: number; // bigint in DB
  user_a: string; // uuid
  user_b: string; // uuid
};

type DbProfile = {
  user_id: string; // uuid
  anon_id: string; // text
  nickname: string | null;
  photo1_url?: string | null; // PATH or URL
  photo_url?: string | null; // optional if you have it
};

export default function ChatThreadPage() {
  const params = useParams<{ matchId: string }>();
  const matchIdStr = params?.matchId ?? "";
  const matchId = Number(matchIdStr);
  console.log("params:", params);
  console.log("matchIdStr:", matchIdStr);

  const router = useRouter();

  const [meUserId, setMeUserId] = useState<string | null>(null);
  const [myAnon, setMyAnon] = useState<string>("");

  const [match, setMatch] = useState<DbMatch | null>(null);
  const [otherProfile, setOtherProfile] = useState<DbProfile | null>(null);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const otherUserId = useMemo(() => {
    if (!meUserId || !match) return null;
    return match.user_a === meUserId ? match.user_b : match.user_a;
  }, [meUserId, match]);

  // -------- init: get auth user + my anon_id --------
useEffect(() => {
  let alive = true;

  (async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.error("auth.getUser error:", error);

    const u = data.user;
    if (!alive) return;

    if (!u) {
      setAuthChecked(true);
      return;
    }

    setMeUserId(u.id);

    const { data: meProf } = await supabase
      .from("profiles")
      .select("user_id, anon_id")
      .eq("user_id", u.id)
      .maybeSingle();

    if (meProf?.anon_id && alive) setMyAnon(meProf.anon_id);

    setAuthChecked(true); // ✅ ეს აუცილებლად უნდა შესრულდეს როცა u არსებობს
  })();

  return () => {
    alive = false;
  };
}, []);


  // -------- load match + other profile --------
  useEffect(() => {
    if (!meUserId) return;
    if (!matchId || Number.isNaN(matchId)) return;

    let alive = true;

    (async () => {
      setLoading(true);

      const { data: matchData, error: matchErr } = await supabase
        .from("matches")
        .select("id, user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();

      if (!alive) return;

      if (matchErr || !matchData) {
        console.error("Match load error:", matchErr);
        setLoading(false);
        return;
      }

      setMatch(matchData as any);

      const otherId =
        (matchData as any).user_a === meUserId
          ? (matchData as any).user_b
          : (matchData as any).user_a;

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, anon_id, nickname, photo1_url, photo_url")
        .eq("user_id", otherId)
        .maybeSingle();

      if (!alive) return;

      if (profErr) console.error("Other profile load error:", profErr);
      if (prof) setOtherProfile(prof as any);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [meUserId, matchId]);

  // -------- load messages --------
  useEffect(() => {
    if (!meUserId) return;
    if (!matchId || Number.isNaN(matchId)) return;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .eq("match_id", matchId as any)
        .order("created_at", { ascending: true });

      if (error) console.error("Messages load error:", error);
      setMessages((data ?? []) as any);
    })();
  }, [meUserId, matchId]);

  // -------- realtime subscribe --------
  useEffect(() => {
    if (!meUserId) return;
    if (!matchId || Number.isNaN(matchId)) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const m = payload.new as DbMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meUserId, matchId]);

  // -------- auto scroll --------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || !myAnon) return;
    if (!matchId || Number.isNaN(matchId)) return;

    setText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId as any,
        sender_anon: myAnon,
        content: t,
      })
      .select("id, match_id, sender_anon, content, created_at, read_at")
      .single();

    if (error) {
      console.error("Send error:", error);
      return;
    }

    setMessages((prev) =>
      prev.some((x) => x.id === data.id) ? prev : [...prev, data as any]
    );
  }

  if (!matchIdStr) return null;

  const NAV_H = 72; // BottomNav სიმაღლე (თუ სხვანაირია შეცვალე)
  const INPUT_H = 76; // input ზონის სიმაღლე (დაახლოებით)
  const HEADER_H = 56; // header სიმაღლე

  const titleName = otherProfile?.nickname ?? (loading ? "Loading…" : "Chat");
  const avatarPath = otherProfile?.photo1_url ?? otherProfile?.photo_url ?? null;
  const avatar = photoSrc(avatarPath);
const [avatarOk, setAvatarOk] = useState(true);
const [authChecked, setAuthChecked] = useState(false);


  const otherAnon = otherProfile?.anon_id ?? null;
  

function openOtherProfile() {
  if (otherAnon) {
    router.push(`/profile/${otherAnon}`);
    return;
  }
  if (otherUserId) {
    router.push(`/profile?user=${otherUserId}`);
  }
}

if (!authChecked) return null;

if (!meUserId) {
  router.replace("/login");
  return null;
}

  return (
    <div
      style={{
        height: "100dvh",
        background: "#09090b",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_H,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 12px",
          background: "#09090b",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          zIndex: 50,
        }}
      >
        {/* ✅ Back + Avatar + Profile pill ერთ ხაზზე */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ padding: "10px 15px", borderRadius: 15 }}
          >
           ← უკან
          </button>

          {/* ✅ მრგვალი სურათი შუაში */}
{avatar && avatarOk ? (
  <img
    src={avatar}
    alt=""
    onClick={openOtherProfile}
    onError={() => setAvatarOk(false)}
    style={{
      width: 40,
      height: 40,
      borderRadius: "50%",
      objectFit: "cover",
      cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.25)",
    }}
  />
) : (
  <div
    onClick={openOtherProfile}
    style={{
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.18)",
      cursor: "pointer",
      border: "1px solid rgba(255,255,255,0.15)",
    }}
  />
)}


          {/* ✅ Profile pill მარჯვნივ */}
          <button
            type="button"
            onClick={openOtherProfile}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.15,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>{titleName}</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>View profile</div>
            </div>
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        style={{
          position: "fixed",
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: NAV_H + INPUT_H,
          overflowY: "auto",
          padding: 12,
        }}
      >
        {messages.map((m) => {
          const mine = m.sender_anon === myAnon;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: mine ? "flex-end" : "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: mine
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.08)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: NAV_H,
          height: INPUT_H,
          padding: 12,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          background: "#09090b",
          display: "flex",
          gap: 8,
          alignItems: "center",
          zIndex: 60,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{
            flex: 1,
            padding: "12px 12px",
            borderRadius: 14,
            outline: "none",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "white",
          }}
        >
          Send
        </button>
      </div>

      {/* BottomNav */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: NAV_H,
          zIndex: 70,
        }}
      >
        <BottomNav />
      </div>
    </div>
  );
}
