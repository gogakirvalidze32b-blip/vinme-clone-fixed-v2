"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getLang } from "@/lib/i18n";

export default function BottomNav({ chatBadge }: { chatBadge?: number } = {}) {
  const pathname = usePathname() || "";

  if (pathname.match(/^\/chat\/.+/)) return null;

  const [unreadPeople, setUnreadPeople] = useState(0);
  const [lang, setLang] = useState<"ka"|"en">("ka");
  const pathname2 = usePathname();

  useEffect(() => {
    setLang(getLang());
    const sync = () => setLang(getLang());
    window.addEventListener("app:lang", sync);
    return () => window.removeEventListener("app:lang", sync);
  }, []);

  useEffect(() => {
    if (chatBadge !== undefined) return;

    let alive = true;

    async function refresh() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid || !alive) return;

      const { data: myProfile } = await supabase.from("profiles").select("anon_id").eq("user_id", uid).maybeSingle();
      const anonId = myProfile?.anon_id ?? null;
      if (!anonId) return;

      const { data: unreadMsgs } = await supabase
        .from("messages").select("match_id")
        .is("read_at", null).neq("sender_anon", anonId).limit(1000);

      const uniq = new Set((unreadMsgs ?? []).map((r: any) => r.match_id));
      if (alive) setUnreadPeople(uniq.size);
    }

    refresh();

    const ch = supabase.channel(`bottomnav-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => { alive = false; supabase.removeChannel(ch); };
  }, [pathname2, chatBadge]);

  const hide =
    pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") || pathname.startsWith("/delete-account");
  if (hide) return null;

  const ka = lang !== "en";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const items = [
    {
      href: "/feed",
      label: ka ? "სვაიპი" : "Swipe",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "white" : "rgba(255,255,255,0.4)"}>
          <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
        </svg>
      ),
    },
    {
      href: "/likes",
      label: ka ? "მოწონება" : "Likes",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={active ? "white" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
    {
      href: "/chat",
      label: ka ? "ჩათი" : "Chat",
      badge: chatBadge !== undefined ? chatBadge : unreadPeople,
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={active ? "white" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      href: "/profile",
      label: ka ? "პროფილი" : "Profile",
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={active ? "white" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-zinc-950">
      <div className="bg-zinc-950/97 backdrop-blur border-t border-white/8" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-around px-2 py-2">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className="relative flex flex-col items-center gap-1 px-4 py-1 min-w-[60px] touch-manipulation select-none">
                  <div className="relative">
                    {item.icon(active)}
                    {!!item.badge && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-pink-500 px-1 text-[10px] font-black text-white text-center leading-[18px]">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? "text-white" : "text-white/40"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}