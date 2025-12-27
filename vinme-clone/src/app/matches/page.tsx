"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchRow = {
  id: number;
  user1: string;
  user2: string;
  created_at: string;
};

type ProfileLite = {
  user_id: string;
  name: string;
  city: string;
  age: number;
};

export default function MatchesPage() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Array<MatchRow & { other?: ProfileLite }>>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setMounted(true);

    (async () => {
      setMsg("");
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return setMsg("ჯერ დალოგინდი 🙂");

      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) return setMsg("შეცდომა: " + error.message);
      const matches = (data ?? []) as MatchRow[];

      const otherIds = matches.map((m) => (m.user1 === user.id ? m.user2 : m.user1));
      if (otherIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
.select("user_id, nickname, age, city, photo_url")
        .in("user_id", otherIds);

      const map = new Map<string, ProfileLite>();
      (profs ?? []).forEach((p: any) => map.set(p.user_id, p));

      setRows(
        matches.map((m) => ({
          ...m,
          other: map.get(m.user1 === user.id ? m.user2 : m.user1),
        }))
      );
    })();
  }, []);

  if (!mounted) return null;

  return (
    <main className="space-y-4">
      <div className="rounded-2xl bg-zinc-900/60 p-4 shadow">
        <h2 className="text-lg font-semibold">🤝 Matches</h2>
        {msg && <p className="mt-2 text-sm text-zinc-300">{msg}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="text-zinc-300">ჯერ Match არ გაქვს. Feed-ში შედი და დაალაიქე 😉</p>
      ) : (
        <div className="grid gap-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl bg-zinc-900/40 p-4">
              <p className="font-semibold">
                {m.other?.name ?? "Unknown"} • {m.other?.age ?? "?"} • {m.other?.city ?? "?"}
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Match ID: {m.id} • {new Date(m.created_at).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-zinc-300">(ჩატს შემდეგ ეტაპზე დავამატებთ ✉️)</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <a className="text-sm text-zinc-300 hover:text-white" href="/">
          ← Home
        </a>
        <a className="text-sm text-zinc-300 hover:text-white" href="/feed">
          🔥 Feed
        </a>
      </div>
    </main>
  );
}
