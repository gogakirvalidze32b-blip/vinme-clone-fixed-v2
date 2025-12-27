"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadCount(myAnonId: string | null) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!myAnonId) return;

    let alive = true;

    async function refresh() {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_anon", myAnonId)
        .is("read_at", null);

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
