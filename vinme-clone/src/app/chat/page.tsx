"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

type Profile = {
  user_id: string;
  nickname: string | null;
  first_name: string | null;
  photo1_url: string | null;
};

type Match = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  _unreadCount: number;
  _hasMessages: boolean;
  last_message: string | null;
  last_message_time: string | null;
  other: Profile;
};

export default function ChatPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);

  async function loadMatches(uid: string, anonId: string | null) {
    const { data: rows } = await supabase
      .from("matches")
      .select("*")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (!rows) { setLoading(false); return; }

    const otherIds = rows.map((r: any) => r.user_a === uid ? r.user_b : r.user_a);
    const { data: profiles } = await supabase
      .from("profiles").select("user_id,nickname,first_name,photo1_url").in("user_id", otherIds);

    const profileMap = new Map<string, Profile>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

    const result: Match[] = [];

    for (const row of rows) {
      const otherId = row.user_a === uid ? row.user_b : row.user_a;
      const profile = profileMap.get(otherId);
      if (!profile) continue;

      const { data: lastMsg } = await supabase
        .from("messages").select("content,created_at,type")
        .eq("match_id", row.id)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();

      let unreadCount = 0;
      if (anonId) {
        const { count } = await supabase
          .from("messages").select("id", { count: "exact", head: true })
          .eq("match_id", row.id).neq("sender_anon", anonId).is("read_at", null);
        unreadCount = count ?? 0;
      }

      result.push({
        ...row,
        _unreadCount: unreadCount,
        _hasMessages: !!lastMsg,
        last_message: lastMsg?.type === "voice" ? "🎤 Voice message" : (lastMsg?.content ?? null),
        last_message_time: lastMsg?.created_at ?? null,
        other: profile,
      });
    }

    setMatches(result);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { router.replace("/login"); return; }
      setMyId(uid);
      const { data: me } = await supabase.from("profiles").select("anon_id").eq("user_id", uid).maybeSingle();
      const anonId = me?.anon_id ?? null;
      setMyAnonId(anonId);
      await loadMatches(uid, anonId);
    })();
  }, [router]);

  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel("chat-list-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        () => { if (myId) loadMatches(myId, myAnonId); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" },
        () => { if (myId) loadMatches(myId, myAnonId); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, myAnonId]);

  // ✅ matches without messages → strip (ზემოთ)
  const newMatches = matches.filter((m) => !m._hasMessages);
  // ✅ matches with messages → list (ქვემოთ), sorted by last message time
  const conversations = matches
    .filter((m) => m._hasMessages)
    .sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  );

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">

        {/* HEADER */}
        <h1 className="text-2xl font-extrabold mb-5">Messages</h1>

        {/* ✅ NEW MATCHES STRIP — მხოლოდ ვისაც ჯერ არ უწერია */}
        {newMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">New Matches</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {newMatches.map((m) => {
                const name = m.other.nickname ?? m.other.first_name ?? "User";
                return (
                  <div key={m.id} className="flex flex-col items-center min-w-[68px] cursor-pointer shrink-0"
                    onClick={() => router.push(`/chat/${m.id}`)}>
                    <div className="relative">
                      <img src={photoSrc(m.other.photo1_url)} alt=""
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-500/70" />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-black" />
                    </div>
                    <span className="text-[11px] mt-1.5 text-white/70 truncate w-16 text-center">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ✅ MESSAGES LIST — მხოლოდ ვისაც უკვე მიეწერა */}
        {conversations.length > 0 && (
          <div>
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">Messages</h2>
            <div className="flex flex-col gap-1">
              {conversations.map((m) => {
                const name = m.other.nickname ?? m.other.first_name ?? "User";
                return (
                  <div key={m.id} onClick={() => router.push(`/chat/${m.id}`)}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 active:bg-white/8 cursor-pointer transition">
                    <div className="relative shrink-0">
                      <img src={photoSrc(m.other.photo1_url)} alt=""
                        className="w-14 h-14 rounded-full object-cover" />
                      {m._unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-pink-500 px-1 text-[11px] font-bold text-white text-center leading-[18px]">
                          {m._unreadCount > 9 ? "9+" : m._unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${m._unreadCount > 0 ? "text-white" : "text-white/80"}`}>{name}</div>
                      <div className={`text-xs truncate mt-0.5 ${m._unreadCount > 0 ? "text-white/70 font-medium" : "text-white/35"}`}>
                        {m.last_message}
                      </div>
                    </div>
                    {m.last_message_time && (
                      <div className="text-[10px] text-white/30 shrink-0">
                        {new Date(m.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPTY */}
        {matches.length === 0 && (
          <div className="text-center text-white/40 mt-24">
            <div className="text-5xl mb-4">💬</div>
            <div className="font-semibold text-white/60">No matches yet</div>
            <div className="text-sm mt-1">Start swiping to get matches!</div>
            <button onClick={() => router.push("/feed")}
              className="mt-5 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white">
              Find Matches →
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
