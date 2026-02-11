"use client";

import BottomNav from "@/components/BottomNav";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {children}
      <BottomNav />
    </div>
  );
}