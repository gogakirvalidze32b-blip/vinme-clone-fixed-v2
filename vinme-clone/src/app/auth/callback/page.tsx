"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // ✅ PKCE code is in query: ?code=...
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          // ✅ this is the missing piece in most “back to login” cases
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession error:", error.message);
          }
        }

        // ✅ verify session exists now
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;

        if (!alive) return;

        // თუ session ვერ დადგა → login-ზე
        if (!hasSession) {
          router.replace("/login");
          return;
        }

        // ✅ go forward
        router.replace("/onboarding");
      } catch (e) {
        console.error("auth callback failed:", e);
        if (alive) router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
      Signing you in…
    </div>
  );
}