"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;

      // ✅ თუ უკვე დალოგინებულია, ამ გვერდზე არ უნდა “ეკიდოს”
      if (uid) {
        router.replace("/auth/callback");
        return;
      }

      if (alive) setChecking(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

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
      console.error(error);
      alert("Google login failed");
    }
  }

  // ✅ Loading მხოლოდ session-check-ის 0.5 წამი
  if (checking) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
        Loading… 🔄
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-2xl font-semibold">Shekhvdi</div>
        <button
          onClick={handleGoogle}
          className="w-full rounded-full bg-white text-black px-6 py-4 font-semibold active:scale-[0.99]"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
