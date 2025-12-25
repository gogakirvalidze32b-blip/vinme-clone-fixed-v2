"use client";

import React, { useEffect, useState } from "react";

type Props = {
  visible: boolean;
  onClose: () => void;

  onMessage?: (text: string) => void | Promise<void>;
  onContinue?: () => void;

  mePhoto?: string | null;
  otherPhoto?: string | null;
  otherName?: string;
};

export default function MatchOverlay({
  visible,
  onClose,
  onMessage,
  onContinue,
  mePhoto,
  otherPhoto,
  otherName = "Match",
}: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!visible) setText("");
  }, [visible]);

  if (!visible) return null;

  async function handleSend() {
    const msg = text.trim();
    if (!msg) return;
    await onMessage?.(msg);
    setText("");
  }

  return (
    <div className="fixed inset-0 z-[1000] text-white">
      {/* BACKGROUND PHOTO */}
      <div className="absolute inset-0">
        <img
          src={
            otherPhoto ||
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=80&auto=format&fit=crop"
          }
          alt={otherName}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/80" />
      </div>

      {/* Close tap area */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-[1010] rounded-full bg-black/40 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 backdrop-blur hover:bg-black/55"
      >
        Close
      </button>

      {/* CONTENT */}
      <div className="relative z-[1010] mx-auto flex min-h-[100svh] w-full max-w-[480px] flex-col items-center justify-end px-5 pb-10">
        {/* MATCH TEXT */}
        <div className="mb-6 w-full text-center">
          <div className="text-4xl font-extrabold tracking-tight">
            IT’S A{" "}
            <span className="text-emerald-300 drop-shadow-[0_6px_18px_rgba(16,185,129,0.35)]">
              MATCH!
            </span>
          </div>

          {/* big word with outline-ish echo */}
          <div className="mt-3 relative select-none">
            <div className="text-[64px] leading-none font-black tracking-tight text-emerald-300/95 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
              MATCH!
            </div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2 text-[64px] leading-none font-black tracking-tight text-emerald-300/15">
              MATCH!
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-white/85">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/90 text-black">
              💚
            </span>
            <span>
              <b className="text-white">{otherName}</b> liked you back
            </span>
          </div>
        </div>

        {/* MESSAGE BOX */}
        <div className="w-full rounded-2xl bg-white/15 ring-1 ring-white/15 backdrop-blur-xl px-3 py-3">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSend();
              }}
              placeholder="Write something…"
              className="w-full bg-transparent px-2 py-2 outline-none placeholder:text-white/55"
            />

            <button
              onClick={handleSend}
              className="shrink-0 rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-zinc-200"
            >
              Send
            </button>
          </div>
        </div>

        {/* CONTINUE */}
        <button
          onClick={() => {
            onContinue?.();
            onClose();
          }}
          className="mt-6 text-sm font-semibold tracking-wide text-white/90 hover:text-white"
        >
          CONTINUE
        </button>

        {/* small avatars (optional) */}
        <div className="pointer-events-none absolute bottom-[148px] left-1/2 -translate-x-1/2 opacity-0 md:opacity-100">
          {/* ეს უბრალოდ პატარა დეკორია desktop-ზე; სურვილისამებრ წაშალე */}
        </div>
      </div>
    </div>
  );
}
