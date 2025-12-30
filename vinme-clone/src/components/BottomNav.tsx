"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";

export const NAV_PILL_H = 56;
export const NAV_WRAP_PAD_TOP = 8;
export const NAV_WRAP_PAD_BOTTOM = 8;

export const BOTTOM_NAV_PB_CLASS =
  "pb-[calc(60px+env(safe-area-inset-bottom))]";

function CardStackIcon({
  active,
  size = 26,
}: {
  active?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="translate(10,14) rotate(-18 20 20)">
        <rect
          x="6"
          y="10"
          width="22"
          height="30"
          rx="8"
          opacity={active ? 0.5 : 0.25}
        />
      </g>

      <g transform="translate(18,8) rotate(8 22 22)">
        <rect
          x="14"
          y="8"
          width="28"
          height="38"
          rx="10"
          opacity={active ? 0.95 : 0.65}
        />
      </g>
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateAnonId();
  }, []);

  const [uid, setUid] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setUid(data.user?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!uid) return;

    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .eq("has_unread", true);

    setUnread(count ?? 0);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    refreshUnread();

    const ch = supabase
      .channel(`bottomnav-unread-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        refreshUnread
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        refreshUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, refreshUnread]);

  const items = [
    { href: "/matches", key: "matches", type: "emoji", label: "💕" },
    { href: "/feed", key: "feed", type: "icon", label: "CARDSTACK" },
    { href: "/chat", key: "chat", type: "emoji", label: "💬" },
    { href: "/profile", key: "profile", type: "emoji", label: "👤" },
  ] as const;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        // paddingTop: 6, ეს უნდა ვქნა ხვალ
        height: `calc(${NAV_WRAP_PAD_TOP + NAV_PILL_H + NAV_WRAP_PAD_BOTTOM}px + env(safe-area-inset-bottom))`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        // და ეს მოვშალო ქვედა ოთხი
        background: "rgba(0, 0, 0, 15)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        // აქამდე
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent" as any,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          padding: `${NAV_WRAP_PAD_TOP}px 14px 0 14px`,
        }}
      >
        <div
          style={{
            height: NAV_PILL_H,
            borderRadius: 999,
            background: "rgba(9,9,11,0.70)",
            border: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
          }}
        >
{items.map((it) => {
  const active = pathname?.startsWith(it.href);
  const isChat = it.key === "chat";
  const isFeed = it.key === "feed";
  

  // ✅ unified button style (ყველა ერთნაირი ზომა/სისწორე)
const baseBtn: React.CSSProperties = {
  width: 58,
  height: 44,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  textDecoration: "none",
  position: "relative",
  color: active ? "white" : "rgba(255,255,255,0.75)",
  background: active ? "rgba(255,255,255,0.10)" : "transparent",
  
};



            // ✅ active accent gradient (optional)
            const accentGlow = active
              ? {
                  background:
                    "linear-gradient(135deg, rgba(249,115,22,0.22), rgba(236,72,153,0.18), rgba(217,70,239,0.16))",
                  border: "1px solid rgba(255,255,255,0.18)",
                }
              : {};

            return (
              <Link
                key={it.key}
                href={it.href}
                style={{
                  ...baseBtn,
                  ...(active ? accentGlow : null),
                }}
              >
                {/* label */}
                <span
                  style={{
                    fontSize: isFeed ? 26 : 22, // ✅ same size for all
                    lineHeight: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
               
    transition: "transform 160ms ease, font-size 160ms ease",
  }}
                >
                  {isFeed ? <CardStackIcon active={active}  size={35} /> : it.label}
                </span>

                {/* unread badge */}
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
                      boxShadow: "0 0 0 2px rgba(9,9,11,0.70)",
                    }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </div>
                )}

                {/* tiny indicator dot (optional) */}
        
              </Link>
            );
          })}
        </div>

        <div
          style={{
            height: `calc(${NAV_WRAP_PAD_BOTTOM}px + env(safe-area-inset-bottom))`,
          }}
        />
      </div>
    </div>
  );
}