"use client";

import React from "react";
import { photoSrc } from "@/lib/photos";

type MatchModalProps = {
  onClose: () => void;
  onOpenChat: () => void;
  meName?: string;
  matchName?: string;
  myPhoto?: string | null; // PATH ან URL
  theirPhoto?: string | null; // PATH ან URL
};

export default function MatchModal({
  onClose,
  onOpenChat,
  meName = "მე",
  matchName = "ვიღაც",
  myPhoto = null,
  theirPhoto = null,
}: MatchModalProps) {
  // ✅ PATH -> URL
  const myAvatar = photoSrc(myPhoto);
  const theirAvatar = photoSrc(theirPhoto);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* stop propagation so clicking inside doesn't close */}
      <div
        className="w-full max-w-sm rounded-3xl bg-zinc-950/90 p-6 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-2xl font-extrabold">შეხვდით 🎉</h2>

        {/* Avatars */}
        <div className="mb-6 flex items-center justify-center gap-6">
          {/* ME */}
          <div className="h-20 w-20 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center">
            {myAvatar ? (
              <img
                src={myAvatar}
                alt={meName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl opacity-80">🙂</span>
            )}
          </div>

          {/* THEM */}
          <div className="h-20 w-20 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center">
            {theirAvatar ? (
              <img
                src={theirAvatar}
                alt={matchName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl opacity-80">✨</span>
            )}
          </div>
        </div>

        {/* Names */}
        <div className="mb-6 text-center text-sm opacity-80">
          {meName} 💛 {matchName}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onOpenChat}
            className="w-full rounded-2xl bg-orange-500 py-3 font-semibold text-black active:scale-[0.99]"
          >
            მიმოწერა 💬
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-white/10 py-3 text-white ring-1 ring-white/10 active:scale-[0.99]"
          >
            გაგრძელება →
          </button>
        </div>
      </div>
    </div>
  );
}
