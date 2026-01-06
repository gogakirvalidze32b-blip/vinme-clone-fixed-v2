"use client";

import { useRouter } from "next/navigation";
import { setLangClient, getLangClient } from "@/lib/i18n";

export default function LangPage() {
  const router = useRouter();
  const current = getLangClient();

  function choose(lang: "en" | "ka") {
    setLangClient(lang);
    router.replace("/login");
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
        <div className="text-xl font-extrabold">Choose language</div>
        <div className="mt-2 text-sm text-white/60">
          Select English or ქართული
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => choose("en")}
            className={[
              "rounded-2xl px-4 py-3 font-extrabold active:scale-[0.99]",
              current === "en" ? "bg-white text-black" : "bg-white/10 text-white",
            ].join(" ")}
          >
            English
          </button>

          <button
            onClick={() => choose("ka")}
            className={[
              "rounded-2xl px-4 py-3 font-extrabold active:scale-[0.99]",
              current === "ka" ? "bg-white text-black" : "bg-white/10 text-white",
            ].join(" ")}
          >
            ქართული
          </button>
        </div>
      </div>
    </main>
  );
}
