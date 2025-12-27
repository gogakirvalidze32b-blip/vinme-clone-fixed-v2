"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideNav =
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding");

  // ✅ ჩათის გვერდზე pb-20 არ გვინდა (თვითონ ჩათი მართავს)
  const noPad =
    pathname.startsWith("/chat/") || pathname === "/chat";

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className={hideNav || noPad ? "" : "pb-20"}>{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
