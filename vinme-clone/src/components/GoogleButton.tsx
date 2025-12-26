"use client";

import { supabase } from "@/lib/supabase";

export default function GoogleButton() {
  async function handleGoogle() {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={handleGoogle}
        className="
          flex items-center gap-3
          rounded-full
          border-2 border-zinc-400
          bg-white

          px-8 py-4
          text-lg font-medium text-zinc-900

          shadow-sm
          transition
          hover:bg-zinc-100
          active:scale-[0.98]
        "
      >
        {/* Google logo */}
        <img
          src="https://icons.veryicon.com/png/o/internet--web/iview-3-x-icons/logo-google.png"
          alt="Google"
          className="w-6 h-6"
        />

        <span className="whitespace-nowrap">
          Sign in with Google
        </span>
      </button>
    </div>
  );
}
