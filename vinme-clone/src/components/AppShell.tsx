"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [chatBadge, setChatBadge] = useState(0);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);

  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ✅ 1) fetch my anon_id once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("anon_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (!cancelled) setMyAnonId(me?.anon_id ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ 2) refresh unread badge = how many UNIQUE match_id have unread incoming messages
  const refresh = useCallback(async () => {
    if (!myAnonId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("match_id")
      .is("read_at", null)
      .neq("sender_anon", myAnonId)
      .limit(1000);

    if (error) return;

    const uniq = new Set<number>();
    (data ?? []).forEach((r: any) => {
      if (r?.match_id != null) uniq.add(Number(r.match_id));
    });

    setChatBadge(uniq.size); // ✅ 1 user -> 1
  }, [myAnonId]);

  // ✅ 3) initial refresh when myAnonId exists
  useEffect(() => {
    if (!myAnonId) return;
    refresh();
  }, [myAnonId, refresh]);

  // ✅ 4) realtime for INSERT + UPDATE
  useEffect(() => {
    if (!myAnonId) return;

    // cleanup old channel
    if (chRef.current) {
      supabase.removeChannel(chRef.current);
      chRef.current = null;
    }

    const ch = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row: any = payload.new;
          // ✅ only incoming messages affect badge
          if (row?.sender_anon && row.sender_anon !== myAnonId) {
            refresh();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row: any = payload.new;
          // ✅ if message becomes read, refresh badge
          if (row?.read_at) {
            refresh();
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
  }, [myAnonId, refresh]);

  // ✅ თუ login/onboarding გვერდებია და BottomNav არ გინდა, აქ შეგიძლია გამორიცხო
  // (თუ გინდა ყველა გვერდზე, დატოვე როგორცაა)
  const hideNav =
    pathname?.startsWith("/auth") || pathname?.startsWith("/onboarding");

  return (
    <>
      {children}
      {!hideNav && <BottomNav chatBadge={chatBadge} />}
    </>
  );
}