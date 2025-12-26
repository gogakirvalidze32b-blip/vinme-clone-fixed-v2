"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";


type MatchRow = {
  id: number; // bigint
  user_a: string; // uuid
  user_b: string; // uuid
  created_at: string;
};

type MsgRow = {
  id: string; // uuid
  match_id: number; // bigint
  sender_anon: string; // text
  content: string; // text
  created_at: string;
  read_at: string | null;
};

type ProfileRow = {
  user_id: string; // uuid
  anon_id: string; // text
  nickname: string;
  photo1_url: string | null;
};

export default function ChatPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [meUserId, setMeUserId] = useState<string>("");
  const [myAnon, setMyAnon] = useState<string>("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [latestByMatch, setLatestByMatch] = useState<Record<number, MsgRow>>({});
  const [profilesByUser, setProfilesByUser] = useState<Record<string, ProfileRow>>({});
  const [matchedUser, setMatchedUser] = useState<any>(null);


  useEffect(() => {
    (async () => {
      setLoading(true);

      // 0) auth user
      const { data: udata } = await supabase.auth.getUser();
      const u = udata.user;
      if (!u) {
        setLoading(false);
        return;
      }
      setMeUserId(u.id);

      // 0.1) my profile -> anon_id
      const { data: meProf, error: meProfErr } = await supabase
        .from("profiles")
.select("user_id, anon_id, nickname, photo_url, photo1_url")
        .eq("user_id", u.id)
        .maybeSingle();

      if (meProfErr) console.error("Me profile load error:", meProfErr);
      if (meProf?.anon_id) setMyAnon(meProf.anon_id);

      // 1) load matches
      const { data: mData, error: mErr } = await supabase
        .from("matches")
        .select("id,user_a,user_b,created_at")
        .or(`user_a.eq.${u.id},user_b.eq.${u.id}`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (mErr) console.error("Matches load error:", mErr);
      const ms = ((mData as any) ?? []) as MatchRow[];
      setMatches(ms);

      // 2) load latest messages for these matches (for history preview)
      const matchIds = ms.map((m) => m.id);
      if (matchIds.length) {
        const { data: msgData, error: msgErr } = await supabase
          .from("messages")
          .select("id,match_id,sender_anon,content,created_at,read_at")
          .in("match_id", matchIds)
          .order("created_at", { ascending: false })
          .limit(200);

        if (msgErr) console.error("Messages load error:", msgErr);

        const latest: Record<number, MsgRow> = {};
        (msgData as any)?.forEach((m: MsgRow) => {
          // since sorted desc, first encountered per match is latest
          if (!latest[m.match_id]) latest[m.match_id] = m;
        });
        setLatestByMatch(latest);
      }

      // 3) load other users' profiles for avatars
      const otherUserIds = Array.from(
        new Set(
          ms.map((m) => (m.user_a === u.id ? m.user_b : m.user_a)).filter(Boolean)
        )
      );

      if (otherUserIds.length) {
        const { data: pData, error: pErr } = await supabase
          .from("profiles")
          .select("user_id,anon_id,nickname,photo1_url")
          .in("user_id", otherUserIds);

        if (pErr) console.error("Profiles load error:", pErr);

        const map: Record<string, ProfileRow> = {};
        (pData as any)?.forEach((p: ProfileRow) => (map[p.user_id] = p));
        setProfilesByUser(map);
      }

      setLoading(false);
    })();
  }, []);

  const filteredMatches = useMemo(() => {
    if (!q.trim()) return matches;
    const needle = q.toLowerCase();

    return matches.filter((m) => {
      const otherId = m.user_a === meUserId ? m.user_b : m.user_a;
      const p = profilesByUser[otherId];
      const name = (p?.nickname ?? "").toLowerCase();
      const last = (latestByMatch[m.id]?.content ?? "").toLowerCase();
      return name.includes(needle) || last.includes(needle);
    });
  }, [q, matches, meUserId, profilesByUser, latestByMatch]);

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
              const otherId = m.user_a === meUserId ? m.user_b : m.user_a;
              const p = profilesByUser[otherId];

              return (
                <button
                  key={m.id}
                  onClick={() => router.push(`/chat/${m.id}`)}
                  className="relative h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
                  title={p?.nickname ?? "Match"}
                >
           {(() => {
  const avatar = photoSrc(p?.photo1_url ?? p?.photo1_url ?? null);

  return avatar ? (
    <img
      src={avatar}
      className="h-full w-full object-cover"
      alt=""
    />
  ) : (
    <div className="h-full w-full bg-zinc-800/40" />
  );
})()}

                  {/* tiny name strip */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-xs font-semibold">
                    {p?.nickname ?? "Match"}
                  </div>
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
          ) : filteredMatches.length === 0 ? (
            <p className="mt-4 text-white/60">No chats yet 😅</p>
          ) : (
            <div className="mt-4 space-y-5">
              {filteredMatches.slice(0, 30).map((m) => {
                const otherId = m.user_a === meUserId ? m.user_b : m.user_a;
                const p = profilesByUser[otherId];
                const last = latestByMatch[m.id];

                return (
                  <button
                    key={m.id}
                    className="flex w-full items-center gap-4 text-left"
                    onClick={() => router.push(`/chat/${m.id}`)}
                  >
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
  {(() => {
    const avatar = photoSrc(p?.photo1_url ?? p?.photo1_url ?? null);

    return avatar ? (
      <img
        src={avatar}
        className="h-full w-full object-cover"
        alt=""
      />
    ) : (
      <div className="h-full w-full bg-zinc-800/40" />
    );
  })()}
</div>
                    <div className="flex-1">
                      <div className="text-xl font-extrabold">
                        {p?.nickname ?? "Unknown"}
                      </div>

                      <div className="mt-0.5 text-white/65 line-clamp-1">
                        {last ? (last.sender_anon === myAnon ? "You: " : "") + last.content : "No messages yet"}
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
