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

    // 🔍 ვამოწმებთ პროფილს
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", uid)
      .maybeSingle();

    if (!profile || !profile.onboarding_completed) {
      // ❗ onboarding ჯერ არ დასრულებულა
      router.replace("/onboarding");
    } else {
      // ✅ დასრულებულია
      router.replace("/feed");
    }
  })();
}, [router]);


  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Logging you in…
    </main>
  );
}
