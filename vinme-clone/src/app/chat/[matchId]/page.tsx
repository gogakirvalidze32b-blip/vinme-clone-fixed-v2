"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { photoSrc } from "@/lib/photos";
import EmojiPicker from "emoji-picker-react";
import BottomNav from "@/components/BottomNav";

type MsgRow = {
  id: string;
  match_id: number;
  sender_anon: string;
  content: string;
  created_at: string;
  read_at: string | null;
  type?: "text" | "voice";
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = Number(params?.matchId);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // Voice
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const markRead = useCallback(async (anonId: string | null) => {
    if (!anonId) return;
    await supabase.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", matchId).neq("sender_anon", anonId).is("read_at", null);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (uid) await supabase.from("matches").update({ has_unread: false }).eq("id", matchId);
  }, [matchId]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) { router.replace("/login"); return; }

      const { data: me } = await supabase.from("profiles").select("anon_id").eq("user_id", user.id).maybeSingle();
      const anonId = me?.anon_id ?? null;
      setMyAnonId(anonId);

      const { data: matchRow } = await supabase.from("matches").select("user_a,user_b").eq("id", matchId).maybeSingle();
      if (!matchRow) return;
      const otherId = matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a;

      const { data: profile } = await supabase.from("profiles").select("user_id,nickname,photo1_url").eq("user_id", otherId).maybeSingle();
      setOtherProfile(profile ?? null);

      const { data: messages } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
      setMsgs(messages ?? []);

      markRead(anonId);
    })();
  }, [matchId, router, markRead]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase.channel(`chat-thread-${matchId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as MsgRow;
          setMsgs((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]);
          setMyAnonId((anon) => {
            if (anon && row.sender_anon !== anon) markRead(anon);
            return anon;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t || !myAnonId || sending) return;
    setSending(true);
    setText("");

    const tempId = `temp-${Date.now()}`;
    setMsgs((prev) => [...prev, {
      id: tempId, match_id: matchId, sender_anon: myAnonId,
      content: t, created_at: new Date().toISOString(), read_at: null, type: "text",
    }]);

    const { data } = await supabase.from("messages")
      .insert({ match_id: matchId, sender_anon: myAnonId, content: t, type: "text" })
      .select().single();
    if (data) setMsgs((prev) => prev.map((m) => m.id === tempId ? (data as MsgRow) : m));
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setRecordTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setRecordTime((p) => p + 1), 1000);
    } catch { alert("მიკროფონზე წვდომა შეუძლებელია"); }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function cancelRecording() {
    stopRecording();
    setAudioBlob(null);
    setRecordTime(0);
    chunksRef.current = [];
  }

  async function sendVoice() {
    if (!audioBlob || !myAnonId || uploadingVoice) return;
    setUploadingVoice(true);
    const fileName = `${myAnonId}-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("voices").upload(fileName, audioBlob, { contentType: "audio/webm", upsert: true });
    if (error) { setUploadingVoice(false); return; }
    const { data } = supabase.storage.from("voices").getPublicUrl(fileName);
    await supabase.from("messages").insert({ match_id: matchId, sender_anon: myAnonId, content: data.publicUrl, type: "voice" });
    await supabase.from("matches").update({ has_unread: true }).eq("id", matchId);
    setAudioBlob(null);
    setUploadingVoice(false);
  }

  const avatar = useMemo(() => photoSrc(otherProfile?.photo1_url ?? null), [otherProfile]);

  return (
    <div className="flex justify-center bg-zinc-950 min-h-[100dvh]">
      {/* ✅ MAX WIDTH — PC-ზე centered, mobile-ზე full */}
      <div className="w-full max-w-lg flex flex-col bg-black" style={{ height: "100dvh" }}
        onClick={() => showEmoji && setShowEmoji(false)}>

        {/* HEADER */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 border-b border-white/8 shrink-0">
          <button onClick={() => router.push("/chat")}
            className="rounded-full bg-white/10 w-9 h-9 flex items-center justify-center text-white shrink-0 text-lg">
            ←
          </button>
          <div className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => router.push(`/profile/${otherProfile?.user_id}`)}>
            <div className="relative">
              {avatar
                ? <img src={avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                : <div className="w-10 h-10 rounded-full bg-white/10" />}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-zinc-950" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white">{otherProfile?.nickname ?? "..."}</div>
              <div className="text-[11px] text-green-400">Online</div>
            </div>
          </div>
          {/* dots menu */}
          <button className="text-white/40 text-xl px-1">⋯</button>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {msgs.map((m, i) => {
            const mine = m.sender_anon === myAnonId;
            const isTemp = m.id.startsWith("temp-");
            const prevMine = i > 0 && msgs[i - 1].sender_anon === m.sender_anon;
            const showTime = !prevMine;

            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} ${prevMine ? "mt-0.5" : "mt-3"}`}>
                {m.type === "voice" ? (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl max-w-[260px]
                    ${mine ? "bg-[#7C3AED] rounded-tr-sm" : "bg-zinc-800 rounded-tl-sm"}`}>
                    <span className="text-base shrink-0">🎤</span>
                    <audio controls src={m.content} className="h-8 max-w-[180px]"
                      style={{ filter: mine ? "invert(1) brightness(2)" : "none" }} />
                    <span className="text-[10px] text-white/50 shrink-0">{msgTime(m.created_at)}</span>
                  </div>
                ) : (
                  <div className={`relative px-4 py-2 max-w-[78%] text-sm leading-relaxed break-words
                    ${mine
                      ? "bg-[#7C3AED] text-white rounded-2xl rounded-tr-sm"
                      : "bg-zinc-800 text-white rounded-2xl rounded-tl-sm"}
                    ${isTemp ? "opacity-60" : ""}`}>
                    {m.content}
                    <span className={`ml-2 text-[10px] ${mine ? "text-purple-200/60" : "text-white/30"}`}>
                      {isTemp ? "⌛" : msgTime(m.created_at)}
                      {mine && !isTemp && " ✓"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT AREA */}
        <div className="shrink-0 bg-zinc-950 border-t border-white/8 px-3 pt-2"
          style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 80px)` }}>

          {/* EMOJI */}
          {showEmoji && (
            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
              <EmojiPicker onEmojiClick={(e) => setText((p) => p + e.emoji)} width="100%" height={300} theme={"dark" as any} />
            </div>
          )}

          {/* RECORDING */}
          {recording && (
            <div className="flex items-center gap-3 mb-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-bold text-sm tabular-nums w-10 shrink-0">{formatTime(recordTime)}</span>
              <div className="flex-1 flex items-end gap-[2px] h-7 overflow-hidden">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="bg-red-400/70 rounded-full shrink-0 transition-all"
                    style={{ width: "2px", height: `${6 + ((i * 7 + recordTime * 11) % 18)}px` }} />
                ))}
              </div>
              <button onClick={cancelRecording} className="text-white/30 hover:text-red-400 text-lg shrink-0">🗑</button>
              <button onClick={stopRecording}
                className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white shrink-0">
                ⏹ Done
              </button>
            </div>
          )}

          {/* VOICE READY */}
          {!recording && audioBlob && (
            <div className="flex items-center gap-3 mb-2 px-4 py-2.5 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30">
              <span className="text-[#A78BFA] font-semibold text-xs shrink-0">🎤 Voice ready</span>
              <div className="flex-1 flex items-end gap-[2px] h-6 overflow-hidden">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="bg-[#A78BFA]/60 rounded-full shrink-0"
                    style={{ width: "2px", height: `${5 + Math.abs(Math.sin(i * 0.9)) * 13}px` }} />
                ))}
              </div>
              <button onClick={() => setAudioBlob(null)} className="text-white/30 hover:text-white text-sm shrink-0">✕</button>
            </div>
          )}

          {/* MAIN INPUT */}
          {!recording && (
            <div className="flex items-center gap-2">
              {/* emoji btn */}
              <button onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); }}
                className="shrink-0 text-xl text-white/40 hover:text-white/70 transition w-9 h-9 flex items-center justify-center">
                😊
              </button>

              {/* input */}
              <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-4 py-2.5 gap-2 min-w-0">
                <input ref={inputRef} value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  className="flex-1 bg-transparent outline-none text-white text-sm placeholder-white/25 min-w-0"
                  placeholder="Message..." />
                {/* mic inside input */}
                {!text.trim() && !audioBlob && (
                  <button onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                    className="text-white/40 hover:text-white/70 text-lg shrink-0 leading-none transition">
                    🎤
                  </button>
                )}
              </div>

              {/* send / send-voice */}
              {text.trim() ? (
                <button onClick={send} disabled={sending}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition shadow-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                  </svg>
                </button>
              ) : audioBlob ? (
                <button onClick={sendVoice} disabled={uploadingVoice}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white disabled:opacity-40 active:scale-90 transition shadow-lg">
                  {uploadingVoice ? (
                    <span className="text-xs">⏳</span>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                    </svg>
                  )}
                </button>
              ) : (
                <div className="shrink-0 w-10 h-10" /> // placeholder for alignment
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
