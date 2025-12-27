"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ აქ დაამატე ყველა გვერდი სადაც პანელი არ გინდა
  const hideNav =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className={hideNav ? "" : "pb-20"}>{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
