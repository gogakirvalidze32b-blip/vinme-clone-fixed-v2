"use client";

import React, { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import MatchModal from "./MatchModal";



// ✅ ჩასვი სადაც გაქვს რეალურად

// ⚠️ თუ path სხვანაირია, შეცვალე: "@/components/MatchModal" -> "@/app/..." ან "@/components/modals/..."

type CardUser = {
  user_id: string; // ✅ ესაა target uuid
  nickname: string;
  age: number;
  city: string;
  distanceKm?: number;
  recentlyActive?: boolean;
  photo_url?: string | null;
};

type Props = {
  user: CardUser | null;
  otherUserId?: string;
  myPhoto?: string | null;          // ✅ დაამატე
  myName?: string;                  // სურვილისამებრ
  loading?: boolean;
  onLike?: () => string | null | Promise<string | null>;
  onSkip?: () => void | Promise<void>;
  onOpenProfile?: () => void;
  showTopTabs?: boolean;
};

export default function TinderCard({
  user,
  otherUserId,
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
  const [matchId, setMatchId] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const startX = useRef(0);
  const downAt = useRef(0);

  const threshold = 120;
  const progress = Math.min(Math.abs(x) / threshold, 1);
  const dir = x > 10 ? "right" : x < -10 ? "left" : "none";

  // ✅ აქ იყო კონფლიქტი photoSrc სახელზე — ვტოვებ იგივე ლოგიკას, უბრალოდ ვუცვლი სახელს
  const cardPhoto =
    typeof user?.photo_url === "string" &&
    user.photo_url.trim() &&
    !user.photo_url.includes("google.com/search")
      ? user.photo_url
      : "/bg-retro-mobile.png";

  const closeMatch = () => setShowMatch(false);

  // ✅ matches table: user_a / user_b
  async function getOrCreateMatch(targetUserId: string) {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw authErr;

    const me = authData.user?.id;
    if (!me) throw new Error("Not authenticated");

    const { data: existing, error: findErr } = await supabase
      .from("matches")
      .select("id")
      .or(
        `and(user_a.eq.${me},user_b.eq.${targetUserId}),and(user_a.eq.${targetUserId},user_b.eq.${me})`
      )
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;
    if (existing?.id) return String(existing.id);

    const { data: created, error: insErr } = await supabase
      .from("matches")
      .insert({ user_a: me, user_b: targetUserId })
      .select("id")
      .single();

    if (insErr) throw insErr;
    return String(created.id);
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

    // animate off-screen
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
    <div className="relative min-h-[100dvh] bg-black text-white overflow-x-hidden pb-28">
      {/* ✅ CARD WRAPPER (stick to bottom above BottomNav) */}
      <div className="relative z-10 flex w-full justify-center items-end px-0 pt-0">
        <div
          className="
            relative z-10 w-full max-w-[420px]
            h-[calc(100dvh-12px)]
            overflow-hidden
            bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55)]
          "
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
          {/* ✅ IMAGE (z-0) */}
          <img
  src={photoSrc(row.photo1_url ?? row.photo_url)}
  alt=""
  onLoad={() => {
    console.log("✅ loaded:", photoSrc(row.photo1_url ?? row.photo_url));
  }}
  onError={() => {
    console.log("❌ failed:", photoSrc(row.photo1_url ?? row.photo_url));
  }}
/>
return (
  <div>
    {/* IMAGE */}
    <img
      src={photoSrc(row.photo1_url ?? row.photo_url)}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  </div>
);


          {/* ✅ GRADIENT (z-10) */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

          {/* ✅ TOP BUTTONS (z-50) */}
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

              if (!otherUserId) {
                console.warn("Missing otherUserId, skipping match create");
                setShowMatch(true); // თუ გინდა მაინც გამოჩნდეს modal
                return;
              }

              try {
                const id = await getOrCreateMatch(otherUserId);
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

          {/* Corner LIKE/NOPE */}
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

          {/* ✅ INFO (z-30) */}
          <div className="absolute bottom-28 left-0 right-0 z-30 px-4">
            {user.recentlyActive && (
              <span className="inline-block rounded-full bg-emerald-300/90 px-3 py-1 text-xs font-semibold text-black">
                Recently Active
              </span>
            )}

            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-extrabold leading-tight">
                  {user.nickname}{" "}
                  <span className="font-semibold text-white/90">
                    {user.age}
                  </span>
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

          {/* ✅ ACTIONS (z-40) */}
          <div className="absolute bottom-15 left-0 right-0 z-40 flex justify-center">
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
        </div>
      </div>

      {/* ✅ MATCH MODAL (External file) */}
{showMatch && (
  <MatchModal
    onClose={closeMatch}
    onOpenChat={() => {
      closeMatch();
      if (matchId) router.push(`/chat?matchId=${encodeURIComponent(matchId)}`);
      else router.push("/chat");
    }}
    meName="მე"
    matchName={user.nickname ?? "ვიღაც"}
    myPhoto={null}
    theirPhoto={user.photo_url ?? null}
  />

      )}

      {/* ✅ BOTTOM PANEL */}
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
    </div>
  );
}

function TinderSkeleton() {
  return (
    <div className="fixed inset-0 overflow-hidden text-white flex items-center justify-center bg-black">
      <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
    </div>
  );
}

function TinderEmpty({ onOpenProfile }: { onOpenProfile?: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-white px-4 bg-black">
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

