"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/userContext";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { chatBadge } = useUser();
  const hideNav = pathname?.startsWith("/auth") || pathname?.startsWith("/onboarding");
  return (
    <>
      {children}
      {!hideNav && <BottomNav chatBadge={chatBadge} />}
    </>
  );
}