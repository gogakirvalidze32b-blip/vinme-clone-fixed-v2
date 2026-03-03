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
  const matchId = Number((params as any)?.matchId);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // ✅ mark ALL incoming messages as read for this thread
  async function markThreadRead(inMatchId: number, meAnon: string) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", inMatchId)
      .is("read_at", null)
      .neq("sender_anon", meAnon);

    if (error) {
      console.log("markThreadRead error:", error.message);
    }

    // ✅ AppShell badge refresh (თუ იყენებ listener-ს)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("badge:refresh"));
    }
  }

  // ===== load initial =====
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!matchId || Number.isNaN(matchId)) {
          throw new Error("Bad match id");
        }

        const { data: session } = await supabase.auth.getSession();
        const user = session?.session?.user;
        if (!user) return;

        const uid = user.id;

        // ✅ Batch 1: fetch my anon_id + match row in parallel
        const [meRes, mRes] = await Promise.all([
          supabase.from("profiles").select("anon_id").eq("user_id", uid).maybeSingle(),
          supabase.from("matches").select("user_a, user_b").eq("id", matchId).maybeSingle(),
        ]);

        if (meRes.error) throw meRes.error;
        if (mRes.error) throw mRes.error;
        if (!mRes.data) throw new Error("Match not found");

        const anon = meRes.data?.anon_id ?? null;
        const otherId = mRes.data.user_a === uid ? mRes.data.user_b : mRes.data.user_a;

        if (!alive) return;
        setMyAnonId(anon);

        // ✅ Batch 2: fetch profile + messages + mark read all in parallel
        const [profileRes, messagesRes] = await Promise.all([
          supabase.from("profiles").select("nickname, photo1_url").eq("user_id", otherId).maybeSingle(),
          supabase.from("messages")
            .select("id, match_id, sender_anon, content, created_at, read_at")
            .eq("match_id", matchId)
            .order("created_at", { ascending: true }),
          anon ? markThreadRead(matchId, anon) : Promise.resolve(),
        ]);

        if (!alive) return;
        setOtherProfile(profileRes.data ?? null);
        setMsgs((messagesRes.data as MsgRow[]) ?? []);
      } catch (e: any) {
        console.error("CHAT LOAD ERROR:", e);
        if (alive) setErr(e?.message ?? "Load failed");
      } {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [matchId]);

  // ===== REALTIME =====
  useEffect(() => {
    if (!matchId || Number.isNaN(matchId)) return;
    if (!myAnonId) return;

    let alive = true;

    const ch = supabase
      .channel(`chat-${matchId}`)

      // ✅ INSERT (new message)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          if (!alive) return;
          const row = payload.new as MsgRow;

          setMsgs((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );

          // ✅ incoming => mark read immediately
          if (row.sender_anon !== myAnonId) {
            const { error } = await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id);

            if (error) console.log("mark single read error:", error.message);

            // refresh badge
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("badge:refresh"));
            }
          }
        }
      )

      // ✅ UPDATE (read_at sync)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
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
    if (!t || !myAnonId || !matchId || Number.isNaN(matchId)) return;

    setSending(true);
    setText("");
    setErr(null);

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
      const { data, error } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_anon: myAnonId, content: t })
        .select("id, match_id, sender_anon, content, created_at, read_at")
        .single();

      if (error) throw error;

      setMsgs((prev) =>
        prev.map((m) => (m.id === optimisticId ? (data as MsgRow) : m))
      );
    } catch (e: any) {
      setErr(e?.message ?? "Send failed");
    }  {
      setSending(false);
    }
  }

  const otherAvatar = useMemo(
    () => photoSrc(otherProfile?.photo1_url ?? null),
    [otherProfile?.photo1_url]
  );

  // ✅ GUARD: სანამ anonId არ მოვა, ჩატი არ დახატო (ერთნაირი UI ყველა chat-ზე)
  if (loading && !myAnonId) {
    return (
      <main className="min-h-[100dvh] bg-black text-white pb-28">
        <div className="mx-auto w-full max-w-md px-4 py-6 text-white/70">
          Loading…
        </div>
        <BottomNav chatBadge={0} />
      </main>
    );
  }

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
              {otherAvatar && (
                <img
                  src={otherAvatar}
                  className="h-full w-full object-cover"
                  alt=""
                />
              )}
            </div>
            <div className="text-lg font-bold">
              {otherProfile?.nickname ?? "Chat"}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-4 space-y-2 max-h-[65dvh] overflow-y-auto">
          {msgs.map((m) => {
            const mine = m.sender_anon === myAnonId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
                    mine
                      ? "bg-white text-black"
                      : "bg-black/40 ring-1 ring-white/10"
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