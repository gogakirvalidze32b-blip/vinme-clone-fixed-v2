"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const title = useMemo(
    () => (mode === "signup" ? "Create account" : "Log in"),
    [mode]
  );

  /* ================= GOOGLE ================= */

  async function signInGoogle() {
    if (busy) return;
    setMsg("");
    setBusy(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    // redirect happens on success
    if (error) {
      setMsg(error.message);
      setBusy(false);
    }
  }

  /* ================= EMAIL / PASSWORD ================= */

  async function submitEmailPass() {
    if (busy) return;
    setMsg("");

    const e = email.trim();
    if (!e.includes("@")) return setMsg("შეიყვანე სწორი email 🙂");
    if (password.length < 6)
      return setMsg("Password მინიმუმ 6 სიმბოლო უნდა იყოს 🙂");

    setBusy(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: e,
        password,
      });

      if (error) {
        setMsg(error.message);
      } else {
        setMsg("ანგარიში შექმნილია ✅ შეამოწმე email და შემდეგ შედი.");
        setMode("login");
      }
      setBusy(false);
      return;
    }

    // login
    const { error } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    // success
    onClose();
    router.replace("/feed");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={() => !busy && onClose()}
      />

      {/* modal */}
      <div className="relative w-full max-w-[520px] rounded-3xl bg-zinc-900/85 ring-1 ring-white/10 shadow-2xl backdrop-blur p-6 text-white">
        {/* close */}
        <button
          className="absolute right-4 top-4 text-white/70 hover:text-white text-2xl"
          onClick={() => !busy && onClose()}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center justify-center mb-5">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
            🔥
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-center">{title}</h2>

        <p className="mt-2 text-center text-sm text-white/70">
          By continuing, you agree to our{" "}
          <span className="underline">Terms</span> and{" "}
          <span className="underline">Privacy Policy</span>.
        </p>

        {/* google */}
        <button
          disabled={busy}
          onClick={signInGoogle}
          className="mt-5 w-full rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-3 font-semibold flex items-center justify-center gap-2"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-black font-bold">
            G
          </span>
          Continue with Google
        </button>

        {/* divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/50">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* email + pass */}
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-2xl bg-black/40 p-3 ring-1 ring-white/10 outline-none focus:ring-white/20"
            autoComplete="email"
            inputMode="email"
            disabled={busy}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            className="w-full rounded-2xl bg-black/40 p-3 ring-1 ring-white/10 outline-none focus:ring-white/20"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            disabled={busy}
          />

          <button
            disabled={busy}
            onClick={submitEmailPass}
            className="w-full rounded-2xl bg-white text-black hover:bg-zinc-200 disabled:opacity-60 px-4 py-3 font-semibold"
          >
            {mode === "signup" ? "Create account" : "Log in"}
          </button>
        </div>

        {/* switch */}
        <div className="mt-4 text-center text-sm text-white/70">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                className="underline text-white"
                onClick={() => setMode("login")}
                disabled={busy}
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                className="underline text-white"
                onClick={() => setMode("signup")}
                disabled={busy}
              >
                Create account
              </button>
            </>
          )}
        </div>

        {msg && (
          <p className="mt-3 text-center text-sm text-emerald-200">{msg}</p>
        )}
      </div>
    </div>
  );
}
