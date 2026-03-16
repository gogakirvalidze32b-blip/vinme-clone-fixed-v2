"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { useRouter, usePathname } from "next/navigation";


export default function MessageToast() {
  const [notification, setNotification] = useState<{
    id: string;
    name: string;
    text: string;
    photo: string | null;
    matchId: string;
  } | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let myId: string;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      myId = session.user.id;

      // ვუსმენთ ყველა ახალ მესიჯს
      const channel = supabase.channel('global-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const msg = payload.new;

          // თუ მე არ ვარ გამომგზავნი და არ ვარ ამ კონკრეტულ ჩათში ახლა
if (msg.sender_anon !== myId && pathname && !pathname.includes(`/chat/${msg.match_id}`)) {
            
            // მოვიძიოთ გამომგზავნის ინფორმაცია
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, nickname, photo1_url")
              .eq("anon_id", msg.sender_anon)
              .maybeSingle();

            setNotification({
              id: msg.id,
              name: profile?.first_name || profile?.nickname || "ახალი მესიჯი",
              text: msg.type === "text" ? msg.content : (msg.type === "voice" ? "🎤 ხმოვანი" : "📷 ფოტო"),
              photo: profile?.photo1_url ? photoSrc(profile.photo1_url) : null,
              matchId: msg.match_id
            });

            // 5 წამში გავაქროთ
            setTimeout(() => setNotification(null), 5000);
          }
        })
        .subscribe();

      return channel;
    };

    const promise = setup();

    return () => {
      promise.then(ch => ch && supabase.removeChannel(ch));
    };
  }, [pathname]);

  if (!notification) return null;

  return (
    <div 
      onClick={() => {
        router.push(`/chat/${notification.matchId}`);
        setNotification(null);
      }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-10 duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
        {notification.photo ? (
          <img src={notification.photo} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black text-purple-400 uppercase tracking-tighter">Shekhvdi</div>
        <div className="text-sm font-bold text-white truncate">{notification.name}</div>
        <div className="text-xs text-white/60 truncate">{notification.text}</div>
      </div>
      <div className="text-xs text-white/20 font-bold ml-2">ახლა</div>
    </div>
  );
}