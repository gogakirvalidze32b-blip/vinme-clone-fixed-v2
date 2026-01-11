"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import GoogleButton from "@/components/GoogleButton";
import LangMenu from "@/components/LangMenu";

import { dict, getLang, type Lang } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ka");

  useEffect(() => {
    let alive = true;

    (async () => {
      // ✅ თუ უკვე logged in არის → login აღარ უნდა გამოჩნდეს
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session?.user) {
        router.replace("/onboarding");
        return;
      }

      // ✅ initial language
      setLang(getLang());
    })();

    // ✅ live updates when LangMenu changes language
    const onLangChange = () => {
      setLang(getLang());
    };

    window.addEventListener("app:lang", onLangChange);

    return () => {
      alive = false;
      window.removeEventListener("app:lang", onLangChange);
    };
  }, [router]);

  const texts = dict[lang] ?? dict.ka;

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* 🌐 language menu */}
      <div className="absolute right-4 top-4 z-50">
        <LangMenu />
      </div>

      {/* background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-red-600/25 blur-[80px]" />
        <div className="absolute -bottom-28 -right-28 h-[420px] w-[420px] rounded-full bg-rose-500/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-orange-400/10 blur-[80px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="rounded-3xl bg-zinc-950/60 p-10 ring-1 ring-white/10 backdrop-blur-xl">
            {/* logo + text */}
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src="/logo1.png"
                alt={texts.login_title}
                className="h-36 w-auto object-contain"
              />

              <p className="text-sm text-white/70">{texts.login_subtitle}</p>
            </div>

            {/* google button */}
            <div className="mt-6">
              <GoogleButton />
            </div>

            {/* terms */}
            <div className="mt-4 text-center text-xs text-zinc-400">
              {texts.login_terms}
            </div>
          </div>

          {/* footer */}
          <div className="mt-6 text-center text-xs text-zinc-500">
            {texts.login_title} • {texts.beta}
          </div>
        </div>
      </div>
    </div>
  );
}