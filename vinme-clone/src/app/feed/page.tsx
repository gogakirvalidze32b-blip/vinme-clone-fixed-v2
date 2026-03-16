"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { useRouter, usePathname } from "next/navigation";

export default function MessageToast() {
  const [notif, setNotif] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let myAnonId: string | null = null;

    const setup = async () => {
      // 1. გავიგოთ ჩვენი AnonID, რომ საკუთარ მესიჯებზე არ ამოხტეს
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("anon_id")
        .eq("user_id", session.user.id)
        .single();
      
      myAnonId = profile?.anon_id;

      // 2. ჩავრთოთ მოსმენა
      const channel = supabase.channel('global-chat-layer')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' }, 
          async (payload) => {
            const msg = payload.new;

            // 🛑 ფილტრები:
            // - msg.sender_anon !== myAnonId -> არ ამოხტეს ჩემს გაგზავნილზე
            // - !pathname?.includes(`/chat/${msg.match_id}`) -> არ ამოხტეს თუ უკვე ამ ჩათში ვარ
            if (myAnonId && msg.sender_anon !== myAnonId && !pathname?.includes(`/chat/${msg.match_id}`)) {
              
              const { data: sender } = await supabase
                .from("profiles")
                .select("first_name, nickname, photo1_url")
                .eq("anon_id", msg.sender_anon)
                .maybeSingle();

              setNotif({
                id: msg.id,
                name: sender?.first_name || sender?.nickname || "ახალი მესიჯი",
                text: msg.type === "text" ? msg.content : "📷 ფოტო/ხმოვანი",
                photo: sender?.photo1_url ? photoSrc(sender.photo1_url) : null,
                matchId: msg.match_id
              });

              // ჯერ ვხატავთ, მერე 10მს-ში ვაძლევთ ანიმაციას
              setIsVisible(true);

              // 5 წამში დავმალოთ
              setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => setNotif(null), 500); // დაველოდოთ ანიმაციას და მერე წავშალოთ
              }, 5000);
            }
          }
        )
        .subscribe();

      return channel;
    };

    const promise = setup();
    return () => { promise.then(ch => ch && supabase.removeChannel(ch)); };
  }, [pathname]); // pathname-ის ცვლილებაზე თავიდან გადამოწმდება ჩათში ყოფნა

  if (!notif) return null;

  return (
    <div 
      onClick={() => {
        router.push(`/chat/${notif.matchId}`);
        setIsVisible(false);
        setNotif(null);
      }}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[10000] 
        w-[92%] max-w-md bg-zinc-950/95 backdrop-blur-xl 
        border border-white/10 rounded-2xl p-3.5 
        shadow-[0_20px_50px_rgba(0,0,0,0.8)] 
        flex items-center gap-3 cursor-pointer 
        transition-all duration-500 ease-out
        ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"}
      `}
    >
      {/* ფოტო */}
      <div className="w-11 h-11 rounded-full bg-zinc-900 overflow-hidden shrink-0 ring-1 ring-white/5">
        {notif.photo ? (
          <img src={notif.photo} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl bg-zinc-800">👤</div>
        )}
      </div>

      {/* ტექსტი */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-0.5 flex justify-between">
          <span>Shekhvdi</span>
          <span className="text-white/20">ახლა</span>
        </div>
        <div className="text-sm font-bold text-white truncate">{notif.name}</div>
        <div className="text-xs text-white/50 truncate leading-tight mt-0.5">{notif.text}</div>
      </div>

      {/* ისარი */}
      <div className="text-white/20 text-lg ml-1">›</div>
    </div>
  );
}