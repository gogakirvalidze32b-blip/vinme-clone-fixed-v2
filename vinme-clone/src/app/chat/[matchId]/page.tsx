"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const NAV_HEIGHT = 84;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = Number(params?.matchId);




  

  const [recordTime, setRecordTime] = useState(0);
const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [msgs, setMsgs] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [myAnonId, setMyAnonId] = useState<string | null>(null);
  const [otherProfile, setOtherProfile] = useState<any>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ---------------- LOAD ----------------
  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) return;

      const { data: me } = await supabase
        .from("profiles")
        .select("anon_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setMyAnonId(me?.anon_id ?? null);

      const { data: matchRow } = await supabase
        .from("matches")
        .select("user_a,user_b")
        .eq("id", matchId)
        .maybeSingle();

      if (!matchRow) return;

      const otherId =
        matchRow.user_a === user.id
          ? matchRow.user_b
          : matchRow.user_a;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id,nickname,photo1_url")
        .eq("user_id", otherId)
        .maybeSingle();

      setOtherProfile(profile ?? null);

      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      setMsgs(messages ?? []);
    })();
  }, [matchId]);

  // ---------------- REALTIME ----------------
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as MsgRow;
          setMsgs((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, row]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  // ---------------- SEND TEXT ----------------
  async function send() {
    const t = text.trim();
    if (!t || !myAnonId) return;

    setText("");

    await supabase.from("messages").insert({
      match_id: matchId,
      sender_anon: myAnonId,
      content: t,
      type: "text",
    });
  }

  // ---------------- VOICE RECORD ----------------
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const recorder = new MediaRecorder(stream);

  mediaRecorderRef.current = recorder;
  chunksRef.current = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunksRef.current.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunksRef.current, {
      type: "audio/webm",
    });

    console.log("Blob size:", blob.size); // ⬅️ ეს დაგეხმარება

    if (blob.size > 0) {
      setAudioBlob(blob);
    }

    stream.getTracks().forEach((track) => track.stop());
  };

  recorder.start(); // ❗️არ ჩასვა 100ms

  setRecording(true);
  setRecordTime(0);

  if (timerRef.current) clearInterval(timerRef.current);

  timerRef.current = setInterval(() => {
    setRecordTime((prev) => prev + 1);
  }, 1000);
}


function stopRecording() {
  mediaRecorderRef.current?.stop();
  setRecording(false);

  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}
async function sendVoice() {
  console.log("Sending voice...");
  console.log("audioBlob:", audioBlob);

  if (!audioBlob || !myAnonId) {
    console.log("Missing blob or anonId");
    return;
  }

  const fileName = `voice-${Date.now()}.webm`;

const { error } = await supabase.storage
  .from("voices")
  .upload(fileName, audioBlob, {
    contentType: "audio/webm",
    upsert: true,
  });

if (error) {
  console.log("UPLOAD ERROR:", error);
  return;
}
  console.log("Upload error:", error);

  const { data } = supabase.storage
    .from("voices")
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_anon: myAnonId,
      content: data.publicUrl,
      type: "voice",
    });

  console.log("Insert error:", insertError);

  setAudioBlob(null);
}
  const avatar = useMemo(
    () => photoSrc(otherProfile?.photo1_url ?? null),
    [otherProfile]
  );

  return (
    <main
      ref={wrapperRef}
      onClick={() => showEmoji && setShowEmoji(false)}
      className="min-h-[100dvh] bg-black text-white pb-28"
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => router.push("/chat")}>←</button>

        <div
          onClick={() =>
            router.push(`/profile/${otherProfile?.user_id}`)
          }
          className="flex items-center gap-3 cursor-pointer"
        >
          {avatar ? (
            <img
              src={avatar}
              className="w-10 h-10 rounded-full object-cover"
              alt=""
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10" />
          )}

          <div className="font-semibold">
            {otherProfile?.nickname}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div
        className="overflow-y-auto px-4 py-4"
        style={{
          height: `calc(100dvh - ${NAV_HEIGHT + 140}px)`,
        }}
      >
        {msgs.map((m) => {
          const mine = m.sender_anon === myAnonId;

          return (
            <div
              key={m.id}
              className={`flex mb-2 ${
                mine ? "justify-end" : "justify-start"
              }`}
            >
              {m.type === "voice" ? (
                <audio
                  controls
                  src={m.content}
                  className="max-w-[220px]"
                />
              ) : (
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[75%] ${
                    mine
                      ? "bg-purple-600"
                      : "bg-white/10"
                  }`}
                >
                  {m.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR */}
      <div className="px-4">
        <div className="relative bg-white/10 rounded-full flex items-center px-4 py-3 gap-3">

          {/* PHOTO PLACEHOLDER */}
          <button className="text-xl">＋</button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="flex-1 bg-transparent outline-none text-white"
            placeholder="Type a message..."
          />

          {/* EMOJI RIGHT */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEmoji(!showEmoji);
            }}
            className="text-xl"
          >
            😊
          </button>
{/* MIC / TIMER / DELETE */}
{recording ? (
  <div className="flex items-center gap-3 text-red-500">

    {/* TIMER */}
    <div className="text-sm font-semibold">
      ● {formatTime(recordTime)}
    </div>

    {/* STOP BUTTON */}
    <button
      onClick={stopRecording}
      className="text-white"
    >
      ⏹
    </button>

  </div>
) : audioBlob ? (
  <div className="flex items-center gap-3">

    {/* READY LABEL */}
    <div className="text-sm text-green-400">
      Voice ready
    </div>

    {/* DELETE BUTTON */}
    <button
      onClick={() => setAudioBlob(null)}
      className="text-red-400"
    >
      ✕
    </button>

  </div>
) : (
  <button onClick={startRecording}>
    🎤
  </button>
)}



          {/* SEND */}
        <button
  type="button"
  onClick={() => {
    if (audioBlob) {
      sendVoice();
    } else {
      send();
    }
  }}
  disabled={!text.trim() && !audioBlob}
  className="disabled:opacity-40"
>
  ➤
</button>
        </div>

        {showEmoji && (
          <div className="mt-2">
            <EmojiPicker
              onEmojiClick={(e) =>
                setText((prev) => prev + e.emoji)
              }
            />
          </div>
        )}
      </div>

      <BottomNav chatBadge={0} />
    </main>
  );
}