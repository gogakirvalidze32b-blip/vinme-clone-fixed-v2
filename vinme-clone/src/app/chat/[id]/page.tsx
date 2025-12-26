"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbMessage = {
  id: string;
  match_id: number | null; // bigint
  sender_anon: string;
  content: string;
  created_at?: string;
  read_at?: string | null;
};

type DbMatch = {
  id: number; // bigint
  user_a: string; // uuid (auth user id)
  user_b: string; // uuid (auth user id)
};

type DbProfile = {
  user_id: string; // uuid
  anon_id: string; // text
  nickname: string;
  photo1_url: string | null;
};

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const matchIdStr = params?.id as string;
  const matchId = Number(matchIdStr);

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

  // ✅ init: get auth user + my anon_id from profiles
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;

      setMeUserId(u.id);

      const { data: meProf, error: meProfErr } = await supabase
        .from("profiles")
        .select("user_id, anon_id, nickname, photo1_url")
        .eq("user_id", u.id)
        .maybeSingle();

      if (meProfErr) console.error("Me profile load error:", meProfErr);
      if (meProf?.anon_id) setMyAnon(meProf.anon_id);
    })();
  }, []);

  // ✅ load match + other profile (by user_id)
  useEffect(() => {
    if (!meUserId || !matchId) return;

    (async () => {
      setLoading(true);

      const { data: matchData, error: matchErr } = await supabase
        .from("matches")
        .select("id, user_a, user_b")
        .eq("id", matchId)
        .maybeSingle();

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
        .select("user_id, anon_id, nickname, photo1_url")
        .eq("user_id", otherId)
        .maybeSingle();

      if (profErr) console.error("Other profile load error:", profErr);
      if (prof) setOtherProfile(prof as any);

      setLoading(false);
    })();
  }, [meUserId, matchId]);

  // ✅ load messages
  useEffect(() => {
    if (!meUserId || !matchId) return;

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

  // ✅ realtime
  useEffect(() => {
    if (!meUserId || !matchId) return;

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
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meUserId, matchId]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || !meUserId || !myAnon) return;

    setText("");

    // ✅ insert + return inserted row so we can update UI instantly
    const { data, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_anon: myAnon,
        content: t,
      })
      .select("id, match_id, sender_anon, content, created_at, read_at")
      .single();

    if (error) {
      console.error("Send error:", error);
      return;
    }

    // ✅ show immediately without refresh
    setMessages((prev) => {
      if (prev.some((x) => x.id === data.id)) return prev;
      return [...prev, data as any];
    });
  }

  if (!matchIdStr) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#09090b", color: "white" }}>
      {/* Header */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <button onClick={() => router.push("/chat")} style={{ padding: "6px 10px", borderRadius: 10 }}>
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {otherProfile?.photo1_url ? (
            <img
              src={otherProfile.photo1_url}
              alt="avatar"
              style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.12)" }} />
          )}
          <div style={{ fontWeight: 700 }}>{otherProfile?.nickname ?? (loading ? "Loading…" : "Chat")}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
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
                  background: mine ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
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

      {/* Input */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
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
            fontWeight: 700,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "white",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
