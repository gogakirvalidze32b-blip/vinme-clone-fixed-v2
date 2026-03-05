"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LangMenu from "@/components/LangMenu";
import { getLang, type Lang } from "@/lib/i18n";


export default function LoginPage() {
  const [lang, setLang] = useState<Lang>("ka");
  const [view, setView] = useState<"main" | "email" | "otp">("main");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ka = lang !== "en";

  useEffect(() => {
    setLang(getLang());
    const h = () => setLang(getLang());
    window.addEventListener("app:lang", h);
    return () => window.removeEventListener("app:lang", h);
  }, []);

  async function signInGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function sendOtp() {
    if (!email.trim()) { setError(ka ? "შეიყვანე მეილი" : "Enter your email"); return; }
    setLoading(true); setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true }
    });
    if (e) {
      if (e.message.includes("rate limit") || e.message.includes("too many")) {
        setError(ka ? "ძალიან ბევრი მცდელობა, სცადე 1 საათში" : "Too many attempts, try again in 1 hour");
      } else {
        setError(e.message);
      }
      setLoading(false); return;
    }
    setView("otp");
    setLoading(false);
  }

 async function verifyOtp() {
    const code = otp.replace(/\s/g, "").trim();
    console.log("code length:", code.length, "code:", code);
    if (code.length < 8) { setError(ka ? "შეიყვანე კოდი" : "Enter the code"); return; }
    setLoading(true); setError(null);
    const { data, error: e } = await supabase.auth.verifyOtp({
      email: email.trim(), token: code, type: "email"
    });
    console.log("data:", data, "error:", e);
    if (e) { setError(ka ? "არასწორი კოდი, სცადე თავიდან" : "Wrong code, try again"); setLoading(false); return; }
    window.location.href = "/";
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden text-white" style={{
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 40%, #0d1117 100%)"
    }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)", top: "-10%", left: "-10%" }} />
        <div className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #ec4899, transparent)", bottom: "10%", right: "-5%",
            animation: "pulse 4s ease-in-out infinite 1s" }} />
        <div className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", animation: "pulse 6s ease-in-out infinite 2s" }} />
      </div>

      <div className="absolute right-4 top-4 z-50"><LangMenu /></div>

      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-[380px]">

          {view === "main" && (
            <>
              <div className="flex flex-col items-center mb-12">
                <img src="/logo1.png" className="h-32 drop-shadow-2xl mb-5" />
                <p className="text-white/45 text-sm tracking-wide text-center">
                  {ka ? "შეხვდი ახალ ადამიანებს — მარტივად." : "Meet new people — easily."}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={signInGoogle}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 font-semibold text-sm bg-white text-black transition active:scale-95 shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {ka ? "Google-ით შესვლა" : "Continue with Google"}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/25 text-xs">{ka ? "ან" : "or"}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <button onClick={() => setView("email")}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-sm transition active:scale-95 ring-1 ring-white/15"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  {ka ? "მეილით შესვლა" : "Continue with Email"}
                </button>
              </div>
              <p className="mt-8 text-center text-[11px] text-white/20">
                {ka ? "შესვლით ეთანხმები წესებს და კონფიდენციალურობას." : "By continuing you agree to our Terms & Privacy Policy."}
              </p>
            </>
          )}

          {view === "email" && (
            <>
              <button onClick={() => { setView("main"); setError(null); }}
                className="flex items-center gap-2 text-white/40 hover:text-white mb-10 transition text-sm">
                ← {ka ? "უკან" : "Back"}
              </button>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-2">
                  {ka ? "შეიყვანე მეილი 📧" : "Enter your email 📧"}
                </h1>
                <p className="text-white/40 text-sm">
                  {ka ? "გამოგიგზავნით 8-ნიშნა კოდს" : "We'll send you an 8-digit code"}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl ring-1 ring-white/10 focus-within:ring-[#7C3AED] transition overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && sendOtp()}
                    placeholder={ka ? "შენი მეილი" : "your@email.com"}
                    className="w-full bg-transparent px-4 py-4 text-sm outline-none placeholder-white/25"
                    autoComplete="email" autoFocus
                  />
                </div>
                {error && <p className="text-red-400 text-xs px-1">{error}</p>}
                <button onClick={sendOtp} disabled={loading}
                  className="w-full rounded-2xl py-4 font-bold text-sm transition active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #ec4899)", boxShadow: "0 4px 24px rgba(124,58,237,0.35)" }}>
                  {loading ? "..." : (ka ? "კოდის გაგზავნა" : "Send Code")}
                </button>
              </div>
            </>
          )}

          {view === "otp" && (
            <>
              <button onClick={() => { setView("email"); setOtp(""); setError(null); }}
                className="flex items-center gap-2 text-white/40 hover:text-white mb-10 transition text-sm">
                ← {ka ? "უკან" : "Back"}
              </button>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-2">
                  {ka ? "კოდი გამოგიგზავნეთ ✉️" : "Check your email ✉️"}
                </h1>
                <p className="text-white/40 text-sm">
                  {ka ? `კოდი გაგზავნილია ${email}-ზე` : `Code sent to ${email}`}
                </p>
              </div>
              <div className="rounded-2xl ring-1 ring-white/10 focus-within:ring-[#7C3AED] transition overflow-hidden mb-4"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <input
                  type="text" inputMode="numeric"
                  value={otp}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
                    setOtp(val);
                    setError(null);
useEffect(() => {
  const code = otp.replace(/\s/g,"");
  if (code.length === 8) {
    const run = async () => {
      setLoading(true); setError(null);
      const { error: e } = await supabase.auth.verifyOtp({
        email: email.trim(), token: code, type: "email"
      });
      if (e) { setError(ka ? "არასწორი კოდი, სცადე თავიდან" : "Wrong code, try again"); setLoading(false); return; }
      window.location.href = "/";
    };
    run();
  }
}, [otp]);         }}
                  placeholder="კოდი"
                  className="w-full bg-transparent px-4 py-5 text-3xl font-black text-center outline-none placeholder-white/20 tracking-[12px]"
                  autoFocus autoComplete="one-time-code"
                />
              </div>
              {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
              <button onClick={verifyOtp} disabled={loading || otp.replace(/\s/g,"").length < 8}
                className="w-full rounded-2xl py-4 font-bold text-sm transition active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7C3AED, #ec4899)", boxShadow: "0 4px 24px rgba(124,58,237,0.35)" }}>
                {loading ? "..." : (ka ? "შესვლა" : "Verify & Sign In")}
              </button>
              <button onClick={sendOtp} disabled={loading}
                className="w-full mt-3 text-center text-sm text-white/30 hover:text-white/60 transition">
                {ka ? "კოდი არ მოვიდა? თავიდან გაგზავნა" : "Didn't receive? Resend"}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}