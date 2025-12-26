"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // აქ ჩაწერე ყველა auth გვერდი სადაც არ გინდა BottomNav
  const hide =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  return (
    <>
      <main className={hide ? "" : "pb-20"}>{children}</main>
      {!hide && <BottomNav />}
    </>
  );
}
