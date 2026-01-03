"use client";

import React, { useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  onDelete: () => Promise<void> | void;
  disabled?: boolean;
};

export default function SwipeToDeleteRow({ children, onDelete, disabled }: Props) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const horizontal = useRef<boolean | null>(null);

  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);

  const max = 96;
  const lock = 6;

  const clamp = (v: number) => Math.max(-max, Math.min(0, v));

  const begin = (x: number, y: number) => {
    if (disabled) return;
    dragging.current = true;
    horizontal.current = null;
    startX.current = x;
    startY.current = y;
  };

  const move = (x: number, y: number) => {
    if (!dragging.current || startX.current == null || startY.current == null) return;

    const dx0 = x - startX.current;
    const dy0 = y - startY.current;

    if (horizontal.current === null) {
      if (Math.abs(dx0) < lock && Math.abs(dy0) < lock) return;
      horizontal.current = Math.abs(dx0) > Math.abs(dy0);
    }

    if (!horizontal.current) return;

    const base = open ? -max : 0;
    setDx(clamp(base + dx0));
  };

  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    startX.current = null;
    startY.current = null;

    const shouldOpen = dx < -max * 0.4;
    setOpen(shouldOpen);
    setDx(shouldOpen ? -max : 0);
  };

  const handleDelete = async () => {
    if (disabled) return;
    await onDelete();
    setOpen(false);
    setDx(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl select-none">
      {/* behind */}
      <div className="absolute inset-0 flex justify-end">
        <button
          type="button"
          onClick={handleDelete}
          className="w-24 bg-red-500 text-black font-extrabold flex items-center justify-center"
        >
          Delete
        </button>
      </div>

      {/* front */}
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? "none" : "transform 160ms ease",
          touchAction: "pan-y",
        }}
        // ✅ მთავარია: swipe-ზე არ გადავიდეს chat-ში
        onClickCapture={(e) => {
          if (open || Math.abs(dx) > 8) e.stopPropagation();
        }}
        onTouchStart={(e) => begin(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => {
          move(e.touches[0].clientX, e.touches[0].clientY);
          if (horizontal.current) e.preventDefault();
        }}
        onTouchEnd={end}
      >
        {children}
      </div>
    </div>
  );
}