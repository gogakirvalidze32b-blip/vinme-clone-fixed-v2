"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      // დროებით ყოველთვის onboarding
      // შემდეგ profiles table-ზე გადავამოწმებთ
      router.replace("/onboarding");
    };

    run();
  }, [router]);

  return null;
}
