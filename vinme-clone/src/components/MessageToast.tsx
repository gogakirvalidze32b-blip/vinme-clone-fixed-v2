"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { useRouter, usePathname } from "next/navigation";

export default function MessageToast() {
  const [notif, setNotif] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let myId: string | null = null;
    let myAnonId: string | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      myId = session.user.id;
      
      const { data: profile } = await supabase
        .from("profiles").select("anon_id").eq("user_id", myId).single();
      myAnonId = profile?.anon_id;

      const channel = supabase.channel('global-app-notifications')
        // 1. ვუსმენთ მესიჯებს
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const msg = payload.new;
          if (myAnonId && msg.sender_anon !== myAnonId && !pathname?.includes(`/chat/${msg.match_id}`)) {
            const { data: sender } = await supabase.from("profiles")
              .select("first_name, nickname, photo1_url").eq("anon_id", msg.sender_anon).single();

            setNotif({
              title: sender?.first_name || sender?.nickname || "ახალი მესიჯი",
              text: msg.content,
              photo: sender?.photo1_url ? photoSrc(sender.photo1_url) : null,
              link: `/chat/${msg.match_id}`,
              type: 'message'
            });
            setTimeout(() => setNotif(null), 5000);
          }
        })
        // 2. ვუსმენთ ზოგად ნოტიფიკაციებს (Unmatch და ა.შ.)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` }, async (payload) => {
          const n = payload.new;
          const { data: fromUser } = await supabase.from("profiles")
            .select("first_name, nickname, photo1_url").eq("user_id", n.from_user).single();

          setNotif({
            title: n.type === 'unmatch' ? "Unmatch 💔" : "შეტყობინება",
            text: `${fromUser?.first_name || "ვიღაცამ"} unmatch გაგიკეთა`,
            photo: fromUser?.photo1_url ? photoSrc(fromUser.photo1_url) : null,
            link: `/chat`,
            type: 'system'
          });
          setTimeout(() => setNotif(null), 5000);
        })
        .subscribe();

      return channel;
    };

    setup();
  }, [pathname]);

  if (!notif) return null;

  return (
    <div 
      onClick={() => { router.push(notif.link); setNotif(null); }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-[94%] max-w-md bg-zinc-900 border border-white/20 rounded-3xl p-3 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-full duration-500"
    >
      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
        {notif.photo ? <img src={notif.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-pink-500 uppercase">{notif.type === 'message' ? 'მესიჯი' : 'სისტემა'}</div>
        <div className="text-sm font-bold text-white truncate">{notif.title}</div>
        <div className="text-xs text-white/60 truncate">{notif.text}</div>
      </div>
    </div>
  );
}