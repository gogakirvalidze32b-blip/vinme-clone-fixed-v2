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
    // 🚩 შემოწმება 1: საერთოდ თუ ირთვება ფაილი
    console.log("🚀 MessageToast: კომპონენტი ჩაირთო");

    let myAnonId: string | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("❌ MessageToast: სესია ვერ მოიძებნა");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles").select("anon_id").eq("user_id", session.user.id).single();
      
      myAnonId = profile?.anon_id;
      console.log("✅ MessageToast: ჩემი AnonID არის:", myAnonId);

      const channel = supabase.channel('global-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          console.log("📩 MessageToast: ახალი მესიჯი მოვიდა ბაზიდან!", payload.new);

          const msg = payload.new;

          // დროებით ამოვიღოთ ყველა შემოწმება (if), რომ ვნახოთ საერთოდ თუ ამოაგდებს
          const { data: sender } = await supabase.from("profiles")
            .select("first_name, nickname, photo1_url").eq("anon_id", msg.sender_anon).single();

          setNotif({
            title: sender?.first_name || sender?.nickname || "ახალი მესიჯი",
            text: msg.content,
            photo: sender?.photo1_url ? photoSrc(sender.photo1_url) : null,
            matchId: msg.match_id
          });

          setTimeout(() => setNotif(null), 6000);
        })
        .subscribe((status) => {
          // 🚩 შემოწმება 2: კავშირი ბაზასთან
          console.log("📡 MessageToast: Realtime სტატუსი არის:", status);
        });

      return channel;
    };

    setup();
  }, [pathname]);

  if (!notif) return null;

  return (
    <div 
      onClick={() => { router.push(`/chat/${notif.matchId}`); setNotif(null); }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-md bg-white text-black rounded-2xl p-4 shadow-2xl flex items-center gap-3 cursor-pointer ring-4 ring-pink-500 animate-bounce"
    >
      <div className="w-12 h-12 rounded-full bg-zinc-200 overflow-hidden shrink-0">
        {notif.photo && <img src={notif.photo} className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1">
        <div className="font-bold">{notif.title}</div>
        <div className="text-sm opacity-70">{notif.text}</div>
      </div>
    </div>
  );
}