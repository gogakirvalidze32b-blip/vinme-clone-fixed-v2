"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_H = 72; // base height (safe-area + padding კიდევ დაამატებს)

export const BOTTOM_NAV_PB_CLASS =
  "pb-[calc(72px+env(safe-area-inset-bottom))]"; // სხვა გვერდებზე convenience

export default function BottomNav() {
  const pathname = usePathname();

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
                border: active ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
