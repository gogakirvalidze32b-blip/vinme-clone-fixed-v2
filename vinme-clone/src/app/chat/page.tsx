"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getOrCreateAnonId } from "@/lib/guest";

type MatchRow = {
  id: number; // bigint
  user_a: string; // uuid
  user_b: string; // uuid
  has_unread: boolean;
  last_message_at: string | null;
  topic?: string | null;
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
  sender_anon: string; // ✅ DB column
  content: string;
  created_at: string;
  read_at: string | null;
};

export default function MessagesPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, ProfileRow>>({});
  const [latestByMatch, setLatestByMatch] = useState<Record<number, MsgRow>>({});

  // ✅ auth + anon
  useEffect(() => {
    let alive = true;

    (async () => {
      const a = getOrCreateAnonId();
      if (alive) setMyAnonId(a);

      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;

      if (error) {
        console.error("auth.getUser error:", error);
        setUid(null);
        return;
      }

      const id = data.user?.id ?? null;
      setUid(id);

      if (!id) window.location.href = "/login";
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ load matches + profiles + latest messages
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const { data: matchData, error: matchErr } = await supabase
          .from("matches")
          .select("id, user_a, user_b, has_unread, last_message_at, topic")
          .or(`user_a.eq.${uid},user_b.eq.${uid}`)
          .order("last_message_at", { ascending: false });

        if (matchErr) {
          console.error("Match load error:", matchErr);
          return;
        }

        const ms = (matchData ?? []) as MatchRow[];
        if (!cancelled) setMatches(ms);

        // ✅ other user ids
        const otherUserIds = Array.from(
          new Set(ms.map((m) => (m.user_a === uid ? m.user_b : m.user_a)).filter(Boolean))
        ) as string[];

        // ✅ load profiles for those users
        if (otherUserIds.length) {
          const { data: pData, error: pErr } = await supabase
            .from("profiles")
            .select("user_id, anon_id, nickname, photo1_url")
            .in("user_id", otherUserIds);

          if (pErr) console.error("Profiles load error:", pErr);

          const map: Record<string, ProfileRow> = {};
          (pData as ProfileRow[] | null)?.forEach((p) => {
            map[p.user_id] = p;
          });

          if (!cancelled) setProfilesByUser(map);
        } else {
          if (!cancelled) setProfilesByUser({});
        }

        // ✅ load latest message per match (simple + safe)
        if (ms.length) {
          const matchIds = ms.map((m) => m.id);

          const { data: msgData, error: msgErr } = await supabase
            .from("messages")
            .select("id, match_id, sender_anon, content, created_at, read_at")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false });

          if (msgErr) {
            console.error("Latest messages load error:", msgErr);
          } else {
            const latest: Record<number, MsgRow> = {};
            (msgData as MsgRow[] | null)?.forEach((row) => {
              // because ordered desc, first one per match_id wins
              if (latest[row.match_id] == null) latest[row.match_id] = row;
            });
            if (!cancelled) setLatestByMatch(latest);
          }
        } else {
          if (!cancelled) setLatestByMatch({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const filteredMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return matches;

    return matches.filter((m) => {
      const otherId = m.user_a === uid ? m.user_b : m.user_a;
      const p = profilesByUser[otherId];
      const name = (p?.nickname ?? "").toLowerCase();
      const topic = (m.topic ?? "").toLowerCase();
      return name.includes(query) || topic.includes(query);
    });
  }, [q, matches, profilesByUser, uid]);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold">Chats</h1>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-40 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none"
          />
        </div>

        {/* Matches row */}
        <div className="mt-5">
          <div className="text-sm font-semibold text-white/70">Matches</div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            <LikeTile />

            {matches.slice(0, 12).map((m) => {
              const otherId = m.user_a === uid ? m.user_b : m.user_a;
              const p = profilesByUser[otherId];
              const avatar = photoSrc(p?.photo1_url ?? null);

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.push(`/chat/${m.id}`)}
                  className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
                  title={p?.nickname ?? "Match"}
                >
                  {avatar ? (
                    <img src={avatar} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full bg-zinc-800/40" />
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs font-semibold">
                    {p?.nickname ?? "Match"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <h2 className="mt-7 text-2xl font-extrabold">Messages</h2>

        <div className="mt-2">
          {loading ? (
            <div className="mt-3 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <p className="mt-4 text-white/60">No chats yet 😅</p>
          ) : (
            <div className="mt-4 space-y-5">
              {filteredMatches.slice(0, 30).map((m) => {
                const otherId = m.user_a === uid ? m.user_b : m.user_a;
                const p = profilesByUser[otherId];
                const last = latestByMatch[m.id];
                const avatar = photoSrc(p?.photo1_url ?? null);

                return (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full items-center gap-4 text-left"
                    onClick={() => router.push(`/chat/${m.id}`)}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                      {avatar ? (
                        <img src={avatar} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full bg-zinc-800/40" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="text-xl font-extrabold">{p?.nickname ?? "Unknown"}</div>

                      <div className="mt-0.5 text-white/65 line-clamp-1">
                        {last
                          ? last.sender_anon === myAnonId
                            ? `You: ${last.content}`
                            : last.content
                          : "No messages yet"}
                      </div>

                      <div className="mt-4 h-px w-full bg-white/10" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function LikeTile() {
  return (
    <button
      type="button"
      onClick={() => (window.location.href = "/likes")}
      className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#2a2620] ring-2 ring-amber-300/80"
      title="Likes"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/60" />
      <div className="absolute bottom-1 left-2 flex items-center gap-2 text-white">
        <span className="text-lg">💛</span>
        <span className="text-base font-extrabold">Likes</span>
      </div>
    </button>
  );
}
