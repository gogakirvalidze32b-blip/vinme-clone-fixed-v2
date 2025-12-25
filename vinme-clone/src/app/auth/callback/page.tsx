"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();

      // თუ session უკვე არსებობს → გააგრძელე
      if (data.session) {
        router.replace("/feed"); // ან "/onboarding" თუ ეგ გინდა პირველად
      } else {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Logging you in…
    </main>
  );
}
