"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getLang } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? "bg-pink-500" : "bg-white/15"}`}>
      <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}

export default function PrivacyPrefsPage() {
  const router = useRouter();
  const lang = getLang();
  const ka = lang !== "en";
  const L = (k: string, e: string) => ka ? k : e;

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [personalized, setPersonalized] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
        <button onClick={() => router.back()} className="text-pink-400 mb-4 block">← {L("უკან", "Back")}</button>
        <h1 className="text-2xl font-extrabold mb-1">{L("კონფიდენციალურობის პარამეტრები", "Privacy Preferences")}</h1>
        <p className="text-xs text-white/40 mb-6">{L("მართე შენი მონაცემების გამოყენება", "Control how your data is used")}</p>
        <div className="space-y-3">
          <Pref label={L("აუცილებელი Cookie-ები", "Essential Cookies")} sub={L("ვერ გამოირთვება.", "Cannot be disabled.")} locked />
          <Pref label={L("პერსონალიზაცია", "Personalization")} sub={L("შემოთავაზებების გასაუმჯობესებლად", "Improve match recommendations")} checked={personalized} onChange={setPersonalized} />
          <Pref label={L("ანალიტიკა", "Analytics")} sub={L("ანონიმური მონაცემები სერვისის გასაუმჯობესებლად", "Anonymous data to improve the service")} checked={analytics} onChange={setAnalytics} />
          <Pref label={L("მარკეტინგი", "Marketing")} sub={L("პერსონალური შეთავაზებები", "Personalized offers and promotions")} checked={marketing} onChange={setMarketing} />
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="mt-6 w-full rounded-2xl bg-white py-4 font-bold text-black">
          {saved ? `✓ ${L("შენახულია!", "Saved!")}` : L("შენახვა", "Save")}
        </button>
        <p className="mt-4 text-xs text-white/30 text-center">privacy@shekhvdi.ge</p>
      </div>
      <BottomNav />
    </div>
  );
}

function Pref({ label, sub, checked, onChange, locked }: { label: string; sub: string; checked?: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-white/8 flex items-center justify-between">
      <div className="flex-1 pr-4">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-white/40 mt-0.5">{sub}</div>
      </div>
      {locked
        ? <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">✓</div>
        : <button type="button" onClick={() => onChange?.(!checked)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? "bg-pink-500" : "bg-white/15"}`}>
            <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
          </button>}
    </div>
  );
}
