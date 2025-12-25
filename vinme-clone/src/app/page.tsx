"use client";

import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

export default function GoogleButton() {
  async function handleGoogle() {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // პატარა safety: მომავალში თუ დაგჭირდება
        // queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      console.error("Google login error:", error);
      alert("Google login failed. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* 🔙 Back */}
      <BackButton href="/" label="Back" />

      {/* Google button */}
      <button
        type="button" // ✅ form submit არ მოხდეს
        onClick={handleGoogle}
        className="w-full rounded-full px-5 py-4 text-lg font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition"
      >
        Continue with Google
      </button>
    </div>
  );
}
