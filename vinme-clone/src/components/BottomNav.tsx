"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import React from "react";

export default function BottomNav() {
  const pathname = usePathname() || "";
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid || !alive) return;

      const { data: myProfile } = await supabase
        .from("profiles").select("anon_id").eq("user_id", uid).maybeSingle();
      const anonId = myProfile?.anon_id ?? null;
      if (!anonId) return;

      const { data: matchRows } = await supabase
        .from("matches").select("id").or(`user_a.eq.${uid},user_b.eq.${uid}`);
      if (!matchRows?.length) return;

      const matchIds = matchRows.map((r: any) => r.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("match_id", matchIds)
        .neq("sender_anon", anonId)
        .is("read_at", null);

      if (alive) setUnread(count ?? 0);
    }

    refresh();

    const ch = supabase
      .channel("bottomnav-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/delete-account")
  ) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const Item = ({ href, icon, badge }: { href: string; icon: React.ReactNode; badge?: number }) => {
    const active = isActive(href);
    return (
      <Link href={href}
        className={["relative flex h-10 w-10 items-center justify-center transition-all",
          active ? "opacity-100 scale-110" : "opacity-55",
          "select-none touch-manipulation focus:outline-none"].join(" ")}>
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
        <div className="flex items-center justify-between rounded-full bg-zinc-900/90 backdrop-blur px-4 py-3 shadow-lg ring-1 ring-white/10">
          <Item href="/feed" icon={<span className="text-xl">💘</span>} />
          <Item href="/likes" icon={<span className="text-xl">🫶</span>} />
          <Item href="/chat" badge={unread} icon={<span className="text-xl">💬</span>} />
          <Item href="/profile" icon={<span className="text-xl">👤</span>} />
        </div>
      </div>
    </div>
  );
}
