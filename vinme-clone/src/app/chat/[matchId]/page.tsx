"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import EmojiPicker from "emoji-picker-react";
import { SafeImg } from "@/components/SafeImg";
import { getLang } from "@/lib/i18n";

type MsgRow = {
  id: string; match_id: number; sender_anon: string;
  content: string; created_at: string; read_at: string | null; type?: "text" | "voice";
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

function Ticks({ sent, read, mine }: { sent: boolean; read: boolean; mine: boolean }) {
  if (!mine || !sent) return null;
  if (read) return (
    <span className="inline-flex items-center ml-1 shrink-0">
      <svg width="16" height="11" viewBox="0 0 20 13" fill="none">
        <path d="M1 6l4 4 7-8" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 10l7-8" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 10l7-8" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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

// ===== 3-DOT MENU =====
function ChatMenu({ onClose, onViewProfile, onUnmatch, onBlock, lang }: {
  onClose: () => void; onViewProfile: () => void; onUnmatch: () => void; onBlock: () => void; lang: string;
}) {
  const ka = lang !== "en";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-3xl overflow-hidden pb-safe"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-end px-4 pt-4 pb-2">
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">✕</button>
        </div>
        {[
          { label: ka ? "პროფილის ნახვა" : "View profile", icon: "👤", onClick: onViewProfile },
          { label: ka ? "Unmatch & დაბლოკვა" : "Unmatch & Block", icon: "🚫", red: false, onClick: onUnmatch },
          { label: ka ? "დაბლოკვა და შეტყობინება" : "Block and report", icon: "⛔", red: true, onClick: onBlock },
        ].map((item, i) => (
          <button key={i} onClick={item.onClick}
            className={`w-full flex items-center justify-between px-5 py-4 border-t border-white/8 hover:bg-white/5 transition ${item.red ? "text-red-400" : "text-white"}`}>
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

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = Number(params?.matchId);
  const lang = getLang();
  const ka = lang !== "en";

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [myAnonId, setMyAnonId] = useState<string|null>(null);
  const [myUserId, setMyUserId] = useState<string|null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [otherUserId, setOtherUserId] = useState<string|null>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [vpHeight, setVpHeight] = useState<number>(0);

  // long press delete
  const [selectedMsgId, setSelectedMsgId] = useState<string|null>(null);
  const longPressTimer = useRef<NodeJS.Timeout|null>(null);

  // pull to refresh
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob|null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnline = useMemo(() => {
    if (!otherProfile?.last_seen) return false;
    return Date.now() - new Date(otherProfile.last_seen).getTime() < 3*60*1000;
  }, [otherProfile]);

  const statusText = formatLastSeen(otherProfile?.last_seen ?? null, ka);

  const markRead = useCallback(async (anonId: string|null, uid: string|null) => {
    if (!anonId || !uid) return;
    await supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("read_at", null);
    await supabase.from("matches").update({ has_unread: false }).eq("id", matchId);
    setMsgs(prev => prev.map(m =>
      m.sender_anon !== anonId && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m
    ));
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

      const anonId = meRes.data?.anon_id ?? null;
      setMyAnonId(anonId);

      const matchRow = matchRes.data;
      if (!matchRow) return;
      const otherId = matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a;
      setOtherUserId(otherId);

      const [profileRes, msgsRes] = await Promise.all([
        supabase.from("profiles").select("user_id,nickname,first_name,photo1_url,last_seen").eq("user_id", otherId).maybeSingle(),
        supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true }),
      ]);

      setOtherProfile(profileRes.data ?? null);
      setMsgs(msgsRes.data ?? []);
      setIsLoaded(true);
      await markRead(anonId, user.id);
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id);
    })();
  }, [matchId, router, markRead]);

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
        setMsgs(prev => prev.map(m => m.id === updated.id ? { ...m, read_at: updated.read_at } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, markRead]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  // ✅ Track visual viewport height for keyboard-aware layout
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) { setVpHeight(window.innerHeight); return; }
    // Use vv.height which excludes keyboard on all mobile browsers
    const handler = () => setVpHeight(Math.round(vv.height));
    handler();
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => { vv.removeEventListener("resize", handler); vv.removeEventListener("scroll", handler); };
  }, []);

  // pull-to-refresh handlers
  function onTouchStart(e: React.TouchEvent) { pullStartY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    const delta = e.touches[0].clientY - pullStartY.current;
    if (delta > 0) setPullY(Math.min(delta * 0.4, 60));
  }
  async function onTouchEnd() {
    if (pullY >= 50) {
      setRefreshing(true); setPullY(0);
      const { data } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
      setMsgs(data ?? []);
      setRefreshing(false);
    } else { setPullY(0); }
  }

  // long press handlers
  function onMsgPointerDown(msgId: string) {
    longPressTimer.current = setTimeout(() => setSelectedMsgId(msgId), 500);
  }
  function onMsgPointerUp() { if (longPressTimer.current) clearTimeout(longPressTimer.current); }

  async function deleteMessage(msgId: string) {
    await supabase.from("messages").delete().eq("id", msgId);
    setMsgs(prev => prev.filter(m => m.id !== msgId));
    setSelectedMsgId(null);
  }

  async function send() {
    const t2 = text.trim();
    if (!t2 || !myAnonId || sending) return;
    setSending(true); setText("");
    const tempId = `temp-${Date.now()}`;
    setMsgs(prev => [...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: t2, created_at: new Date().toISOString(), read_at: null, type: "text" }]);
    const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: t2, type: "text" }).select().single();
    if (data) setMsgs(prev => prev.map(m => m.id === tempId ? (data as MsgRow) : m));
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    if (myUserId) await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", myUserId);
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) setAudioBlob(blob);
        stream.getTracks().forEach(tr => tr.stop());
      };
      recorder.start(); setRecording(true); setRecordTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch { alert(ka ? "მიკროფონი მიუწვდომელია" : "Microphone unavailable"); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop(); setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function cancelRecording() { stopRecording(); setAudioBlob(null); setRecordTime(0); chunksRef.current = []; }

  async function sendVoice() {
    if (!audioBlob || !myAnonId || uploadingVoice) return;
    setUploadingVoice(true);
    const fileName = `voice-${Date.now()}.webm`;
    // ✅ upload to public bucket path
    const { data: uploadData, error } = await supabase.storage.from("voices").upload(fileName, audioBlob, { contentType: "audio/webm", upsert: true });
    if (error) { console.error("Voice upload error:", error); setUploadingVoice(false); return; }
    // ✅ get public URL correctly
    const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    const tempId = `tempv-${Date.now()}`;
    setMsgs(prev => [...prev, { id: tempId, match_id: matchId, sender_anon: myAnonId, content: publicUrl, created_at: new Date().toISOString(), read_at: null, type: "voice" }]);
    const { data } = await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: publicUrl, type: "voice" }).select().single();
    if (data) setMsgs(prev => prev.map(m => m.id === tempId ? (data as MsgRow) : m));
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    setAudioBlob(null); setUploadingVoice(false);
  }

  async function handleUnmatch() {
    if (!confirm(ka ? "Unmatch-ი გჭირდება?" : "Unmatch this person?")) return;
    await supabase.from("matches").delete().eq("id", matchId);
    router.replace("/chat");
  }
  async function handleBlock() {
    if (!confirm(ka ? "დაბლოკვა და შეტყობინება?" : "Block and report?")) return;
    await supabase.from("matches").delete().eq("id", matchId);
    router.replace("/chat");
  }

  const avatar = useMemo(() => { const src = photoSrc(otherProfile?.photo1_url ?? null); return src || null; }, [otherProfile]);
  const otherName = otherProfile?.nickname ?? otherProfile?.first_name ?? "...";

  if (!isLoaded) return (
    <div className="flex justify-center bg-[#111]" style={{ height: vpHeight > 0 ? `${vpHeight}px` : "100dvh" }}>
      <div className="w-full max-w-lg flex flex-col bg-[#111]" style={{ height: vpHeight > 0 ? `${vpHeight}px` : "100dvh" }}>
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

  return (
    <div className="flex justify-center bg-[#111]" style={{ height: vpHeight > 0 ? `${vpHeight}px` : "100dvh" }}>
      <div className="w-full max-w-lg flex flex-col bg-[#111] text-white"
        style={{ height: vpHeight > 0 ? `${vpHeight}px` : "100dvh" }}
        onClick={() => { showEmoji && setShowEmoji(false); selectedMsgId && setSelectedMsgId(null); }}>

        {/* HEADER */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-white/8 shrink-0">
          <button onClick={() => router.push("/chat")}
            className="rounded-full bg-white/8 w-9 h-9 flex items-center justify-center text-white shrink-0 hover:bg-white/12 transition">←</button>
          
          {/* ✅ avatar + name clickable → profile */}
          <div className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => otherUserId && router.push(`/profile/${otherUserId}`)}>
            <div className="relative shrink-0">
              <SafeImg src={avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                fallback={<div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm">👤</div>} />
              {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-zinc-950" />}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{otherName}</div>
              <div className={`text-[11px] ${isOnline ? "text-green-400" : "text-white/40"}`}>{statusText}</div>
            </div>
          </div>

          {/* 3-dot menu */}
          <button onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/8 transition shrink-0 text-lg font-bold tracking-widest">
            ···
          </button>
        </div>

        {/* MESSAGES */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3"
          style={{ transform: `translateY(${pullY}px)`, transition: pullY === 0 ? "transform 0.2s" : "none" }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          
          {/* pull indicator */}
          {(pullY > 10 || refreshing) && (
            <div className="flex justify-center mb-2 -mt-8">
              <span className={`text-white/40 text-xs ${refreshing ? "animate-spin" : ""}`}>
                {refreshing ? "↻" : "↓ " + (ka ? "განახლება" : "Pull to refresh")}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {msgs.map((m, i) => {
              const mine = m.sender_anon === myAnonId;
              const isTemp = m.id.startsWith("temp");
              const isRead = !!m.read_at;
              const prevSame = i > 0 && msgs[i-1].sender_anon === m.sender_anon;
              const isSelected = selectedMsgId === m.id;

              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${prevSame ? "mt-0.5" : "mt-3"} relative`}
                  onPointerDown={() => onMsgPointerDown(m.id)} onPointerUp={onMsgPointerUp} onPointerLeave={onMsgPointerUp}
                  onContextMenu={e => e.preventDefault()}
                  style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}>
                  
                  {/* delete popup on long press */}
                  {isSelected && mine && (
                    <div className="absolute bottom-full right-0 mb-1 z-30 bg-zinc-800 rounded-xl shadow-xl ring-1 ring-white/10 overflow-hidden">
                      <button onClick={() => deleteMessage(m.id)}
                        className="flex items-center gap-2 px-4 py-3 text-red-400 text-sm font-medium hover:bg-red-500/10 transition w-full">
                        🗑 {ka ? "წაშლა" : "Delete"}
                      </button>
                    </div>
                  )}

                  {m.type === "voice" ? (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl max-w-[270px]
                      ${mine ? "bg-[#7C3AED] rounded-tr-sm" : "bg-zinc-800 rounded-tl-sm"}
                      ${isTemp ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-red-400" : ""}`}>
                      <span className="text-lg shrink-0">🎤</span>
                      <audio controls src={m.content} className="h-8 max-w-[160px]" preload="metadata" />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[10px] text-white/40">{fmtTime(m.created_at)}</span>
                        <Ticks sent={!isTemp} read={isRead} mine={mine} />
                      </div>
                    </div>
                  ) : (
                    <div className={`px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-[78%] select-none
                      ${mine ? "bg-[#7C3AED] rounded-2xl rounded-tr-sm" : "bg-zinc-800 rounded-2xl rounded-tl-sm"}
                      ${isTemp ? "opacity-60" : ""} ${isSelected ? "ring-2 ring-red-400 opacity-80" : ""}`}>
                      <span>{m.content}</span>
                      <span className="inline-flex items-center gap-0.5 ml-2">
                        <span className={`text-[10px] ${mine ? "text-purple-200/50" : "text-white/25"}`}>{fmtTime(m.created_at)}</span>
                        <Ticks sent={!isTemp} read={isRead} mine={mine} />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* INPUT - sticks to keyboard */}
        <div className="shrink-0 bg-zinc-950 border-t border-white/8 px-3 pt-2 pb-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
          onClick={e => e.stopPropagation()}>
          
          {showEmoji && (
            <div className="mb-2"><EmojiPicker onEmojiClick={e => setText(p => p + e.emoji)} width="100%" height={280} theme={"dark" as any} /></div>
          )}

          {recording && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold text-sm tabular-nums shrink-0">{fmtTimer(recordTime)}</span>
              <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
                {Array.from({length:30}).map((_,i) => (
                  <div key={i} className="bg-red-400/60 rounded-full shrink-0" style={{width:"2px",height:`${5+((i*7+recordTime*13)%16)}px`}} />
                ))}
              </div>
              <button onClick={cancelRecording} className="text-white/30 hover:text-red-400 shrink-0">🗑</button>
              <button onClick={stopRecording} className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shrink-0">
                {ka ? "გაჩერება" : "Stop"}
              </button>
            </div>
          )}

          {!recording && audioBlob && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/25">
              <span className="text-[#A78BFA] font-semibold text-xs shrink-0">🎤 {ka ? "ხმა მზადაა" : "Voice ready"}</span>
              <div className="flex-1 flex items-end gap-[2px] h-5 overflow-hidden">
                {Array.from({length:26}).map((_,i) => (
                  <div key={i} className="bg-[#A78BFA]/50 rounded-full shrink-0" style={{width:"2px",height:`${4+Math.abs(Math.sin(i*0.9))*12}px`}} />
                ))}
              </div>
              <button onClick={() => setAudioBlob(null)} className="text-white/30 hover:text-white shrink-0">✕</button>
            </div>
          )}

          {!recording && (
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); setShowEmoji(!showEmoji); }}
                className="shrink-0 w-9 h-9 flex items-center justify-center text-xl text-white/35 hover:text-white/60 transition">😊</button>
              <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-4 py-2.5 gap-2 min-w-0">
                <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                  autoComplete="off" autoCorrect="off" autoCapitalize="sentences"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/25 min-w-0"
                  placeholder={ka ? "შეიყვანე მესიჯი..." : "Message..."} />
                {!text.trim() && !audioBlob && (
                  <button onPointerDown={e => { e.preventDefault(); startRecording(); }}
                    className="text-white/35 hover:text-white/60 text-lg shrink-0 transition">🎤</button>
                )}
              </div>
              {text.trim() ? (
                <button onClick={send} disabled={sending}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 active:scale-90 transition shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
              ) : audioBlob ? (
                <button onClick={sendVoice} disabled={uploadingVoice}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center disabled:opacity-40 active:scale-90 transition shadow-lg">
                  {uploadingVoice ? <span className="text-xs">⏳</span>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>}
                </button>
              ) : <div className="w-10 h-10 shrink-0" />}
            </div>
          )}
        </div>

      </div>

      {/* 3-DOT MENU MODAL */}
      {showMenu && (
        <ChatMenu lang={lang}
          onClose={() => setShowMenu(false)}
          onViewProfile={() => { setShowMenu(false); otherUserId && router.push(`/profile/${otherUserId}`); }}
          onUnmatch={() => { setShowMenu(false); handleUnmatch(); }}
          onBlock={() => { setShowMenu(false); handleBlock(); }}
        />
      )}

      {/* DELETE CONFIRM OVERLAY */}
      {selectedMsgId && (
        <div className="fixed inset-0 z-40" onClick={() => setSelectedMsgId(null)} />
      )}
    </div>
  );
}
