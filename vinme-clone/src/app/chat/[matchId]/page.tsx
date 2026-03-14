"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import { SafeImg } from "@/components/SafeImg";
import { getLang } from "@/lib/i18n";
import { useUser } from "@/lib/userContext";

type MsgRow = {
  id: string; match_id: number; sender_anon: string;
  content: string; created_at: string; read_at: string | null;
  delivered_at?: string | null;
  type?: "text" | "voice" | "image";
  reply_to_id?: string | null;
  reply_preview?: string | null;
};

type Reaction = {
  id: string; message_id: string; sender_anon: string; emoji: string;
};

function fmtTimer(sec: number) { const m = Math.floor(sec/60), s = sec%60; return `${m}:${s<10?"0":""}${s}`; }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }

function formatLastSeen(lastSeen: string|null, ka: boolean): string {
  if (!lastSeen) return ka ? "ოფლაინ" : "Offline";
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 3*60*1000) return ka ? "ონლაინ" : "Online";
  const mins = Math.floor(diff/60000), hours = Math.floor(diff/3600000), days = Math.floor(diff/86400000);
  if (mins < 60) return ka ? `${mins} წუთის წინ` : `${mins}m ago`;
  if (hours < 24) return ka ? `${hours} საათის წინ` : `${hours}h ago`;
  return ka ? `${days} დღის წინ` : `${days}d ago`;
}

function Ticks({ isTemp, delivered, read, mine }: { isTemp: boolean; delivered: boolean; read: boolean; mine: boolean }) {
  if (!mine) return null;
  if (isTemp) return (
    <span className="inline-flex items-center ml-1 shrink-0">
      <svg width="11" height="10" viewBox="0 0 14 12" fill="none">
        <path d="M1 6l4 4 8-8" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  const color = read ? "#60A5FA" : "rgba(255,255,255,0.45)";
  if (delivered || read) return (
    <span className="inline-flex items-center ml-1 shrink-0">
      <svg width="16" height="11" viewBox="0 0 20 13" fill="none">
        <path d="M1 6l4 4 7-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 10l7-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 10l7-8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
  return (
    <span className="inline-flex items-center ml-1 shrink-0">
      <svg width="13" height="10" viewBox="0 0 16 12" fill="none">
        <path d="M1 6l4 4 9-9" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function ReactionBar({ msgId, myAnonId, reactions, onReact, onClose, mine }: {
  msgId: string; myAnonId: string; reactions: Reaction[];
  onReact: (msgId: string, emoji: string) => void; onClose: () => void; mine: boolean;
}) {
  const emojis = ["❤️", "😂", "😮", "😢", "😡", "👍"];
  return (
    <div
      className={`absolute bottom-full mb-2 z-50 flex items-center gap-1 bg-zinc-800 rounded-full px-3 py-2 shadow-2xl ring-1 ring-white/10 ${mine ? "right-0" : "left-0"}`}
      onClick={e => e.stopPropagation()}>
      {emojis.map(e => {
        const active = reactions.some(r => r.message_id === msgId && r.sender_anon === myAnonId && r.emoji === e);
        return (
          <button key={e} onClick={() => { onReact(msgId, e); onClose(); }}
            className={`text-2xl transition active:scale-75 hover:scale-125 ${active ? "scale-110" : "opacity-80"}`}
            style={{ lineHeight: 1 }}>
            {e}
          </button>
        );
      })}
    </div>
  );
}

function ReactionsDisplay({ msgId, reactions, myAnonId, mine, onReact }: {
  msgId: string; reactions: Reaction[]; myAnonId: string; mine: boolean;
  onReact: (msgId: string, emoji: string) => void;
}) {
  const msgReactions = reactions.filter(r => r.message_id === msgId);
  if (!msgReactions.length) return null;
  const grouped: Record<string, number> = {};
  msgReactions.forEach(r => { grouped[r.emoji] = (grouped[r.emoji] ?? 0) + 1; });
  return (
    <div className={`flex w-full ${mine?"justify-end":"justify-start"}`}>
      {Object.entries(grouped).map(([emoji, count]) => {
        const isMine = msgReactions.some(r => r.emoji === emoji && r.sender_anon === myAnonId);
        return (
          <button key={emoji} onClick={() => onReact(msgId, emoji)}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition active:scale-90 ${
              isMine ? "bg-[#7C3AED]/40 ring-1 ring-[#7C3AED]" : "bg-zinc-700/80 ring-1 ring-white/10"
            }`}>
            <span style={{ fontSize: 14 }}>{emoji}</span>
            {count > 1 && <span className="text-white/70 font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function UnmatchModal({ onClose, onConfirm, ka }: {
  onClose: () => void; onConfirm: (reason: string) => void; ka: boolean;
}) {
  const [selected, setSelected] = useState<string|null>(null);
  const [feedback, setFeedback] = useState("");


  function isRealText(text: string): boolean {
    if (text.length < 10) return false;
    const unique = new Set(text.toLowerCase().replace(/\s/g, "")).size;
    if (unique < 5) return false;
    if (/(.)\1{4,}/.test(text)) return false;
    const words = text.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length < 2) return false;
    return new Set(words.map(w => w.toLowerCase())).size >= 2;
  }

  const canConfirm = selected !== null || isRealText(feedback);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm(selected ?? feedback);
  }

  const reasons = [
    ka ? "არ ვართ თავსებადი" : "Not compatible",
    ka ? "შეურაცხმყოფელი ქცევა" : "Offensive behavior",
    ka ? "სპამი ან ყალბი პროფილი" : "Spam or fake profile",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-2 border-b border-white/8">
          <h2 className="text-white font-bold text-lg">{ka ? "რატო ხდება Unmatch?" : "Why Unmatch?"}</h2>
          <p className="text-white/40 text-sm">{ka ? "მიზეზი სავალდებულოა" : "Reason required"}</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2">
          {reasons.map(r => (
            <button key={r} onClick={() => setSelected(selected === r ? null : r)}
              className={`w-full px-4 py-3.5 rounded-2xl text-sm font-medium text-left transition border ${
                selected === r
                  ? "bg-[#7C3AED]/20 border-[#7C3AED] text-white"
                  : "bg-white/5 border-white/8 text-white/70"
              }`}>
              {r}
            </button>
          ))}
          <textarea value={feedback} onChange={e => { setFeedback(e.target.value); if (e.target.value) setSelected(null); }}
            placeholder={ka ? "ან დაწერე უკუკავშირი (მინ. 10 სიმბოლო)..." : "Or write feedback (min. 10 chars)..."}
            rows={3}
            className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-white/30" />
          {feedback.length >= 3 && !isRealText(feedback) && !selected && (
            <p className="text-xs text-red-400 px-1">{ka ? "გთხოვ ნამდვილი ტექსტი დაწერო" : "Please write meaningful feedback"}</p>
          )}
        </div>
        <div className="px-4 pb-8 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-white/8 py-3.5 text-sm font-semibold text-white/70">
            {ka?"გაუქმება":"Cancel"}
          </button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-40 transition">
            Unmatch
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMenu({ onClose, onViewProfile, onUnmatch, onBlock, lang }: {
  onClose: () => void; onViewProfile: () => void; onUnmatch: () => void; onBlock: () => void; lang: string;
}) {
  const ka = lang !== "en";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end px-4 pt-4 pb-2">
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">✕</button>
        </div>
        {[
          { label: ka?"პროფილის ნახვა":"View profile", icon:"👤", red:false, onClick:onViewProfile },
          { label: ka?"Unmatch & დაბლოკვა":"Unmatch & Block", icon:"🚫", red:false, onClick:onUnmatch },
          { label: ka?"დაბლოკვა და შეტყობინება":"Block and report", icon:"⛔", red:true, onClick:onBlock },
        ].map((item,i) => (
          <button key={i} onClick={item.onClick}
            className={`w-full flex items-center justify-between px-5 py-4 border-t border-white/8 hover:bg-white/5 transition ${item.red?"text-red-400":"text-white"}`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            <span className="text-white/25">›</span>
          </button>
        ))}
        <div className="h-8" />
      </div>
    </div>
  );
}

function AttachSheet({ onClose, onGallery, onCamera, lang }: {
  onClose: () => void; onGallery: () => void; onCamera: () => void; lang: string;
}) {
  const ka = lang !== "en";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-white/8">
          <h3 className="text-white font-bold">{ka?"დამატება":"Attach"}</h3>
          <button onClick={onClose} className="text-white/40 text-2xl">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button onClick={() => { onCamera(); onClose(); }}
            className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-white/5 hover:bg-white/10 transition active:scale-95">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span className="text-white/80 text-sm font-medium">{ka?"კამერა":"Camera"}</span>
          </button>
          <button onClick={() => { onGallery(); onClose(); }}
            className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-white/5 hover:bg-white/10 transition active:scale-95">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span className="text-white/80 text-sm font-medium">{ka?"გალერეა":"Gallery"}</span>
          </button>
        </div>
        <div className="h-6" />
      </div>
    </div>
  );
}

const EMOJI_ROWS = [
  ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗"],
  ["😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑"],
  ["😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧"],
  ["🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯"],
  ["😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩"],
  ["😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽"],
  ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖"],
  ["💘","💝","💟","☮️","✝️","☪️","🕉","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉"],
  ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️"],
  ["👋","🤚","🖐","✋","🖖","👏","🙌","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿"],
  ["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","⚽","🏀","🏈","⚾"],
  ["🔥","💥","✨","⭐","🌟","💫","⚡","☄️","🌈","☀️","🌤","⛅","🌥","☁️","🌦","🌧"],
  ["😻","😺","😸","😹","😼","😽","🙀","😿","😾","🐶","🐱","🐭","🐹","🐰","🦊","🐻"],
];

function QuickEmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const allEmojis = EMOJI_ROWS.flat();
  const filtered = search ? allEmojis.filter(e => e.includes(search)) : null;
  const rows = filtered ? [filtered] : EMOJI_ROWS;

  return (
    <div className="bg-zinc-900 border-t border-white/8 rounded-t-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button onClick={onClose} 
          className="shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search emojis..."
          className="flex-1 bg-zinc-800 rounded-full px-3 py-2 text-sm text-white placeholder-white/30 outline-none" />
      </div>
      <div className="overflow-y-auto px-2 pb-3" style={{ maxHeight: 240 }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex flex-wrap">
            {row.map((e, ei) => (
              <button key={ei} onClick={() => { onPick(e); if (search) setSearch(""); }}
                className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-xl transition active:scale-90"
                style={{ lineHeight: 1 }}>
                {e}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = Number(params?.matchId);
  const lang = getLang();
  const ka = lang !== "en";
  const { anonId: ctxAnonId } = useUser();
const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [myAnonId, setMyAnonId] = useState<string|null>(null);
  const [myUserId, setMyUserId] = useState<string|null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [otherUserId, setOtherUserId] = useState<string|null>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [showAttachSheet, setShowAttachSheet] = useState(false);

  const [reactionMsgId, setReactionMsgId] = useState<string|null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string|null>(null);
  const longPressTimer = useRef<NodeJS.Timeout|null>(null);

  const [replyTo, setReplyTo] = useState<MsgRow|null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string|null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob|null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string|null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myAnonIdRef = useRef<string|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imagePreview, setImagePreview] = useState<{file: File, url: string} | null>(null);


  useEffect(() => { if (ctxAnonId && !myAnonId) setMyAnonId(ctxAnonId); }, [ctxAnonId]);

  useEffect(() => {
    return () => {
      setReactionMsgId(null);
      setSelectedMsgId(null);
    };
  }, []);

 useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  
  function onResize() {
    const kbHeight = Math.max(0, window.innerHeight - vv!.height);
    setKeyboardHeight(kbHeight);
    if (kbHeight > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }
  
  vv.addEventListener("resize", onResize);
  return () => vv.removeEventListener("resize", onResize);
}, []);

  const isOnline = useMemo(() => {
    if (!otherProfile?.last_seen) return false;
    return Date.now() - new Date(otherProfile.last_seen).getTime() < 3*60*1000;
  }, [otherProfile]);

  const markRead = useCallback(async (anonId: string|null, uid: string|null) => {
    if (!anonId || !uid) return;
    await supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("read_at", null);
    await supabase.from("matches").update({ has_unread: false }).eq("id", matchId);
    setMsgs(prev => prev.map(m =>
      m.sender_anon !== anonId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
    ));
  }, [matchId]);

  const markDelivered = useCallback(async (anonId: string|null) => {
    if (!anonId) return;
    await supabase.from("messages")
      .update({ delivered_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("delivered_at", null);
  }, [matchId]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) { router.replace("/login"); return; }
      setMyUserId(user.id);
      const [meRes, matchRes] = await Promise.all([
        supabase.from("profiles").select("anon_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("matches").select("user_a,user_b").eq("id", matchId).maybeSingle(),
      ]);
      const anonId = meRes.data?.anon_id ?? ctxAnonId ?? null;
      setMyAnonId(anonId);
      myAnonIdRef.current = anonId;
      const matchRow = matchRes.data;
      if (!matchRow) return;
      const otherId = matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a;
      setOtherUserId(otherId);
      const [profileRes, msgsRes] = await Promise.all([
        supabase.from("profiles").select("user_id,nickname,first_name,photo1_url,last_seen").eq("user_id", otherId).maybeSingle(),
        supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true }),
      ]);
      const msgIds = (msgsRes.data ?? []).map((m: any) => m.id);
      const reactionsRes = msgIds.length
        ? await supabase.from("message_reactions").select("*").in("message_id", msgIds)
        : { data: [] };
      setOtherProfile(profileRes.data ?? null);
      setMsgs(msgsRes.data ?? []);
      setReactions(reactionsRes.data ?? []);
      setIsLoaded(true);
      await markRead(anonId, user.id);
      await markDelivered(anonId);
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id);
    })();
  }, [matchId, router, markRead, markDelivered]);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase.channel(`chat-${matchId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const row = payload.new as MsgRow;
        if (row.match_id !== matchId) return;
        setMsgs(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row]);
        setMyAnonId(anon => {
          if (anon && row.sender_anon !== anon) setMyUserId(uid => { markRead(anon, uid); return uid; });
          return anon;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const updated = payload.new as MsgRow;
        setMsgs(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as Reaction;
          setReactions(prev => prev.some(x => x.id === r.id) ? prev : [...prev, r]);
        }
        if (payload.eventType === "DELETE") {
          const r = payload.old as Reaction;
          setReactions(prev => prev.filter(x => x.id !== r.id));
        }
        if (payload.eventType === "UPDATE") {
          const r = payload.new as Reaction;
          setReactions(prev => prev.map(x => x.id === r.id ? r : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, markRead]);

  useEffect(() => {
    if (!isLoaded) return;
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [msgs.length, isLoaded]);

  useEffect(() => {
  if (keyboardHeight > 0) {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }
}, [keyboardHeight]);

  async function handleReact(msgId: string, emoji: string) {
    if (!myAnonId) return;
    setReactionMsgId(null);
    const existing = reactions.find(r => r.message_id === msgId && r.sender_anon === myAnonId);
    if (existing) {
      if (existing.emoji === emoji) {
        setReactions(prev => prev.filter(r => r.id !== existing.id));
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        setReactions(prev => prev.map(r => r.id === existing.id ? { ...r, emoji } : r));
        await supabase.from("message_reactions").update({ emoji }).eq("id", existing.id);
      }
    } else {
      const tempId = `r-${Date.now()}`;
      setReactions(prev => [...prev, { id: tempId, message_id: msgId, sender_anon: myAnonId, emoji }]);
      const { data } = await supabase.from("message_reactions").insert({ message_id: msgId, sender_anon: myAnonId, emoji }).select().single();
      if (data) setReactions(prev => prev.map(r => r.id === tempId ? data as Reaction : r));
    }
  }

  function onMsgPointerDown(msgId: string, mine: boolean) {
    longPressTimer.current = setTimeout(() => {
      setReactionMsgId(msgId);
      if (mine) setSelectedMsgId(msgId);
    }, 500);
  }
  function onMsgPointerUp() { if (longPressTimer.current) clearTimeout(longPressTimer.current); }

  async function deleteMessage(msgId: string) {
    await supabase.from("messages").delete().eq("id", msgId);
    setMsgs(prev => prev.filter(m => m.id !== msgId));
    setSelectedMsgId(null); setReactionMsgId(null);
  }

  async function uploadImage(file: File) {
    if (!matchId || !myUserId || !myAnonId) return;
    setUploadingImg(true);
    try {
      const ext = file.type.split("/")[1] || "jpg";
      const path = `${myUserId}/chat-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const tempId = `tempi-${Date.now()}`;
      setMsgs(prev => [...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, created_at: new Date().toISOString(), read_at: null, type: "image" }]);
      const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, type: "image" }).select().single();
      if (data) setMsgs(prev => prev.map(m => m.id === tempId ? (data as MsgRow) : m));
      await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    } catch (e) { console.error(e); }
    setUploadingImg(false);
  }

 async function send() {
  const t2 = text.trim();
  if (!t2 || !myAnonId || sendingRef.current) return;
  sendingRef.current = true;
  setSending(true);
  setText("");
  // დანარჩენი კოდი...
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const replyPreview = replyTo ? (replyTo.type==="voice"?"🎤 Voice":replyTo.type==="image"?"📷 Photo":replyTo.content.slice(0,60)) : null;
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    
    setMsgs(prev => [...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: t2, created_at: new Date().toISOString(), read_at: null, delivered_at: null, type: "text", reply_to_id: replyId, reply_preview: replyPreview }]);
    
    try {
      const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: t2, type: "text", reply_to_id: replyId, reply_preview: replyPreview }).select().single();
      if (data) {
        setMsgs(prev => prev.map(m => m.id === tempId ? (data as MsgRow) : m));
      }
      await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
      if (myUserId) await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", myUserId);
    } catch (err) {
      console.error("Send error:", err);
      setMsgs(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
      sendingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) { setAudioBlob(blob); setAudioPreviewUrl(URL.createObjectURL(blob)); }
        stream.getTracks().forEach(tr => tr.stop());
      };
      recorder.start(); setRecording(true); setRecordTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch { alert(ka ? "მიკროფონი მიუწვდომელია" : "Microphone unavailable"); }
  }
  function stopRecording() { mediaRecorderRef.current?.stop(); setRecording(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }
  function cancelRecording() { stopRecording(); setAudioBlob(null); if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); } setRecordTime(0); chunksRef.current = []; }

  async function sendVoice() {
    if (!audioBlob || !myAnonId || uploadingVoice) return;
    setUploadingVoice(true);
    const fileName = `voice-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("voices").upload(fileName, audioBlob, { contentType: "audio/webm", upsert: true });
    if (error) { console.error(error); setUploadingVoice(false); return; }
    const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
    const tempId = `tempv-${Date.now()}`;
    setMsgs(prev => [...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, created_at: new Date().toISOString(), read_at: null, type: "voice" }]);
    const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, type: "voice" }).select().single();
    if (data) setMsgs(prev => prev.map(m => m.id === tempId ? (data as MsgRow) : m));
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); }
    setAudioBlob(null); setUploadingVoice(false);
  }

  async function handleUnmatchConfirm(reason: string) {
    setShowUnmatchModal(false);
    const isReport = reason === "შეურაცხმყოფელი ქცევა" || reason === "სპამი ან ყალბი პროფილი" ||
                     reason === "Offensive behavior" || reason === "Spam or fake profile";

    try {
      await supabase.from("unmatch_feedback").insert({ from_user: myUserId, to_user: otherUserId, match_id: matchId, reason });
    } catch {}

    if (isReport) {
      try {
        await supabase.from("reports").insert({ from_user: myUserId, to_user: otherUserId, match_id: matchId, reason });
      } catch {}
    } else {
      try {
        await supabase.from("notifications").insert({
          user_id: otherUserId,
          type: "unmatch",
          message: reason,
          from_user: myUserId
        });
      } catch {}
    }

    try { await supabase.from("messages").delete().eq("match_id", matchId); } catch {}
    try { await supabase.from("matches").delete().eq("id", matchId); } catch {}
    window.location.href = "/chat";
  }

  async function handleBlock() {
    if (!confirm(ka?"დაბლოკვა და შეტყობინება?":"Block and report?")) return;
    await supabase.from("matches").delete().eq("id", matchId);
    router.replace("/chat");
  }

  const avatar = useMemo(() => { const src = photoSrc(otherProfile?.photo1_url ?? null); return src || null; }, [otherProfile]);
  const otherName = otherProfile?.nickname ?? otherProfile?.first_name ?? "...";
  const hasFocusOrText = text.trim().length > 0;

  if (!isLoaded) return (
    <div className="fixed inset-0 bg-[#111] flex justify-center">
      <div className="w-full max-w-lg flex flex-col bg-[#111]">
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-white/8 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-2 w-16 bg-white/8 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {[1,2,3,4].map(i => <div key={i} className={`flex ${i%2===0?"justify-end":"justify-start"}`}>
            <div className={`h-9 rounded-2xl bg-white/8 animate-pulse ${i%2===0?"w-48":"w-36"}`} />
          </div>)}
        </div>
      </div>
    </div>
  );

  const effectiveAnonId = myAnonId ?? myAnonIdRef.current;


return (
 <div className="fixed inset-0 bg-[#111] flex justify-center overflow-hidden">
  <div className="w-full max-w-lg flex flex-col bg-[#111] text-white overflow-hidden"
    style={{ height: "100dvh", paddingBottom: "env(keyboard-inset-height, 0px)" }}>
        {/* HEADER - FIXED */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-white/8 shrink-0">
          <button onClick={() => { setReactionMsgId(null); setSelectedMsgId(null); router.push("/chat"); }}
            className="rounded-full bg-white/8 w-9 h-9 flex items-center justify-center text-white shrink-0 hover:bg-white/12 transition">←</button>
          <div className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => otherUserId && router.push(`/profile/${otherUserId}`)}>
            <div className="relative shrink-0">
              <SafeImg src={avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                fallback={<div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm">👤</div>} />
              {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-zinc-950" />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{otherName}</div>
              <div className={`text-[11px] ${isOnline?"text-green-400":"text-white/40"}`}>{formatLastSeen(otherProfile?.last_seen ?? null, ka)}</div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); setShowMenu(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition shrink-0 text-lg font-bold tracking-widest">···</button>
        </div>

        {/* MESSAGES - SCROLLABLE */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3"
  style={{ overscrollBehavior: "none" }}>
  <div className="flex flex-col justify-end min-h-full space-y-0.5">

            {msgs.map((m, i) => {
              if (!myAnonId) return null;                
              const mine = myAnonId ? m.sender_anon === myAnonId : false;
              const isTemp = m.id.startsWith("temp");
              const isRead = !!m.read_at;
              const isDelivered = !!m.delivered_at;
              const prevSame = i > 0 && msgs[i-1].sender_anon === m.sender_anon;
              const isSelected = selectedMsgId === m.id;
              const showReactionBar = reactionMsgId === m.id;
              const isHovered = hoveredMsgId === m.id;

              return (
                <div key={m.id} className={`flex flex-col w-full ${mine?"items-end":"items-start"} ${prevSame?"mt-0.5":"mt-3"}`}>
                  <div className="relative flex w-full px-2"
                    style={{ justifyContent: mine ? "flex-end" : "flex-start" }}
                    onMouseEnter={() => setHoveredMsgId(m.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                    onPointerDown={() => onMsgPointerDown(m.id, mine)}
                    onPointerUp={onMsgPointerUp}
                    onPointerLeave={onMsgPointerUp}
                    onContextMenu={e => e.preventDefault()}>

                    {isHovered && !showReactionBar && (
                      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-20 ${mine ? "right-full pr-2" : "left-full pl-2"}`}>
                        <button onClick={e => { e.stopPropagation(); setReplyTo(m); inputRef.current?.focus(); }}
                          className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white/70 hover:text-white transition text-sm">↩</button>
                        <button onClick={e => { e.stopPropagation(); setReactionMsgId(m.id); }}
                          className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition text-sm">😊</button>
                        {mine && (
                          <button onClick={e => { e.stopPropagation(); deleteMessage(m.id); }}
                            className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-red-500/80 flex items-center justify-center text-white/50 hover:text-white transition text-xs">🗑</button>
                        )}
                      </div>
                    )}

                    {showReactionBar && (
                      <ReactionBar msgId={m.id} myAnonId={myAnonId} reactions={reactions} mine={mine}
                        onReact={handleReact} onClose={() => setReactionMsgId(null)} />
                    )}

                    <div>
                      {m.reply_preview && (
                        <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 border-[#7C3AED] bg-white/8 max-w-[240px] truncate text-white/60 ${mine?"ml-auto":""}`}>
                          ↩ {m.reply_preview}
                        </div>
                      )}

                      {m.type === "voice" ? (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl max-w-[270px]
                          ${mine?"bg-[#7C3AED] rounded-tr-sm":"bg-zinc-800 rounded-tl-sm"}
                          ${isTemp?"opacity-60":""} ${isSelected?"ring-2 ring-red-400":""}`}>
                          <span className="text-lg shrink-0">🎤</span>
                          <audio controls src={m.content} className="h-8 max-w-[160px]" preload="metadata" />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <span className="text-[10px] text-white/40">{fmtTime(m.created_at)}</span>
                            <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                          </div>
                        </div>
                      ) : m.type === "image" ? (
                        <div className={`rounded-2xl overflow-hidden max-w-[260px] ${mine?"rounded-tr-sm":"rounded-tl-sm"} ${isTemp?"opacity-60":""}`}>
                          <img src={m.content} className="max-w-full max-h-[280px] object-cover block" alt=""
                            onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                          {mine && (
                            <div className="flex justify-end px-2 py-1 bg-black/20">
                              <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`px-3.5 py-2.5 text-sm leading-relaxed break-words select-none
${mine?"bg-[#7C3AED] rounded-2xl rounded-tr-sm ml-8":"bg-zinc-800 rounded-2xl rounded-tl-sm mr-8"}
${isTemp?"opacity-60":""} ${isSelected?"ring-2 ring-red-400":""}`}>
                          <span>{m.content}</span>
                          <span className="inline-flex items-center gap-0.5 ml-2">
                            <span className={`text-[10px] ${mine?"text-purple-200/50":"text-white/25"}`}>{fmtTime(m.created_at)}</span>
                            <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ReactionsDisplay msgId={m.id} reactions={reactions} myAnonId={effectiveAnonId ?? ""} mine={mine} onReact={handleReact} />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>
{/* INPUT BAR - FIXED */}
<div className="shrink-0 bg-zinc-950 border-t border-white/8"
  style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}>

  {showEmoji && (
    <QuickEmojiPicker onPick={e => setText(p => p + e)} onClose={() => setShowEmoji(false)} />
  )}
  {replyTo && (
    <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-2 rounded-2xl bg-zinc-800 border-l-2 border-[#7C3AED]">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#A78BFA] font-semibold mb-0.5">↩ {ka?"პასუხი":"Reply"}</div>
        <div className="text-xs text-white/60 truncate">
          {replyTo.type==="voice"?"🎤 Voice":replyTo.type==="image"?"📷 Photo":replyTo.content.slice(0,60)}
        </div>
      </div>
      <button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white text-lg shrink-0">✕</button>
    </div>
  )}

          {recording && (
            <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold text-sm tabular-nums shrink-0">{fmtTimer(recordTime)}</span>
              <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
                {Array.from({length:28}).map((_,i) => (
                  <div key={i} className="bg-red-400/60 rounded-full shrink-0" style={{width:"2px",height:`${5+((i*7+recordTime*13)%16)}px`}} />
                ))}
              </div>
              <button onClick={cancelRecording} className="text-white/40 hover:text-red-400 shrink-0 px-1">🗑</button>
              <button onClick={stopRecording} className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shrink-0">{ka?"გაჩერება":"Stop"}</button>
            </div>
          )}

          {!recording && audioBlob && audioPreviewUrl && (
            <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-2 rounded-2xl bg-zinc-800 border border-white/10">
              <span className="text-white/70 text-xs shrink-0">🎤</span>
              <audio controls src={audioPreviewUrl} className="flex-1 h-8" preload="auto" />
              <button onClick={cancelRecording} className="text-white/40 hover:text-white shrink-0 text-lg leading-none">✕</button>
            </div>
          )}

          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setImagePreview({ file: f, url: URL.createObjectURL(f) }); e.target.value=""; }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setImagePreview({ file: f, url: URL.createObjectURL(f) }); e.target.value=""; }} />

          {!recording && (
            <div className="flex items-center gap-1.5 px-3 py-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
              {!hasFocusOrText ? (
                <button onClick={() => setShowAttachSheet(true)}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition active:scale-90 text-xl">
                  +
                </button>
              ) : null}

              <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-4 py-2.5 gap-2 min-w-0 border-0 outline-none ring-0">
                <input ref={inputRef} value={text}
                  onChange={e => setText(e.target.value)}
                  onFocus={() => { setShowEmoji(false); }}
                  autoComplete="off" autoCorrect="off" autoCapitalize="sentences"
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && !sending) { e.preventDefault(); send(); } }}
                  placeholder={ka?"მესიჯი...":"Message..."} />
              </div>

              {text.trim() ? (
                <button onClick={send} disabled={sending}
                  onMouseDown={e => e.preventDefault()}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 active:scale-90 transition shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
              ) : audioBlob ? (
                <button onClick={sendVoice} disabled={uploadingVoice}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 active:scale-90 transition shadow-lg">
                  {uploadingVoice ? <span className="text-xs text-white">⏳</span>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>}
                </button>
              ) : (
                <button onClick={e => { e.stopPropagation(); setShowEmoji(p => !p); }}
                  className="shrink-0 w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition text-xl">
                  🙂
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {imagePreview && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}>
            <button onClick={() => setImagePreview(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg">✕</button>
            <button onClick={async () => { const f = imagePreview.file; setImagePreview(null); await uploadImage(f); }} disabled={uploadingImg}
              className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center shadow-xl disabled:opacity-50 active:scale-90 transition">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={imagePreview.url} className="max-w-full max-h-full object-contain rounded-2xl" alt="" />
          </div>
        </div>
      )}

      {showMenu && <ChatMenu lang={lang} onClose={() => setShowMenu(false)}
        onViewProfile={() => { setShowMenu(false); otherUserId && router.push(`/profile/${otherUserId}`); }}
        onUnmatch={() => { setShowMenu(false); setShowUnmatchModal(true); }}
        onBlock={() => { setShowMenu(false); handleBlock(); }} />}

      {showUnmatchModal && <UnmatchModal ka={ka} onClose={() => setShowUnmatchModal(false)} onConfirm={handleUnmatchConfirm} />}

      {showAttachSheet && <AttachSheet lang={lang} onClose={() => setShowAttachSheet(false)}
        onGallery={() => galleryInputRef.current?.click()} onCamera={() => cameraInputRef.current?.click()} />}

      {(reactionMsgId || selectedMsgId) && (
        <div className="fixed inset-0 z-30" onClick={() => { setReactionMsgId(null); setSelectedMsgId(null); }} />
      )}
    </div>
  );
}
    