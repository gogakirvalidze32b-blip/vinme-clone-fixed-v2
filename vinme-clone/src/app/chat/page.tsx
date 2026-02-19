"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import BottomNav from "@/components/BottomNav";

type Profile = {
  user_id: string;
  nickname: string | null;
  first_name: string | null;
  photo1_url: string | null;
};

type Match = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  other: Profile;
};

export default function ChatPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const myId = sess.session?.user?.id;

      if (!myId) {
        router.replace("/login");
        return;
      }

      const { data: rows } = await supabase
        .from("matches")
        .select("*")
        .or(`user_a.eq.${myId},user_b.eq.${myId}`)
        .order("created_at", { ascending: false });

      if (!rows) {
        setLoading(false);
        return;
      }

      const result: Match[] = [];

      for (const row of rows) {
        const otherId =
          row.user_a === myId ? row.user_b : row.user_a;

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id,nickname,first_name,photo1_url")
          .eq("user_id", otherId)
          .maybeSingle();

        if (!profile) continue;

        result.push({
          ...row,
          other: profile,
        });
      }

      if (alive) {
        setMatches(result);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white pb-28">
      <div className="mx-auto w-full max-w-md px-4 pt-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">Chats</h1>

          <input
            placeholder="Search"
            className="bg-white/10 px-4 py-2 rounded-full text-sm outline-none text-white placeholder-white/40"
          />
        </div>

        {/* MATCH STRIP */}
        {matches.length > 0 && (
          <>
            <h2 className="text-sm text-white/50 mb-3">Matches</h2>

            <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
              {matches.map((m) => {
                const name =
                  m.other.nickname ??
                  m.other.first_name ??
                  "User";

                return (
                  <div
                    key={m.id}
                    className="flex flex-col items-center min-w-[72px]"
                  >
                    <img
                      src={photoSrc(m.other.photo1_url)}
                      alt=""
                      className="w-16 h-16 rounded-2xl object-cover cursor-pointer ring-2 ring-pink-500/40"
                      onClick={() =>
                        router.push(`/profile/${m.other.user_id}`)
                      }
                    />
                    <span className="text-xs mt-2 text-white/80 truncate w-16 text-center">
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* MESSAGE LIST */}
        <div className="flex flex-col gap-2">
          {matches.map((m) => {
            const name =
              m.other.nickname ??
              m.other.first_name ??
              "User";

            return (
              <div
                key={m.id}
                onClick={() => router.push(`/chat/${m.id}`)}
                className="flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/5 cursor-pointer transition"
              >
                <img
                  src={photoSrc(m.other.photo1_url)}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                />

                <div className="flex-1">
                  <div className="font-semibold">{name}</div>
                  <div className="text-sm text-white/50">
                    Tap to open chat
                  </div>
                </div>

                <div className="text-xs text-white/30">
                  →
                </div>
              </div>
            );
          })}
        </div>

        {matches.length === 0 && (
          <div className="text-center text-white/40 mt-16">
            No matches yet  
          </div>
        )}
      </div>

      <BottomNav chatBadge={0} />
    </main>
  );
}

