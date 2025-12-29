"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getOrCreateAnonId } from "@/lib/guest";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: s, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const uid = s.session?.user?.id ?? null;
        if (!uid) {
          router.replace("/login");
          return;
        }

        // ✅ IMPORTANT: read ONLY by user_id (არავითარი anon აქ!)
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, onboarding_completed")
          .eq("user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;

        // NEW USER (no row) → create minimal row then onboarding
        const anonId = getOrCreateAnonId();

        if (!p?.user_id) {
          const a = getOrCreateAnonId();
         const { error } = await supabase
  .from("profiles")
  .upsert(
    {
      user_id: uid,
      anon_id: anonId,
      onboarding_completed: false,
      onboarding_step: 0,
    },
    { onConflict: "user_id" }
  );

if (error) throw error;


          if (!alive) return;
          router.replace("/onboarding");
          return;
        }

        // EXISTING USER → route by onboarding_completed
        if (!alive) return;

        if (p.onboarding_completed) router.replace("/feed");
        else router.replace("/onboarding");
      } catch (e: any) {
        console.error("auth/callback error:", e?.message ?? e);
        router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-white">
      Signing in… 🔄
    </div>
  );
}
