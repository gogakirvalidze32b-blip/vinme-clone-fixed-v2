"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";
import { useUser } from "@/lib/userContext";
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

  const[notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { anonId: ctxAnonId } = useUser();
  const[ctxReady, setCtxReady] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const[selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 ტრიუკი 1: შემოსვლისთანავე, წამიერად ვაჩვენებთ დამახსოვრებულ სიას
  useEffect(() => {
    try {
      const cachedMatches = localStorage.getItem("chat_list_cache");
      if (cachedMatches) {
        setMatches(JSON.parse(cachedMatches));
        setLoading(false); // ლოუდერს ეგრევე ვთიშავთ!
      }
    } catch (e) {
      console.error("Cache error", e);
    }
  },[]);

  useEffect(() => {
    if (ctxAnonId !== null && !ctxReady) setCtxReady(true);
  },[ctxAnonId]);

  async function deleteMatch(matchId: string) {
    await supabase.from("matches").delete().eq("id", matchId);
    setMatches(prev => {
      const updated = prev.filter(m => m.id !== matchId);
      localStorage.setItem("chat_list_cache", JSON.stringify(updated)); // წაშლისასაც ვაახლებთ ქეშს
      return updated;
    });
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
    if (!otherIds.length) { 
      setMatches([]); 
      localStorage.removeItem("chat_list_cache");
      setLoading(false); 
      loadingRef.current = false; 
      return; 
    }

    const matchIds = rows.map((r: any) => r.id);

    const [profilesRes, msgsRes] = await Promise.all([
      supabase.from("profiles").select("user_id,nickname,first_name,photo1_url,last_seen").in("user_id", otherIds),
      supabase.from("messages")
        .select("id,match_id,content,created_at,type,sender_anon,read_at")
        .in("match_id", matchIds)
        .order("created_at", { ascending: false }),
    ]);

    const profileMap = new Map<string, Profile>();
    (profilesRes.data ??[]).forEach((p: any) => profileMap.set(p.user_id, p));

    const allMsgs = msgsRes.data;
    const lastMsgMap = new Map<string, any>();
    const unreadMap = new Map<string, number>();

    for (const msg of (allMsgs ??[])) {
      if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg);
      if (anonId && msg.sender_anon !== anonId) {
        if (!unreadMap.has(msg.match_id)) {
          unreadMap.set(msg.match_id, !msg.read_at ? 1 : 0);
        }
      }
    }

    const result: Match[] =[];
    for (const row of rows) {
      const otherId = row.user_a === uid ? row.user_b : row.user_a;
      const profile = profileMap.get(otherId);
      if (!profile) continue;
      const lastMsg = lastMsgMap.get(row.id);
      const unreadCount = unreadMap.get(row.id) ?? 0;
      result.push({
        ...row,
        _unreadCount: unreadCount,
        _hasMessages: !!lastMsg,
        last_message: lastMsg?.type === "voice"
          ? (ka ? "🎤 ხმოვანი" : "🎤 Voice")
          : lastMsg?.type === "image"
          ? (ka ? "📷 ფოტო" : "📷 Photo")
          : (lastMsg?.content ?? null),
        last_message_time: lastMsg?.created_at ?? null,
        last_sender_anon: lastMsg?.sender_anon ?? null,
        other: profile,
      });
    }

    // 💾 ტრიუკი 2: ვაახლებთ სიას და ვინახავთ ლოკალურად მომავალი შემოსვლისთვის
    setMatches(result);
    try {
      localStorage.setItem("chat_list_cache", JSON.stringify(result));
    } catch(e) {}
    
    setLoading(false);
    loadingRef.current = false;
  }

  useEffect(() => {
    if (!ctxReady) return;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { router.replace("/login"); return; }
      setMyId(uid);
      setMyAnonId(ctxAnonId);
      
      // ეს გაეშვება უკანა ფონზე და ჩუმად განაახლებს ბაზიდან მონაცემებს
      await loadMatches(uid, ctxAnonId);

      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid)
        .neq("read", true)
        .order("created_at", { ascending: false });

      const fromUserIds = (notifs ??[]).map((n: any) => n.from_user).filter(Boolean);
      const fromProfileMap: Record<string, {name: string, photo: string|null}> = {};
      if (fromUserIds.length > 0) {
        const { data: fps } = await supabase
          .from("profiles")
          .select("user_id, first_name, nickname, photo1_url")
          .in("user_id", fromUserIds);
        (fps ?? []).forEach((p: any) => {
          fromProfileMap[p.user_id] = {
            name: p.first_name ?? p.nickname ?? "ვინმე",
            photo: p.photo1_url ?? null
          };
        });
      }

      setNotifications((notifs ??[]).map((n: any) => ({
        ...n,
        from_name: fromProfileMap[n.from_user]?.name ?? "ვინმე",
        from_photo: fromProfileMap[n.from_user]?.photo ?? null
      })));
    })();
  }, [ctxReady]);
  
  useEffect(() => {
    if (!myId || !myAnonId) return;
    const ch = supabase.channel(`chat-list-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        setMatches(prev => {
          const updated = prev.map(m => {
            if (String(m.id) !== String(msg.match_id)) return m;
            const isUnread = msg.sender_anon !== myAnonId;
            return {
              ...m,
              _hasMessages: true,
              last_message: msg.type === "voice" ? "🎤 Voice" : msg.type === "image" ? "📷 Photo" : msg.content,
              last_message_time: msg.created_at,
              last_sender_anon: msg.sender_anon,
              _unreadCount: isUnread ? m._unreadCount + 1 : m._unreadCount,
            };
          });
          localStorage.setItem("chat_list_cache", JSON.stringify(updated));
          return updated;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "matches" }, (payload) => {
        setMatches(prev => {
          const updated = prev.filter(m => String(m.id) !== String(payload.old.id));
          localStorage.setItem("chat_list_cache", JSON.stringify(updated));
          return updated;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.read_at) {
          setMatches(prev => {
            const updated = prev.map(m => {
              if (String(m.id) !== String(msg.match_id)) return m;
              return { ...m, _unreadCount: 0 };
            });
            localStorage.setItem("chat_list_cache", JSON.stringify(updated));
            return updated;
          });
        }
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
  const totalUnread = matches.reduce((sum, m) => sum + (m._unreadCount > 0 ? 1 : 0), 0);

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
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-black text-white">
                {totalUnread > 99 ? "99+" : totalUnread} {L("ახალი", "new")}
              </span>
            )}
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/12 transition"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {showNotifications && (
          <div className="mb-4 space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center text-white/40 text-sm py-3">შეტყობინება არ არის</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-zinc-800/80 border border-white/8 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                    {n.from_photo ? (
                      <img src={photoSrc(n.from_photo)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {n.from_name}-მ გააკეთა Unmatch
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">{n.message}</div>
                  </div>
                  <button onClick={async () => {
                    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                    setNotifications(prev => prev.filter(x => x.id !== n.id));
                  }} className="text-white/30 hover:text-white text-lg shrink-0">✕</button>
                </div>
              ))
            )}
          </div>
        )}

        {newMatches.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">{L("ახალი შეხვედრები", "New Matches")}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {newMatches.map(m => {
                const name = m.other.first_name ?? m.other.nickname ?? "User";
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

        {conversations.length > 0 && (
          <div>
            <h2 className="text-xs text-white/40 uppercase tracking-wider mb-3">{L("მიმოწერა", "Messages")}</h2>
            <div className="flex flex-col gap-0.5" style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", touchAction: "manipulation" }}>
              {conversations.map(m => {
                const name = m.other.first_name ?? m.other.nickname ?? "User";
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
                    className={`relative flex items-center gap-3 px-3 py-3.5 rounded-2xl cursor-pointer transition ${selectedMatchId === m.id ? "bg-white/10 ring-1 ring-red-500/40" : "bg-white/5 hover:bg-white/8 active:bg-white/10"}`}>
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

        {selectedMatchId && (
          <div className="fixed inset-0 z-30" onClick={() => setSelectedMatchId(null)} />
        )}

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