"use client";

import React, { useMemo } from "react";
import { photoSrc } from "@/lib/photos";
import { getLang } from "@/lib/i18n";

type MatchModalProps = {
  onClose: () => void;
  onOpenChat: () => void;
  meName?: string;
  matchName?: string;
  myPhoto?: string | null;
  theirPhoto?: string | null;
};

const COPY = {
  ka: {
    title: "შეხვედრა შედგა 🐾",
    subtitle: "ყველაფერი ახლა იწყება ✨",
    primary: "მიწერე ახლა 💬",
    secondary: "მოგვიანებით →",
  },
  en: {
    title: "It’s a match! 🐾",
    subtitle: "It’s just the beginning ✨",
    primary: "Message now 💬",
    secondary: "Later →",
  },
} as const;

export default function MatchModal({
  onClose,
  onOpenChat,
  meName = "მე",
  matchName = "ვიღაც",
  myPhoto = null,
  theirPhoto = null,
}: MatchModalProps) {
  // ✅ PATH -> URL (robust + memoized)
  const myAvatar = useMemo(() => photoSrc(myPhoto), [myPhoto]);
  const theirAvatar = useMemo(() => photoSrc(theirPhoto), [theirPhoto]);

  // ✅ robust lang + fallback
  const rawLang = getLang();
  const lang: "ka" | "en" = rawLang === "en" ? "en" : "ka";

  // ✅ always defined
  const t = COPY[lang];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-zinc-950/90 p-6 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-white/80">{t.subtitle}</p>
        </div>

        {/* Avatars */}
        <div className="mt-5 flex items-center justify-center gap-6">
          {/* Me */}
          <div className="text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/20">
              <img
                src={myAvatar || "/avatar-placeholder.png"}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
            <div className="mt-2 text-sm text-white/70">{meName}</div>
          </div>

          {/* Their */}
          <div className="text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-pink-400/70">
              <img
                src={theirAvatar || "/avatar-placeholder.png"}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
            <div className="mt-2 text-sm text-white/70">{matchName}</div>
          </div>
        </div>

        {/* Primary action */}
        <button
          type="button"
          onClick={onOpenChat}
          className="
            mt-6 w-full rounded-xl
            bg-gradient-to-r from-orange-500 to-pink-500
            px-6 py-4
            text-base font-semibold text-black
            shadow-lg
            active:scale-[0.98]
            transition
          "
        >
          {t.primary}
        </button>

        {/* Secondary action */}
        <button
          type="button"
          onClick={onClose}
          className="
            mt-3 w-full rounded-xl
            bg-white/10 px-6 py-3
            text-sm font-medium text-white/85
            hover:bg-white/15
            transition
          "
        >
          {t.secondary}
        </button>
      </div>
    </div>
  );
}
