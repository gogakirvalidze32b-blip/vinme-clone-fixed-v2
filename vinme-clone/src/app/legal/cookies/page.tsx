"use client";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

export default function CookiePage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
        <button onClick={() => router.back()} className="text-pink-400 mb-4 block">← {ka ? "უკან" : "Back"}</button>
        <h1 className="text-2xl font-extrabold">{ka ? "ქუქი-პოლიტიკა" : "Cookie Policy"}</h1>
        <p className="mt-1 text-xs text-white/40">{ka ? "ბოლო განახლება: 2025 წლის 1 იანვარი" : "Last updated: January 1, 2025"}</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
          {ka ? (
            <>
              <p>„შეხვდი" იყენებს cookie-ებს სერვისის ფუნქციონირებისა და გაუმჯობესებისთვის.</p>
              <section>
                <h2 className="font-extrabold text-white mb-2">1. რა არის Cookie?</h2>
                <p>Cookie — პატარა ტექსტური ფაილია, რომელიც ინახება თქვენს მოწყობილობაზე. ეხმარება სესიის შენარჩუნებასა და პარამეტრების დამახსოვრებაში.</p>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">2. Cookie-ების ტიპები</h2>
                <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/10 mb-2">
                  <div className="font-semibold text-white">აუცილებელი Cookie-ები</div>
                  <div className="text-xs text-white/50 mt-1">სერვისის მუშაობისთვის აუცილებელი. ვერ გამოიყენება მათ გარეშე. (supabase-auth-token)</div>
                </div>
                <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/10 mb-2">
                  <div className="font-semibold text-white">ანალიტიკური Cookie-ები</div>
                  <div className="text-xs text-white/50 mt-1">გამოიყენება მხოლოდ თანხმობის შემდეგ. გვეხმარება სერვისის გასაუმჯობესებლად.</div>
                </div>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">3. Cookie-ების მართვა</h2>
                <p>ბრაუზერის პარამეტრებში შეგიძლიათ Cookie-ები გამორთოთ, თუმცა ეს შეიძლება გავლენა ჰქონდეს სერვისის მუშაობაზე.</p>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">4. კონტაქტი</h2>
                <p>კითხვებისთვის: <span className="text-pink-400">privacy@shekhvdi.ge</span></p>
              </section>
            </>
          ) : (
            <>
              <p>Shekhvdi uses cookies for service functionality and improvement.</p>
              <section>
                <h2 className="font-extrabold text-white mb-2">1. What is a Cookie?</h2>
                <p>A cookie is a small text file stored on your device. It helps maintain sessions and remember preferences.</p>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">2. Types of Cookies</h2>
                <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/10 mb-2">
                  <div className="font-semibold text-white">Essential Cookies</div>
                  <div className="text-xs text-white/50 mt-1">Required for the service to function. Cannot be disabled. (supabase-auth-token)</div>
                </div>
                <div className="rounded-xl bg-zinc-900 p-3 ring-1 ring-white/10 mb-2">
                  <div className="font-semibold text-white">Analytics Cookies</div>
                  <div className="text-xs text-white/50 mt-1">Only used with your consent. Help us improve the service.</div>
                </div>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">3. Managing Cookies</h2>
                <p>You can disable cookies in your browser settings, though this may affect service functionality.</p>
              </section>
              <section>
                <h2 className="font-extrabold text-white mb-2">4. Contact</h2>
                <p>Questions: <span className="text-pink-400">privacy@shekhvdi.ge</span></p>
              </section>
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
import React from "react";
