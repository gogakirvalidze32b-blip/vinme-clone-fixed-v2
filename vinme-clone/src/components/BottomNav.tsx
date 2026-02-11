"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type Props = {
  chatBadge?: number;
};

export default function BottomNav({ chatBadge = 0 }: Props) {
  const pathname = usePathname() || "";

  // ამ გვერდებზე BottomNav არ გამოჩნდეს
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
    pathname === href || pathname.startsWith(href + "/");

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
          "focus:outline-none",
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
    <div className="fixed inset-x-0 bottom-4 z-50">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="flex items-center justify-between rounded-full bg-zinc-900/80 backdrop-blur px-4 py-3">
          <Item href="/feed" icon={<span>💘</span>} />
          <Item href="/likes" icon={<span>🫶</span>} />
          <Item href="/chat" badge={chatBadge} icon={<span>💬</span>} />
          <Item href="/profile" icon={<span>👤</span>} />
        </div>
      </div>
    </div>
  );
}
