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
      className="w-full rounded-full bg-white text-black px-6 py-4 font-semibold active:scale-[0.99]"
    >
      Continue with Google
    </button>
  );
}