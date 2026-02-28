"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";
import MatchModal from "./MatchModal";
import { supabase } from "@/lib/supabase";

type CardUser = {
  user_id: string;
  nickname: string;
  age: number;
  city?: string;
  distanceKm?: number;
  recentlyActive?: boolean;
  photo_url?: string | null;
  photo1_url?: string | null;
};

type Props = {
  user: CardUser | null;
  otherUserId?: string;
  myProfile?: any;
  loading?: boolean;
  onLike?: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
  onOpenProfile?: () => void;
  externalMatchId?: string | null;
  externalShowMatch?: boolean;
  onCloseMatch?: () => void;
  onOpenChat?: () => void;
};

export default function TinderCard({
  user, otherUserId, myProfile, loading,
  onLike, onSkip, onOpenProfile,
  externalMatchId, externalShowMatch, onCloseMatch, onOpenChat,
}: Props) {
  const router = useRouter();

  const [x, setX] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);

  const startX = useRef(0);
  const downAt = useRef(0);

  const threshold = 100;
  const progress = Math.min(Math.abs(x) / threshold, 1);
  const dir = x > 15 ? "right" : x < -15 ? "left" : "none";

  const imgSrc = useMemo(() => photoSrc(user?.photo1_url ?? user?.photo_url ?? null),
    [user?.photo1_url, user?.photo_url]);

  useEffect(() => {
    if (!otherUserId) return;
    supabase.from("profiles").select("user_id,first_name,nickname,photo1_url")
      .eq("user_id", otherUserId).maybeSingle()
      .then(({ data }) => setOtherUser(data ?? null));
  }, [otherUserId]);

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
    setRot(Math.max(-15, Math.min(15, dx / 15)));
  }

  async function finish(action: "like" | "skip") {
    if (animating) return;
    setAnimating(true);
    setX(action === "like" ? window.innerWidth : -window.innerWidth);
    setRot(action === "like" ? 15 : -15);
    await new Promise((r) => setTimeout(r, 220));
    try {
      if (action === "like") await onLike?.();
      else await onSkip?.();
    } finally {
      setX(0); setRot(0); setDragging(false); setAnimating(false);
    }
  }

  function onPointerUp() {
    if (!dragging || animating) return;
    setDragging(false);
    const quick = Date.now() - downAt.current < 200;
    const t = quick ? threshold * 0.7 : threshold;
    if (x > t) return void finish("like");
    if (x < -t) return void finish("skip");
    setX(0); setRot(0);
  }

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden flex flex-col">

      {/* ✅ CARD — mobile: full height, PC: centered with max size */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="relative overflow-hidden bg-zinc-900 shadow-2xl"
          style={{
            /* mobile: full width, PC: max 420px wide, aspect ratio 3:4 */
            width: "min(100%, 420px)",
            height: "min(calc(100dvh - 130px), 560px)",
            borderRadius: "clamp(0px, 2vw, 20px)",
            transform: `translateX(${x}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 200ms ease-out",
            willChange: "transform",
            touchAction: "pan-y",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: dragging ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* IMAGE */}
          {imgSrc && (
            <img src={imgSrc} alt="" draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" />
          )}
          {!imgSrc && <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-6xl">👤</div>}

          {/* GRADIENT */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />

          {/* LIKE badge */}
          {dir === "right" && (
            <div className="absolute top-8 left-6 z-30 rotate-[-20deg]" style={{ opacity: Math.min(progress * 1.5, 1) }}>
              <div className="border-[3px] border-[#00E08F] rounded-xl px-4 py-1.5 text-[#00E08F] text-2xl font-black tracking-widest">
                LIKE
              </div>
            </div>
          )}

          {/* NOPE badge */}
          {dir === "left" && (
            <div className="absolute top-8 right-6 z-30 rotate-[20deg]" style={{ opacity: Math.min(progress * 1.5, 1) }}>
              <div className="border-[3px] border-[#FF4458] rounded-xl px-4 py-1.5 text-[#FF4458] text-2xl font-black tracking-widest">
                NOPE
              </div>
            </div>
          )}

          {/* INFO */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black text-white drop-shadow">
                  {user.nickname}
                  <span className="font-light ml-2 text-xl">{user.age}</span>
                </h2>
                {user.city && (
                  <p className="text-sm text-white/75 mt-0.5 drop-shadow">
                    📍 {user.distanceKm != null ? `${user.distanceKm} km away` : user.city}
                  </p>
                )}
              </div>
              <button type="button" onClick={onOpenProfile}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-base hover:bg-white/30 transition">
                ℹ️
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ACTION BUTTONS — Tinder style */}
      <div className="shrink-0 flex items-center justify-center gap-5 pb-6 pt-3">
        {/* UNDO — small */}
        <button type="button" disabled={animating}
          className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-yellow-400 text-lg shadow disabled:opacity-40 active:scale-90 transition">
          ↩
        </button>

        {/* NOPE */}
        <button type="button" onClick={() => finish("skip")} disabled={animating}
          style={{
            opacity: dir === "left" ? 0.65 + progress * 0.35 : 1,
            transform: dir === "left" ? `translateY(${-progress * 20}px) scale(${1 + progress * 0.1})` : undefined,
          }}
          className="w-16 h-16 rounded-full bg-white border-2 border-[#FF4458] flex items-center justify-center shadow-lg disabled:opacity-40 active:scale-90 transition">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF4458">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        {/* SUPER LIKE — small */}
        <button type="button" disabled={animating}
          className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[#00B4E4] text-xl shadow disabled:opacity-40 active:scale-90 transition">
          ★
        </button>

        {/* LIKE */}
        <button type="button" onClick={() => finish("like")} disabled={animating}
          style={{
            opacity: dir === "right" ? 0.65 + progress * 0.35 : 1,
            transform: dir === "right" ? `translateY(${-progress * 20}px) scale(${1 + progress * 0.1})` : undefined,
          }}
          className="w-16 h-16 rounded-full bg-white border-2 border-[#00E08F] flex items-center justify-center shadow-lg disabled:opacity-40 active:scale-90 transition">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#00E08F">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </button>

        {/* BOOST — small */}
        <button type="button" disabled={animating}
          className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-purple-400 text-lg shadow disabled:opacity-40 active:scale-90 transition">
          ⚡
        </button>
      </div>

      {/* MATCH MODAL */}
      {externalShowMatch && externalMatchId && (
        <MatchModal
          onClose={onCloseMatch ?? (() => {})}
          onOpenChat={onOpenChat ?? (() => {})}
          meName={myProfile?.nickname ?? myProfile?.first_name ?? "Me"}
          myPhoto={myProfile?.photo1_url ?? null}
          matchName={otherUser?.nickname ?? otherUser?.first_name ?? "Someone"}
          theirPhoto={otherUser?.photo1_url ?? null}
        />
      )}
    </div>
  );
}

function TinderSkeleton() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black gap-4">
      <div className="w-full max-w-[420px] bg-zinc-900 animate-pulse rounded-2xl" style={{ height: "min(calc(100dvh - 130px), 560px)" }} />
      <div className="flex gap-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`rounded-full bg-zinc-800 animate-pulse ${i === 1 || i === 3 ? "w-16 h-16" : "w-12 h-12"}`} />
        ))}
      </div>
    </div>
  );
}

function TinderEmpty({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const router = useRouter();
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white px-8 bg-black">
      <div className="text-6xl">😅</div>
      <h2 className="text-xl font-black text-center">You've seen everyone!</h2>
      <p className="text-sm text-white/40 text-center">Come back later for new people nearby.</p>
      <button onClick={() => router.push("/feed")}
        className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3 font-bold text-white shadow-lg">
        Refresh
      </button>
    </div>
  );
}
