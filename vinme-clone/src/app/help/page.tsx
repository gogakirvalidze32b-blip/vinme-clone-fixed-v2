"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HelpPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!msg.trim()) return;
    await fetch("https://formspree.io/f/შენი-form-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    setSent(true);
  }

  if (sent) return (
    <div className="h-screen bg-black text-white flex items-center justify-center flex-col gap-4">
      <div className="text-4xl">✅</div>
      <p className="font-bold">გაგზავნილია!</p>
      <button onClick={() => router.back()} className="text-pink-400">← უკან</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-12">
      <button onClick={() => router.back()} className="text-pink-400 mb-6">← უკან</button>
      <h1 className="text-xl font-extrabold mb-4">დახმარება</h1>
      <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={6}
        className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10"
        placeholder="დაწერე შენი შეკითხვა..." />
      <button onClick={handleSubmit}
        className="mt-4 w-full rounded-2xl bg-pink-500 py-4 font-bold text-white">
        გაგზავნა
      </button>
    </div>
  );
}