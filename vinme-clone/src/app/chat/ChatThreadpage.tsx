"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

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
  const params = useParams();
  const matchId = Number(params.matchId);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ===== load initial =====
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const uid = session.session.user.id;

      const { data: me } = await supabase
        .from("profiles")
        .select("anon_id")
        .eq("user_id", uid)
        .single();

      setMyAnonId(me?.anon_id ?? null);

      const { data: mRow } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .single();

      const otherId = mRow?.user_a === uid ? mRow.user_b : mRow?.user_a;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, photo1_url")
        .eq("user_id", otherId)
        .single();

      setOtherProfile(profile);

      const { data: messages } = await supabase
        .from("messages")
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      setMsgs((messages as MsgRow[]) ?? []);
      setLoading(false);
    })();
  }, [matchId]);

  // ===== REALTIME =====
  useEffect(() => {
    if (!matchId || !myAnonId) return;

    let alive = true;

    const ch = supabase
      .channel(`chat-${matchId}`)

      // ✅ INSERT (ახალი მესიჯი)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async (payload) => {
          if (!alive) return;
          const row = payload.new as MsgRow;

          setMsgs((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );

          // თუ შემომავალია → მყისიერად mark read
          if (row.sender_anon !== myAnonId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id);
          }
        }
      )

      // ✅ UPDATE (read_at / badge sync)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (!alive) return;
          const row = payload.new as MsgRow;

          setMsgs((prev) => {
            const i = prev.findIndex((m) => m.id === row.id);
            if (i === -1) return prev;
            const copy = [...prev];
            copy[i] = { ...copy[i], ...row };
            return copy;
          });
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

  // ===== SEND =====
  async function send() {
    const t = text.trim();
    if (!t || !myAnonId) return;

    setSending(true);
    setText("");

    const optimisticId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();

    setMsgs((prev) => [
      ...prev,
      {
        id: optimisticId,
        match_id: matchId,
        sender_anon: myAnonId,
        content: t,
        created_at: now,
        read_at: null,
      },
    ]);

    try {
      const { data } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_anon: myAnonId, content: t })
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .single();

      setMsgs((prev) =>
        prev.map((m) => (m.id === optimisticId ? (data as MsgRow) : m))
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  }

  const otherAvatar = useMemo(
    () => photoSrc(otherProfile?.photo1_url ?? null),
    [otherProfile?.photo1_url]
  );

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chat")}
            className="rounded-full bg-white/10 px-3 py-2 text-sm"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10">
              {otherAvatar && <img src={otherAvatar} className="h-full w-full object-cover" />}
            </div>
            <div className="text-lg font-bold">
              {otherProfile?.nickname ?? "Chat"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 max-h-[65dvh] overflow-y-auto">
          {msgs.map((m) => {
            const mine = m.sender_anon === myAnonId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
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

        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 rounded-2xl bg-black/40 border border-white/10 px-4 py-3"
          />
          <button
            onClick={send}
            disabled={sending}
            className="rounded-2xl bg-white px-4 py-3 text-black font-bold"
          >
            Send
          </button>
        </div>
      </div>

      <BottomNav chatBadge={0} />
    </main>
  );
}