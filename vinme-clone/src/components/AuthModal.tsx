// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";



export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Loading…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // After OAuth redirect, Supabase stores session in browser
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data.session;
        if (!session?.user?.id) {
          if (!alive) return;
          setMsg("No session found. Redirecting…");
          router.replace("/login");
          return;
        }

        const uid = session.user.id;

        // Check if onboarding is completed for this user_id
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("onboarding_completed,onboarding_step,photo1_url,first_name,birthdate,gender,seeking,intent,distance_km")
          .eq("user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;

        const completed =
          profile?.onboarding_completed === true &&
          (profile?.onboarding_step ?? 0) >= 8 &&
          Boolean(profile?.photo1_url) &&
          Boolean(profile?.first_name?.trim()) &&
          Boolean(profile?.birthdate) &&
          Boolean(profile?.gender) &&
          Boolean(profile?.seeking) &&
          Boolean(profile?.intent) &&
          Boolean(profile?.distance_km);

        router.replace(completed ? "/feed" : "/onboarding");
      } catch (e: any) {
        console.error("AUTH CALLBACK ERROR:", e);
        if (!alive) return;
        setMsg(e?.message ?? "Auth callback failed");
        router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      {msg}
    </main>
  );
}

