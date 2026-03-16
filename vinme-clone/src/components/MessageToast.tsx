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
    let myAnonId: string | null = null;

    const setup = async () => {
      // 1. გავიგოთ ჩვენი anon_id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("anon_id")
        .eq("user_id", session.user.id)
        .single();
      
      myAnonId = profile?.anon_id;

      // 2. ჩავრთოთ მოსმენა
      const channel = supabase.channel('global-chat-notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' }, 
          async (payload) => {
            const msg = payload.new;
            console.log("ახალი მესიჯი მოვიდა:", msg); // <-- შეამოწმე კონსოლში

            // შემოწმება: თუ სხვისია და სხვა გვერდზე ვართ
            if (myAnonId && msg.sender_anon !== myAnonId && !pathname?.includes(`/chat/${msg.match_id}`)) {
              
              const { data: sender } = await supabase
                .from("profiles")
                .select("first_name, nickname, photo1_url")
                .eq("anon_id", msg.sender_anon)
                .maybeSingle();

              setNotification({
                id: msg.id,
                name: sender?.first_name || sender?.nickname || "ახალი მესიჯი",
                text: msg.type === "text" ? msg.content : "📷 ფოტო/ხმოვანი",
                photo: sender?.photo1_url ? photoSrc(sender.photo1_url) : null,
                matchId: msg.match_id
              });

              // 5 წამში გაქრეს
              setTimeout(() => setNotification(null), 5000);
            }
          }
        )
        .subscribe((status) => {
          console.log("სტატუსი:", status); // უნდა დაწეროს "SUBSCRIBED"
        });

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
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-full duration-500"
    >
      <div className="w-11 h-11 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-white/10">
        {notification.photo ? (
          <img src={notification.photo} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-0.5">Shekhvdi</div>
        <div className="text-sm font-bold text-white truncate">{notification.name}</div>
        <div className="text-xs text-white/60 truncate">{notification.text}</div>
      </div>
      <div className="text-[10px] text-white/30 font-bold ml-2 shrink-0">ახლა</div>
    </div>
  );
}