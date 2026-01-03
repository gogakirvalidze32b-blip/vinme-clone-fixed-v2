"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

type MsgRow = {
  id: string;
  match_id: number;
  sender_anon: string;
  read_at: string | null;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav = pathname === "/feed" || pathname?.startsWith("/feed/");

  const [chatBadge, setChatBadge] = useState(0);
  const [myAnonId, setMyAnonId] = useState<string | null>(null);

  // 1️⃣ anon_id მოვიტანოთ ერთხელ
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

  // 2️⃣ badge refresh ფუნქცია
  const refresh = useCallback(async () => {
    if (!myAnonId) return;

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_anon", myAnonId);

    if (error) {
      console.error("badge refresh error:", error);
      return;
    }

    setChatBadge(count ?? 0);
  }, [myAnonId]);

  // 3️⃣ პირველი ჩათვლისთვის
  useEffect(() => {
    if (!myAnonId) return;
    refresh();
  }, [myAnonId, refresh]);

  // 4️⃣ realtime listener
  useEffect(() => {
    if (!myAnonId) return;

    const ch = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as MsgRow;
          if (row.sender_anon !== myAnonId && !row.read_at) {
            setChatBadge((x) => x + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          // read_at როცა შეიცვლება, ჯობია თავიდან დაითვალოს
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [myAnonId, refresh]);

  // 5️⃣ layout render
  return (
    <>
      {children}
      {!hideNav && <BottomNav chatBadge={chatBadge} />}
    </>
  );
}