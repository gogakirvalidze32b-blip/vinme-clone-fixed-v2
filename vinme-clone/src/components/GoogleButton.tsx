"use client";

import { supabase } from "@/lib/supabase";

export default function GoogleButton() {
  async function handleGoogle() {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      console.error("Google login error:", error);
      alert("Google login failed. Try again.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      className="
        w-full
        rounded-full
        border-4 border-zinc-500
        bg-white
        px-10 py-6
        flex items-center justify-center
        gap-6
        text-3xl font-semibold text-zinc-900
        transition
        active:scale-[0.99]
      "
    >
      <img src="/google.svg" alt="" className="w-12 h-12" />
      <span>Sign in with Google</span>
    </button>
  );
}
