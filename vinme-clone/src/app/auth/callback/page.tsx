"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (profile?.onboarding_completed) {
        router.replace("/feed");
      } else {
        router.replace("/onboarding");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      Signing you in...
    </div>
  );
}