"use client";

import React from "react";

export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* center phone frame on desktop */}
      <div className="mx-auto w-full max-w-[420px] min-h-[100dvh] bg-zinc-950">
        {children}
      </div>
    </div>
  );
}