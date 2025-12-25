"use client";

import { useState } from "react";

export default function LikesPage() {
  const [tab, setTab] = useState<"likes" | "top">("likes");

  return (
    <main className="min-h-[100svh] bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-5 pb-28">
        {/* Tabs */}
        <div className="flex items-center gap-4 text-white/70">
          <button
            onClick={() => setTab("likes")}
            className={`flex-1 border-b-2 pb-3 text-center font-semibold ${
              tab === "likes" ? "border-pink-500 text-white" : "border-white/10"
            }`}
          >
            1 Like
          </button>
          <button
            onClick={() => setTab("top")}
            className={`flex-1 border-b-2 pb-3 text-center font-semibold ${
              tab === "top" ? "border-pink-500 text-white" : "border-white/10"
            }`}
          >
            Top Picks <span className="ml-1 inline-block h-2 w-2 rounded-full bg-pink-500" />
          </button>
        </div>

        {/* Card */}
        <div className="mt-10 flex flex-col items-center">
          <p className="text-center text-white/70">
            Upgrade to Gold to see people who have already liked you.
          </p>

          <div className="mt-8 w-full max-w-[240px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10">
              {/* blurred photo placeholder */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/30 to-black/60" />
              <div className="absolute inset-0 backdrop-blur-[18px]" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="rounded-lg bg-black/40 px-2 py-1 text-sm font-extrabold">
                  23
                </span>
                <span className="text-white/85 text-sm">🎵 Music</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => alert("Later: show likes list")}
            className="mt-10 w-full rounded-full bg-amber-300/95 py-4 text-lg font-extrabold text-black hover:bg-amber-300"
          >
            See Who Likes You
          </button>
        </div>
      </div>
    </main>
  );
}
