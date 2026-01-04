"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type Props = {
  chatBadge?: number;
};

export default function BottomNav({ chatBadge = 0 }: Props) {
  const pathname = usePathname();

  // ✅ ამ გვერდებზე BottomNav საერთოდ არ გამოჩნდეს
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/delete-account")
  ) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const Item = ({
    href,
    icon,
    badge,
  }: {
    href: string;
    icon: React.ReactNode;
    badge?: number;
  }) => {
    const active = isActive(href);

    return (
      <Link
        href={href}
        className={[
          "relative flex h-10 w-10 items-center justify-center transition-opacity",
          active ? "opacity-100" : "opacity-60",
          "select-none touch-manipulation",
          "focus:outline-none focus-visible:outline-none",
          "[-webkit-tap-highlight-color:transparent]",
        ].join(" ")}
      >
        {icon}

        {!!badge && badge > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] rounded-full bg-pink-500 px-1 text-center text-[11px] font-extrabold text-white leading-[18px]">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-[9999] pointer-events-none">
      <div className="mx-auto w-full max-w-md px-6 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-full px-3 py-0 pointer-events-auto">
          <div className="flex items-center justify-between px-2">
            <Item href="/feed" icon={<span className="text-[18px]">💘</span>} />
            <Item href="/likes" icon={<span className="text-[18px]">🫶</span>} />
            <Item
              href="/chat"
              badge={chatBadge}
              icon={<span className="text-[18px]">💬</span>}
            />
            <Item href="/profile" icon={<span className="text-[18px]">👤</span>} />
          </div>
        </div>
      </div>
    </div>
  );
}