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
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 py-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
        </div>

        {/* content */}
        <div className="mt-6 flex-1 space-y-4">{children}</div>

        {/* footer stays near bottom */}
        {footer && <div className="mt-8 pb-2">{footer}</div>}
      </div>
    </main>
  );
}
