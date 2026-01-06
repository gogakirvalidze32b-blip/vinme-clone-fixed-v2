"use client";

import { useEffect, useState } from "react";
import { getLangClient, setLangClient } from "@/lib/i18n";

export default function LangMenu() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<"ka" | "en">("ka");

  useEffect(() => {
    setLang(getLangClient());
  }, []);

  function select(l: "ka" | "en") {
    setLangClient(l);
    setLang(l);
    setOpen(false);
    window.location.reload(); // მარტივი და საიმედო
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-sm text-white ring-1 ring-white/10"
      >
        🌐 {lang === "ka" ? "ქართული" : "English"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-32 rounded-xl bg-zinc-900 ring-1 ring-white/10 overflow-hidden">
          <button
            onClick={() => select("ka")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10"
          >
            ქართული
          </button>
          <button
            onClick={() => select("en")}
            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10"
          >
            English
          </button>
        </div>
      )}
    </div>
  );
}
