"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";


const NAV_H = 72; // base height (safe-area + padding კიდევ დაამატებს)

export const BOTTOM_NAV_PB_CLASS =
  "pb-[calc(72px+env(safe-area-inset-bottom))]"; // სხვა გვერდებზე convenience

export default function BottomNav() {
  const pathname = usePathname();

  // ✅ my anon id (client only)
  const myAnonId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateAnonId();
  }, []);

  const [unread, setUnread] = useState(0);

  // ✅ fetch unread count
  async function refreshUnread() {
    if (!myAnonId) return;

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .neq("sender_anon", myAnonId) // not mine
      .is("read_at", null); // unread

    if (error) {
      console.error("Unread count error:", error);
      return;
    }

    setUnread(count ?? 0);
  }

  useEffect(() => {
    if (!myAnonId) return;

    let alive = true;

    // initial load
    refreshUnread();

    // realtime updates
    const ch = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (!alive) return;

          // simplest + reliable: re-count on any message change
          // (insert new msg / update read_at)
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myAnonId]);

  const items = [
    { href: "/feed", label: "🔥", key: "feed" },
    { href: "/matches", label: "💗", key: "matches" },
    { href: "/chat", label: "💬", key: "chat" },
    { href: "/profile", label: "👤", key: "profile" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height: NAV_H,
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 9999,
        background: "rgba(9,9,11,0.88)",
        backdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "0 14px",
          display: "flex",
          gap: 14,
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          const isChat = it.key === "chat";

          return (
            <Link
              key={it.key}
              href={it.href}
              style={{
                width: 54,
                height: 46,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                textDecoration: "none",
                color: "white",
                background: active ? "rgba(255,255,255,0.10)" : "transparent",
                border: active
                  ? "1px solid rgba(255,255,255,0.14)"
                  : "1px solid transparent",
                position: "relative", // ✅ badge-ისთვის
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{it.label}</span>

              {/* ✅ unread badge only on chat */}
              {isChat && unread > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "#ef4444",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    boxShadow: "0 0 0 2px rgba(9,9,11,0.88)", // ✅ ლამაზად დაჯდეს
                  }}
                >
                  {unread > 99 ? "99+" : unread}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
