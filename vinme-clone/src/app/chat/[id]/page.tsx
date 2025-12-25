"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbMessage = {
  id: string;
  match_id: string | null;
  from_anon: string;
  to_anon: string;
  text: string;
  created_at?: string;
};

type DbMatch = {
  id: string;
  a_anon: string;
  b_anon: string;
};

type DbProfile = {
  anon_id: string;
  nickname: string;
  photo1_url: string | null;
};

async function getOrCreateAnonId(): Promise<string> {
  const key = "anon_id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const matchId = params?.id as string;

  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);

  const [match, setMatch] = useState<DbMatch | null>(null);
  const [otherProfile, setOtherProfile] = useState<DbProfile | null>(null);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const otherAnonId = useMemo(() => {
    if (!meId || !match) return null;
    return match.a_anon === meId ? match.b_anon : match.a_anon;
  }, [meId, match]);

  // Init meId
  useEffect(() => {
    (async () => {
      const id = await getOrCreateAnonId();
      setMeId(id);
    })();
  }, []);

  // Load match + other profile
  useEffect(() => {
    if (!meId || !matchId) return;

    (async () => {
      setLoading(true);

      const { data: matchData, error: matchErr } = await supabase
        .from("matches")
        .select("id, a_anon, b_anon")
        .eq("id", matchId)
        .maybeSingle();

      if (matchErr || !matchData) {
        console.error("Match load error:", matchErr);
        setLoading(false);
        return;
      }

      setMatch(matchData);

      const otherId =
        matchData.a_anon === meId ? matchData.b_anon : matchData.a_anon;

      const { data: prof } = await supabase
        .from("profiles")
        .select("anon_id, nickname, photo1_url")
        .eq("anon_id", otherId)
        .maybeSingle();

      if (prof) setOtherProfile(prof);

      setLoading(false);
    })();
  }, [meId, matchId]);

  // Load messages
  useEffect(() => {
    if (!meId || !matchId) return;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, match_id, from_anon, to_anon, text, created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) console.error("Messages load error:", error);
      setMessages((data ?? []) as DbMessage[]);
    })();
  }, [meId, matchId]);

  // Realtime subscribe
  useEffect(() => {
    if (!meId || !matchId) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as DbMessage;
          setMessages((prev) => {
            // დუბლიკატის დაცვა (ხანდახან შეიძლება)
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, matchId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || !meId || !otherAnonId) return;

    setText("");

    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      from_anon: meId,
      to_anon: otherAnonId,
      text: t,
    });

    if (error) {
      console.error("Send error:", error);
      // თუ გინდა, აქ შეიძლება toast/alert
    }
  }

  if (!matchId) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 10, alignItems: "center" }}>
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
          <div style={{ fontWeight: 700 }}>
            {otherProfile?.nickname ?? (loading ? "Loading…" : "Chat")}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
        {messages.map((m) => {
          const mine = m.from_anon === meId;
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
                {m.text}
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
          }}
        />
        <button onClick={send} style={{ padding: "10px 14px", borderRadius: 14, fontWeight: 700 }}>
          Send
        </button>
      </div>
    </div>
  );
}
