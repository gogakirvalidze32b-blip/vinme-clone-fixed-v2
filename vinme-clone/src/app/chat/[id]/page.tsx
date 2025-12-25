"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbMessage = {
  id: string;
  match_id: string | null;
  sender_anon: string;
  content: string;
  created_at?: string;
  read_at?: string | null;
};

type DbMatch = {
  id: number; // bigint
  user_a: string; // uuid
  user_b: string; // uuid
};

type DbProfile = {
  anon_id: string;
  nickname: string;
  photo1_url: string | null;
};

function safeUUID() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return (
      hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20)
    );
  }
  return `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function getOrCreateAnonId(): Promise<string> {
  const key = "vinme_anon_id";
  let v = localStorage.getItem(key);
  if (!v) {
    v = safeUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const matchIdStr = params?.id as string; // URL param
  const matchId = Number(matchIdStr); // matches.id is bigint -> number here

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
    return match.user_a === meId ? match.user_b : match.user_a;
  }, [meId, match]);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateAnonId();
      setMeId(id);
    })();
  }, []);

  useEffect(() => {
    if (!meId || !matchId) return;

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

      const otherId = (matchData as any).user_a === meId ? (matchData as any).user_b : (matchData as any).user_a;

      const { data: prof } = await supabase
        .from("profiles")
        .select("anon_id, nickname, photo1_url")
        .eq("anon_id", otherId)
        .maybeSingle();

      if (prof) setOtherProfile(prof as any);

      setLoading(false);
    })();
  }, [meId, matchId]);

  // ⚠️ NOTE: This will ONLY work after you fix messages.match_id type to bigint (see SQL below)
  useEffect(() => {
    if (!meId || !matchId) return;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .eq("match_id", matchId as any)
        .order("created_at", { ascending: true });

      if (error) console.error("Messages load error:", error);
      setMessages((data ?? []) as any);
    })();
  }, [meId, matchId]);

  // realtime
  useEffect(() => {
    if (!meId || !matchId) return;

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as DbMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const t = text.trim();
    if (!t || !meId) return;
    setText("");

    // ⚠️ Will work after match_id type fix (below)
    const { error } = await supabase.from("messages").insert({
      match_id: matchId as any,
      sender_anon: meId,
      content: t,
    });

    if (error) console.error("Send error:", error);
  }

  if (!matchIdStr) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={() => router.push("/chat")} style={{ padding: "6px 10px", borderRadius: 10 }}>
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {otherProfile?.photo1_url ? (
            <img src={otherProfile.photo1_url} alt="avatar" style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.12)" }} />
          )}
          <div style={{ fontWeight: 700 }}>{otherProfile?.nickname ?? (loading ? "Loading…" : "Chat")}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
        {messages.map((m) => {
          const mine = m.sender_anon === meId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
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

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          style={{ flex: 1, padding: "12px 12px", borderRadius: 14, outline: "none" }}
        />
        <button onClick={send} style={{ padding: "10px 14px", borderRadius: 14, fontWeight: 700 }}>
          Send
        </button>
      </div>
    </div>
  );
}
