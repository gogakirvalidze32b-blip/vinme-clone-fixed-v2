"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";

type MsgRow = {
  id: string;
  match_id: string | null;
  from_anon: string;
  to_anon: string;
  text: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  a_anon: string;
  b_anon: string;
  created_at: string;
};

type ProfileRow = {
  anon_id: string;
  nickname: string;
  photo1_url: string | null;
};

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string>("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [profilesByAnon, setProfilesByAnon] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    const a = getOrCreateAnonId();
    setMeId(a);

    (async () => {
      setLoading(true);

      // 1) try load matches (optional table)
      const { data: mData } = await supabase
        .from("matches")
        .select("id,a_anon,b_anon,created_at")
        .or(`a_anon.eq.${a},b_anon.eq.${a}`)
        .order("created_at", { ascending: false })
        .limit(30);

      setMatches((mData as any) ?? []);

      // 2) try load recent messages (optional table)
      const { data: msgData } = await supabase
        .from("messages")
        .select("id,match_id,from_anon,to_anon,text,created_at")
        .or(`from_anon.eq.${a},to_anon.eq.${a}`)
        .order("created_at", { ascending: false })
        .limit(50);

      setMessages((msgData as any) ?? []);

      // 3) collect other anon_ids to show avatars
      const otherIds = new Set<string>();
      (mData as any)?.forEach((m: MatchRow) => {
        otherIds.add(m.a_anon === a ? m.b_anon : m.a_anon);
      });
      (msgData as any)?.forEach((m: MsgRow) => {
        otherIds.add(m.from_anon === a ? m.to_anon : m.from_anon);
      });

      const ids = Array.from(otherIds).filter(Boolean);
      if (ids.length) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("anon_id,nickname,photo1_url")
          .in("anon_id", ids);

        const map: Record<string, ProfileRow> = {};
        (pData as any)?.forEach((p: ProfileRow) => (map[p.anon_id] = p));
        setProfilesByAnon(map);
      }

      setLoading(false);
    })();
  }, []);

  const filteredMessages = useMemo(() => {
    if (!q.trim()) return messages;
    const needle = q.toLowerCase();
    return messages.filter((m) => {
      const other = m.from_anon === meId ? m.to_anon : m.from_anon;
      const name = profilesByAnon[other]?.nickname ?? "";
      return name.toLowerCase().includes(needle) || m.text.toLowerCase().includes(needle);
    });
  }, [q, messages, meId, profilesByAnon]);

  return (
    <main className="min-h-[100svh] bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-5 pb-28">
        {/* Search */}
        <div className="flex items-center gap-3 text-white/85">
          <span className="text-xl">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${matches.length} Matches`}
            className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-white/45"
          />
        </div>

        <div className="mt-4 h-px w-full bg-white/10" />

        {/* New matches */}
        <h2 className="mt-6 text-2xl font-extrabold">New Matches</h2>

        {loading ? (
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 w-20 rounded-2xl bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            <LikeTile />
            {matches.slice(0, 12).map((m) => {
              const other = m.a_anon === meId ? m.b_anon : m.a_anon;
              const p = profilesByAnon[other];
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    // TODO: როცა chat/[matchId] მზად იქნება
                    // window.location.href = `/chat/${m.id}`;
                  }}
                  className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
                  title={p?.nickname ?? "Match"}
                >
                  {p?.photo1_url ? (
                    <img src={p.photo1_url} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full bg-zinc-800/40" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Messages */}
        <h2 className="mt-7 text-2xl font-extrabold">Messages</h2>

        <div className="mt-2">
          {loading ? (
            <div className="space-y-4 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/10 animate-pulse" />
              ))}
            </div>
          ) : filteredMessages.length === 0 ? (
            <p className="mt-4 text-white/60">No messages yet 😅</p>
          ) : (
            <div className="mt-4 space-y-5">
              {filteredMessages.slice(0, 20).map((m) => {
                const other = m.from_anon === meId ? m.to_anon : m.from_anon;
                const p = profilesByAnon[other];
                return (
                  <button
                    key={m.id}
                    className="flex w-full items-center gap-4 text-left"
                    onClick={() => {
                      // TODO: window.location.href = `/chat/${m.match_id ?? other}`;
                    }}
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                      {p?.photo1_url ? (
                        <img src={p.photo1_url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full bg-zinc-800/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xl font-extrabold">{p?.nickname ?? "Unknown"}</div>
                      <div className="mt-0.5 text-white/65 line-clamp-1">
                        ↩ {m.text}
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
