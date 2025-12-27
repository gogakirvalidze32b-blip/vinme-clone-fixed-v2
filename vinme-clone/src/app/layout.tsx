// src/app/(app)/layout.tsx
"use client";

import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Page content */}
      <div className="pb-20">{children}</div>

      {/* ✅ ALWAYS VISIBLE */}
      <BottomNav />
    </div>
  );
}
