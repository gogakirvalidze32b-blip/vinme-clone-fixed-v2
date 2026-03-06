"use client";

import { UserProvider } from "@/lib/userContext";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  // chat thread-ზე არ ჩართოს — იქ საკუთარი pull to refresh აქვს
  const skip = pathname?.match(/^\/chat\/.+/);

  function onTouchStart(e: TouchEvent) {
    if (skip) return;
    const el = document.documentElement;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }

  function onTouchMove(e: TouchEvent) {
    if (!pulling.current || skip) return;
    const el = document.documentElement;
    if (el.scrollTop > 0) { pulling.current = false; setPullY(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPullY(Math.min(dy * 0.4, 70));
  }

  async function onTouchEnd() {
    if (!pulling.current || skip) return;
    pulling.current = false;
    if (pullY >= 55) {
      setRefreshing(true);
      setPullY(0);
      router.refresh();
      await new Promise(r => setTimeout(r, 800));
      setRefreshing(false);
    } else {
      setPullY(0);
    }
  }

  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, pathname]);

  return (
    <div style={{ transform: pullY > 0 ? `translateY(${pullY}px)` : undefined, transition: pullY === 0 ? "transform 0.2s" : "none" }}>
      {(pullY > 10 || refreshing) && (
        <div className="fixed top-0 left-0 right-0 z-[999] flex justify-center pt-3 pointer-events-none">
          <div className="bg-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-xl">
            <span className={`text-white text-sm ${refreshing ? "animate-spin" : ""}`}>
              {refreshing ? "↻" : "↓"}
            </span>
            <span className="text-white/70 text-xs">
              {refreshing ? "განახლება..." : "გაანახლე"}
            </span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <PullToRefresh>{children}</PullToRefresh>
    </UserProvider>
  );
}