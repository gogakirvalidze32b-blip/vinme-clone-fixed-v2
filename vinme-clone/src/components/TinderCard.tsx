"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";
import MatchModal from "./MatchModal";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  nickname: string | null;
  photo1_url: string | null;
};

type CardUser = {
  user_id: string; // target uuid
  nickname: string;
  age: number;
  city: string;
  distanceKm?: number;
  recentlyActive?: boolean;
  photo_url?: string | null;
  photo1_url?: string | null;
};

type Props = {
  user: CardUser | null;
  otherUserId?: string;
  myPhoto?: string | null;
  myName?: string;
  loading?: boolean;
  onLike?: () => string | null | Promise<string | null>;
  onSkip?: () => void | Promise<void>;
  onOpenProfile?: () => void;
  showTopTabs?: boolean;
};

const NAV_H = 60; // BottomNav height

export default function TinderCard({
  user,
  otherUserId,
  loading,
  onLike,
  onSkip,
  onOpenProfile,
  showTopTabs = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ ALL HOOKS FIRST
  const [x, setX] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);

  const [me, setMe] = useState<ProfileRow | null>(null);
  const [otherUser, setOtherUser] = useState<ProfileRow | null>(null);

  const [showMatch, setShowMatch] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);

  const startX = useRef(0);
  const downAt = useRef(0);

  const threshold = 120;
  const progress = Math.min(Math.abs(x) / threshold, 1);
  const dir = x > 10 ? "right" : x < -10 ? "left" : "none";

  // ✅ picture url
const imgSrc = useMemo(() => {
  // აიღე ფოტო path/url სხვადასხვა ველიდან
  const raw =
    user?.photo1_url ??
    user?.photo_url ??
   
    null;

  // photoSrc თვითონ აკეთებს PATH -> public URL
  return photoSrc(raw);
}, [user?.photo1_url, user?.photo_url, ]);

  // ✅ load ME + OTHER USER (for modal)
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      if (!uid) return;

      const meRes = await supabase
        .from("profiles")
        .select("user_id, first_name, nickname, photo1_url")
        .eq("user_id", uid)
        .maybeSingle();

      if (alive && !meRes.error) {
        setMe((meRes.data as ProfileRow) ?? null);
      }

      if (!otherUserId) {
        if (alive) setOtherUser(null);
        return;
      }

      const otherRes = await supabase
        .from("profiles")
        .select("user_id, first_name, nickname, photo1_url")
        .eq("user_id", otherUserId)
        .maybeSingle();

      if (otherRes.error) {
        console.error("OTHER USER load error:", otherRes.error.message);
        if (alive) setOtherUser(null);
      } else {
        if (alive) setOtherUser((otherRes.data as ProfileRow) ?? null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [otherUserId]);

  const closeMatch = () => setShowMatch(false);

  async function getOrCreateMatch(targetUserId: string) {
    if (typeof window === "undefined") return null;

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("auth.getUser error:", error);
      return null;
    }

    const myId = data.user?.id ?? null;
    if (!myId) return null;

    // check existing match (both orders)
    const { data: existing, error: findErr } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(user_a.eq.${myId},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${myId})`
      )
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existing?.id) return String(existing.id);

    // create
    const { data: created, error: createErr } = await supabase
      .from("matches")
      .insert({ user_a: myId, user_b: targetUserId })
      .select("id")
      .single();

    if (createErr) throw createErr;
    return created?.id ? String(created.id) : null;
  }
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
      if (action === "like") {
        const id = await onLike?.();
        if (id) {
          setMatchId(String(id));
          setShowMatch(true);
        }
      } else {
        await onSkip?.();
      }
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
    <div className="relative w-full h-full bg-black text-white overflow-hidden">
      {/* ✅ CARD WRAPPER: height = viewport - BottomNav */}
      <div className="mx-auto w-full max-w-[480px] px-0">
        <div
          className="relative w-full overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          style={{
            height: `calc(100dvh - (${NAV_H}px + env(safe-area-inset-bottom)))`,
            transform: `translateX(${x}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 180ms ease-out",
            willChange: "transform",
            touchAction: "pan-y",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* ✅ IMAGE */}
          <div className="absolute inset-0">
            <img
              src={imgSrc || "/bg-retro-mobile.png"}
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
            />
          </div>

          {/* ✅ GRADIENT */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/25 via-transparent to-black/75" />

          {/* ✅ TOP BUTTONS */}
          <button
            type="button"
            onClick={() => router.push("/chat")}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            className="absolute left-4 top-4 z-50 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black shadow"
          >
            TEST
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={async (e) => {
              e.stopPropagation();
              if (!otherUserId) return;

              try {
                const id = await getOrCreateMatch(otherUserId);
                if (!id) throw new Error("Match id missing");
                setMatchId(id);
                setShowMatch(true);
              } catch (err) {
                console.error("TEST MATCH failed:", err);
              }
            }}
            className="absolute right-4 top-4 z-50 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow"
          >
            TEST MATCH
          </button>

          {/* ✅ LIKE/NOPE badge */}
          {dir !== "none" && (
            <div
              className={`absolute top-0 z-30 select-none ${
                dir === "right"
                  ? "left-4 rotate-[-10deg]"
                  : "right-4 rotate-[10deg]"
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

          {/* Top tabs */}
          {showTopTabs && (
            <div className="absolute left-0 right-0 top-0 z-40 px-4 pt-4">
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
              </div>

              <div className="mt-3 h-1 w-full rounded-full bg-white/20">
                <div className="h-1 w-1/3 rounded-full bg-white/60" />
              </div>
            </div>
          )}

          {/* ✅ INFO */}
          <div className="absolute bottom-[88px] left-0 right-0 z-30 px-4">
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
                onClick={onOpenProfile}
                className="rounded-full bg-white/10 px-3 py-3 text-lg"
              >
                ⬆️
              </button>
            </div>
          </div>

          {/* ✅ ACTIONS */}
          <div className="absolute bottom-[18px] left-0 right-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-8">
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
        </div>
      </div>

      {/* ✅ MATCH MODAL */}
      {showMatch && (
        <MatchModal
          onClose={closeMatch}
          onOpenChat={() => router.push(`/chat/${matchId}`)}
          meName={me?.nickname ?? me?.first_name ?? "მე"}
          myPhoto={me?.photo1_url ?? null}
          matchName={otherUser?.nickname ?? otherUser?.first_name ?? "ვიღაც"}
          theirPhoto={otherUser?.photo1_url ?? null}
        />
      )}

      {/* ✅ BOTTOM PANEL (full width like Tinder) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999]">
        <div className="w-full bg-black/60 backdrop-blur-md border-t border-white/10">
          <div className="mx-auto flex max-w-[420px] items-center justify-between px-4 py-2 pb-[max(6px,env(safe-area-inset-bottom))]">
            {/* 1) MATCHES 💕 (გული ოდნავ მარცხნივ) */}
            <button
              type="button"
              onClick={() => router.push("/matches")}
              className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition -ml-2 ${
                pathname === "/matches" ? "text-pink-400" : "text-white/70"
              }`}
            >
              💕
            </button>

            {/* 2) CARDS STACK (🔥 მაგივრად) */}
            <button
              type="button"
              onClick={() => router.push("/feed")}
              className={`flex h-10 w-10 items-center justify-center active:scale-95 transition ${
                pathname === "/feed" ? "text-white" : "text-white/60"
              }`}
              aria-label="Cards"
            >
              <CardStackIcon active={pathname === "/feed"} />
            </button>

            {/* 3) CHAT */}
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className={`flex h-10 w-10 items-center justify-center text-xl active:scale-95 transition ${
                pathname === "/chat" ? "text-white" : "text-white/70"
              }`}
            >
              💬
            </button>

            {/* 4) PROFILE */}
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
    </div>
  );
}

/* ===== Helpers (ფაილის ბოლოში უნდა იყოს) ===== */

function TinderSkeleton() {
  return (
    <div className="fixed inset-0 overflow-hidden text-white flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
    </div>
  );
}

function TinderEmpty({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-white px-4 bg-black">
      <p className="text-lg font-semibold">No profiles found 😅</p>

      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-xl bg-white/10 px-4 py-3 font-semibold text-white ring-1 ring-white/10 hover:bg-white/15"
          onClick={() => router.push("/feed")}
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
        disabled ? "opacity-60 cursor-not-allowed" : "active:scale-95",
        primary
          ? "bg-emerald-400/90 text-black hover:bg-emerald-400"
          : "bg-white/10 text-white hover:bg-white/20",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CardStackIcon({
  active,
  size = 26,
}: {
  active?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* back card */}
      <g transform="translate(10,14) rotate(-18 20 20)">
        <rect
          x="6"
          y="10"
          width="22"
          height="30"
          rx="8"
          opacity={active ? 0.45 : 0.22}
        />
      </g>

      {/* front card */}
      <g transform="translate(18,8) rotate(8 22 22)">
        <rect
          x="14"
          y="8"
          width="28"
          height="38"
          rx="10"
          opacity={active ? 0.9 : 0.6}
        />
      </g>
    </svg>
  );
}