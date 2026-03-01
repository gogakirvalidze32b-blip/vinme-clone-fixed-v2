"use client";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

export default function LicensesPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  const libs = [
    { name: "Next.js", version: "15.x", license: "MIT", author: "Vercel" },
    { name: "React", version: "18.x", license: "MIT", author: "Meta" },
    { name: "Supabase", version: "2.x", license: "Apache 2.0", author: "Supabase Inc." },
    { name: "Tailwind CSS", version: "4.x", license: "MIT", author: "Tailwind Labs" },
    { name: "emoji-picker-react", version: "4.x", license: "MIT", author: "ealush" },
    { name: "TypeScript", version: "5.x", license: "Apache 2.0", author: "Microsoft" },
  ];

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
        <button onClick={() => router.back()} className="text-pink-400 mb-4 block">← {ka ? "უკან" : "Back"}</button>
        <h1 className="text-2xl font-extrabold mb-1">{ka ? "ლიცენზიები" : "Licenses"}</h1>
        <p className="text-xs text-white/40 mb-6">{ka ? "ღია კოდის ბიბლიოთეკები" : "Open source libraries used in this app"}</p>

        <div className="space-y-2">
          {libs.map(lib => (
            <div key={lib.name} className="rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-white/8 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">{lib.name}</div>
                <div className="text-xs text-white/40">{lib.author} · v{lib.version}</div>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">{lib.license}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8">
          <div className="font-semibold text-sm mb-2">{ka ? "Shekhvdi" : "Shekhvdi"}</div>
          <div className="text-xs text-white/50 leading-relaxed">
            {ka
              ? "© 2025 Shekhvdi. ყველა უფლება დაცულია. ეს აპლიკაცია გამოიყენებს ღია კოდის ბიბლიოთეკებს ზემოთ ჩამოთვლილი ლიცენზიებით."
              : "© 2025 Shekhvdi. All rights reserved. This application uses open source libraries under the licenses listed above."}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
