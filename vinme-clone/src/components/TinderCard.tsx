"use client";
 
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";
import MatchModal from "./MatchModal";
import { supabase } from "@/lib/supabase";
import { getLang, t } from "@/lib/i18n";
import Image from "next/image";
 
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
  onSuperLike?: () => void | Promise<void>;
  onSendMessage: (message: string) => void;
  messagesLeft: number;
  onFirstImpression?: (message: string) => void | Promise<void>;
  superLikesLeft?: number;
  firstImpressionsLeft?: number;
  externalMatchId?: string | null;
  externalShowMatch?: boolean;
  onCloseMatch?: () => void;
  onOpenChat?: () => void;
  matchedUserName?: string;
  matchedUserPhoto?: string | null;
  onOpenProfile?: () => void;
};
 
export default function TinderCard({
  user, otherUserId, myProfile, loading,
  onLike, onSkip, onSuperLike, onFirstImpression,
  onSendMessage,   // ✅
  messagesLeft,    // ✅
  superLikesLeft = 0, firstImpressionsLeft = 0,
  externalMatchId, externalShowMatch, onCloseMatch, onOpenChat,
  matchedUserName, matchedUserPhoto, onOpenProfile,
}: Props) {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
 
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rot, setRot] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [superLikeAnim, setSuperLikeAnim] = useState(false);
  const [showFIModal, setShowFIModal] = useState(false);
  const [fiMessage, setFiMessage] = useState("");
  const [fiSending, setFiSending] = useState(false);
 
  const startX = useRef(0);
  const startY = useRef(0);
  const downAt = useRef(0);
 
  const threshold = 90;
  const progress = Math.min(Math.abs(x) / threshold, 1);
  const dir = x > 12 ? "right" : x < -12 ? "left" : "none";
  const upProgress = Math.min(Math.max(-y, 0) / 100, 1);
  const isSuperDir = y < -60 && Math.abs(x) < 60;
 
  const imgSrc = useMemo(() => photoSrc(user?.photo1_url ?? user?.photo_url ?? null),
    [user?.photo1_url, user?.photo_url]);
 
  useEffect(() => {
    if (!otherUserId) { setOtherUser(null); return; }
    setOtherUser(null);
    supabase.from("profiles").select("user_id,first_name,nickname,photo1_url")
      .eq("user_id", otherUserId).maybeSingle()
      .then(({ data }) => setOtherUser(data ?? null));
  }, [otherUserId]);
 
  if (!user) return <TinderEmpty onOpenProfile={onOpenProfile} lang={lang} />;
 
  function onPointerDown(e: React.PointerEvent) {
    if (animating || showFIModal) return;
    setDragging(true);
    downAt.current = Date.now();
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  }
 
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || animating || showFIModal) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    setX(dx);
    setY(dy);
    setRot(Math.max(-15, Math.min(15, dx / 14)));
  }
 
  async function finish(action: "like" | "skip" | "super_like") {
    if (animating) return;
    setAnimating(true);
 
    if (action === "super_like") {
      setSuperLikeAnim(true);
      setY(-window.innerHeight);
      await new Promise((r) => setTimeout(r, 150));
      try { await onSuperLike?.(); }
      finally {
        setX(0); setY(0); setRot(0);
        setDragging(false); setAnimating(false);
        setSuperLikeAnim(false);
      }
      return;
    }
 
    setX(action === "like" ? window.innerWidth : -window.innerWidth);
    setRot(action === "like" ? 15 : -15);
    await new Promise((r) => setTimeout(r, 120));
    try {
      if (action === "like") await onLike?.();
      else await onSkip?.();
    } finally {
      setX(0); setY(0); setRot(0); setDragging(false); setAnimating(false);
    }
  }
 
  function onPointerUp() {
    if (!dragging || animating || showFIModal) return;
    setDragging(false);
    const quick = Date.now() - downAt.current < 200;
    const thr = quick ? threshold * 0.7 : threshold;
    if (isSuperDir && superLikesLeft > 0) return void finish("super_like");
    if (x > thr) return void finish("like");
    if (x < -thr) return void finish("skip");
    setX(0); setY(0); setRot(0);
  }
 
  async function handleSendFI() {
    if (!fiMessage.trim() || fiSending) return;
    setFiSending(true);
    try {
      await onFirstImpression?.(fiMessage.trim());
      setShowFIModal(false);
      setFiMessage("");
    } finally {
      setFiSending(false);
    }
  }
 
  return (
    <div className="relative w-full bg-black text-white flex flex-col" style={{ height: "100dvh" }}>
 
      {/* CARD */}
      <div className="flex-1 flex items-start justify-center pt-2 px-3 overflow-hidden">
        <div
          className="relative overflow-hidden bg-zinc-900 shadow-2xl w-full"
          style={{
            maxWidth: "420px",
            height: "min(calc(100dvh - 130px), 680px)",
            borderRadius: "20px",
            transform: `translateX(${x}px) translateY(${y}px) rotate(${rot}deg)`,
            transition: dragging ? "none" : "transform 200ms ease-out",
            willChange: "transform",
            touchAction: "pan-y",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: dragging ? "grabbing" : "grab",
            boxShadow: isSuperDir ? "0 25px 60px rgba(0,180,228,0.5)" : "0 25px 60px rgba(0,0,0,0.6)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {imgSrc
            ? <Image src={imgSrc} alt="" fill draggable={false}
                className="object-cover object-center select-none pointer-events-none"
                onDragStart={e => e.preventDefault()}
                sizes="(max-width: 460px) 100vw, 460px"
                priority unoptimized={false} />
            : <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center text-7xl">👤</div>
          }
 
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-black/85" />
 
          {dir === "right" && (
            <div className="absolute top-10 left-5 z-30" style={{ opacity: Math.min(progress * 1.8, 1), transform: "rotate(-22deg)" }}>
              <div className="border-4 border-[#00E08F] rounded-lg px-4 py-1">
                <span className="text-[#00E08F] text-3xl font-black tracking-[0.15em]">LIKE</span>
              </div>
            </div>
          )}
 
          {dir === "left" && (
            <div className="absolute top-10 right-5 z-30" style={{ opacity: Math.min(progress * 1.8, 1), transform: "rotate(22deg)" }}>
              <div className="border-4 border-[#FF4458] rounded-lg px-4 py-1">
                <span className="text-[#FF4458] text-3xl font-black tracking-[0.15em]">NOPE</span>
              </div>
            </div>
          )}
 
          {(isSuperDir || superLikeAnim) && (
            <div className="absolute inset-x-0 top-1/3 z-30 flex justify-center"
              style={{ opacity: Math.min(upProgress * 2, 1) }}>
              <div className="border-4 border-[#00B4E4] rounded-lg px-6 py-2">
                <span className="text-[#00B4E4] text-3xl font-black tracking-[0.15em]">SUPER LIKE</span>
              </div>
            </div>
          )}
 
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[1.75rem] font-black text-white leading-tight drop-shadow-lg">{user.nickname}</h2>
                  <span className="text-[1.6rem] font-light text-white/90">{user.age}</span>
                  {user.recentlyActive && (
                    <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-black">●</span>
                  )}
                </div>
                <p className="text-[13px] text-white/75 mt-0.5 drop-shadow flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 opacity-80">
                    <path d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                  </svg>
                  {user.city || (ka ? "უცნობი ადგილი" : "Unknown location")}
                  {user.distanceKm != null && (
                    <span className="text-white/55 ml-1">
                      · {user.distanceKm < 1
                          ? (ka ? "1 კმ-ზე ნაკლები" : "Less than 1 km")
                          : `${user.distanceKm} ${ka ? "კმ" : "km away"}`}
                    </span>
                  )}
                </p>
              </div>
              <button type="button" onClick={onOpenProfile}
                onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition border border-white/20 shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
 
      {/* ACTION BUTTONS */}
      <div className="shrink-0 flex items-center justify-center gap-4 py-1.5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
        onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
 
        <ActionBtn size="sm" disabled={animating} color="#F7BB00" onClick={() => {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
          </svg>
        </ActionBtn>
 
        <ActionBtn size="lg" disabled={animating} color="#FF4458"
          style={{ opacity: dir === "left" ? 0.65 + progress * 0.35 : 1, transform: dir === "left" ? `translateY(${-progress * 14}px) scale(${1 + progress * 0.08})` : undefined }}
          onClick={() => finish("skip")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </ActionBtn>
 
        <ActionBtn size="sm" disabled={animating || superLikesLeft <= 0} color="#00B4E4"
          onClick={() => finish("super_like")}
          badge={superLikesLeft > 0 ? String(superLikesLeft) : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </ActionBtn>
 
        <ActionBtn size="lg" disabled={animating} color="#00E08F"
          style={{ opacity: dir === "right" ? 0.65 + progress * 0.35 : 1, transform: dir === "right" ? `translateY(${-progress * 14}px) scale(${1 + progress * 0.08})` : undefined }}
          onClick={() => finish("like")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
        </ActionBtn>
 
        {/* ✉️ First Impression */}
        <ActionBtn size="sm" disabled={animating || firstImpressionsLeft <= 0} color="#9B59B6"
          onClick={() => firstImpressionsLeft > 0 && setShowFIModal(true)}
          badge={firstImpressionsLeft > 0 ? String(firstImpressionsLeft) : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </ActionBtn>
      </div>
 
      {/* FIRST IMPRESSION MODAL */}
      {showFIModal && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="bg-zinc-900 rounded-t-3xl px-4 pt-5"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
 
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-black text-lg">
                  {ka ? "პირველი შთაბეჭდილება" : "First Impression"}
                </h2>
                <p className="text-white/40 text-xs mt-0.5">
                  {ka
                    ? `${user.nickname}-ს გაუგზავნე მესიჯი სვაიპამდე`
                    : `Send ${user.nickname} a message before swiping`}
                </p>
              </div>
              <button onClick={() => { setShowFIModal(false); setFiMessage(""); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-lg">✕</button>
            </div>
 
            {/* Preview */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-white/5">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-zinc-800">
                {imgSrc && <img src={imgSrc} className="w-full h-full object-cover" alt="" />}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{user.nickname}, {user.age}</div>
                <div className="text-white/40 text-xs">{user.city || ""}</div>
              </div>
              <div className="ml-auto text-xs text-purple-400 font-semibold">
                {firstImpressionsLeft} {ka ? "დარჩა" : "left today"}
              </div>
            </div>
 
            <textarea
              value={fiMessage}
              onChange={e => setFiMessage(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder={ka ? "დაწერე მესიჯი..." : "Write a message..."}
              className="w-full bg-white/8 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-purple-500 transition"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1 mb-3">
              <span className="text-white/20 text-xs">{fiMessage.length}/200</span>
              {firstImpressionsLeft <= 1 && (
                <span className="text-yellow-400 text-xs">
                  {ka ? "⚠️ ბოლო დღიური გამოყენება" : "⚠️ Last one today"}
                </span>
              )}
            </div>
 
            <button onClick={handleSendFI} disabled={!fiMessage.trim() || fiSending}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 py-3.5 font-bold text-white text-sm shadow-lg disabled:opacity-40 active:scale-[0.99] transition">
              {fiSending
                ? (ka ? "იგზავნება..." : "Sending...")
                : (ka ? "✉️ გაგზავნა" : "✉️ Send")}
            </button>
 
            {firstImpressionsLeft <= 1 && (
              <p className="text-center text-white/30 text-[11px] mt-2 mb-1">
                {ka ? "Plus-ით 3/დღეში" : "Get 3/day with Plus"}
              </p>
            )}
          </div>
        </div>
      )}
 
      {/* MATCH MODAL */}
      {externalShowMatch && externalMatchId && (
        <MatchModal
          onClose={onCloseMatch ?? (() => {})}
          onOpenChat={onOpenChat ?? (() => {})}
          meName={myProfile?.first_name ?? myProfile?.nickname ?? "Me"}
          myPhoto={myProfile?.photo1_url ?? null}
          matchName={matchedUserName ?? otherUser?.first_name ?? otherUser?.nickname ?? "Someone"}
          theirPhoto={matchedUserPhoto ?? otherUser?.photo1_url ?? null}
        />
      )}
    </div>
  );
}
 
function ActionBtn({ size, color, onClick, disabled, children, style, badge }: {
  size: "sm" | "lg"; color: string; onClick?: () => void;
  disabled?: boolean; children: React.ReactNode;
  style?: React.CSSProperties; badge?: string;
}) {
  const dim = size === "lg" ? "w-14 h-14" : "w-11 h-11";
  return (
    <div className="relative">
      <button type="button" onClick={onClick} disabled={disabled}
        className={`${dim} rounded-full flex items-center justify-center shadow-xl disabled:opacity-30 active:scale-90 transition-all duration-150`}
        style={{ ...style, background: `${color}18`, borderWidth: 2, borderStyle: "solid", borderColor: `${color}60`, color, backdropFilter: "blur(8px)" }}>
        {children}
      </button>
      {badge && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow"
          style={{ background: color }}>
          {badge}
        </div>
      )}
    </div>
  );
}
 
function TinderEmpty({ onOpenProfile, lang }: { onOpenProfile?: () => void; lang: "ka" | "en" }) {
  const router = useRouter();
  return (
    <div className="w-full flex flex-col items-center justify-center bg-black text-white px-8 gap-4" style={{ height: "100dvh" }}>
      <div className="text-6xl">😅</div>
      <h2 className="text-xl font-black text-center">{t("no_more", lang)}</h2>
      <p className="text-sm text-white/40 text-center">{t("no_more_sub", lang)}</p>
      <button onClick={() => router.push("/feed")}
        className="mt-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-8 py-3 font-bold text-white shadow-lg">
        {t("refresh", lang)}
      </button>
    </div>
  );
}