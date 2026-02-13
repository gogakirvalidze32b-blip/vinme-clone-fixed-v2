"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TinderCard from "@/components/TinderCard";
import { supabase } from "@/lib/supabase";
import { getLang } from "@/lib/i18n";
import { photoSrc } from "@/lib/photos";

export default function FeedPage() {
  const router = useRouter();

  const [lang, setLang] = useState<"ka" | "en">("ka");
  const [me, setMe] = useState<any>(null);
  const [top, setTop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const loadingTopRef = useRef(false);

  useEffect(() => {
    setLang(getLang());
  }, []);

  const loadMe = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setMe(row);
    return row;
  }, [router]);

  const loadTop = useCallback(async (myId: string) => {
    if (loadingTopRef.current) return;
    loadingTopRef.current = true;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_completed", true)
      .neq("user_id", myId)
      .not("photo1_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setTop(data ?? null);
    loadingTopRef.current = false;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const my = await loadMe();
      if (!alive || !my) return;

      await loadTop(my.user_id);
      if (alive) setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [loadMe, loadTop]);

  const onLike = async (): Promise<void> => {
    if (!me || !top) return;

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: top.user_id,
      action: "like",
    });

    await loadTop(me.user_id);
  };

  const onSkip = async (): Promise<void> => {
    if (!me || !top) return;

    await supabase.from("swipes").insert({
      from_id: me.user_id,
      to_id: top.user_id,
      action: "skip",
    });

    await loadTop(me.user_id);
  };

  const cardUser = useMemo(() => {
    if (!top) return null;

    return {
      id: top.user_id,
      user_id: top.user_id,
      nickname: top.nickname ?? "Anonymous",
      age: top.age ?? 18,
      city: top.city ?? "",
      bio: top.bio ?? "",
      photo_url: top.photo1_url ? photoSrc(top.photo1_url) : null,
    };
  }, [top]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (!cardUser) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white">
        No profiles
      </div>
    );
  }

return (
  <div className="bg-black min-h-screen flex justify-center">
    <div className="w-full max-w-md h-screen">
<TinderCard
  key={cardUser.id}
  user={cardUser}
  otherUserId={cardUser.user_id} // ← ეს დაამატე
  onLike={onLike}
  onSkip={onSkip}
  onOpenProfile={() => router.push(`/profile/${cardUser.user_id}`)}
/>
    </div>
  </div>
);
}