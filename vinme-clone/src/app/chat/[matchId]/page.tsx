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

function formatDetailedDate(iso: string, ka: boolean) {
  const d = new Date(iso);
  const monthsKa =["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];
  const monthsEn =["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = ka ? monthsKa[d.getMonth()] : monthsEn[d.getMonth()];
  const min = d.getMinutes().toString().padStart(2, '0');
  const hr = d.getHours().toString().padStart(2, '0');
  return `${d.getDate()} ${month} ${d.getFullYear()}, ${hr}:${min}`;
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

function ThemeModal({ current, currentBg, onClose, onSelect, ka }: {
  current: string; currentBg: string; onClose: () => void; 
  onSelect: (color: string, bg: string) => void; ka: boolean;
}) {
  const[selectedColor, setSelectedColor] = useState(current);
  const[selectedBg, setSelectedBg] = useState(currentBg);
  const [tab, setTab] = useState<"color" | "bg">("color");

  const themes =[
    { color: "#7C3AED", label: "Purple" },
    { color: "#EC4899", label: "Pink" },
    { color: "#3B82F6", label: "Blue" },
    { color: "#10B981", label: "Green" },
    { color: "#F59E0B", label: "Orange" },
    { color: "#EF4444", label: "Red" },
    { color: "#6366F1", label: "Indigo" },
    { color: "#14B8A6", label: "Teal" },
    { color: "#F97316", label: "Amber" },
    { color: "#8B5CF6", label: "Violet" },
    { color: "#06B6D4", label: "Cyan" },
    { color: "#84CC16", label: "Lime" },
  ];

  const backgrounds =[
    { label: "შავი", bg: "#111111" },
    { label: "ღამე", bg: "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 100%)" },
    { label: "ოკეანე", bg: "linear-gradient(160deg, #0f0c29, #302b63, #24243e)" },
    { label: "ტყე", bg: "linear-gradient(160deg, #0a0a0a, #0d2b1a, #1a3a0a)" },
    { label: "მზის ჩასვლა", bg: "linear-gradient(160deg, #1a0a00, #3d1a00, #2d0a20)" },
    { label: "ვარდისფერი", bg: "linear-gradient(160deg, #1a0010, #2d0030, #1a001a)" },
    { label: "ანიმე 🌸", bg: "linear-gradient(160deg, #1a0015, #2d0030, #0d001a, #1a0020)" },
    { label: "სამყარო 🌌", bg: "radial-gradient(ellipse at top, #0d0d2b 0%, #000000 60%), radial-gradient(ellipse at bottom, #1a0030 0%, #000000 60%)" },
    { label: "Aurora 🌈", bg: "linear-gradient(160deg, #001a1a 0%, #0a2d1a 30%, #1a0030 70%, #0a001a 100%)" },
    { label: "Synthwave 🌆", bg: "linear-gradient(160deg, #0d001a 0%, #1a0030 40%, #2d0015 100%)" },
    { label: "ზღვა 🌊", bg: "linear-gradient(160deg, #000d1a 0%, #001a2d 50%, #001a1a 100%)" },
    { label: "ვულკანი 🌋", bg: "linear-gradient(160deg, #0a0000 0%, #1a0000 40%, #2d0500 100%)" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">🎨 {ka ? "ჩატის სტილი" : "Chat Style"}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex rounded-full bg-white/8 p-0.5 mb-4">
          <button onClick={() => setTab("color")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${tab === "color" ? "bg-white text-black" : "text-white/50"}`}>
            🎨 {ka ? "ფერი" : "Color"}
          </button>
          <button onClick={() => setTab("bg")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${tab === "bg" ? "bg-white text-black" : "text-white/50"}`}>
            🖼 {ka ? "ფონი" : "Background"}
          </button>
        </div>

        {tab === "color" && (
          <div className="grid grid-cols-6 gap-3 mb-5">
            {themes.map(t => (
              <button key={t.color} onClick={() => setSelectedColor(t.color)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full transition-transform active:scale-90"
                  style={{ background: t.color, outline: selectedColor === t.color ? "3px solid white" : "3px solid transparent", outlineOffset: "2px" }} />
                <span className="text-[10px] text-white/50">{t.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "bg" && (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[240px] scrollbar-hide pb-2">
            {backgrounds.map(b => (
              <button key={b.label} onClick={() => setSelectedBg(b.bg)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-full h-16 rounded-2xl border-2 transition-transform active:scale-95"
                  style={{ background: b.bg, borderColor: selectedBg === b.bg ? "white" : "transparent" }} />
                <span className="text-[10px] text-white/50">{b.label}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-white/10">
          <button 
            onClick={() => { onSelect(selectedColor, selectedBg); onClose(); }}
            className="w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-[0.98] transition-transform"
            style={{ background: selectedColor }}>
            {ka ? "შენახვა" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// მცურავი ემოჯების პანელი (რჩება მესიჯის თავზე)
function EmojiPopup({ msg, myAnonId, reactions, onReact, onClose, mine }: {
  msg: MsgRow; myAnonId: string; reactions: Reaction[];
  onReact: (msgId: string, emoji: string) => void; onClose: () => void; mine: boolean;
}) {
  const emojis =["❤️", "😂", "😮", "😢", "😡", "👍"];
  return (
    <div className={`absolute z-[60] flex items-center gap-1 bg-zinc-800 rounded-full px-3 py-2 shadow-2xl ring-1 ring-white/10 ${mine ? "right-0" : "left-0"}`}
      style={{ bottom: "calc(100% + 8px)" }}
      onClick={e => e.stopPropagation()}>
      {emojis.map(e => {
        const active = reactions.some(r => r.message_id === msg.id && r.sender_anon === myAnonId && r.emoji === e);
        return (
          <button key={e} onClick={() => { onReact(msg.id, e); onClose(); }}
            className={`text-2xl transition active:scale-75 hover:scale-125 ${active ? "scale-110" : "opacity-80"}`}
            style={{ lineHeight: 1 }}>
            {e}
          </button>
        );
      })}
    </div>
  );
}

// ქვედა მოქმედებების პანელი (განახლებული Unsend ლოგიკით)
function BottomActionMenu({ msg, mine, onClose, onReply, onCopy, onDelete, ka }: {
  msg: MsgRow; mine: boolean; onClose: () => void;
  onReply: () => void; onCopy: () => void; onDelete: () => void; ka: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] bg-[#1a1a1a] border-t border-white/5 pb-8 pt-5 px-4 flex justify-around items-center rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      onClick={e => e.stopPropagation()}>
      
      <button onClick={onReply} className="flex flex-col items-center gap-2 w-16 opacity-80 hover:opacity-100 transition active:scale-95">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        </div>
        <span className="text-[12px] font-medium text-white">{ka ? "პასუხი" : "Reply"}</span>
      </button>

      {msg.type === "text" && (
        <button onClick={onCopy} className="flex flex-col items-center gap-2 w-16 opacity-80 hover:opacity-100 transition active:scale-95">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </div>
          <span className="text-[12px] font-medium text-white">{ka ? "კოპირება" : "Copy"}</span>
        </button>
      )}

      {/* წაშლის ღილაკი ახლა ყველა მესიჯზე ჩანს (Mine-ის მიუხედავად) */}
      <button onClick={onDelete} className="flex flex-col items-center gap-2 w-16 opacity-80 hover:opacity-100 transition active:scale-95">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </div>
        <span className="text-[12px] font-medium text-white">{ka ? "წაშლა" : "Unsend"}</span>
      </button>
    </div>
  );
}

// წაშლის მოდალი (ამოწმებს შენი მესიჯია თუ არა)
function DeleteMessageModal({ onClose, onConfirm, ka, isMine }: { onClose: ()=>void, onConfirm: (type: 'me'|'everyone')=>void, ka: boolean, isMine: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden p-5" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <h3 className="text-white font-bold text-center text-lg mb-4">{ka ? "მესიჯის წაშლა" : "Delete Message"}</h3>
        
        <div className="flex flex-col gap-2">
          {/* ყველასთვის წაშლა გამოჩნდება მხოლოდ შენს მესიჯებზე */}
          {isMine && (
            <button onClick={() => onConfirm('everyone')} className="w-full py-4 rounded-2xl bg-red-500/10 text-red-500 font-bold active:scale-95 transition ring-1 ring-red-500/30">
              {ka ? "წაშლა ყველასთვის" : "Unsend for everyone"}
            </button>
          )}
          {/* შენთვის წაშლა ყველა შემთხვევაში */}
          <button onClick={() => onConfirm('me')} className="w-full py-4 rounded-2xl bg-white/10 text-white font-bold active:scale-95 transition">
            {ka ? "წაშლა ჩემთვის" : "Delete for you"}
          </button>
          <button onClick={onClose} className="w-full py-4 rounded-2xl text-white/50 font-bold active:scale-95 transition mt-2">
            {ka ? "გაუქმება" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReactionsDisplay({ msgId, reactions, myAnonId, onReact, theme }: {
  msgId: string; reactions: Reaction[]; myAnonId: string;
  onReact: (msgId: string, emoji: string) => void; theme: string;
}) {
  const msgReactions = reactions.filter(r => r.message_id === msgId);
  if (!msgReactions.length) return null;
  const latestReactions = new Map<string, Reaction>();
  msgReactions.forEach(r => { latestReactions.set(r.sender_anon, r); });
  const activeReactions = Array.from(latestReactions.values());
  if (!activeReactions.length) return null;
  const grouped: Record<string, number> = {};
  activeReactions.forEach(r => { grouped[r.emoji] = (grouped[r.emoji] ?? 0) + 1; });
  return (
    <div className="flex items-center gap-1">
      {Object.entries(grouped).map(([emoji, count]) => {
        const isMine = activeReactions.some(r => r.emoji === emoji && r.sender_anon === myAnonId);
        return (
          <button key={emoji} onClick={() => onReact(msgId, emoji)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition active:scale-90 shadow-md text-white border"
            style={isMine ? { background: theme, borderColor: theme } : { background: "#27272a", borderColor: "rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
            {count > 1 && <span className="font-medium ml-0.5">{count}</span>}
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
  const reasons =[
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
                selected === r ? "bg-[#7C3AED]/20 border-[#7C3AED] text-white" : "bg-white/5 border-white/8 text-white/70"
              }`}>
              {r}
            </button>
          ))}
          <textarea value={feedback} onChange={e => { setFeedback(e.target.value); if (e.target.value) setSelected(null); }}
            placeholder={ka ? "ან დაწერე უკუკავშირი (მინ. 10 სიმბოლო)..." : "Or write feedback (min. 10 chars)..."}
            rows={3}
            className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-white/30" />
        </div>
        <div className="px-4 pb-8 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-white/8 py-3.5 text-sm font-semibold text-white/70">
            {ka?"გაუქმება":"Cancel"}
          </button>
          <button onClick={() => canConfirm && onConfirm(selected ?? feedback)} disabled={!canConfirm}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-40 transition">
            Unmatch
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMenu({ onClose, onViewProfile, onUnmatch, onBlock, onOpenTheme, lang }: {
  onClose: () => void; onViewProfile: () => void; onUnmatch: () => void; onBlock: () => void; onOpenTheme: () => void; lang: string;
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
          { label: ka?"ჩატის სტილი":"Chat Style", icon:"🎨", red:false, onClick: () => { onClose(); onOpenTheme(); } },
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
        <div className="flex justify-between items-center px-5 pt-4 pb-3 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">{ka?"ატვირთვა":"Attach"}</h3>
          <button onClick={onClose} className="text-white/40 text-xl hover:text-white">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button onClick={() => { onCamera(); onClose(); }}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span className="text-white/80 text-xs font-medium">{ka?"კამერა":"Camera"}</span>
          </button>
          <button onClick={() => { onGallery(); onClose(); }}
            className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition active:scale-95">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span className="text-white/80 text-xs font-medium">{ka?"გალერეა":"Gallery"}</span>
          </button>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}

const EMOJI_ROWS = [["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗"],["😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑"],["😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧"],["🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯"],["😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩"],["😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽"],["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖"],["💘","💝","💟","☮️","✝️","☪️","🕉","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉"],["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️"],["👋","🤚","🖐","✋","🖖","👏","🙌","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿"],["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","⚽","🏀","🏈","⚾"],["🔥","💥","✨","⭐","🌟","💫","⚡","☄️","🌈","☀️","🌤","⛅","🌥","☁️","🌦","🌧"],["😻","😺","😸","😹","😼","😽","🙀","😿","😾","🐶","🐱","🐭","🐹","🐰","🦊","🐻"]];
const ALL_EMOJIS = EMOJI_ROWS.flat();

function QuickEmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = search ? ALL_EMOJIS.filter(e => e.includes(search)) : ALL_EMOJIS;
  return (
    <div className="bg-zinc-900 border-t border-white/8 rounded-t-2xl shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-white/5">
        <button type="button" onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white transition bg-white/5 rounded-full">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search emojis..."
          className="flex-1 bg-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 outline-none" />
      </div>
      <div className="overflow-y-auto p-2 scrollbar-hide" style={{ height: 220 }}>
        <div className="grid grid-cols-7 gap-1">
          {filtered.map((e, i) => (
            <button key={i} type="button" onClick={() => { onPick(e); if (search) setSearch(""); }}
              className="aspect-square flex items-center justify-center text-2xl hover:bg-white/10 rounded-xl transition active:scale-90">
              {e}
            </button>
          ))}
        </div>
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

  // ⚡️ SPEED FIX: ჩატში შესვლის წამიერი დაყოვნების ("ფიქრის") მოსაშორებლად.
  // 5-ჯერ JSON.parse-ის ნაცვლად, ქეშს ვკითხულობთ მხოლოდ 1-ხელ და ვუნაწილებთ სტეიტებს
  const cacheRef = useRef<any>(undefined);
  if (cacheRef.current === undefined) {
    if (typeof window !== "undefined") {
      const c = localStorage.getItem(`chat_cache_${matchId}`);
      cacheRef.current = c ? JSON.parse(c) : null;
    } else {
      cacheRef.current = null;
    }
  }
  const cache = cacheRef.current || {};

  const [msgs, setMsgs] = useState<MsgRow[]>(cache.cachedMsgs || []);
  const [otherProfile, setOtherProfile] = useState<any>(cache.cachedProfile || null);
  const [myAnonId, setMyAnonId] = useState<string|null>(cache.cachedAnonId || null);
  const [myUserId, setMyUserId] = useState<string|null>(cache.cachedUserId || null);
  const [isLoaded, setIsLoaded] = useState<boolean>(!!cache.cachedMsgs);

  const [matchCreatedAt, setMatchCreatedAt] = useState<string|null>(null);
  
  // აქედან ჩვეულებრივად გრძელდება შენი კოდი...
  const [chatTheme, setChatTheme] = useState("#7C3AED");
  // ...
  const[chatBg, setChatBg] = useState("#111111");  
  const[showThemeModal, setShowThemeModal] = useState(false);
  const[msgToDelete, setMsgToDelete] = useState<string | null>(null);

    const [viewingImage, setViewingImage] = useState<string | null>(null);


  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const[showTimeFor, setShowTimeFor] = useState<string | null>(null);
  
const [hasMore, setHasMore] = useState(true);
  const[loadingMore, setLoadingMore] = useState(false);


  const hasOverlay = isSearching  || !!viewingImage  || showThemeModal ||  !!msgToDelete;


    // 👇 👇 👇 აქედან იწყება Swipe Back-ის კოდი 

  useEffect(() => {
    if (hasOverlay) {
      window.history.pushState(null, "", window.location.href);
    }
  }, [hasOverlay]);

  useEffect(() => {
    const handlePopState = () => {
      if (hasOverlay) {
        setIsSearching(false);
        setShowEmoji(false);
        setViewingImage(null);
        setReactionMsgId(null);
        setShowMenu(false);
        setShowAttachSheet(false);
        setShowThemeModal(false);
        setShowUnmatchModal(false);
        setMsgToDelete(null);
      }
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasOverlay]);
  // 👆 👆 👆 აქ მთავრდება Swipe Back-ის კოდი

  

  useEffect(() => {
    const saved = localStorage.getItem(`chat-theme-${matchId}`);
    if (saved) {
      const { color, bg } = JSON.parse(saved);
      setChatTheme(color);
      setChatBg(bg);
    }
  },[matchId]);

  const applyTheme = useCallback((color: string, bg: string) => {
    setChatTheme(color);
    setChatBg(bg);
    setTimeout(() => {
      localStorage.setItem(`chat-theme-${matchId}`, JSON.stringify({ color, bg }));
    }, 0);
  }, [matchId]);

  const headerRef = useRef<HTMLDivElement>(null);
  const[keyboardHeight, setKeyboardHeight] = useState(0);
  const [headerTop, setHeaderTop] = useState(0);
  const[reactions, setReactions] = useState<Reaction[]>([]);
  const[text, setText] = useState("");
  const [otherUserId, setOtherUserId] = useState<string|null>(null);
  const[sending, setSending] = useState(false);
  const[showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const[showUnmatchModal, setShowUnmatchModal] = useState(false);
  const[showAttachSheet, setShowAttachSheet] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string|null>(null);
  const [replyTo, setReplyTo] = useState<MsgRow|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const[recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob|null>(null);
  const[audioPreviewUrl, setAudioPreviewUrl] = useState<string|null>(null);
  const[recordTime, setRecordTime] = useState(0);
  const[uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const myAnonIdRef = useRef<string|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const[uploadingImg, setUploadingImg] = useState(false);
  const [imagePreview, setImagePreview] = useState<{file: File, url: string} | null>(null);
  const msgReactionIds = useMemo(() => new Set(reactions.map(r => r.message_id)), [reactions]);
  const bgStyle = useMemo(() => ({ background: chatBg || "#111111" }),[chatBg]);

  const touchState = useRef({ id: null as string | null, startX: 0, startY: 0, timer: null as any, isLong: false, isSwipe: false });

  useEffect(() => { if (ctxAnonId && !myAnonId) setMyAnonId(ctxAnonId); },[ctxAnonId]);
  useEffect(() => { return () => { setReactionMsgId(null); setShowTimeFor(null); }; },[]);
  useEffect(() => { if (headerRef.current) setHeaderTop(headerRef.current.getBoundingClientRect().top); }, [isLoaded]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      if (isChrome || isFirefox) return;
      const kbHeight = Math.max(0, window.innerHeight - vv!.height);
      setKeyboardHeight(kbHeight);
      if (kbHeight > 0) bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  },[]);

  useEffect(() => {
    function onFocus() {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        headerRef.current.style.position = "fixed";
        headerRef.current.style.top = rect.top + "px";
        headerRef.current.style.left = rect.left + "px";
        headerRef.current.style.right = "0";
        headerRef.current.style.zIndex = "50";
        headerRef.current.style.width = rect.width + "px";
      }
    }
    function onBlur() {
      if (headerRef.current) {
        headerRef.current.style.position = "";
        headerRef.current.style.top = "";
        headerRef.current.style.left = "";
        headerRef.current.style.right = "";
        headerRef.current.style.width = "";
      }
    }
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", onBlur);
    return () => { window.removeEventListener("focusin", onFocus); window.removeEventListener("focusout", onBlur); };
  },[]);

  const isOnline = useMemo(() => {
    if (!otherProfile?.last_seen) return false;
    return Date.now() - new Date(otherProfile.last_seen).getTime() < 3*60*1000;
  },[otherProfile]);

  const markRead = useCallback(async (anonId: string|null, uid: string|null) => {
    if (!anonId || !uid) return;
    await supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("read_at", null);
    await supabase.from("matches").update({ has_unread: false }).eq("id", matchId);
    setMsgs(prev => prev.map(m => m.sender_anon !== anonId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m));
  }, [matchId]);

  const markDelivered = useCallback(async (anonId: string|null) => {
    if (!anonId) return;
    await supabase.from("messages").update({ delivered_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("delivered_at", null);
  },[matchId]);

  useEffect(() => {
    if (!matchId) return;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) { router.replace("/login"); return; }
      if (!myUserId) setMyUserId(user.id);

      const[meRes, matchRes, msgsRes] = await Promise.all([
        supabase.from("profiles").select("anon_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("matches").select("user_a,user_b,created_at").eq("id", matchId).maybeSingle(),
        supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: false }).limit(40),
      ]);

      const anonId = meRes.data?.anon_id ?? ctxAnonId ?? null;
      if (anonId !== myAnonId) setMyAnonId(anonId);
      myAnonIdRef.current = anonId;

      const matchRow = matchRes.data;
      if (!matchRow) return;
      setMatchCreatedAt(matchRow.created_at ?? null);

      const otherId = matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a;
      setOtherUserId(otherId);

      const msgsData = msgsRes.data ??[];
      if (msgsData.length < 40) setHasMore(false);

      const msgIds = msgsData.map((m: any) => m.id);

      const [profileRes, reactionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id,nickname,first_name,photo1_url,last_seen").eq("user_id", otherId).maybeSingle(),
        msgIds.length > 0
          ? supabase.from("message_reactions").select("*").in("message_id", msgIds)
          : Promise.resolve({ data: [] }),
      ]);

      const hiddenMsgs = JSON.parse(localStorage.getItem(`hidden_msgs`) || "[]");
      const finalMsgs = msgsData.filter((m: any) => !hiddenMsgs.includes(m.id)).reverse();
      const finalProfile = profileRes.data ?? null;

      setOtherProfile(finalProfile);
      setMsgs(finalMsgs);
      setReactions(reactionsRes.data ??[]);
      setIsLoaded(true);

      localStorage.setItem(`chat_cache_${matchId}`, JSON.stringify({
        cachedMsgs: finalMsgs,
        cachedProfile: finalProfile,
        cachedAnonId: anonId,
        cachedUserId: user.id
      }));

      Promise.all([
        markRead(anonId, user.id),
        markDelivered(anonId),
        supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id)
      ]).catch(console.error);

    })();
  },[matchId, router, markRead, markDelivered, ctxAnonId]);

  const handleScroll = async (e: any) => {
    if (e.target.scrollTop < 100) {
      if (hasMore && !loadingMore && msgs.length > 0) {
        setLoadingMore(true);
        const minCreatedAt = msgs[0].created_at; 
        const { data } = await supabase.from("messages")
          .select("*").eq("match_id", matchId)
          .lt("created_at", minCreatedAt)
          .order("created_at", { ascending: false }).limit(50);

        if (data && data.length > 0) {
          const hiddenMsgs = JSON.parse(localStorage.getItem(`hidden_msgs`) || "[]");
          const newMsgs = data.filter((m:any) => !hiddenMsgs.includes(m.id)).reverse();
          const scrollContainer = e.target;
          const oldScrollHeight = scrollContainer.scrollHeight;
          
          setMsgs(prev => [...newMsgs, ...prev]);
          
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
            }
          }, 0);
          if (data.length < 50) setHasMore(false);
        } else {
          setHasMore(false);
        }
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase.channel(`chat-${matchId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const row = payload.new as MsgRow;
        if (row.match_id !== matchId) return;
        
        const hiddenMsgs = JSON.parse(localStorage.getItem(`hidden_msgs`) || "[]");
        if (hiddenMsgs.includes(row.id)) return;

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
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        const deletedId = payload.old.id;
        setMsgs(prev => prev.filter(m => m.id !== deletedId));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const r = payload.new as Reaction;
          setReactions(prev => {
            const cleaned = prev.filter(x => !(x.id.startsWith("temp-") && x.message_id === r.message_id && x.sender_anon === r.sender_anon));
            if (cleaned.some(x => x.id === r.id)) return cleaned;
            return [...cleaned, r];
          });
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
  },[matchId, markRead]);

  useEffect(() => {
    if (isLoaded) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isLoaded, msgs.length]);

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
      const tempId = `temp-r-${Date.now()}`;
      setReactions(prev =>[...prev, { id: tempId, message_id: msgId, sender_anon: myAnonId, emoji }]);
      const { data } = await supabase.from("message_reactions").insert({ message_id: msgId, sender_anon: myAnonId, emoji }).select().single();
      if (data) {
        setReactions(prev => {
          const hasReal = prev.some(r => r.id === data.id);
          if (hasReal) return prev.filter(r => r.id !== tempId);
          return prev.map(r => r.id === tempId ? data : r);
        });
      }
    }
  }

  async function confirmDeleteMessage(type: 'me' | 'everyone') {
    if (!msgToDelete) return;
    const msgId = msgToDelete;
    setMsgToDelete(null);

    if (type === 'everyone') {
      await supabase.from("messages").delete().eq("id", msgId);
    } else {
      const hidden = JSON.parse(localStorage.getItem(`hidden_msgs`) || "[]");
      hidden.push(msgId);
      localStorage.setItem(`hidden_msgs`, JSON.stringify(hidden));
    }
    
    setMsgs(prev => prev.filter(m => m.id !== msgId));
    setReactionMsgId(null);
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
      setMsgs(prev =>[...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, created_at: new Date().toISOString(), read_at: null, type: "image" }]);
      const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, type: "image" }).select().single();
      if (data) {
        setMsgs(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempId);
          if (withoutTemp.some(m => m.id === data.id)) return withoutTemp;
          return[...withoutTemp, data as MsgRow];
        });
      }
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
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const replyPreview = replyTo ? (replyTo.type==="voice"?"🎤 Voice":replyTo.type==="image"?"📷 Photo":replyTo.content.slice(0,60)) : null;
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    setMsgs(prev =>[...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: t2, created_at: new Date().toISOString(), read_at: null, delivered_at: null, type: "text", reply_to_id: replyId, reply_preview: replyPreview }]);
    try {
      const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: t2, type: "text", reply_to_id: replyId, reply_preview: replyPreview }).select().single();
      if (data) {
        setMsgs(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempId);
          if (withoutTemp.some(m => m.id === data.id)) return withoutTemp;
          return [...withoutTemp, data as MsgRow];
        });
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
      mediaRecorderRef.current = recorder; chunksRef.current =[];
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
  function cancelRecording() { stopRecording(); setAudioBlob(null); if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); } setRecordTime(0); chunksRef.current =[]; }

  async function sendVoice() {
    if (!audioBlob || !myAnonId || uploadingVoice) return;
    setUploadingVoice(true);
    const fileName = `voice-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("voices").upload(fileName, audioBlob, { contentType: "audio/webm", upsert: true });
    if (error) { console.error(error); setUploadingVoice(false); return; }
    const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
    const tempId = `tempv-${Date.now()}`;
    setMsgs(prev =>[...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, created_at: new Date().toISOString(), read_at: null, type: "voice" }]);
    const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: urlData.publicUrl, type: "voice" }).select().single();
    if (data) {
      setMsgs(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        if (withoutTemp.some(m => m.id === data.id)) return withoutTemp;
        return[...withoutTemp, data as MsgRow];
      });
    }
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); }
    setAudioBlob(null); setUploadingVoice(false);
  }

  async function handleUnmatchConfirm(reason: string) {
    setShowUnmatchModal(false);
    const isReport = reason === "შეურაცხმყოფელი ქცევა" || reason === "სპამი ან ყალბი პროფილი" ||
                     reason === "Offensive behavior" || reason === "Spam or fake profile";
    try { await supabase.from("unmatch_feedback").insert({ from_user: myUserId, to_user: otherUserId, match_id: matchId, reason }); } catch {}
    if (isReport) {
      try { await supabase.from("reports").insert({ from_user: myUserId, to_user: otherUserId, match_id: matchId, reason }); } catch {}
    } else {
      try { await supabase.from("notifications").insert({ user_id: otherUserId, type: "unmatch", message: reason, from_user: myUserId }); } catch {}
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

  const avatar = useMemo(() => { const src = photoSrc(otherProfile?.photo1_url ?? null); return src || null; },[otherProfile]);
  const effectiveAnonId = myAnonId ?? myAnonIdRef.current;
  const otherName = otherProfile?.nickname ?? otherProfile?.first_name ?? "...";

  const visibleMsgs = useMemo(() => {
    if (!searchQuery.trim()) return msgs;
    const lowerQ = searchQuery.toLowerCase();
    return msgs.filter(m => m.type === "text" && m.content.toLowerCase().includes(lowerQ));
  },[msgs, searchQuery]);

  if (!isLoaded) return (
    <div className="fixed inset-0 h-[100dvh] flex justify-center select-none" style={{ ...bgStyle, willChange: "background", WebkitTouchCallout: "none" }}>
      <div className="w-full max-w-lg flex flex-col h-full bg-black/40">
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-2 w-16 bg-white/8 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -khtml-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        input, textarea {
          -webkit-touch-callout: default !important;
          -webkit-user-select: auto !important;
          -khtml-user-select: auto !important;
          -moz-user-select: auto !important;
          -ms-user-select: auto !important;
          user-select: auto !important;
        }
      `}} />

      <div className="fixed inset-0 h-[100dvh] flex justify-center select-none" style={{ ...bgStyle, willChange: "auto", WebkitTouchCallout: "none" }}>
        <div className="w-full max-w-lg flex flex-col h-full" style={{ background: "transparent" }}>
          
          <div ref={headerRef} className="flex items-center gap-3 px-4 py-3 bg-transparent shrink-0"
            style={{ position: "sticky", top: headerTop, zIndex: 50 }}>
            
            {isSearching ? (
              <div className="flex w-full items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full ring-1 ring-white/20">
                <button onClick={() => { setIsSearching(false); setSearchQuery(""); }} className="text-white shrink-0 text-xl font-bold transition">←</button>
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder={ka ? "ძებნა..." : "Search..."}
                  className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-white/50" />
              </div>
            ) : (
              <>
                <button onClick={() => { setReactionMsgId(null); router.push("/chat"); }}
                  className="rounded-full bg-black/20 backdrop-blur-md w-9 h-9 flex items-center justify-center text-white shrink-0 transition">←</button>
                <div className="flex items-center gap-3 flex-1 cursor-pointer bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full"
                  onClick={() => otherUserId && router.push(`/profile/${otherUserId}`)}>
                  <div className="relative shrink-0">
                    <SafeImg src={avatar} className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                      fallback={<div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">👤</div>} />
                    {isOnline && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-400 border border-zinc-950" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[13px] truncate drop-shadow-md">{otherName}</div>
                  </div>
                </div>
                
                <button onClick={() => setIsSearching(true)}
                  className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white transition shrink-0 text-[16px]">
                  🔍
                </button>
                
                <button onClick={e => { e.stopPropagation(); setShowMenu(true); }}
                  className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white transition shrink-0 text-lg font-bold tracking-widest">···</button>
              </>
            )}
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 scrollbar-hide relative"
            style={{ overscrollBehavior: "none" }}
            onClick={() => { setReactionMsgId(null); setShowTimeFor(null); }}
            onContextMenu={e => e.preventDefault()}>
            
            <div className="flex flex-col justify-end min-h-full pt-24 pb-8 space-y-0.5">
              
              {loadingMore && (
                <div className="flex justify-center mb-4">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {matchCreatedAt && !isSearching && (
                <div className="text-center text-xs text-white/50 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full mx-auto mb-4 w-max">
                  {ka ? `${otherName}-თან შეხვედრა შედგა` : `Matched with ${otherName} on`}{" "}
                  <span className="font-bold">{formatDetailedDate(matchCreatedAt, ka)}</span>
                </div>
              )}
              
              {visibleMsgs.map((m, i) => {
                if (!myAnonId) return null;
                const mine = m.sender_anon === myAnonId;
                const isTemp = m.id.startsWith("temp");
                const isRead = !!m.read_at;
                const isDelivered = !!m.delivered_at;
                const prevSame = i > 0 && visibleMsgs[i-1].sender_anon === m.sender_anon;
                const showReactionBar = reactionMsgId === m.id;
                const showingTime = showTimeFor === m.id;

                return (
                  <div key={m.id} className={`flex flex-col w-full ${mine?"items-end":"items-start"} ${prevSame?"mt-0.5":"mt-3"}`}>
                    
                    {showingTime && (
                       <div className={`text-[11px] font-medium text-white/50 mb-1 mt-1 drop-shadow-sm ${mine ? "mr-1" : "ml-1"}`}>
                          {formatDetailedDate(m.created_at, ka)}
                       </div>
                    )}

                    <div className="relative flex w-full"
                      style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>

                      {/* ემოჯების პანელი (რჩება მესიჯზე) */}
                      {showReactionBar && (
                        <EmojiPopup msg={m} myAnonId={myAnonId} reactions={reactions} mine={mine}
                          onReact={handleReact} onClose={() => setReactionMsgId(null)} />
                      )}

            <div className={`msg-box relative flex flex-col cursor-pointer max-w-[75vw] sm:max-w-[320px] select-none ${showReactionBar ? 'z-[60] scale-[1.02] transition-transform' : 'z-10'}`}
                           onTouchStart={e => {
                             if (touchState.current.timer) clearTimeout(touchState.current.timer);
                             touchState.current = {
                               id: m.id,
                               startX: e.touches[0].clientX,
                               startY: e.touches[0].clientY,
                               isLong: false,
                               isSwipe: false,
                               timer: setTimeout(() => {
                                 touchState.current.isLong = true;
                                 setReactionMsgId(m.id);
                                 setShowTimeFor(null);
                                 if (navigator.vibrate) navigator.vibrate(50);
                               }, 300)
                             };
                           }}
                           onTouchMove={e => {
                             if (touchState.current.id !== m.id) return;
                             const dx = Math.abs(e.touches[0].clientX - touchState.current.startX);
                             const dy = Math.abs(e.touches[0].clientY - touchState.current.startY);
                             if (dx > 10 || dy > 10) {
                               touchState.current.isSwipe = true;
                               if (touchState.current.timer) {
                                 clearTimeout(touchState.current.timer);
                                 touchState.current.timer = null;
                               }
                             }
                           }}
                           onTouchEnd={e => {
                             if (touchState.current.id !== m.id) return;
                             if (touchState.current.timer) {
                               clearTimeout(touchState.current.timer);
                               touchState.current.timer = null;
                             }
                             if (!touchState.current.isLong) {
                               const dx = e.changedTouches[0].clientX - touchState.current.startX;
                               const dy = Math.abs(e.changedTouches[0].clientY - touchState.current.startY);
                               
                               // გასრიალება დასარეფლაიებლად
                               if (Math.abs(dx) > 60 && dy < 40) {
                                  setReplyTo(m); 
                                  setTimeout(() => inputRef.current?.focus(), 50);
                               } 
                               // ⚡️ წამიერი დაჭერა (Tap)
                               else if (Math.abs(dx) < 10 && dy < 10 && !touchState.current.isSwipe) {
                                  if (m.type === "image") {
                                    // ⏱ 50 მილიწამიანი დაყოვნება აგვარებს "ეგრევე დახურვის" პრობლემას
                                    setTimeout(() => setViewingImage(m.content), 50);
                                  } else {
                                    setShowTimeFor(prev => prev === m.id ? null : m.id);
                                  }
                                  setReactionMsgId(null);
                               }
                             }
                             setTimeout(() => { touchState.current.id = null; }, 50);
                           }}>
                        
                        <div>
                          {m.reply_preview && (
                            <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 bg-black/40 backdrop-blur-sm truncate text-white/80 select-none ${mine?"ml-auto":""}`}
                              style={{ borderColor: chatTheme, maxWidth: "100%" }}>
                              ↩ {m.reply_preview}
                            </div>
                          )}

                          {m.type === "voice" ? (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl w-full select-none ${mine?"rounded-tr-sm":"bg-zinc-800/90 backdrop-blur-md rounded-tl-sm"} ${isTemp?"opacity-60":""}`}
                              style={mine ? { background: chatTheme } : {}}>
                              <span className="text-lg shrink-0">🎤</span>
                              <audio controls src={m.content} className="h-8 w-[140px] shrink-0" preload="metadata" />
                              <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                                <span className="text-[10px] text-white/60 drop-shadow-sm">{fmtTime(m.created_at)}</span>
                                <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                              </div>
                            </div>
                          ) : m.type === "image" ? (
                            // 🖼 დაცული სურათი ჩატში (არ ინახება)
                            <div className={`relative rounded-2xl overflow-hidden w-full select-none ${mine?"rounded-tr-sm":"rounded-tl-sm"} ${isTemp?"opacity-60":""}`}>
                              <img src={m.content} className="max-w-full max-h-[280px] object-cover block select-none" 
                                   style={{ WebkitTouchCallout: "none", pointerEvents: "none" }}
                                   draggable="false" alt="" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                              
                              {/* 🛡 უხილავი ფენა, რომელიც კრძალავს Long Press-ს შენახვაზე */}
                              <div className="absolute inset-0 z-10 bg-transparent" onContextMenu={e => e.preventDefault()} />
                              
                              {mine && (
                                <div className="absolute bottom-1.5 right-1.5 flex justify-end px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-full z-20 pointer-events-none">
                                  <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`px-4 py-2.5 text-[15px] leading-relaxed break-words shadow-sm select-none ${mine?"rounded-2xl rounded-tr-sm text-white":"bg-zinc-800/95 backdrop-blur-md rounded-2xl rounded-tl-sm text-white"} ${isTemp?"opacity-60":""}`}
                              style={mine ? { background: chatTheme } : {}}>
                              <span>{m.content}</span>
                              <span className="inline-flex items-center gap-0.5 ml-2 float-right mt-1.5">
                                <span className={`text-[10px] drop-shadow-sm ${mine?"text-white/70":"text-white/40"}`}>{fmtTime(m.created_at)}</span>
                                <Ticks isTemp={isTemp} delivered={isDelivered} read={isRead} mine={mine} />
                              </span>
                            </div>
                          )}
                        </div>

                        {msgReactionIds.has(m.id) && (
                          <div className={`flex mt-[-10px] z-10 select-none ${mine ? "mr-1 justify-end" : "ml-auto mr-[-10px]"}`}>
                            <ReactionsDisplay msgId={m.id} reactions={reactions} myAnonId={effectiveAnonId ?? ""} onReact={handleReact} theme={chatTheme} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 bg-transparent z-10 px-3 pt-2"
            style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 8}px` : "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>

            {showEmoji && (
              <QuickEmojiPicker onPick={e => setText(p => p + e)} onClose={() => setShowEmoji(false)} />
            )}

            {replyTo && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-md"
                style={{ borderLeft: `2px solid ${chatTheme}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold mb-0.5 drop-shadow" style={{ color: chatTheme }}>↩ {ka?"პასუხი":"Reply"}</div>
                  <div className="text-xs text-white/80 truncate drop-shadow">
                    {replyTo.type==="voice"?"🎤 Voice":replyTo.type==="image"?"📷 Photo":replyTo.content.slice(0,60)}
                  </div>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-white/60 hover:text-white text-lg shrink-0">✕</button>
              </div>
            )}

            {!recording && (
              <div className="flex items-end gap-1.5">
                <div className="flex-1 flex items-center bg-black/40 backdrop-blur-xl rounded-3xl px-4 py-2 min-h-[44px] ring-1 ring-white/10">
                  <input ref={inputRef} value={text}
                    onChange={e => setText(e.target.value)}
                    onFocus={() => {
                      setShowEmoji(false);
                      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                    }}
                    autoComplete="off" autoCorrect="off" autoCapitalize="sentences"
                    onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && !sending) { e.preventDefault(); send(); } }}
                    placeholder={ka?"მესიჯი...":"Type a message..."} 
                    className="bg-transparent outline-none text-white w-full text-[15px] placeholder:text-white/50 select-text"
                    style={{ WebkitUserSelect: "auto", WebkitTouchCallout: "default" }} />
                  
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={e => { e.stopPropagation(); setShowEmoji(p => !p); }}
                      className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition text-lg">🙂</button>
                    {!text.trim() && (
                      <button onClick={() => setShowAttachSheet(true)}
                        className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition text-xl">+</button>
                    )}
                  </div>
                </div>

                {text.trim() ? (
                  <button onClick={send} disabled={sending} onMouseDown={e => e.preventDefault()}
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 active:scale-90 transition shadow-lg"
                    style={{ background: chatTheme }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  </button>
                ) : (
                  <button onPointerDown={e => { e.preventDefault(); startRecording(); }}
                    className="shrink-0 w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl ring-1 ring-white/10 flex items-center justify-center text-white/80 hover:text-white transition active:scale-90">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </button>
                )}
              </div>
            )}

            {recording && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-2xl bg-red-500/20 backdrop-blur-xl border border-red-500/30">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-red-400 font-bold text-sm tabular-nums shrink-0">{fmtTimer(recordTime)}</span>
                <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
                  {Array.from({length:28}).map((_,i) => (
                    <div key={i} className="bg-red-400/60 rounded-full shrink-0" style={{width:"2px",height:`${5+((i*7+recordTime*13)%16)}px`}} />
                  ))}
                </div>
                <button onClick={cancelRecording} className="text-white/60 hover:text-red-400 shrink-0 px-2">✕</button>
                <button onClick={stopRecording} className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shrink-0">{ka?"გაგზავნა":"Send"}</button>
              </div>
            )}
          </div>
        </div>

        {/* MODALS & OVERLAYS */}
        
        {reactionMsgId && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-[2px] transition-all" onClick={() => setReactionMsgId(null)} />
            {msgs.find(m => m.id === reactionMsgId) && (
              <BottomActionMenu
                msg={msgs.find(m => m.id === reactionMsgId)!}
                mine={msgs.find(m => m.id === reactionMsgId)?.sender_anon === myAnonId}
                ka={ka}
                onClose={() => setReactionMsgId(null)}
                onReply={() => {
                  setReplyTo(msgs.find(m => m.id === reactionMsgId)!);
                  setReactionMsgId(null);
                  setTimeout(()=>inputRef.current?.focus(), 50);
                }}
                onCopy={() => {
                  const selectedMsg = msgs.find(m => m.id === reactionMsgId);
                  if (selectedMsg?.type === "text") {
                    navigator.clipboard.writeText(selectedMsg.content).catch(()=>{});
                  }
                  setReactionMsgId(null);
                }}
                onDelete={() => {
                  setMsgToDelete(reactionMsgId);
                  setReactionMsgId(null);
                }}
              />
            )}
          </>
        )}

        {imagePreview && (
          <div className="fixed inset-0 z-[70] bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 12px)" }}>
              <button onClick={() => setImagePreview(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg">✕</button>
              <button onClick={async () => { const f = imagePreview.file; setImagePreview(null); await uploadImage(f); }} disabled={uploadingImg}
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl disabled:opacity-50 active:scale-90 transition"
                style={{ background: chatTheme }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <img src={imagePreview.url} className="max-w-full max-h-full object-contain rounded-2xl" alt="" />
            </div>
          </div>
        )}

        {showMenu && <ChatMenu lang={lang} onClose={() => setShowMenu(false)}
          onOpenTheme={() => { setShowThemeModal(true); }}
          onViewProfile={() => { setShowMenu(false); otherUserId && router.push(`/profile/${otherUserId}`); }}
          onUnmatch={() => { setShowMenu(false); setShowUnmatchModal(true); }}
          onBlock={() => { setShowMenu(false); handleBlock(); }} />}

        {showUnmatchModal && <UnmatchModal ka={ka} onClose={() => setShowUnmatchModal(false)} onConfirm={handleUnmatchConfirm} />}

        {showAttachSheet && <AttachSheet lang={lang} onClose={() => setShowAttachSheet(false)}
          onGallery={() => galleryInputRef.current?.click()} onCamera={() => cameraInputRef.current?.click()} />}
        
        {showThemeModal && (
          <ThemeModal ka={ka} current={chatTheme} currentBg={chatBg} onClose={() => setShowThemeModal(false)}
            onSelect={(color, bg) => applyTheme(color, bg)} />
        )}

 {/* 🖼 სურათის სრულ ეკრანზე ნახვა (დაცული შენახვისგან) */}
        {viewingImage && (
          <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-xl flex flex-col"
               onClick={(e) => {
                 // დაიხურება მხოლოდ მაშინ, თუ ზუსტად შავ ფონს დააჭერს (ან X ღილაკს)
                 if (e.target === e.currentTarget) setViewingImage(null);
               }}
               onContextMenu={e => e.preventDefault()}>
            
            <div className="flex justify-end px-4 py-4 pointer-events-none" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}>
              <button onClick={() => setViewingImage(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg active:scale-90 transition pointer-events-auto">✕</button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center p-2 overflow-hidden pointer-events-none">
              <img src={viewingImage} 
                   className="max-w-full max-h-full object-contain select-none pointer-events-auto" 
                   draggable="false" 
                   style={{ WebkitTouchCallout: "none" }} 
                   alt="fullscreen" />
              
              {/* 🛡 უხილავი დამცავი ფენა (ბლოკავს სურათის შენახვას/ჩამოტვირთვას) */}
              <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" onContextMenu={e => e.preventDefault()} />
            </div>
          </div>
        )}

      </div>
    </>
  );
}