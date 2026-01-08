"use client";

import { useEffect, useState } from "react";
import { getLang, setLang, type Lang } from "@/lib/i18n";

export default function LangMenu() {
  const [lang, setLangState] = useState<Lang>("ka");

  useEffect(() => {
    setLangState(getLang());
  }, []);

  function toggle() {
    const next: Lang = getLang() === "en" ? "ka" : "en";
    setLang(next);
    setLangState(next);

    // ✅ notify all pages/components (Login/Onboarding/Feed/etc)
    window.dispatchEvent(new Event("app:lang"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white backdrop-blur"
    >
      🌐 {lang === "en" ? "English" : "ქართული"}
    </button>
  );
}