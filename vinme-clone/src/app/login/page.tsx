"use client";

import { useEffect, useState } from "react";
import GoogleButton from "@/components/GoogleButton";
import LangMenu from "@/components/LangMenu";
import { getLang } from "@/lib/i18n";

export default function LoginPage() {
  const [lang, setLang] = useState<"ka" | "en">("ka");

  useEffect(() => {
    setLang(getLang());
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white">
      {/* 🌐 language menu */}
      <div className="absolute right-4 top-4 z-50">
        <LangMenu />
      </div>

      {/* warm glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-red-600/25 blur-[80px]" />
        <div className="absolute -bottom-28 -right-28 h-[420px] w-[420px] rounded-full bg-rose-500/20 blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-orange-400/10 blur-[80px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-3xl bg-zinc-950/60 p-10 shadow-[0_0_800px_rgba(255,0,60,0.18)] ring-1 ring-white/10 backdrop-blur-xl">
            {/* Logo + text */}
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src="/logo1.png"
                alt="Shekhvdi"
                className="h-36 w-auto object-contain"
              />

              <p className="text-sm text-white/70">
                {lang === "ka"
                  ? "შეხვდი ახალ ადამიანებს — მარტივად."
                  : "Meet new people — easily."}
              </p>
            </div>

            {/* Button */}
            <div className="mt-6">
              <GoogleButton />
            </div>

            {/* Small note */}
            <div className="mt-4 text-center text-xs text-zinc-400">
              {lang === "ka"
                ? "გაგრძელებით ეთანხმები წესებს და კონფიდენციალურობას."
                : "By continuing, you agree to the terms and privacy policy."}
            </div>
          </div>

          {/* tiny footer */}
          <div className="mt-6 text-center text-xs text-zinc-500">
            Shekhvdi • beta
          </div>
        </div>
      </div>
    </div>
  );
}
