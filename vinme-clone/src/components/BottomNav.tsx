"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const btn = (path: string) =>
    `text-xl transition ${
      pathname === path ? "text-white" : "text-white/70 hover:text-white"
    }`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="bg-black/60 backdrop-blur border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
          <nav className="flex justify-around py-3">
            <button onClick={() => router.push("/feed")} className={btn("/feed")}>
              🔥
            </button>
            <button onClick={() => router.push("/likes")} className={btn("/likes")}>
              ❤️
            </button>
            <button onClick={() => router.push("/chat")} className={btn("/chat")}>
              💬
            </button>
            <button onClick={() => router.push("/profile")} className={btn("/profile")}>
              👤
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
