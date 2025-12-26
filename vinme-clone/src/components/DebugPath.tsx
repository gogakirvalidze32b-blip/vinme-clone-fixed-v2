"use client";

import { usePathname } from "next/navigation";

export default function DebugPath() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-2 right-2 z-[99999] rounded bg-black/70 px-2 py-1 text-xs text-white">
      {pathname}
    </div>
  );
}
