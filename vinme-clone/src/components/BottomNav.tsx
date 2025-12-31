"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  chatBadge?: number; // რამდენ ჩათშია unread (>0)
};

export default function BottomNav({ chatBadge = 0 }: Props) {
  const pathname = usePathname();

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
        className={`relative flex h-12 w-12 items-center justify-center rounded-full transition ${
          active ? "bg-white/10" : "bg-transparent"
        }`}
      >
        {icon}

        {!!badge && badge > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-pink-500 px-1 text-center text-[11px] font-extrabold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="mb-3 rounded-full bg-black/70 p-2 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between px-2">
            <Item
              href="/feed"
              icon={<span className="text-xl">💘</span>}
            />
            <Item
              href="/likes"
              icon={<span className="text-xl">🫶</span>}
            />
            <Item
              href="/chat"
              badge={chatBadge}
              icon={<span className="text-xl">💬</span>}
            />
            <Item
              href="/profile"
              icon={<span className="text-xl">👤</span>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}