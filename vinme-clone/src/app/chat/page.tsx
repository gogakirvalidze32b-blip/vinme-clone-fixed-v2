"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

type Profile = { user_id: string; nickname: string | null; first_name: string | null; photo1_url: string | null; last_seen?: string | null; };

type Match = {
  id: string; user_a: string; user_b: string; created_at: string;
  _unreadCount: number; _hasMessages: boolean;
  last_message: string | null; last_message_time: string | null; last_sender_anon: string | null;
  other: Profile;
};

function relativeTime(iso: string | null, ka: boolean): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return ka ? "ახლახან" : "now";
  if (mins < 60) return ka ? `${mins}წთ` : `${mins}m`;
  if (hours < 24) return ka ? `${hours}სთ` : `${hours}h`;
  return ka ? `${days}დღ` : `${days}d`;
}

function onlineText(lastSeen: string | null, ka: boolean): string | null {
  if (!lastSeen) return null;
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 3 * 60 * 1000) return ka ? "ონლაინ" : "Online";
  return null;
}

export default function ChatPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
  const L = (k: string, e: string) => ka ? k : e;

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string|null>(null);
  const longPressRef = useRef<NodeJS.Timeout|null>(null);

  async function deleteMatch(matchId: string) {
    await supabase.from("matches").delete().eq("id", matchId);
    setMatches(prev => prev.filter(m => m.id !== matchId));
    setSelectedMatchId(null);
  }

  async function loadMatches(uid: string, anonId: string | null) {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const { data: rows } = await supabase
      .from("matches").select("*")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (!rows) { setLoading(false); loadingRef.current = false; return; }

    const otherIds = rows.map((r: any) => r.user_a === uid ? r.user_b : r.user_a);
    if (!otherIds.length) { setMatches([]); setLoading(false); loadingRef.current = false; return; }

    const { data: profiles } = await supabase
      .from("profiles").select("user_id,nickname,first_name,photo1_url,last_seen").in("user_id", otherIds);

    const profileMap = new Map<string, Profile>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

    const result: Match[] = [];

    for (const row of rows) {
      const otherId = row.user_a === uid ? row.user_b : row.user_a;
      const profile = profileMap.get(otherId);
      if (!profile) continue;

      // last message
      const { data: lastMsg } = await supabase
        .from("messages").select("content,created_at,type,sender_anon")
        .eq("match_id", row.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      // ✅ unread = messages FROM other person, not read
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
        last_message: lastMsg?.type === "voice" ? (ka ? "🎤 ხმოვანი" : "🎤 Voice") : (lastMsg?.content ?? null),
        last_message_time: lastMsg?.created_at ?? null,
        last_sender_anon: lastMsg?.sender_anon ?? null,
        other: profile,
      });
    }

    setMatches(result);
    setLoading(false);
    loadingRef.current = false;
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

  // ✅ realtime — unread badge updates instantly
  useEffect(() => {
    if (!myId) return;
    const ch = supabase.channel(`chat-list-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        if (myId && myAnonId) loadMatches(myId, myAnonId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        if (myId && myAnonId) loadMatches(myId, myAnonId);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, () => {
        if (myId && myAnonId) loadMatches(myId, myAnonId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, myAnonId]);

  const newMatches = matches.filter(m => !m._hasMessages);
  const conversations = matches
    .filter(m => m._hasMessages)
    .sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

  const totalUnread = matches.reduce((s, m) => s + m._unreadCount, 0);

  if (loading) return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <div className="h-8 w-32 bg-white/10 rounded-xl animate-pulse mb-6" />
        <div className="h-3 w-24 bg-white/8 rounded animate-pulse mb-3" />
        <div className="flex gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
            <div className="w-12 h-2 bg-white/8 rounded animate-pulse" />
          </div>)}
        </div>
        <div className="h-3 w-20 bg-white/8 rounded animate-pulse mb-3" />
        {[1,2,3].map(i => <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-2.5 w-48 bg-white/8 rounded animate-pulse" />
          </div>
        </div>)}
      </div>
      <BottomNav />
    </main>
  );

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold">{L("ჩათი", "Messages")}</h1>
          {totalUnread > 0 && (
            <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white">
              {totalUnread > 99 ? "99+" : totalUnread} {L("ახალი", "new")}
            </span>
          )}
        </div>

        {/* NEW MATCHES STRIP */}
        {newMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">{L("ახალი შეხვედრები", "New Matches")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {newMatches.map(m => {
                const name = m.other.nickname ?? m.other.first_name ?? "User";
                const isOnline = !!onlineText(m.other.last_seen ?? null, ka);
                return (
                  <div key={m.id} className="flex flex-col items-center min-w-[68px] cursor-pointer shrink-0"
                    onClick={() => router.push(`/chat/${m.id}`)}>
                    <div className="relative">
                      {photoSrc(m.other.photo1_url)
                        ? <img src={photoSrc(m.other.photo1_url)} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-500/70"
                            onError={e => { const t = e.target as HTMLImageElement; t.onerror=null; t.src=""; t.className=""; t.style.display="none"; }} />
                        : <div className="w-16 h-16 rounded-full bg-zinc-700 ring-2 ring-pink-500/70 flex items-center justify-center text-2xl">👤</div>}
                      {isOnline && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-black" />}
                    </div>
                    <span className="text-[11px] mt-1.5 text-white/70 truncate w-16 text-center">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONVERSATIONS */}
        {conversations.length > 0 && (
          <div>
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">{L("მიმოწერა", "Messages")}</h2>
            <div className="flex flex-col gap-0.5" style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" }}>
              {conversations.map(m => {
                const name = m.other.nickname ?? m.other.first_name ?? "User";
                const isOnline = !!onlineText(m.other.last_seen ?? null, ka);
                const isMine = m.last_sender_anon && m.last_sender_anon === myAnonId;
                return (
                  <div key={m.id}
                    onClick={() => { if (!selectedMatchId) router.push(`/chat/${m.id}`); else setSelectedMatchId(null); }}
                    onPointerDown={() => { longPressRef.current = setTimeout(() => setSelectedMatchId(m.id), 500); }}
                    onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
                    onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
                    onContextMenu={e => e.preventDefault()}
                    style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" }}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer transition ${selectedMatchId === m.id ? "bg-white/8 ring-1 ring-red-500/40" : "hover:bg-white/5 active:bg-white/8"}`}>
                    {selectedMatchId === m.id && (
                      <button onClick={e => { e.stopPropagation(); deleteMatch(m.id); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-red-500 rounded-full px-3 py-1.5 text-white text-xs font-bold z-10 shadow-lg">
                        🗑 {ka ? "წაშლა" : "Delete"}
                      </button>
                    )}
                    <div className="relative shrink-0">
                      {photoSrc(m.other.photo1_url)
                      ? <img src={photoSrc(m.other.photo1_url)} alt="" className="w-14 h-14 rounded-full object-cover"
                          onError={e => { const t = e.target as HTMLImageElement; t.style.display="none"; t.parentElement && (t.parentElement.innerHTML = "<div class=\"w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center text-xl\">👤</div>"); }} />
                      : <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center text-xl">👤</div>}
                      {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-black" />}
                      {m._unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-pink-500 px-1 text-[10px] font-black text-white text-center leading-[18px]">
                          {m._unreadCount > 9 ? "9+" : m._unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${m._unreadCount > 0 ? "text-white" : "text-white/80"}`}>{name}</div>
                      <div className={`text-xs truncate mt-0.5 ${m._unreadCount > 0 ? "text-white/70 font-medium" : "text-white/35"}`}>
                        {isMine ? (ka ? "შენ: " : "You: ") : ""}{m.last_message}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-white/30">{relativeTime(m.last_message_time, ka)}</span>
                      {isOnline && <span className="text-[9px] text-green-400">{ka ? "ონლაინ" : "online"}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISMISS OVERLAY */}
        {selectedMatchId && (
          <div className="fixed inset-0 z-30" onClick={() => setSelectedMatchId(null)} />
        )}

        {/* EMPTY */}
        {matches.length === 0 && (
          <div className="text-center text-white/40 mt-24">
            <div className="text-5xl mb-4">💬</div>
            <div className="font-semibold text-white/60">{L("შეხვედრა ჯერ არ არის", "No matches yet")}</div>
            <div className="text-sm mt-1">{L("დაიწყე სვაიპი!", "Start swiping to get matches!")}</div>
            <button onClick={() => router.push("/feed")}
              className="mt-5 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white">
              {L("შეხვედრის პოვნა →", "Find Matches →")}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
