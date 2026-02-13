"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { photoSrc } from "@/lib/photos";

export default function ChatPage() {
  const router = useRouter();

  const [matches, setMatches] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    if (!uid) return;

    setMeId(uid);

    // MATCHES
    const { data: m } = await supabase
      .from("matches")
      .select("*, user_a:profiles!matches_user_a_fkey(*), user_b:profiles!matches_user_b_fkey(*)")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`);

    setMatches(m ?? []);

    // ბოლო მესიჯები თითო match-ზე
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .in(
        "match_id",
        (m ?? []).map((x) => x.id)
      )
      .order("created_at", { ascending: false });

    setMessages(msgs ?? []);
  }

  function otherUser(match: any) {
    return match.user_a.user_id === meId
      ? match.user_b
      : match.user_a;
  }

  function lastMessage(matchId: string) {
    return messages.find((m) => m.match_id === matchId);
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chats</h1>
        <input
          placeholder="Search"
          className="bg-white/10 rounded-full px-4 py-2 text-sm outline-none"
        />
      </div>

      {/* MATCHES */}
      <div className="mt-6">
        <h2 className="text-sm text-white/60 mb-3">Matches</h2>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {matches.map((match) => {
            const user = otherUser(match);
            return (
              <div
                key={match.id}
                onClick={() => router.push(`/chat/${match.id}`)}
                className="flex-shrink-0 w-20 text-center cursor-pointer"
              >
                <img
                  src={user.photo1_url}
                  className="w-20 h-20 object-cover rounded-xl"
                />
                <p className="mt-2 text-xs truncate">{user.nickname}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MESSAGES */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Messages</h2>

        <div className="space-y-5">
          {matches.map((match) => {
            const user = otherUser(match);
            const msg = lastMessage(match.id);

            return (
              <div
                key={match.id}
                onClick={() => router.push(`/chat/${match.id}`)}
                className="flex items-center gap-4 cursor-pointer"
              >
                <img
                  src={user.photo1_url}
                  className="w-14 h-14 object-cover rounded-full"
                />

                <div className="flex-1 border-b border-white/10 pb-3">
                  <p className="font-semibold">{user.nickname}</p>
                  <p className="text-sm text-white/60 truncate">
                    {msg?.content ?? "Say hi 👋"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/10 backdrop-blur-xl rounded-full py-4 flex justify-around">
        <button onClick={() => router.push("/feed")}>💖</button>
        <button>🎮</button>
        <button className="text-white">💬</button>
        <button onClick={() => router.push("/profile")}>👤</button>
      </div>
    </div>
  );
}