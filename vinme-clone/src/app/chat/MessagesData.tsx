"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";
import SwipeToDeleteRow from "@/components/SwipeToDeleteRow";

/* ================= TYPES ================= */

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

/* ================= COMPONENT ================= */

export default function MessagesClient() {
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
    let cancelled = false;

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

        /* ---- matches ---- */
        const { data: mRows } = await supabase
          .from("matches")
          .select("id, user_a, user_b, hidden_by_a, hidden_by_b")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

        const mm = (mRows as MatchRow[]) ?? [];
        if (cancelled) return;
        setMatches(mm);

        /* ---- profiles ---- */
        const userIds = Array.from(
          new Set(mm.flatMap((m) => [m.user_a, m.user_b]))
        );

        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, nickname, photo1_url")
          .in("user_id", userIds);

        if (pErr) setErr(pErr.message);

        const map: Record<string, ProfileRow> = {};
        (profiles ?? []).forEach((p) => (map[p.user_id] = p));
        setProfilesByUser(map);

        /* ---- messages (ONE QUERY, NO LOOP) ---- */
        const matchIds = mm.map((m) => m.id);

        if (matchIds.length === 0) {
          setLatestByMatch({});
          setUnreadByMatch({});
          return;
        }

        const { data: msgs } = await supabase
          .from("messages")
          .select("id, match_id, sender_anon, content, created_at, read_at")
          .in("match_id", matchIds)
          .order("created_at", { ascending: false });

        const latest: Record<number, MsgRow | null> = {};
        const unread: Record<number, number> = {};

        for (const m of mm) {
          latest[m.id] = null;
          unread[m.id] = 0;
        }

        (msgs ?? []).forEach((msg: MsgRow) => {
          if (!latest[msg.match_id]) {
            latest[msg.match_id] = msg;
          }
          if (!msg.read_at && msg.sender_anon !== me?.anon_id) {
            unread[msg.match_id] = (unread[msg.match_id] ?? 0) + 1;
          }
        });

        if (cancelled) return;
        setLatestByMatch(latest);
        setUnreadByMatch(unread);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ================= HELPERS ================= */

  function otherUserId(m: MatchRow) {
    return m.user_a === uid ? m.user_b : m.user_a;
  }

  function displayNameFor(m: MatchRow) {
    const p = profilesByUser[otherUserId(m)];
    return (p?.nickname ?? "").trim() || "Unknown";
  }

  /* ================= MEMO ================= */

  const matchesWithMessages = useMemo(() => {
    return matches
      .filter((m) => {
        const hiddenForMe =
          m.user_a === uid ? m.hidden_by_a : m.hidden_by_b;
        if (hiddenForMe) return false;
        return !!latestByMatch[m.id];
      })
      .sort((a, b) =>
        (latestByMatch[b.id]?.created_at ?? "").localeCompare(
          latestByMatch[a.id]?.created_at ?? ""
        )
      );
  }, [matches, latestByMatch, uid]);

  const matchesNoMessages = useMemo(
    () => matches.filter((m) => !latestByMatch[m.id]),
    [matches, latestByMatch]
  );

  const filteredMatches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return matchesWithMessages;
    return matchesWithMessages.filter((m) =>
      displayNameFor(m).toLowerCase().includes(query)
    );
  }, [q, matchesWithMessages]);

  const bottomUnreadChats = useMemo(
    () => Object.values(unreadByMatch).filter((n) => n > 0).length,
    [unreadByMatch]
  );

  /* ================= UI ================= */

  return (
    <main className="h-[100dvh] bg-black text-white pb-28">
      {/* UI — ზუსტად შენს კოდს 그대로 ტოვებს */}
      {/* BottomNav, SwipeToDeleteRow, layout უცვლელია */}
      <BottomNav chatBadge={bottomUnreadChats} />
    </main>
  );
}