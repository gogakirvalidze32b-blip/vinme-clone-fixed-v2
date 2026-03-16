"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { useRouter, usePathname } from "next/navigation";

export default function MessageToast() {
  const [notif, setNotif] = useState<any>(null);
  const [show, setShow] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. მოვითხოვოთ ბრაუზერის შეტყობინებების უფლება (როცა აპლიკაცია დახურულია)
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let myAnonId: string | null = null;
    let myUserId: string | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      myUserId = session.user.id;
      
      const { data: profile } = await supabase
        .from("profiles").select("anon_id").eq("user_id", myUserId).single();
      myAnonId = profile?.anon_id;

      const channel = supabase.channel('global-realtime-v3')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
          const msg = payload.new;

          // 🛑 მკაცრი ფილტრები
          const isInThisChat = pathname?.includes(`/chat/${msg.match_id}`);
          const isMine = msg.sender_anon === myAnonId;

          if (!isMine && !isInThisChat) {
            const { data: sender } = await supabase.from("profiles")
              .select("first_name, nickname, photo1_url")
              .eq("anon_id", msg.sender_anon)
              .maybeSingle();

            const title = sender?.first_name || sender?.nickname || "ახალი მესიჯი";
            const content = msg.type === "text" ? msg.content : "📷 ფოტო/ხმოვანი";
            const photo = sender?.photo1_url ? photoSrc(sender.photo1_url) : null;

            // 📱 თუ მომხმარებელი აპლიკაციაშია - ვაჩვენებთ შავ პანელს
            if (document.visibilityState === "visible") {
              setNotif({ title, text: content, photo, matchId: msg.match_id });
              setTimeout(() => setShow(true), 10);
              
              setTimeout(() => {
                setShow(false);
                setTimeout(() => setNotif(null), 500);
              }, 4500);
            } 
            // 🔔 თუ მომხმარებელი აპლიკაციის გარეთაა - ბრაუზერის სისტემური ნოტიფიკაცია
            else if (Notification.permission === "granted") {
              new Notification(title, { body: content, icon: photo || "/favicon.ico" });
            }
          }
        })
        .subscribe();

      return channel;
    };

    const promise = setup();
    return () => { promise.then(ch => ch && supabase.removeChannel(ch)); };
  }, [pathname]);

  if (!notif) return null;

  return (
    <div 
      onClick={() => {
        router.push(`/chat/${notif.matchId}`);
        setShow(false);
      }}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[100000] 
        w-[92%] max-w-sm bg-zinc-900/95 backdrop-blur-xl 
        border border-white/10 rounded-2xl p-3
        shadow-[0_15px_40px_rgba(0,0,0,0.7)] 
        flex items-center gap-3 cursor-pointer 
        transition-all duration-500 ease-out
        ${show ? "translate-y-0 opacity-100" : "-translate-y-28 opacity-0"}
      `}
    >
      <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/5">
        {notif.photo ? (
          <img src={notif.photo} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg bg-zinc-800">👤</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-white truncate">{notif.title}</span>
          <span className="text-[10px] text-pink-500 font-black uppercase tracking-tighter shrink-0">Shekhvdi</span>
        </div>
        <p className="text-xs text-white/50 truncate mt-0.5 leading-tight">
          {notif.text}
        </p>
      </div>

      <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] shrink-0" />
    </div>
  );
}