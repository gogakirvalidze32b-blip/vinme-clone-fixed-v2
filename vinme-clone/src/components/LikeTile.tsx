"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
};

type ProfileRow = {
  user_id: string;
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

  const [uid, setUid] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, ProfileRow>>({});
  const [latestByMatch, setLatestByMatch] = useState<Record<number, MsgRow | null>>({});
  const [unreadByMatch, setUnreadByMatch] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  /* ================= INIT ================= */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) return;

        setUid(user.id);

        const { data: me } = await supabase
          .from("profiles")
          .select("anon_id")
          .eq("user_id", user.id)
          .single();

        setMyAnonId(me?.anon_id ?? null);

        const { data: mRows } = await supabase
          .from("matches")
          .select("id, user_a, user_b")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        setMatches((mRows as MatchRow[]) ?? []);

        const userIds = new Set<string>();
        (mRows ?? []).forEach((m: MatchRow) => {
          userIds.add(m.user_a);
          userIds.add(m.user_b);
        });

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nickname, photo1_url")
          .in("user_id", Array.from(userIds));

        const map: Record<string, ProfileRow> = {};
        (profiles ?? []).forEach((p: ProfileRow) => (map[p.user_id] = p));
        setProfilesByUser(map);

        // latest messages
        const latest: Record<number, MsgRow | null> = {};
        const unread: Record<number, number> = {};

        for (const m of mRows ?? []) {
          const { data: last } = await supabase
            .from("messages")
            .select("id, match_id, sender_anon, content, created_at, read_at")
            .eq("match_id", m.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          latest[m.id] = (last as MsgRow) ?? null;

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("match_id", m.id)
            .is("read_at", null)
            .neq("sender_anon", me?.anon_id ?? "");

          unread[m.id] = count ?? 0;
        }

        setLatestByMatch(latest);
        setUnreadByMatch(unread);
      } catch (e: any) {
        setErr(e?.message ?? "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ================= FILTER ================= */
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

  const bottomUnreadChats = useMemo(
    () => Object.values(unreadByMatch).filter((n) => n > 0).length,
    [unreadByMatch]
  );

  /* ================= UI ================= */
  return (
    <main className="h-[100dvh] bg-black text-white pb-28">
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
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {/* Messages */}
        <h2 className="mt-6 text-2xl font-extrabold">Messages</h2>

        <div className="mt-2">
          {loading ? (
            <div className="mt-3 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : filteredMatches.length === 0 ? (
            <p className="mt-4 text-white/60">No chats yet  </p>
          ) : (
            <div className="mt-4 space-y-5">
              {filteredMatches.map((m) => {
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
                      <div className="text-xl font-extrabold">
                        {p?.nickname ?? "Unknown"}
                      </div>

                      <div className="mt-0.5 text-white/65 line-clamp-1">
                        {last
                          ? last.sender_anon === myAnonId
                            ? `You: ${last.content}`
                            : last.content
                          : "No messages yet"}
                      </div>

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

