"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getOrCreateAnonId } from "@/lib/guest";
import BottomNav from "@/components/BottomNav";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
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

export default function MessagesPage() {
  const router = useRouter();
  const chRef = useRef<any>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, ProfileRow>>({});
  const [latestByMatch, setLatestByMatch] = useState<Record<number, MsgRow>>({});
  const [unreadByMatch, setUnreadByMatch] = useState<Record<number, number>>({});

  // --- auth + anon ---
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
        console.error("AUTH ERROR:", e);
        if (alive) setErr(e?.message ?? "Auth failed");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // --- initial load ---
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) matches
        const { data: matchData, error: matchErr } = await supabase
          .from("matches")
          .select("id, user_a, user_b, last_message_at")
          .or(`user_a.eq.${uid},user_b.eq.${uid}`)
          .order("last_message_at", { ascending: false });

        if (matchErr) throw matchErr;

        const ms = (matchData ?? []) as MatchRow[];
        if (cancelled) return;
        setMatches(ms);

        // 2) profiles
        const otherUserIds = Array.from(
          new Set(ms.map((m) => (m.user_a === uid ? m.user_b : m.user_a)).filter(Boolean))
        ) as string[];

        if (otherUserIds.length) {
          const { data: pData } = await supabase
            .from("profiles")
            .select("user_id, anon_id, nickname, photo1_url")
            .in("user_id", otherUserIds);

          const map: Record<string, ProfileRow> = {};
          (pData as ProfileRow[] | null)?.forEach((p) => (map[p.user_id] = p));
          if (!cancelled) setProfilesByUser(map);
        } else {
          if (!cancelled) setProfilesByUser({});
        }

        // 3) latest preview
        if (ms.length) {
          const matchIds = ms.map((m) => m.id);

          const { data: msgData } = await supabase
            .from("messages")
            .select("id, match_id, sender_anon, content, created_at, read_at")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false });

          const latest: Record<number, MsgRow> = {};
          (msgData as MsgRow[] | null)?.forEach((row) => {
            if (latest[row.match_id] == null) latest[row.match_id] = row;
          });
          if (!cancelled) setLatestByMatch(latest);

          // 4) unread counts (სწრაფი ვერსია: წამოვიღოთ მხოლოდ match_id list)
          if (myAnonId) {
            const { data: unreadRows } = await supabase
              .from("messages")
              .select("match_id")
              .in("match_id", matchIds)
              .neq("sender_anon", myAnonId)
              .is("read_at", null);

            const by: Record<number, number> = {};
            (unreadRows as any[] | null)?.forEach((r) => {
              const mid = Number(r.match_id);
              by[mid] = (by[mid] ?? 0) + 1;
            });
            if (!cancelled) setUnreadByMatch(by);
          }
        } else {
          if (!cancelled) {
            setLatestByMatch({});
            setUnreadByMatch({});
          }
        }
      } catch (e: any) {
        console.error("CHAT LIST INIT ERROR:", e);
        if (!cancelled) setErr(e?.message ?? "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, myAnonId]);

  // ✅ realtime: new messages => update UI WITHOUT refresh
  useEffect(() => {
  if (!uid || !myAnonId) return;

  const ch = supabase
    .channel(`realtime:chatlist:${uid}`)

    // ================= INSERT (ახალი მესიჯი) =================
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as any as MsgRow;
        const mid = Number(row.match_id);

        // 1) update latest preview
        setLatestByMatch((prev) => ({ ...prev, [mid]: row }));

        // 2) bump unread only if incoming
        if (row.sender_anon !== myAnonId) {
          setUnreadByMatch((prev) => ({
            ...prev,
            [mid]: (prev[mid] ?? 0) + 1,
          }));
        }

        // 3) reorder matches to top by last_message_at
        setMatches((prev) => {
          const idx = prev.findIndex((m) => m.id === mid);
          if (idx === -1) return prev;

          const updated = [...prev];
          const m = updated[idx];
          updated[idx] = { ...m, last_message_at: row.created_at };

          updated.sort((a, b) => {
            const ta = a.last_message_at
              ? new Date(a.last_message_at).getTime()
              : 0;
            const tb = b.last_message_at
              ? new Date(b.last_message_at).getTime()
              : 0;
            return tb - ta;
          });

          return updated;
        });
      }
    )

    // ================= UPDATE (read_at შეიცვალა) =================
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as any as MsgRow;
        const old = payload.old as any as MsgRow;
        const mid = Number(row.match_id);

        // თუ unread -> read გახდა და ეს მესიჯი ჩემთვის იყო
        if (
          old?.read_at == null &&
          row.read_at != null &&
          row.sender_anon !== myAnonId
        ) {
          setUnreadByMatch((prev) => {
            const cur = prev[mid] ?? 0;
            if (cur <= 1) {
              const { [mid]: _, ...rest } = prev;
              return rest;
            }
            return { ...prev, [mid]: cur - 1 };
          });
        }
      }
    )

    .subscribe();

  chRef.current = ch;

  return () => {
    if (chRef.current) {
      supabase.removeChannel(chRef.current);
      chRef.current = null;
    }
  };
}, [uid, myAnonId]);

  // bottom badge: how many chats have unread (>0)
  const bottomUnreadChats = useMemo(
    () => Object.values(unreadByMatch).filter((n) => n > 0).length,
    [unreadByMatch]
  );

  const filteredMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return matches;

    return matches.filter((m) => {
      const otherId = m.user_a === uid ? m.user_b : m.user_a;
      const p = profilesByUser[otherId];
      const name = (p?.nickname ?? "").toLowerCase();
      return name.includes(query);
    });
  }, [q, matches, profilesByUser, uid]);

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
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

        {err && (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        )}

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

                  {(unreadByMatch[m.id] ?? 0) > 0 && (
                    <div className="absolute top-2 right-2 h-5 min-w-[20px] rounded-full bg-pink-500 px-1 text-xs font-extrabold text-white flex items-center justify-center">
                      {unreadByMatch[m.id] > 99 ? "99+" : unreadByMatch[m.id]}
                    </div>
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
                const unread = unreadByMatch[m.id] ?? 0;

                return (
                  <button
                    key={m.id}
                    type="button"
                    className="relative flex w-full items-center gap-4 text-left"
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

                      {/* ✅ “რამდენჯერ მოგწერა” ტექსტითაც */}
                      {unread > 0 && (
                        <div className="mt-1 text-xs font-semibold text-pink-300">
                          {unread} new message{unread === 1 ? "" : "s"}
                        </div>
                      )}

                      <div className="mt-3 h-px w-full bg-white/10" />
                    </div>

                    {unread > 0 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-pink-500 px-2 py-1 text-xs font-extrabold text-white">
                        {unread > 99 ? "99+" : unread}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav chatBadge={bottomUnreadChats} />
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