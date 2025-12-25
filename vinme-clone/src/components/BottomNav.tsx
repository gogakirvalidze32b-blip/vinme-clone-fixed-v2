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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl bg-black/45 backdrop-blur-md ring-1 ring-white/10">
        <nav className="flex justify-around rounded-3xl bg-black/40 py-3 backdrop-blur">
          <button type="button" onClick={() => router.push("/feed")} className={btn("/feed")}>
            🔥
          </button>
          <button type="button" onClick={() => router.push("/likes")} className={btn("/likes")}>
            ❤️
          </button>
          <button type="button" onClick={() => router.push("/chat")} className={btn("/chat")}>
            💬
          </button>
          <button type="button" onClick={() => router.push("/profile")} className={btn("/profile")}>
            👤
          </button>
        </nav>
      </div>
    </div>
  );
}
