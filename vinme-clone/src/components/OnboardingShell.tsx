"use client";

import React from "react";

export default function OnboardingShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
<main className="min-h-[100svh] w-full bg-zinc-950 text-white">
  <div className="w-full px-5 py-8">
    <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
    {subtitle && (
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
    )}

    <div className="mt-6 space-y-4">{children}</div>

    {footer && <div className="mt-8">{footer}</div>}
  </div>
</main>
  );
}
