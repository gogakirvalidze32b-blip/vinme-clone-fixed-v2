"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";



export function useUnreadCount(myAnonId: string | null) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!myAnonId) return;

    let alive = true;

async function refresh() {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id ?? null;
  if (!uid) return;

  // ✅ unread = რამდენ match-შია has_unread = true
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    .eq("has_unread", true);

  if (!alive) return;

  if (error) {
    console.error("Unread count error:", error);
    return;
  }

  setUnread(count ?? 0);
}

    refresh();

    // realtime: INSERT / UPDATE (read_at)
    const ch = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row: any = (payload as any).new ?? null;

          // თუ ახალი მესიჯი მოვიდა და ჩემგან არაა -> refresh
          if (payload.eventType === "INSERT") {
            if (row && row.sender_anon !== myAnonId) refresh();
            return;
          }

          // თუ read_at შეიცვალა (გავხსენი ჩათი) -> refresh
          if (payload.eventType === "UPDATE") {
            refresh();
            return;
          }
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [myAnonId]);

  return unread;
}
