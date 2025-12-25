"use client";

import React, { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type CardUser = {
  nickname: string;
  age: number;
  city: string;
  distanceKm?: number;
  recentlyActive?: boolean;
  photo_url?: string | null;
};

type Props = {
  user: CardUser | null;
  loading?: boolean;
  onLike?: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
  onOpenProfile?: () => void;
  /** Show the "For You / Double Date" header tabs (new UI). Default: false (old UI). */
  showTopTabs?: boolean;
};






export default function TinderCard({
  user,
  loading,
  onLike,
  onSkip,
  onOpenProfile,
  showTopTabs = false,
}: Props) {
  // ✅ ALL HOOKS FIRST
  const [x, setX] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
const [showMatch, setShowMatch] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const startX = useRef(0);
  const downAt = useRef(0);

  const threshold = 120;

  const progress = Math.min(Math.abs(x) / threshold, 1);
  const dir = x > 10 ? "right" : x < -10 ? "left" : "none";

  const photoSrc =
  typeof user?.photo_url === "string" &&
  user.photo_url.trim() &&
  !user.photo_url.includes("google.com/search")
    ? user.photo_url
    : "/bg-retro-mobile.png"; // ან "/test.jpg"

  const hint = useMemo(() => {
    if (Math.abs(x) < 10) return "";
    return x > 0 ? "LIKE 💚" : "NOPE ❌";
  }, [x]);

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path + "/");

 


  // ✅ EARLY RETURNS AFTER HOOKS
  if (loading === true) return <TinderSkeleton />;
  if (!user) return <TinderEmpty onOpenProfile={onOpenProfile} />;

  function onPointerDown(e: React.PointerEvent) {
    if (animating) return;
    setDragging(true);
    downAt.current = Date.now();
    startX.current = e.clientX;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || animating) return;
    const dx = e.clientX - startX.current;
    setX(dx);
    setRot(Math.max(-12, Math.min(12, dx / 18)));
  }

  async function finish(action: "like" | "skip") {
    if (animating) return;
    setAnimating(true);

    const off = action === "like" ? window.innerWidth : -window.innerWidth;
    setX(off);
    setRot(action === "like" ? 14 : -14);

    await new Promise((r) => setTimeout(r, 220));

    try {
      if (action === "like") await onLike?.();
      else await onSkip?.();
    } finally {
      setX(0);
      setRot(0);
      setDragging(false);
      setAnimating(false);
    }
  }

  function onPointerUp() {
    if (!dragging || animating) return;
    setDragging(false);

    const quick = Date.now() - downAt.current < 180;
    const t = quick ? threshold * 0.75 : threshold;

    if (x > t) return void finish("like");
    if (x < -t) return void finish("skip");

    setX(0);
    setRot(0);
  }

  return (
  // NOTE: use vh/screen units for broad browser support (some WebViews don't support svh).
<div className="relative h-[100dvh] overflow-hidden overscroll-none bg-black text-white">
    {/* Card */}
    <div className="absolute inset-0 flex w-full justify-center">
      <div
        className="relative w-full max-w-[420px] h-screen"
        style={{
          transform: `translateX(${x}px) rotate(${rot}deg)`,
          transition: dragging ? "none" : "transform 180ms ease-out",
          touchAction: "none",
          willChange: "transform",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* PHOTO AREA */}
<button
  type="button"
  onClick={() => setShowMatch(true)}
  className="absolute right-4 top-4 z-[9999] rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow"
>
  TEST MATCH
</button>


        <div className="absolute inset-0 overflow-hidden">
         <img
  src={photoSrc}
  alt={user?.nickname ?? "photo"}
  className="absolute inset-0 h-full w-full object-cover object-center -translate-y-10 md:translate-y-0"
  draggable={false}
            onLoad={() => console.log("IMG LOADED ✅", photoSrc)}
            onError={(e) => console.log("IMG ERROR ❌", photoSrc, e)}
          />
        </div>

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
<button
  type="button"
  onClick={() => router.push("/chat")}
  className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black"
>
  TEST
</button>

        {/* Corner LIKE/NOPE */}
        {dir !== "none" && (
          <div
            className={`absolute top-4 z-40 select-none ${
              dir === "right" ? "left-4 rotate-[-10deg]" : "right-4 rotate-[10deg]"
            }`}
            style={{ opacity: progress }}
          >
            
            <div
            
              className={`rounded-xl border-2 px-5 py-3 text-xl font-extrabold tracking-widest bg-black/25 backdrop-blur-sm ${
                dir === "right"
                  ? "border-emerald-400 text-emerald-300"
                  : "border-rose-400 text-rose-300"
              }`}
            >
              {dir === "right" ? "კი💚" : "არა❌"}
            </div>
          </div>
        )}

        {/* Top tabs (new UI) */}
        {showTopTabs && (
          // <div className="absolute left-0 right-0 top-0 z-40 px-4 pt-4">
            <div className="flex items-center justify-center">
              <div className="flex gap-2 rounded-full bg-white/10 p-1">
                <button
                  type="button"
                  className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold"
                >
                  For You
                </button>
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm text-white/70"
                >
                  Double Date
                </button>
              </div>
          

            <div className="mt-3 h-1 w-full rounded-full bg-white/20">
              <div className="h-1 w-1/3 rounded-full bg-white/60" />
            </div>
          </div>
        )}

        {/* Info */}
<div className="absolute bottom-[180px] md:bottom-32 left-0 right-0 z-30 px-4">
          {user.recentlyActive && (
            <span className="inline-block rounded-full bg-emerald-300/90 px-3 py-1 text-xs font-semibold text-black">
              Recently Active
            </span>
          )}

          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold leading-tight">
                {user.nickname}{" "}
                <span className="font-semibold text-white/90">{user.age}</span>
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm text-white/85">
                <span>📍</span>
                <span>{user.distanceKm ?? 0} km away</span>
              </div>
            </div>

            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-3 text-lg"
            >
              ⬆️
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ✅ BOTTOM PANEL – full width, FIXED (works on mobile) */}
<nav className="fixed bottom-0 left-0 right-0 z-[9999]">
  <div className="w-full bg-black/60 backdrop-blur-md">
    <div className="mx-auto flex max-w-[420px] items-center justify-between px-4 py-2 pb-[max(6px,env(safe-area-inset-bottom))]">
      
      <button
        type="button"
        onClick={() => router.push("/feed")}
        className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition ${
          pathname === "/feed" ? "text-orange-400" : "text-white/70"
        }`}
      >
        🔥
      </button>

      <button
        type="button"
        onClick={() => router.push("/matches")}
        className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition ${
          pathname === "/matches" ? "text-red-400" : "text-white/70"
        }`}
      >
        ❤️
      </button>

      <button
        type="button"
        onClick={() => router.push("/chat")}
        className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition ${
          pathname === "/chat" ? "text-white" : "text-white/70"
        }`}
      >
        💬
      </button>

      <button
        type="button"
        onClick={() => router.push("/profile")}
        className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition ${
          pathname === "/profile" ? "text-white" : "text-white/70"
        }`}
      >
        👤
      </button>

    </div>
  </div>
</nav>

  

            {/* Actions */}
<div className="absolute bottom-22 md:bottom-22 left-0 right-0 z-40 flex justify-center">
              <div className="flex items-center gap-8">
                {/* ❌ */}
                <div
                  style={{
                    opacity: dir === "left" ? 0.65 + progress * 0.35 : 1,
                    transform:
                      dir === "left"
                        ? `translateY(${-progress * 26}px) scale(${
                            1 + progress * 0.12
                          })`
                        : "translateY(0px) scale(1)",
                    transition: dragging
                      ? "none"
                      : "transform 180ms ease-out, opacity 180ms ease-out",
                  }}
                >
                  <CircleBtn
                    label="❌"
                    onClick={() => finish("skip")}
                    disabled={animating}
                  />
                </div>

                {/* 💚 */}
                <div
                  style={{
                    opacity: dir === "right" ? 0.65 + progress * 0.35 : 1,
                    transform:
                      dir === "right"
                        ? `translateY(${-progress * 26}px) scale(${
                            1 + progress * 0.12
                          })`
                        : "translateY(0px) scale(1)",
                    transition: dragging
                      ? "none"
                      : "transform 180ms ease-out, opacity 180ms ease-out",
                  }}
                >
                  <CircleBtn
                    label="💚"
                    primary
                    onClick={() => finish("like")}
                    disabled={animating}
                  />
                </div>
              </div>
            </div>

         
            {/* optional debug */}
            {/* {hint && (
              <div className="absolute top-24 left-4 rounded-xl bg-black/40 px-3 py-2 text-sm font-semibold ring-1 ring-white/10 backdrop-blur">
                {hint}
              </div>
            )} */}
          </div>
  
    
  );
}

function TinderSkeleton() {
  return (

  <div className="fixed inset-0 overflow-hidden bg-black text-white flex justify-center">
      <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
    </div>
  );
}

function TinderEmpty({ onOpenProfile }: { onOpenProfile?: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white px-4">
      <p className="text-lg font-semibold">No profiles found 😅</p>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
          onClick={() => {
            // stay on feed
          }}
        >
          Home
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="rounded-xl bg-white px-4 py-3 font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Settings
        </button>
      </div>
    </div>
  );
}

function CircleBtn({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (

    
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-16 w-16 items-center justify-center rounded-full text-2xl backdrop-blur ring-1 ring-white/10 transition",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        primary
          ? "bg-emerald-400/90 text-black hover:bg-emerald-400"
          : "bg-white/10 text-white hover:bg-white/20",
      ].join(" ")}
    >
      {label}
    </button>

    
  );
}


