// src/app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const uid = data.session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", uid)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        router.replace("/feed");
      } else {
        router.replace("/onboarding");
      }
    })();
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Loading…
    </main>
  );
}
