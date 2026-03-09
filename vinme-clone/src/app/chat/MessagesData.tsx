"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";
import SwipeToDeleteRow from "@/components/SwipeToDeleteRow";

type MatchRow = {
  id: number;
  user_a: string;
  user_b: string;
  hidden_by_a?: boolean;
  hidden_by_b?: boolean;
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

export default function MessagesClient() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profilesByUser, setProfilesByUser] = useState<Record<string, ProfileRow>>({});
  const [latestByMatch, setLatestByMatch] = useState<Record<number, MsgRow | null>>({});
  const [unreadByMatch, setUnreadByMatch] = useState<Record<number, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const { data: sess } = await supabase.auth.getSession();
        const user = sess?.session?.user;
        if (!user) { router.replace("/login"); return; }

        setUid(user.id);

        const { data: me } = await supabase
          .from("profiles").select("anon_id").eq("user_id", user.id).single();
        setMyAnonId(me?.anon_id ?? null);

        const { data: mRows } = await supabase
          .from("matches").select("id, user_a, user_b, hidden_by_a, hidden_by_b")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        const mm = (mRows as MatchRow[]) ?? [];
        if (cancelled) return;
        setMatches(mm);

        const userIds = Array.from(new Set(mm.flatMap((m) => [m.user_a, m.user_b])));

        const { data: profiles } = await supabase
          .from("profiles").select("user_id, nickname, first_name, photo1_url").in("user_id", userIds);

        const map: Record<string, ProfileRow> = {};
        (profiles ?? []).forEach((p) => (map[p.user_id] = p));
        setProfilesByUser(map);

        const matchIds = mm.map((m) => m.id);
        if (matchIds.length === 0) {
          setLatestByMatch({});
          setUnreadByMatch({});
        } else {
          const { data: msgs } = await supabase
            .from("messages")
            .select("id, match_id, sender_anon, content, created_at, read_at")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false });

          const latest: Record<number, MsgRow | null> = {};
          const unread: Record<number, number> = {};

          mm.forEach((m) => { latest[m.id] = null; unread[m.id] = 0; });

          (msgs ?? []).forEach((msg) => {
            if (!latest[msg.match_id]) latest[msg.match_id] = msg;
            if (!msg.read_at && msg.sender_anon !== me?.anon_id) unread[msg.match_id]++;
          });

          if (!cancelled) { setLatestByMatch(latest); setUnreadByMatch(unread); }
        }

       const { data: notifs } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", user.id)
  .neq("read", true)
  .order("created_at", { ascending: false });

      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  function otherUserId(m: MatchRow) {
    return m.user_a === uid ? m.user_b : m.user_a;
  }

  function displayNameFor(m: MatchRow) {
    const p = profilesByUser[otherUserId(m)] as any;
    return (p?.first_name ?? p?.nickname ?? "").trim() || "Unknown";
  }

  const matchesWithMessages = useMemo(() => {
    return matches
      .filter((m) => {
        const hiddenForMe = m.user_a === uid ? m.hidden_by_a : m.hidden_by_b;
        if (hiddenForMe) return false;
        return !!latestByMatch[m.id];
      })
      .sort((a, b) =>
        (latestByMatch[b.id]?.created_at ?? "").localeCompare(latestByMatch[a.id]?.created_at ?? "")
      );
  }, [matches, latestByMatch, uid]);

  const bottomUnreadChats = useMemo(
    () => Object.values(unreadByMatch).filter((n) => n > 0).length,
    [unreadByMatch]
  );

  if (loading) return (
    <div className="h-[100dvh] flex items-center justify-center bg-black text-white">Loading chats…</div>
  );

  if (err) return (
    <div className="h-[100dvh] flex items-center justify-center bg-black text-red-400">{err}</div>
  );

  return (
    <main className="h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-4 space-y-3">

        {notifications.map(n => (
          <div key={n.id} className="flex items-center gap-3 rounded-2xl bg-zinc-800/80 border border-white/8 px-4 py-3">
            <span className="text-2xl shrink-0">💔</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Unmatch მოხდა</div>
              <div className="text-xs text-white/50 mt-0.5">{n.message}</div>
            </div>
            <button onClick={async () => {
              await supabase.from("notifications").update({ read: true }).eq("id", n.id);
              setNotifications(prev => prev.filter(x => x.id !== n.id));
            }} className="text-white/30 hover:text-white text-lg shrink-0">✕</button>
          </div>
        ))}

{notifications.map(n => (
          <div key={n.id} className="flex items-center gap-3 rounded-2xl bg-zinc-800/80 border border-white/8 px-4 py-3">
            <span className="text-2xl shrink-0">💔</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">Unmatch მოხდა</div>
              <div className="text-xs text-white/50 mt-0.5">{n.message}</div>
            </div>
            <button onClick={async () => {
              await supabase.from("notifications").update({ read: true }).eq("id", n.id);
              setNotifications(prev => prev.filter(x => x.id !== n.id));
            }} className="text-white/30 hover:text-white text-lg shrink-0">✕</button>
          </div>
        ))}

        {matchesWithMessages.length === 0 && notifications.length === 0 && (
          <div className="text-center text-white/60 mt-20">No chats yet</div>
        )}

        {matchesWithMessages.map((m) => {
          const otherId = otherUserId(m);
          const p = profilesByUser[otherId];
          const last = latestByMatch[m.id];

          return (
            <SwipeToDeleteRow key={m.id} onDelete={() => {}}>
              <button
                onClick={() => router.push(`/chat/${m.id}`)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                <div className="h-12 w-12 rounded-full bg-white/10 overflow-hidden shrink-0">
                  {p?.photo1_url && (
                    <img src={photoSrc(p.photo1_url)} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold">{displayNameFor(m)}</div>
                  <div className="text-sm text-white/60 truncate">{last?.content ?? "No messages yet"}</div>
                </div>
                {unreadByMatch[m.id] > 0 && (
                  <div className="h-6 min-w-[24px] rounded-full bg-pink-500 text-black text-xs font-bold flex items-center justify-center px-2 shrink-0">
                    {unreadByMatch[m.id]}
                  </div>
                )}
              </button>
            </SwipeToDeleteRow>
          );
        })}
      </div>

      <BottomNav chatBadge={bottomUnreadChats} />
    </main>
  );
}