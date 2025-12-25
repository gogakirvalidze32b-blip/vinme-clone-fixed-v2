"use client";

import { useMemo } from "react";
import BackButton from "@/components/BackButton";

type Me = {
  nickname: string;
  age: number;
  photo1_url?: string | null;
  onboarding_completed?: boolean;
};

export default function ProfilePage() {
  // TODO: აქ ჩაანაცვლე შენი რეალური "me" state / query-ით
  const me: Me = {
    nickname: "Bearded",
    age: 29,
    photo1_url: null,
    onboarding_completed: false,
  };

  // 0..100 progress (მაგალითად onboarding completion)
  const progress = useMemo(() => {
    // შენ შეგიძლია აქ ჩათვალო რეალურად: name/birth/gender/photos...
    return me.onboarding_completed ? 100 : 50;
  }, [me.onboarding_completed]);

  const pct = Math.max(0, Math.min(100, progress));

  return (
    <main className="min-h-[100svh] bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <BackButton href="/feed" label="Back" />
          <div className="flex items-center gap-2">
            {/* optional shield */}
            <button
              className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              type="button"
              title="Safety"
              aria-label="Safety"
            >
              🛡️
            </button>

            {/* settings */}
            <button
              className="rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              type="button"
              title="Settings"
              aria-label="Settings"
              onClick={() => (window.location.href = "/settings")}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mt-6 flex items-center gap-4">
          {/* Avatar + progress ring */}
          <div className="relative h-20 w-20 shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(rgba(236,72,153,.95) ${pct * 3.6}deg, rgba(255,255,255,.12) 0deg)`,
              }}
            />
            <div className="absolute inset-[3px] rounded-full bg-zinc-950" />

            <div className="absolute inset-[6px] overflow-hidden rounded-full bg-white/10">
              {me.photo1_url ? (
                <img
                  src={me.photo1_url}
                  alt={me.nickname}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/60">
                  👤
                </div>
              )}
            </div>

            {/* % badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold ring-2 ring-pink-500">
              {pct}%
            </div>
          </div>

          {/* Name + button */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">
                {me.nickname}, {me.age}
              </h1>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70">
                ✓
              </span>
            </div>

            <button
              type="button"
              onClick={() => (window.location.href = "/profile/edit")}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
            >
              ✏️ Edit profile
            </button>
          </div>
        </div>

        {/* Big card */}
        <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-2xl">👥</div>
              <div>
                <div className="text-lg font-bold">Try Double Date</div>
                <div className="text-sm text-white/70">
                  Invite your friends and find other pairs.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-2 text-white/80 ring-1 ring-white/10 hover:bg-white/15"
              aria-label="Open"
              title="Open"
            >
              ➜
            </button>
          </div>
        </div>

        {/* Small tiles row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Tile icon="⭐" title="Super Likes" subtitle="0" onClick={() => alert("Soon")} />
          <Tile icon="⚡" title="Boosts" subtitle="My Boosts" onClick={() => alert("Soon")} />
          <Tile icon="🔥" title="Subs" subtitle="Subscriptions" onClick={() => alert("Soon")} />
        </div>

        {/* Optional promo card (თუ გინდა) */}
        <div className="mt-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900/30 to-zinc-900/30 p-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-extrabold">Premium</div>
              <div className="mt-1 text-sm text-white/75">
                See who likes you, top picks, and more.
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-amber-300 px-5 py-3 font-semibold text-zinc-900 hover:bg-amber-200"
              onClick={() => alert("Soon")}
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Tile({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white/10 p-4 text-left ring-1 ring-white/10 hover:bg-white/15"
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="text-xs text-white/60">{subtitle}</div>
    </button>
  );
}
