"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";
import { upsertProfileByIdentity } from "@/lib/profile";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        if (!data.session?.user?.id) {
          router.replace("/login");
          return;
        }

        const uid = data.session.user.id;

        // ✅ always ensure user_id row exists (NO anon-row bind here)
        const a = getOrCreateAnonId();
        await upsertProfileByIdentity({
          user_id: uid,
          anon_id: a,
          age: 18,
        } as any);

        // ✅ now decide route
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, onboarding_step")
          .eq("user_id", uid)
          .maybeSingle();

        if (error) throw error;

        const completed =
          profile?.onboarding_completed === true &&
          (profile?.onboarding_step ?? 0) >= 8;

        if (!alive) return;

        router.replace(completed ? "/feed" : "/onboarding");
      } catch (e) {
        // fallback: go login
        if (!alive) return;
        router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Loading…
    </main>
  );
}
