"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  has_messages?: boolean;
};

type ProfileRow = {
  user_id: string;
  anon_id: string | null;
  nickname: string | null;
  photo1_url: string | null;
};

type MsgRow = {
  id: string;
  match_id: number;
  sender_anon: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params?.matchId);

  const [uid, setUid] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [otherProfile, setOtherProfile] = useState<ProfileRow | null>(null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 0) auth + anon
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const a = getOrCreateAnonId();
        if (alive) setMyAnonId(a);

        const { data, error } = await supabase.auth.getUser();
        if (!alive) return;
        if (error) throw error;

        const id = data.user?.id ?? null;
        if (!id) {
          window.location.href = "/login";
          return;
        }
        setUid(id);
      } catch (e: any) {
        console.error("Auth error:", e);
        if (alive) setErr(e?.message ?? "Auth failed");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ mark all incoming as read (this chat)
  async function markThreadRead() {
    if (!myAnonId || !matchId) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .neq("sender_anon", myAnonId)
      .is("read_at", null);
  }

  // 1) load match + other profile + messages
 useEffect(() => {
  if (!uid) return;

  // ✅ matchId შეიძლება იყოს string -> გადავიყვანოთ number-ში სწორად
  const mid = Number(matchId);
  if (!mid || Number.isNaN(mid)) return;

  // ✅ myAnonId საჭიროა read-ის დასასმელად
  if (!myAnonId) return;

  let alive = true;

  (async () => {
    try {
      setLoading(true);
      setErr(null);

      const { data: mData, error: mErr } = await supabase
        .from("matches")
        .select("id, user_a, user_b, last_message_at, has_messages")
        .eq("id", mid)
        .maybeSingle();

      if (mErr) throw mErr;
      if (!mData) throw new Error("Match not found");

      if (!alive) return;
      const mRow = mData as MatchRow;
      setMatch(mRow);

      const otherId = (mRow.user_a === uid ? mRow.user_b : mRow.user_a) as string;

      const { data: pData } = await supabase
        .from("profiles")
        .select("user_id, anon_id, nickname, photo1_url")
        .eq("user_id", otherId)
        .maybeSingle();

      if (!alive) return;
      setOtherProfile((pData as ProfileRow) ?? null);

      const { data: msgData, error: msgErr } = await supabase
        .from("messages")
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .eq("match_id", mid)
        .order("created_at", { ascending: true });

      if (msgErr) throw msgErr;
      if (!alive) return;

      setMsgs((msgData as MsgRow[]) ?? []);

      // ✅ open thread => mark read (მხოლოდ სხვა ადამიანის unread მესიჯები ამ match-ზე)
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("match_id", mid)
        .is("read_at", null)
        .neq("sender_anon", myAnonId);

    } catch (e: any) {
      console.error("CHAT LOAD ERROR:", e);
      if (alive) setErr(e?.message ?? "Load failed");
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => {
    alive = false;
  };
}, [uid, matchId, myAnonId]);

  // 2) realtime messages for this match
  useEffect(() => {
    if (!matchId || Number.isNaN(matchId)) return;
    if (!myAnonId) return;

    let alive = true;

    const ch = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          if (!alive) return;
          const row = payload.new as any as MsgRow;

          

          // append (no dup)
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));

          // ✅ incoming => instantly mark read (badge disappears without refresh)
          if (row.sender_anon !== myAnonId) {
            try {
              await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", row.id);
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [matchId, myAnonId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    if (!myAnonId) return;
    if (!matchId || Number.isNaN(matchId)) return;

    setSending(true);

    try {
      const optimisticId = `tmp-${Date.now()}`;
      const nowIso = new Date().toISOString();

      // ✅ optimistic UI FIRST (რომ “მყისიერად გამოჩნდეს”)
      setMsgs((prev) => [
        ...prev,
        {
          id: optimisticId,
          match_id: matchId,
          sender_anon: myAnonId,
          content: t,
          created_at: nowIso,
          read_at: null,
        },
      ]);

      setText("");

      const { data, error } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_anon: myAnonId, content: t })
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .single();

      if (error) throw error;

      // replace optimistic with real row
      setMsgs((prev) => prev.map((m) => (m.id === optimisticId ? (data as any as MsgRow) : m)));

      await supabase
        .from("matches")
        .update({ has_messages: true, last_message_at: new Date().toISOString() })
        .eq("id", matchId);
    } catch (e: any) {
      console.error("Send error:", e);
      setErr(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  const otherAvatar = useMemo(() => photoSrc(otherProfile?.photo1_url ?? null), [otherProfile?.photo1_url]);

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="rounded-full bg-white/10 px-3 py-2 text-sm"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
              {otherAvatar ? (
                <img src={otherAvatar} className="h-full w-full object-cover" alt="" />
              ) : (
                <div className="h-full w-full bg-zinc-800/40" />
              )}
            </div>

            <div className="text-lg font-extrabold">{otherProfile?.nickname ?? "Chat"}</div>
          </div>
        </div>

        {err && <div className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{err}</div>}

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-3">
          {loading ? (
            <div className="p-6 text-center text-white/60">Loading…</div>
          ) : (
            <div className="max-h-[65dvh] overflow-y-auto space-y-2 p-2">
              {msgs.map((m) => {
                const mine = m.sender_anon === myAnonId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-white text-black" : "bg-black/40 ring-1 ring-white/10"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ✅ input + send (ვიზუალი იგივე) */}
          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="rounded-2xl bg-white px-4 py-3 font-bold text-black disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* ჩათში ბეჯი არ გვჭირდება */}
      <BottomNav chatBadge={0} />
    </main>
  );
}