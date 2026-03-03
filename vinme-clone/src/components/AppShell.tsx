"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

let cachedAnonId: string | null = null;
let cachedUid: string | null = null;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [chatBadge, setChatBadge] = useState(0);
  const [myAnonId, setMyAnonId] = useState<string | null>(cachedAnonId);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (cachedAnonId) { setMyAnonId(cachedAnonId); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      cachedUid = uid;
      const { data: me } = await supabase.from("profiles").select("anon_id").eq("user_id", uid).maybeSingle();
      if (!cancelled) { cachedAnonId = me?.anon_id ?? null; setMyAnonId(cachedAnonId); }
    })();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    if (!myAnonId) return;
    const { data, error } = await supabase.from("messages").select("match_id").is("read_at", null).neq("sender_anon", myAnonId).limit(1000);
    if (error) return;
    const uniq = new Set<number>();
    (data ?? []).forEach((r: any) => { if (r?.match_id != null) uniq.add(Number(r.match_id)); });
    setChatBadge(uniq.size);
  }, [myAnonId]);

  useEffect(() => { if (myAnonId) refresh(); }, [myAnonId, refresh]);

  useEffect(() => {
    if (!myAnonId) return;
    if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null; }
    const ch = supabase.channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (payload) => { const row: any = payload.new; if (row?.sender_anon && row.sender_anon !== myAnonId) refresh(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => { const row: any = payload.new; if (row?.read_at) refresh(); })
      .subscribe();
    chRef.current = ch;
    return () => { if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null; } };
  }, [myAnonId, refresh]);

  const hideNav = pathname?.startsWith("/auth") || pathname?.startsWith("/onboarding");

  return (
    <>
      {children}
      {!hideNav && <BottomNav chatBadge={chatBadge} />}
    </>
  );
}
