"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

type UserCtx = { anonId: string | null; chatBadge: number; refreshBadge: () => void; };
const Ctx = createContext<UserCtx>({ anonId: null, chatBadge: 0, refreshBadge: () => {} });

export function useUser() { return useContext(Ctx); }

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [anonId, setAnonId] = useState<string | null>(null);
  const [chatBadge, setChatBadge] = useState(0);
  const chRef = useRef<any>(null);

  useEffect(() => {
    const { supabase } = require("@/lib/supabase");
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: me } = await supabase.from("profiles").select("anon_id").eq("user_id", uid).maybeSingle();
      setAnonId(me?.anon_id ?? null);
    })();
  }, []);

  const refreshBadge = useCallback(async () => {
    if (!anonId) return;
    const { supabase } = require("@/lib/supabase");
    const { data } = await supabase.from("messages").select("match_id").is("read_at", null).neq("sender_anon", anonId).limit(1000);
    const uniq = new Set((data ?? []).map((r: any) => r.match_id));
    setChatBadge(uniq.size);
  }, [anonId]);

  useEffect(() => { if (anonId) refreshBadge(); }, [anonId, refreshBadge]);

  useEffect(() => {
    if (!anonId) return;
    const { supabase } = require("@/lib/supabase");
    if (chRef.current) supabase.removeChannel(chRef.current);
    chRef.current = supabase.channel("user-ctx-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        (p: any) => { if (p.new?.sender_anon !== anonId) refreshBadge(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" },
        (p: any) => { if (p.new?.read_at) refreshBadge(); })
      .subscribe();
    return () => { if (chRef.current) supabase.removeChannel(chRef.current); };
  }, [anonId, refreshBadge]);

  return <Ctx.Provider value={{ anonId, chatBadge, refreshBadge }}>{children}</Ctx.Provider>;
}