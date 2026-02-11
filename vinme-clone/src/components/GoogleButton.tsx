"use client";

import { supabase } from "@/lib/supabase";

export default function GoogleButton() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
redirectTo: `${window.location.origin}/auth/callback`
      },
    });
  };

  return (
    <button
      onClick={signIn}
      className="w-full rounded-full bg-white py-3 text-sm font-medium text-black"
    >
      Continue with Google
    </button>
  );
}
