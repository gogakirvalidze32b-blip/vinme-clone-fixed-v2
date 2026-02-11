"use client";

import { useEffect, useState } from "react";
import GoogleButton from "@/components/GoogleButton";
import LangMenu from "@/components/LangMenu";
import { dict, getLang, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const [lang, setLang] = useState<Lang>("ka");

  useEffect(() => {
    setLang(getLang());
    const onLangChange = () => setLang(getLang());
    window.addEventListener("app:lang", onLangChange);
    return () => window.removeEventListener("app:lang", onLangChange);
  }, []);

  const texts = dict[lang] ?? dict.ka;

  return (
    <div className="relative min-h-[100dvh] w-full bg-black text-white">
      <div className="absolute right-4 top-4 z-50">
        <LangMenu />
      </div>

      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="w-full max-w-[420px] rounded-3xl bg-zinc-950/60 p-10 ring-1 ring-white/10">
          <div className="flex flex-col items-center gap-4 text-center">
            <img src="/logo1.png" className="h-36" />
            <p className="text-sm text-white/70">{texts.login_subtitle}</p>
          </div>

          <div className="mt-6">
            <GoogleButton />
          </div>

          <div className="mt-4 text-center text-xs text-zinc-400">
            {texts.login_terms}
          </div>

          <div className="mt-6 text-center text-xs text-zinc-500">
            {texts.login_title} • {texts.beta}
          </div>
        </div>
      </div>
    </div>
  );
}

