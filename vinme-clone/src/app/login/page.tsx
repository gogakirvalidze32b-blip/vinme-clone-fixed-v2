"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LangMenu from "@/components/LangMenu";
import { getLang, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const [lang, setLang] = useState<Lang>("ka");
  const [view, setView] = useState<"main" | "email">("main");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function handleEmail() {
    if (!email || !password) { setError(ka ? "შეავსე ყველა ველი" : "Fill in all fields"); return; }
    setLoading(true); setError(null); setSuccess(null);
    if (mode === "register") {
      const { error: e } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (e) setError(e.message);
      else setSuccess(ka ? "დაადასტურე მეილი ✉️" : "Check your email to confirm ✉️");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(ka ? "არასწორი მეილი ან პაროლი" : "Invalid email or password");
      else window.location.href = "/";
    }
    setLoading(false);
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden text-white" style={{
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 40%, #0d1117 100%)"
    }}>

      {/* Animated blobs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)", top: "-10%", left: "-10%" }} />
        <div className="absolute w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #ec4899, transparent)", bottom: "10%", right: "-5%",
            animation: "pulse 4s ease-in-out infinite 1s" }} />
        <div className="absolute w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            animation: "pulse 6s ease-in-out infinite 2s" }} />
      </div>

      {/* Lang menu */}
      <div className="absolute right-4 top-4 z-50">
        <LangMenu />
      </div>

      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-[400px]">

          {view === "main" ? (
            <>
              {/* Logo + tagline */}
              <div className="flex flex-col items-center mb-10">
                <img src="/logo1.png" className="h-32 drop-shadow-2xl mb-4" />
                <p className="text-white/50 text-sm tracking-wide">
                  {ka ? "შეხვდი ახალ ადამიანებს" : "Meet new people"}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">

                {/* Google */}
                <button onClick={signInGoogle}
                  className="relative w-full flex items-center justify-center gap-3 rounded-2xl py-4 font-semibold text-sm transition active:scale-95"
                  style={{ background: "white", color: "#111" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {ka ? "Google-ით შესვლა" : "Continue with Google"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">{ka ? "ან" : "or"}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email */}
                <button onClick={() => { setView("email"); setMode("login"); }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-sm transition active:scale-95 ring-1 ring-white/15 hover:ring-white/30"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {ka ? "მეილით შესვლა" : "Continue with Email"}
                </button>

                {/* Register */}
                <button onClick={() => { setView("email"); setMode("register"); }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-sm transition active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #ec4899)", boxShadow: "0 4px 24px rgba(124,58,237,0.4)" }}>
                  ✨ {ka ? "რეგისტრაცია" : "Create Account"}
                </button>
              </div>

              <p className="mt-8 text-center text-[11px] text-white/25">
                {ka ? "გაგრძელებით ეთანხმები წესებს და კონფიდენციალურობას." : "By continuing you agree to our Terms & Privacy Policy."}
              </p>
            </>

          ) : (
            <>
              {/* Email form */}
              <button onClick={() => { setView("main"); setError(null); setSuccess(null); }}
                className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm">
                ← {ka ? "უკან" : "Back"}
              </button>

              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1">
                  {mode === "login" ? (ka ? "კეთილი იყოს შენი დაბრუნება 👋" : "Welcome back 👋") : (ka ? "მოდი გაგიცნო 🔥" : "Let's get started 🔥")}
                </h1>
                <p className="text-white/40 text-sm">
                  {mode === "login" ? (ka ? "შეიყვანე შენი მეილი და პაროლი" : "Enter your email and password") : (ka ? "შექმენი ანგარიში" : "Create your account")}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 focus-within:ring-[#7C3AED] transition"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={ka ? "მეილი" : "Email"}
                    className="w-full bg-transparent px-4 py-4 text-sm outline-none placeholder-white/25" />
                </div>

                <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 focus-within:ring-[#7C3AED] transition"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={ka ? "პაროლი" : "Password"}
                    onKeyDown={e => e.key === "Enter" && handleEmail()}
                    className="w-full bg-transparent px-4 py-4 text-sm outline-none placeholder-white/25" />
                </div>

                {error && <p className="text-red-400 text-xs px-1">{error}</p>}
                {success && <p className="text-green-400 text-xs px-1">{success}</p>}

                <button onClick={handleEmail} disabled={loading}
                  className="w-full rounded-2xl py-4 font-bold text-sm transition active:scale-95 disabled:opacity-50 mt-1"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #ec4899)", boxShadow: "0 4px 24px rgba(124,58,237,0.4)" }}>
                  {loading ? "..." : mode === "login" ? (ka ? "შესვლა" : "Sign In") : (ka ? "რეგისტრაცია" : "Sign Up")}
                </button>

                <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setSuccess(null); }}
                  className="text-center text-sm text-white/40 hover:text-white/70 transition mt-1">
                  {mode === "login"
                    ? (ka ? "ანგარიში არ გაქვს? რეგისტრაცია" : "No account? Sign up")
                    : (ka ? "უკვე გაქვს ანგარიში? შესვლა" : "Already have an account? Sign in")}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
