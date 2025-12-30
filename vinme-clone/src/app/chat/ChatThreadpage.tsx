"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";
import { photoSrc } from "@/lib/photos";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  has_messages: boolean;
  unread_a: number;
  unread_b: number;
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

  // helper: reset unread counter for THIS user in THIS match
  async function clearUnreadForMe(currentMatch: MatchRow) {
    if (!uid) return;

    const isA = currentMatch.user_a === uid;

    // 1) messages.read_at (optional, მაგრამ კარგია)
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", currentMatch.id)
      .neq("sender_anon", myAnonId)
      .is("read_at", null);

    // 2) matches unread counter reset
    await supabase
      .from("matches")
      .update(isA ? { unread_a: 0 } : { unread_b: 0 })
      .eq("id", currentMatch.id);

    // 3) UI optimistic
    setMatch((prev) => {
      if (!prev) return prev;
      return { ...prev, ...(isA ? { unread_a: 0 } : { unread_b: 0 }) };
    });
  }

  // 1) load match + other profile + messages
  useEffect(() => {
    if (!uid) return;
    if (!matchId || Number.isNaN(matchId)) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: mData, error: mErr } = await supabase
          .from("matches")
          .select("id, user_a, user_b, last_message_at, has_messages, unread_a, unread_b")
          .eq("id", matchId)
          .maybeSingle();

        if (mErr) throw mErr;
        if (!mData) throw new Error("Match not found");

        if (!alive) return;
        const mRow = mData as MatchRow;
        setMatch(mRow);

        const otherId = (mRow.user_a === uid ? mRow.user_b : mRow.user_a) as string;

        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, anon_id, nickname, photo1_url")
          .eq("user_id", otherId)
          .maybeSingle();

        if (pErr) console.warn("other profile error:", pErr);
        if (!alive) return;
        setOtherProfile((pData as ProfileRow) ?? null);

        const { data: msgData, error: msgErr } = await supabase
          .from("messages")
          .select("id, match_id, sender_anon, content, created_at, read_at")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true });

        if (msgErr) throw msgErr;
        if (!alive) return;
        setMsgs((msgData as MsgRow[]) ?? []);

        // open chat => clear unread now
        await clearUnreadForMe(mRow);
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

          // append if not already
          setMsgs((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          // if it's incoming => instantly mark read + clear unread counter (so badge disappears without refresh)
          if (row.sender_anon !== myAnonId && match) {
            try {
              await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", row.id);
              await clearUnreadForMe(match);
            } catch (e) {
              console.warn("auto-read failed:", e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [matchId, myAnonId, match]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    if (!myAnonId) return;
    if (!matchId || Number.isNaN(matchId)) return;

    setText("");
    setSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          match_id: matchId,
          sender_anon: myAnonId,
          content: t,
        })
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .single();

      if (error) throw error;

      // optimistic (realtime-იც მოვა, მაგრამ დუბლს ვფილტრავთ)
      setMsgs((prev) => {
        if (prev.some((m) => m.id === (data as any).id)) return prev;
        return [...prev, data as any];
      });

      await supabase
        .from("matches")
        .update({
          has_messages: true,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", matchId);
    } catch (e: any) {
      console.error("Send error:", e);
      setErr(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  const otherAvatar = useMemo(
    () => photoSrc(otherProfile?.photo1_url ?? null),
    [otherProfile?.photo1_url]
  );

  return (
    <main className="min-h-[100dvh] bg-black text-white">
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
    </main>
  );
}