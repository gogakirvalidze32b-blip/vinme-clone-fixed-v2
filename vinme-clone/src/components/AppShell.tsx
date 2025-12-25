"use client";

import React from "react";
import BottomNav from "@/components/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* content space so bottom nav doesn't cover */}
      <div className="pb-16">{children}</div>

      <BottomNav />
    </div>
  );
}
