"use client";

import Image from "next/image";
import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-hidden">
      {/* warm glow background */}
      <div className="pointer-events-none absolute inset-0">
        {/* soft radial glows */}
        <div className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-red-600/25 blur-[80px]" />
        <div className="absolute -bottom-28 -right-28 h-[420px] w-[420px] rounded-full bg-rose-500/20 blur-[90px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[260px] w-[260px] rounded-full bg-orange-400/10 blur-[80px]" />

        {/* subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.55)_55%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="rounded-3xl bg-zinc-950/60 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(255,0,60,0.18)]">
            {/* Logo */}
            <div className="flex flex-col items-center text-center">
              {/* ჩააგდე შენი ლოგო აქ: /public/brand/shekhvdi-logo.png */}
        <div className="flex flex-col items-center gap-4">
  <img src="/logo1.png"
    alt="Shekhvdi"
    className="h-30 object-contain"
  />

  <p className="text-white/70 text-sm text-center">
    შეხვდი ახალ ადამიანებს — მარტივად.
  </p>
</div>




    
            </div>

            {/* Button */}
            <div className="mt-6">
              <GoogleButton />
            </div>

            {/* Small note */}
            <div className="mt-4 text-center text-xs text-zinc-400">
              გაგრძელებით ეთანხმები წესებს და კონფიდენციალურობას.
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
