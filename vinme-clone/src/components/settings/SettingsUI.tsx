"use client";

import React from "react";

export function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[15px] font-semibold text-white/90">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-white/10" />;
}

export function Row({
  title,
  subtitle,
  left,
  right,
  onClick,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "flex items-start gap-3 px-4 py-4",
        onClick ? "cursor-pointer active:bg-white/5" : "",
      ].join(" ")}
      role={onClick ? "button" : undefined}
    >
      {left ? <div className="pt-[2px]">{left}</div> : null}

      <div className="flex-1">
        <div className="text-[15px] font-semibold text-white">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-[13px] leading-5 text-white/60">
            {subtitle}
          </div>
        ) : null}
      </div>

      {right ? <div className="pt-[2px]">{right}</div> : null}
    </div>
  );
}

export function Chevron() {
  return <span className="text-white/35 text-xl leading-none">›</span>;
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      className={[
        "relative h-7 w-12 rounded-full transition",
        value ? "bg-pink-500/90" : "bg-white/15",
      ].join(" ")}
      aria-pressed={value}
    >
      <span
        className={[
          "absolute top-1 h-5 w-5 rounded-full bg-white transition",
          value ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}